// src/app/api/chat/route.ts
import { getApp } from "@/actions/get-app";
import { freestyle } from "@/lib/freestyle";
import { getAppIdFromHeaders } from "@/lib/utils";
import { CoreMessage } from "@mastra/core";
import { getUser } from "@/auth/stack-auth";
import { checkAndConsumeCredit } from "@/lib/credits";
import { setStream, getStream } from "@/lib/streams";
import { openRouterClaude } from "@/lib/openrouter";
import { streamText } from "ai";
import { EventEmitter } from "events";
import { NextResponse } from "next/server";

// ✅ Increase default event listener limit to avoid memory leak warnings
EventEmitter.defaultMaxListeners = 1000;

// ✅ Normalize message content for consistent handling
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

// ✅ POST: Handle prompt and stream Claude's response
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
    await checkAndConsumeCredit(userId);

    const claude = openRouterClaude();

    if (!claude || !claude.chat) {
      console.error("❌ Claude model is not properly initialized.");
      return new NextResponse(
        JSON.stringify({
          error: "Claude model is unavailable. Please try again later.",
          code: "MODEL_INIT_ERROR",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // const { message }: { message: CoreMessage } = await req.json();
    // const prompt = normalizeMessageContent(message.content);

    const messages = [{ role: "user", content: prompt }];
    console.log("🧪 About to call streamText with messages:", messages);

    const result = await claude.chat.doStream({
      messages: [{ role: "user", content: prompt }],
    });
    console.log("✅ Claude response received:", result);
    return NextResponse.json({
      output: result.content,
    });

    const encodedStream = new ReadableStream({
      async start(controller) {
        const reader = result.baseStream.getReader();
        const encoder = new TextEncoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          console.log("📦 Stream chunk value:", value);

          if (typeof value === "object" && value?.text) {
            controller.enqueue(encoder.encode(value.text));
          }
        }

        controller.close();
      },
    });

    await setStream(appId, result.baseStream, prompt);

    return new Response(encodedStream, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("❌ POST /api/chat failed:", error);

    if (
      error instanceof Error &&
      error.message.includes("No credits remaining")
    ) {
      return new NextResponse(
        JSON.stringify({
          error: "No credits remaining. Please upgrade your plan.",
          code: "NO_CREDITS",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new NextResponse(
      JSON.stringify({
        error: "Internal Server Error. Please try again.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// ✅ GET: Return recent stream for fallback or debugging
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
