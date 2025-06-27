// src/app/api/chat/route.ts

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
// import { streams } from "@/lib/streams"; // ✅ add this if missing
import { NextResponse } from "next/server";

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

function runAgentStream(
  finalPrompt: string,
  userId: string
): AsyncIterable<string> {
  return (async function* () {
    try {
      console.log("Simulating AI response for prompt:", finalPrompt);

      await new Promise((resolve) => setTimeout(resolve, 1500)); // simulate delay

      const simulatedText = `🧪 Simulated response: Based on your prompt "${finalPrompt}", here’s a placeholder response.`;
      for (const word of simulatedText.split(" ")) {
        yield word + " ";
        await new Promise((res) => setTimeout(res, 80)); // simulate streaming
      }

      console.log("✅ Simulated stream finished.");
    } catch (error: any) {
      console.error("❌ Error during simulated stream:", error);
      yield "Something went wrong in the simulation.";
    }

    console.log("User ID:", userId);
    console.log("Prompt content:", finalPrompt);
  })();
}

export async function POST(req: Request) {
  try {
    const appId = getAppIdFromHeaders(req);

    if (!appId) {
      return new NextResponse("Missing App Id header", { status: 400 });
    }

    const app = await getApp(appId);
    if (!app) {
      return new NextResponse("App not found", { status: 404 });
    }

    const { mcpEphemeralUrl } = await freestyle.requestDevServer({
      repoId: app.info.gitRepo,
      baseId: app.info.baseId,
    });

    const { message }: { message: CoreMessage } = await req.json();
    const prompt = normalizeMessageContent(message.content);

    if (!prompt || prompt.trim() === "") {
      return new NextResponse("Prompt cannot be empty", { status: 400 });
    }

    const { userId } = await getUser();

    const stream = runAgentStream(prompt, userId);
    const stream1 = stream[Symbol.asyncIterator]();

    const streamWrapper = new ReadableStream({
      async pull(controller) {
        const { value, done } = await stream1.next();
        if (done) {
          controller.close();
        } else if (typeof value === "string") {
          controller.enqueue(new TextEncoder().encode(value));
        }
      },
    });

    const [tee1, tee2] = streamWrapper.tee();
    await setStream(appId, tee2, prompt);

    console.log("Saving stream for app:", appId, "with prompt:", prompt);

    // const result = streamText({
    //   content: tee1,
    //   model: "claude-3-opus",
    //   prompt,
    // });

    return new NextResponse(tee1, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("❌ POST /api/chat failed:", error);

    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function GET(req: Request) {
  const appId = getAppIdFromHeaders(req);
  if (!appId) {
    return new NextResponse("Missing App Id header", { status: 400 });
  }

  const streamData = await getStream(appId);

  if (!streamData) {
    return new NextResponse("No stream found for this app", { status: 404 });
  }

  return NextResponse.json({
    stream: {
      prompt: streamData.prompt,
    },
  });
}
