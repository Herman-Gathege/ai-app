// src/components/chat.tsx
"use client";

import { useChat } from "@ai-sdk/react";
import { PromptInputBasic } from "./chatinput";
import { Markdown } from "./ui/markdown";
import { ChangeEvent, useEffect } from "react";
import { ChatContainer } from "./ui/chat-container";
import { Message } from "ai";
import { ToolMessage } from "./tools";

import { toast } from "sonner";

export default function Chat(props: {
  appId: string;
  initialMessages: Message[];
  isLoading?: boolean;
  topBar?: React.ReactNode;
  unsentMessage?: string;
}) {
  // const { toast } = useToast();
  const { messages, handleSubmit, input, handleInputChange, status, append } =
    useChat({
      initialMessages: props.initialMessages,
      generateId: () => {
        if (typeof crypto?.randomUUID === "function") {
          return "cs-" + crypto.randomUUID();
        }
        return "cs-" + Math.random().toString(36).substring(2) + Date.now();
      },

      sendExtraMessageFields: true,
      headers: {
        "Adorable-App-Id": props.appId,
      },
      api: "/api/chat",

      experimental_prepareRequestBody: (request) => {
        const lastMessage = request.messages.at(-1);
        console.log("📤 Sending lastMessage:", lastMessage);
        return {
          message: {
            role: lastMessage?.role || "user",
            content: lastMessage?.content || "",
          },
          threadId: props.appId,
          resourceId: props.appId,
        };
      },

      // 🔥 This will trigger if backend returns an error (like 500 or 403)
      onError: async (error) => {
        const err = error as { response?: Response }; // 👈 assert it has `.response`

        try {
          const parsed = await err.response?.json();
          if (parsed?.code === "NO_CREDITS") {
            toast.error("⚠️ You're out of credits. Please upgrade your plan.");
          } else {
            toast.error(parsed?.error || "Something went wrong.");
          }
        } catch (err) {
          toast.error("Unexpected error. Please try again.");
          console.error("Parsing error response failed:", err);
        }
      },

      onFinish: async (assistantMessage: Message) => {
        const userMessage = messages.at(-2);

        if (!userMessage || !assistantMessage) return;

        try {
          const res = await fetch(`/api/messages/${props.appId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: [userMessage, assistantMessage],
            }),
          });

          if (!res.ok) {
            toast.error("❌ Failed to save messages");
          } else {
            toast.success("💾 Chat saved");
          }
        } catch (err) {
          console.error("❌ Error saving messages:", err);
          toast.error("Unexpected error saving chat");
        }
      },
    });

  useEffect(() => {
    const url = new URL(window.location.href);
    const unsentMessageRaw = url.searchParams.get("unsentMessage");
    url.searchParams.delete("unsentMessage");

    const unsentMessage = unsentMessageRaw
      ? decodeURIComponent(unsentMessageRaw)
      : null;

    if (unsentMessage) {
      window.history.replaceState(undefined, "", url.toString());

      console.log("📥 Appending unsent message to chat:", unsentMessage);

      append({
        content: ` user prompt: "${unsentMessage}"`,
        role: "user",
      });

      setTimeout(() => {
        append({
          content: ` Of course! Here's a short poem based on: "${unsentMessage}"`,
          role: "assistant",
        });
      }, 800); // 0.8 second delay

      console.log("🧠 Messages state updated:", messages);
    }
  });

  const onValueChange = (value: string) => {
    handleInputChange({
      target: { value },
    } as ChangeEvent<HTMLTextAreaElement>);
  };

  const onSubmit = (e?: Event) => {
    if (e?.preventDefault) {
      e.preventDefault();
    }
    handleSubmit(e);
  };

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
            <MessageBody key={message.id} message={message} />
          ))}
        </ChatContainer>
      </div>
      <div className="flex-shrink-0 p-3 transition-all bg-background md:backdrop-blur-sm">
        <PromptInputBasic
          input={input || ""}
          onSubmit={onSubmit}
          onValueChange={onValueChange}
          isGenerating={
            props.isLoading || status === "streaming" || status === "submitted"
          }
        />
      </div>
    </div>
  );
}

function MessageBody({ message }: { message: Message }) {
  if (typeof message.content === "string" && message.content.trim() !== "") {
    return (
      <div className="mb-4">
        <Markdown className="prose prose-sm dark:prose-invert max-w-none">
          {message.content}
        </Markdown>
      </div>
    );
  }

  return (
    <div>
      <p className="text-gray-500">Something went wrong</p>
    </div>
  );
}
