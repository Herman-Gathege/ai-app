import { getApp } from "@/actions/get-app";
import { freestyle } from "@/lib/freestyle";
import { getAppIdFromHeaders } from "@/lib/utils";
import { MCPClient } from "@mastra/mcp";
import { builderAgent } from "@/mastra/agents/builder";
import { deleteStream, getStream, setStream } from "@/lib/streams";
import { CoreMessage } from "@mastra/core";
import { decrementUserCredits } from "@/lib/credits"; // ✅ Add this line
import { getUser } from "@/auth/stack-auth";
import { openRouterClaude } from "@/lib/openrouter";
import { EventEmitter } from "events";
import { AITextContent, streamText } from "ai";

// "fix" mastra mcp bug
EventEmitter.defaultMaxListeners = 1000;

// ✅ Normalize any CoreMessage.content into a string
function normalizeMessageContent(content: CoreMessage["content"]): string {
  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if ("text" in part) return part.text;
        if ("content" in part) return part.content;
        return "";
      })
      .join("\n");
  }

  if ("text" in content) return content.text;
  if ("content" in content) return content.content;

  return "";
}

// ✅ Async generator to stream Claude response
function runAgentStream(finalPrompt: string, userId: string): AsyncIterable<AITextContent> {
  return (async function* () {
    try {
      console.log("Calling Claude with prompt:", finalPrompt);

      const result = await openRouterClaude().generateContent(finalPrompt, userId);

      console.log("Claude responded:", result);

      yield {
        type: "text",
        text: result.content,
      };

      const didDeduct = await decrementUserCredits(userId);
      if (!didDeduct) {
        console.warn("⚠️ Credit deduction failed — user may be out of credits.");
      } else {
        console.log("✅ 1 credit deducted for user:", userId);
      }

      console.log("✅ Stream finished.");
    } catch (error: any) {
      console.error("❌ Error in Claude or credit logic:", error);
      const fallback =
        error?.message?.includes("No credits")
          ? "You're out of credits. Please upgrade your plan."
          : "Something went wrong. Please try again.";
      yield {
        type: "text",
        text: fallback,
      };
    }

    console.log("User ID:", userId);
    console.log("Prompt content:", finalPrompt);
  })();
}

export async function POST(req: Request) {
  const appId = getAppIdFromHeaders(req);

  if (!appId) {
    return new Response("Missing App Id header", { status: 400 });
  }

  const app = await getApp(appId);
  if (!app) {
    return new Response("App not found", { status: 404 });
  }

  const existingStream = await getStream(appId);
  if (existingStream) {
    const [stream1, stream2] = streams[appId].readable.tee();
    streams[appId] = { readable: stream2, prompt: streams[appId].prompt };
    return new Response(stream1, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  const { mcpEphemeralUrl } = await freestyle.requestDevServer({
    repoId: app.info.gitRepo,
    baseId: app.info.baseId,
  });

  const { message }: { message: CoreMessage } = await req.json();

  const mcp = new MCPClient({
    id: crypto.randomUUID(),
    servers: {
      dev_server: {
        url: new URL(mcpEphemeralUrl),
      },
    },
  });

  const toolsets = await mcp.getToolsets();

  const prompt = normalizeMessageContent(message.content);
  if (!prompt || prompt.trim() === "") {
    return new Response("Prompt cannot be empty", { status: 400 });
  }

  const { userId } = await getUser();

  const stream = runAgentStream(prompt, userId);
  const stream1 = stream[Symbol.asyncIterator]();

  const streamWrapper = new ReadableStream({
    async pull(controller) {
      const { value, done } = await stream1.next();
      if (done) {
        controller.close();
      } else if (value?.type === "text") {
        controller.enqueue(new TextEncoder().encode(value.text));
      }
    },
  });

  const [tee1, tee2] = streamWrapper.tee();
  await setStream(appId, tee2, prompt);

  console.log("Saving stream for app:", appId, "with prompt:", prompt);

  return streamText({
    content: tee1,
    model: "claude-3-opus", // you can change this label; it's required
    prompt,
  });

   
}

export async function GET(req: Request) {
  const appId = getAppIdFromHeaders(req);
  if (!appId) {
    return new Response("Missing App Id header", { status: 400 });
  }

  return new Response(
    JSON.stringify({
      stream: streams[appId] && {
        prompt: streams[appId].prompt,
      },
    })
  );
}
