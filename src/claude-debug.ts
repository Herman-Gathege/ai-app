// claude-debug.ts
const fetch = require("node-fetch");

const API_KEY = process.env.OPENROUTER_API_KEY;

if (!API_KEY) {
  console.error("❌ OPENROUTER_API_KEY is undefined.");
  process.exit(1);
}

async function testClaude() {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "anthropic/claude-3-opus-20240229",
      messages: [
        { role: "user", content: "Say hello Claude." }
      ],
    }),
  });

  const json = await res.json();
  console.log("🧠 Claude response:", JSON.stringify(json, null, 2));
}

testClaude();
