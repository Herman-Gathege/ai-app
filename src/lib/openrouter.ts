import { customProvider, wrapLanguageModel } from "ai";

export const openRouterClaude = () => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const modelId = "anthropic/claude-3-opus";
  const providerId = "openrouter";

  if (!apiKey) {
    console.error("❌ Missing OPENROUTER_API_KEY");
    return null;
  }

  const provider = customProvider({
    id: providerId,
    models: [
      {
        id: modelId,
        type: "chat",
        handleChat: async ({ messages }) => {
          if (!Array.isArray(messages) || messages.length === 0) {
            console.error("❌ Missing or invalid messages array in handleChat");
            throw new Error("Missing or invalid messages array");
          }

          console.log(
            "📨 Sending messages to OpenRouter (handleChat):",
            messages
          );

          const res = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: modelId,
                messages,
                temperature: 0.7,
              }),
            }
          );

          const json = await res.json();

          if (!res.ok) {
            console.error("❌ OpenRouter API Error (handleChat):", json);
            throw new Error(
              json?.error?.message || "Unknown OpenRouter API error"
            );
          }

          return {
            type: "text",
            content: json?.choices?.[0]?.message?.content ?? "No content",
          };
        },
      },
    ],
  });

  const wrapped = wrapLanguageModel({
    modelId,
    providerId,
    middleware: [],
    model: {
      invoke: async ({ messages }) => {
        if (!Array.isArray(messages) || messages.length === 0) {
          console.error(
            "❌ Missing or invalid messages array in invoke:",
            messages
          );
          throw new Error("Missing or invalid messages array");
        }

        console.log("📨 Sending messages to OpenRouter (invoke):", messages);

        const res = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: modelId,
              messages,
              temperature: 0.7,
            }),
          }
        );

        const json = await res.json();

        if (!res.ok) {
          console.error("❌ OpenRouter API Error (invoke):", json);
          throw new Error(json?.error?.message || "Unknown error");
        }

        return {
          type: "text",
          content: json?.choices?.[0]?.message?.content ?? "No content",
        };
      },
    },
  });

  if (!wrapped) {
    console.error(`🛑 wrapLanguageModel returned undefined for ${modelId}`);
    return null;
  }

  console.log(`✅ wrapLanguageModel success for ${modelId}`);
  console.log(`🧠 Claude model initialized successfully`);

  return {
    chat: {
      doStream: async (params) => {
        console.log("📨 doStream received:", params); // Log full input for debugging

        // Destructure both
        const { messages, prompt } = params;

        // Fallback: try prompt if messages is missing or empty
        const safeMessages =
          Array.isArray(messages) && messages.length > 0
            ? messages
            : Array.isArray(prompt) && prompt.length > 0
            ? prompt
            : [];

        if (!Array.isArray(safeMessages) || safeMessages.length === 0) {
          console.error(
            "❌ Missing or invalid messages array in invoke:",
            safeMessages
          );
          throw new Error("Missing or invalid messages array");
        }

        console.log("✅ Valid messages to send:", safeMessages);

        return await wrapped.invoke({ messages: safeMessages });
      },
    },
  };
};
