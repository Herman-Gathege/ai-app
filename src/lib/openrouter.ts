// src/lib/openrouter.ts
import { OpenAI } from "openai";

// Create OpenRouter client
const openRouterClient = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || "",
  baseURL: "https://openrouter.ai/api/v1",
});

export function openRouterClaude() {
  return {
    async generateContent(prompt: any) {
      try {
        const messages = Array.isArray(prompt)
          ? prompt.map((msg: any) => ({
              role: msg.role,
              content: typeof msg.content === 'string'
                ? msg.content
                : msg.content.map((part: any) => {
                    if (part.type === 'text') return { type: 'text', text: part.text };
                    return part;
                  })
            }))
          : [{ role: "user", content: prompt }];

        const response = await openRouterClient.chat.completions.create({
          model: "anthropic/claude-3-opus-20240229", // Using Claude via OpenRouter
          messages,
          temperature: 0.7,
          max_tokens: 4096,
        });

        return {
          content: response.choices[0]?.message?.content || "",
        };
      } catch (error) {
        console.error("Error calling OpenRouter:", error);
        throw error;
      }
    },
  };
}
