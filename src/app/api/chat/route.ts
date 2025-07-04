// src/app/api/chat/route.ts
import { getUser } from "@/auth/stack";
import { checkAndConsumeCredit } from "@/lib/credits";
import { getApp } from "@/actions/get-app";
import { freestyle } from "@/lib/freestyle";
import { getAppIdFromHeaders } from "@/lib/utils";
import { MCPClient } from "@mastra/mcp";
import { builderAgent } from "@/mastra/agents/builder";
import { deleteStream, getStream, setStream } from "@/lib/streams";
import { CoreMessage } from "@mastra/core";
import { openRouterClaude } from "@/lib/openrouter";
import { EventEmitter } from "events";

EventEmitter.defaultMaxListeners = 1000;

// Wait for dev server
async function waitForServer(url: string, retries = 5, delayMs = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok) return true;
    } catch (_) {}
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return false;
}

export async function POST(req: Request) {
  const appId = getAppIdFromHeaders(req);
  if (!appId) return new Response("Missing App Id header", { status: 400 });

  const app = await getApp(appId);
  if (!app) return new Response("App not found", { status: 404 });

  const user = await getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  try {
    await checkAndConsumeCredit(user.userId);
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 402,
      headers: { "Content-Type": "application/json" },
    });
    // 402: Payment Required
  }

  const existingStream = await getStream(appId);
  if (existingStream) {
    const [stream1, stream2] = existingStream.readable.tee();
    await setStream(appId, stream2, existingStream.prompt);
    return new Response(stream1, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  const { mcpEphemeralUrl, ephemeralUrl } = await freestyle.requestDevServer({
    repoId: app.info.gitRepo,
    baseId: app.info.baseId,
  });

  const { message }: { message: CoreMessage } = await req.json();
  const promptText =
    typeof message.content === "string"
      ? message.content
      : Array.isArray(message.content)
      ? message.content.map((c: any) => c.text).join("")
      : "";

  const rootStream = new TransformStream();
  const [stream1, stream2] = rootStream.readable.tee();
  await setStream(appId, stream2, promptText);

  const encoder = new TextEncoder();
  const writer = rootStream.writable.getWriter();

  let toolsets: any[] = [];
  let mcp: MCPClient;

  try {
    const devReady = await waitForServer(mcpEphemeralUrl);
    if (!devReady) throw new Error("Dev server not reachable");

    mcp = new MCPClient({
      id: crypto.randomUUID(),
      servers: {
        dev_server: { url: new URL(mcpEphemeralUrl) },
      },
    });

    toolsets = await mcp.getToolsets();

    const safePrompt = {
      messages: [
        {
          role: "user",
          content: promptText,
        },
      ],
      system: "",
      tools: [],
      tool_results: [],
    };

    const stream = await builderAgent.stream(safePrompt, {
      threadId: appId,
      resourceId: appId,
      maxSteps: 100,
      maxRetries: 0,
      maxTokens: 64000,
      toolsets,
      toolCallStreaming: true,
      onError: async (err) => {
        await mcp.disconnect();
        console.error("❌ Builder agent error:", err);
      },
      onFinish: async () => {
        await mcp.disconnect();
        await writer.close();
        deleteStream(appId);
        console.log("✅ Builder stream finished");
      },
    });

    // const dataStream = stream.toDataStream();

    // dataStream.pipeTo(rootStream.writable, { preventClose: true });

    const dataStream = stream.toDataStream();
    const reader = dataStream.getReader();

    async function pump() {
      let started = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = new TextDecoder().decode(value);

        if (!started) {
          // Initial assistant shell
          await writer.write(
            encoder.encode(
              `data: ${JSON.stringify({ role: "assistant", parts: [] })}\n\n`
            )
          );
          started = true;
        }

        // Stream text chunks as `type: text` parts
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({ type: "text", content: text })}\n\n`
          )
        );
      }
      await writer.ready;
      await new Promise((res) => setTimeout(res, 30));

      await writer.write(encoder.encode(`data: [DONE]\n\n`));
      await writer.close();
      await mcp.disconnect();
      deleteStream(appId);
    }

    pump();
  } catch (err) {
    console.warn("⚠️ Falling back to Claude:", (err as Error).message);

    try {
      const claude = openRouterClaude("anthropic/claude-3-sonnet");
      const response = await claude.generateContent({
        messages: [
          {
            role: "user",
            content: promptText,
          },
        ],
      });

      let reply = response.messages?.[0]?.content;
      // console.log("🪂 Claude raw reply:", reply);

      let finalText = "";

      if (Array.isArray(reply)) {
        for (const part of reply) {
          if (part.type === "text") {
            finalText += part.text;
          }
        }
      } else if (typeof reply === "string") {
        finalText = reply;
      }

      console.log("🧠 Final Claude content:", finalText);

      // ✅ Emit assistant starter
      await writer.write(
        encoder.encode(
          `data: ${JSON.stringify({ role: "assistant", parts: [] })}\n\n`
        )
      );

      await writer.ready;

      // ✅ Stream line-by-line
      for (const line of finalText.split("\n")) {
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({ type: "text", content: line })}\n\n`
          )
        );
        await writer.ready;
        await new Promise((res) => setTimeout(res, 30)); // simulate chunking
      }

      await writer.write(encoder.encode(`data: [DONE]\n\n`));
      await writer.ready;
      await writer.close();
    } catch (fallbackError) {
      console.error("❌ Claude fallback also failed:", fallbackError);

      await writer.write(
        encoder.encode(
          `data: ${JSON.stringify({
            role: "assistant",
            parts: [{ type: "text", text: "Something went wrong." }],
          })}\n\n`
        )
      );

      await writer.write(encoder.encode(`data: [DONE]\n\n`));
      await writer.close();
    }
  }

  return new Response(stream1, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
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
