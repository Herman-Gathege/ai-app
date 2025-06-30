import { SYSTEM_MESSAGE } from "@/lib/system";
import { ANTHROPIC_MODEL } from "@/lib/model";
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { PostgresStore, PgVector } from "@mastra/pg";
import { tool } from "ai";
import { z } from "zod";

export const memory = new Memory({
  options: {
    lastMessages: 10,
    semanticRecall: false,
    threads: {
      generateTitle: true,
    },
  },
  vector: new PgVector({
    connectionString: process.env.DATABASE_URL!,
  }),
  storage: new PostgresStore({
    connectionString: process.env.DATABASE_URL!,
  }),
});

let model;

try {
  model = ANTHROPIC_MODEL;
  if (!model) throw new Error("ANTHROPIC_MODEL is null");
  console.log("🧠 Claude model initialized successfully");
} catch (err) {
  console.warn("⚠️ Claude model could not be initialized:", err);
  model = undefined;
}

export const builderAgent = model
  ? new Agent({
      name: "BuilderAgent",
      model,
      instructions: SYSTEM_MESSAGE,
      memory,
      tools: {
        update_todo_list: tool({
          description: "Track tasks. Use this tool to update your todo list.",
          parameters: z.object({
            items: z.array(
              z.object({
                description: z.string(),
                completed: z.boolean(),
              })
            ),
          }),
          execute: async () => ({}),
        }),
      },
    })
  : undefined;
