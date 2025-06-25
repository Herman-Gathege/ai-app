// //app/api/chat/route.ts

// import { getApp } from "@/actions/get-app";
// import { freestyle } from "@/lib/freestyle";
// import { getAppIdFromHeaders } from "@/lib/utils";
// import { MCPClient } from "@mastra/mcp";
// import { builderAgent } from "@/mastra/agents/builder";
// import { deleteStream, getStream, setStream } from "@/lib/streams";
// import { CoreMessage } from "@mastra/core";
// import { decrementUserCredits } from "@/lib/credits"; // ✅ Add this line

// import { getUser } from "@/auth/stack-auth";
// import { openRouterClaude } from "@/lib/openrouter";

// // "fix" mastra mcp bug
// import { EventEmitter } from "events";

// EventEmitter.defaultMaxListeners = 1000;

// export async function POST(req: Request) {
//   const appId = getAppIdFromHeaders(req);

//   if (!appId) {
//     return new Response("Missing App Id header", { status: 400 });
//   }

//   const app = await getApp(appId);
//   if (!app) {
//     return new Response("App not found", { status: 404 });
//   }

//   const existingStream = await getStream(appId);
//   if (existingStream) {
//     const [stream1, stream2] = streams[appId].readable.tee();
//     streams[appId] = { readable: stream2, prompt: streams[appId].prompt };
//     return new Response(stream1, {
//       headers: {
//         "Content-Type": "text/event-stream",
//         "Cache-Control": "no-cache",
//         Connection: "keep-alive",
//       },
//     });
//   }

//   const { mcpEphemeralUrl, ephemeralUrl } = await freestyle.requestDevServer({
//     repoId: app.info.gitRepo,
//     baseId: app.info.baseId,
//   });

//   const { message }: { message: CoreMessage } = await req.json();

//   const mcp = new MCPClient({
//     id: crypto.randomUUID(),
//     servers: {
//       dev_server: {
//         url: new URL(mcpEphemeralUrl),
//       },
//     },
//   });

//   const toolsets = await mcp.getToolsets();

//   const rootStream = new TransformStream();

//   let fixCount = 0;

//   async function runAgent(prompt: any) {
//     // NEW: get userId
//     const { userId } = await getUser();

//     // NEW: normalize prompt to string
//     let finalPrompt: string = "";

//     if (typeof prompt === "string") {
//       finalPrompt = prompt;
//     } else if (Array.isArray(prompt)) {
//       finalPrompt = prompt
//         .map((p: any) => {
//           if (p.type === "text") return p.text;
//           if (p.content) return p.content;
//           return "";
//         })
//         .join("\n");
//     } else {
//       finalPrompt = "";
//     }

//     // try {
//     //   // NEW: call OpenRouter Claude
//     //   // added console.logs for debugging
//     //   console.log("Calling Claude with prompt:", finalPrompt);

//     //   const result = await openRouterClaude().generateContent(finalPrompt, userId);

//     //   console.log("Claude responded:", result);

//     //   // stream result into the rootStream, so your existing logic works the same
//     //   const writer = rootStream.writable.getWriter();

//     //   writer.write(new TextEncoder().encode(result.content));
//     //   writer.close();

//     //   console.log("Stream ended");

//     // } catch (error: any) {
//     //   console.error(" Error in Claude or credit logic:", error);

//     //   const writer = rootStream.writable.getWriter();

//     //   const message = error?.message?.includes("No credits")
//     //     ? " You're out of credits. Please upgrade your plan."
//     //     : " Something went wrong. Please try again.";

//     //   writer.write(new TextEncoder().encode(message));
//     //   writer.close();
//     // }

//     try {
//       console.log("Calling Claude with prompt:", finalPrompt);

//       const result = await openRouterClaude().generateContent(
//         finalPrompt,
//         userId
//       );

//       console.log("Claude responded:", result);

//       const writer = rootStream.writable.getWriter();
//       writer.write(new TextEncoder().encode(result.content));
//       writer.close();

//       // ✅ DEDUCT CREDIT HERE
//       const didDeduct = await decrementUserCredits(userId);
//       if (!didDeduct) {
//         console.warn(
//           "⚠️ Credit deduction failed — user may be out of credits."
//         );
//       } else {
//         console.log("✅ 1 credit deducted for user:", userId);
//       }

//       console.log("Stream ended");
//     } catch (error: any) {
//       console.error(" Error in Claude or credit logic:", error);

//       const writer = rootStream.writable.getWriter();

//       const message = error?.message?.includes("No credits")
//         ? "You're out of credits. Please upgrade your plan."
//         : "Something went wrong. Please try again.";

//       writer.write(new TextEncoder().encode(message));
//       writer.close();
//     }

//     console.log("User ID:", userId);
//     console.log("Prompt content:", finalPrompt);
//   }

//   runAgent(message.content);

//   const [stream1, stream2] = rootStream.readable.tee();
//   await setStream(appId, stream2, message.content);

//   console.log("Saving stream for app:", appId, "with prompt:", message.content);

//   return new Response(stream1, {
//     headers: {
//       "Content-Type": "text/event-stream",
//       "Cache-Control": "no-cache",
//       Connection: "keep-alive",
//     },
//   });
// }

// export async function GET(req: Request) {
//   const appId = getAppIdFromHeaders(req);
//   if (!appId) {
//     return new Response("Missing App Id header", { status: 400 });
//   }

//   return new Response(
//     JSON.stringify({
//       stream: streams[appId] && {
//         prompt: streams[appId].prompt,
//       },
//     })
//   );
// }

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
  const rootStream = new TransformStream();

  // 🧠 Handles prompt sending and streaming Claude response
  async function runAgent(finalPrompt: string) {
    const { userId } = await getUser();

    try {
      console.log("Calling Claude with prompt:", finalPrompt);

      const result = await openRouterClaude().generateContent(finalPrompt, userId);

      console.log("Claude responded:", result);

      const writer = rootStream.writable.getWriter();
      writer.write(new TextEncoder().encode(result.content));
      writer.close();

      // ✅ Deduct credit after successful response
      const didDeduct = await decrementUserCredits(userId);
      if (!didDeduct) {
        console.warn("⚠️ Credit deduction failed — user may be out of credits.");
      } else {
        console.log("✅ 1 credit deducted for user:", userId);
      }

      console.log("Stream ended");
    } catch (error: any) {
      console.error(" Error in Claude or credit logic:", error);

      const writer = rootStream.writable.getWriter();
      const message = error?.message?.includes("No credits")
        ? "You're out of credits. Please upgrade your plan."
        : "Something went wrong. Please try again.";

      writer.write(new TextEncoder().encode(message));
      writer.close();
    }

    console.log("User ID:", userId);
    console.log("Prompt content:", finalPrompt);
  }

  // ✅ Safely normalize content before running agent
  const prompt = normalizeMessageContent(message.content);

  // 🚫 Check for empty prompts and block them early
  if (!prompt || prompt.trim() === "") {
    return new Response("Prompt cannot be empty", { status: 400 });
  }

  runAgent(prompt);

  const [stream1, stream2] = rootStream.readable.tee();
  await setStream(appId, stream2, prompt); // updated here too

  console.log("Saving stream for app:", appId, "with prompt:", prompt);

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
