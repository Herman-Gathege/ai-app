"use client";

import { PromptInputBasic } from "./chatinput";
import { Markdown } from "./ui/markdown";
import { ChatContainer } from "./ui/chat-container";
import { ToolMessage } from "./tools";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Message } from "ai";

export default function Chat(props: {
  appId: string;
  initialMessages: Message[];
  isLoading?: boolean;
  topBar?: React.ReactNode;
  unsentMessage?: string;
}) {
  const assistantIdRef = useRef<string | null>(null);
  const [messages, setMessages] = useState<Message[]>(props.initialMessages);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "streaming" | "submitted">(
    "idle"
  );

  const append = (message: Message) => {
    setMessages((prev) => [...prev, message]);
  };

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const streamAssistantResponse = async (prompt: string) => {
    console.log("📥 streamAssistantResponse fired with prompt:", prompt);

    const assistantId = "claude-" + crypto.randomUUID();
    assistantIdRef.current = assistantId;
    setStatus("streaming");

    append({ id: crypto.randomUUID(), role: "user", content: prompt });

    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", parts: [] },
    ]);

    try {
      console.log("📡 Fetching /api/chat...");
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Adorable-App-Id": props.appId,
        },
        body: JSON.stringify({
          message: { role: "user", content: prompt },
          threadId: props.appId,
          resourceId: props.appId,
        }),
      });
      console.log("📡 Got response:", response.status);
      console.log("👂 Stream started from backend");


      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) {
        setStatus("idle");
        return;
      }
      if (!response.body) {
        console.error("🚫 No response body!");
      }

      let buffer = "";
      let done = false;
      let runningParts: any[] = [];

      while (!done) {
        const { value, done: readerDone } = await reader.read();

        if (value) {
          buffer += decoder.decode(value);
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";

          for (const part of parts) {
            if (!part.startsWith("data: ")) continue;

            const jsonStr = part.slice("data: ".length).trim();

            if (jsonStr === "[DONE]") {
              done = true;
              break;
            }

            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.role === "assistant" && parsed.parts) {
                runningParts = parsed.parts;
              } else if (parsed.type === "text" && parsed.content) {
                runningParts.push({ type: "text", text: parsed.content });
              } else if (typeof parsed.content === "string") {
                runningParts.push({ type: "text", text: parsed.content });
              }

              console.log("🟡 Parsed JSON:", parsed);

              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, parts: [...runningParts] } : m
                )
              );

              console.log("💬 UI runningParts:", runningParts);


            } catch (err) {
              console.warn("⚠ Failed to parse chunk:", jsonStr, err);
            }
            console.log("🟢 JSON string:", jsonStr);
          }
        }

        console.log("🔴 RAW buffer chunk:", decoder.decode(value));

        // ✅ move this inside the loop to ensure it runs only after done
        if (readerDone) {
          done = true;
          console.log("🔵 Stream reading done");
          break;
        }
      }

      // ✅ fail-safe: show fallback message if nothing was received
      if (runningParts.length === 0) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  parts: [
                    {
                      type: "text",
                      text: "⚠️ No response received. Please try again.",
                    },
                  ],
                }
              : m
          )
        );
      }

      setStatus("idle");
    } catch (err: any) {
      console.error("💥 Error during stream:", err.message, err.stack);
      setStatus("idle");
    }
  };

  const onSubmit = async (e?: Event) => {
    if (e?.preventDefault) e.preventDefault();
    if (!input.trim()) return;
    await streamAssistantResponse(input);
    setInput("");
  };

  useEffect(() => {
    const url = new URL(window.location.href);
    const unsentMessageRaw = url.searchParams.get("unsentMessage");
    url.searchParams.delete("unsentMessage");
    const unsentMessage = unsentMessageRaw
      ? decodeURIComponent(unsentMessageRaw)
      : null;

    if (unsentMessage) {
      window.history.replaceState(undefined, "", url.toString());
      streamAssistantResponse(unsentMessage);
    }
  }, []);

  return (
    <div
      className="flex flex-col h-full"
      style={{ transform: "translateZ(0)" }}
    >
      {props.topBar}
      <div
        className="flex-1 overflow-y-auto flex flex-col space-y-6 min-h-0"
        style={{ overflowAnchor: "auto" }}
      >
        <ChatContainer autoScroll>
          {messages.map((message) => (
            <MessageBody
              key={message.id + "-" + (message.parts?.length || 0)}
              message={message}
            />
          ))}
        </ChatContainer>
      </div>
      <div className="flex-shrink-0 p-3 transition-all bg-background md:backdrop-blur-sm">
        <PromptInputBasic
          input={input}
          onSubmit={onSubmit}
          onValueChange={(val) =>
            handleInputChange({
              target: { value: val },
            } as ChangeEvent<HTMLTextAreaElement>)
          }
          isGenerating={
            props.isLoading || status === "streaming" || status === "submitted"
          }
        />
      </div>
    </div>
  );
}

function MessageBody({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end py-1 mb-4">
        <div className="bg-neutral-200 dark:bg-neutral-700 rounded-xl px-4 py-1 max-w-[80%] ml-auto">
          {typeof message.content === "string"
            ? message.content
            : Array.isArray(message.parts)
            ? message.parts.map((p) => p.text).join("")
            : ""}
        </div>
      </div>
    );
  }

  if (message.role === "assistant") {
    if (Array.isArray(message.parts) && message.parts.length > 0) {
      return (
        <div className="mb-4">
          {message.parts.map((part, idx) =>
            part.type === "text" ? (
              <Markdown
                key={idx}
                className="prose prose-sm dark:prose-invert max-w-none"
              >
                {part.text}
              </Markdown>
            ) : part.type === "tool-invocation" ? (
              <ToolMessage key={idx} toolInvocation={part.toolInvocation} />
            ) : null
          )}
        </div>
      );
    }
    return <div className="mb-4 italic text-neutral-500 animate-pulse">…</div>;
  }

  return (
    <div className="p-4 bg-yellow-100 text-black rounded">
      <pre>{JSON.stringify(message, null, 2)}</pre>
    </div>
  );
}
