// // src/mastra/agents/builder.ts
import { SYSTEM_MESSAGE } from "@/lib/system";
import { openRouterClaude } from "@/lib/openrouter";
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
    // workingMemory: {
    //   enabled: true,
    //   use: "tool-call",
    // },
  },
  vector: new PgVector({
    connectionString: process.env.DATABASE_URL!,
  }),
  storage: new PostgresStore({
    connectionString: process.env.DATABASE_URL!,
  }),
  processors: [
    // new ToolCallFilter({
    //   exclude: ["read_file", "read_multiple_files"],
    // }),
    // new TokenLimiter(100_000),
  ],
});

export const builderAgent = new Agent({
  name: "BuilderAgent",
  model: openRouterClaude("anthropic/claude-3-opus-20240229"),
  instructions: SYSTEM_MESSAGE,
  memory,
  tools: {
    update_todo_list: tool({
      description:
        "Use the update todo list tool to keep track of the tasks you need to do to accomplish the user's request. You should should update the todo list each time you complete an item. You can remove tasks from the todo list, but only if they are no longer relevant or you've finished the user's request completely and they are asking for something else. Make sure to update the todo list each time the user asks you do something new. If they're asking for something new, you should probably just clear the whole todo list and start over with new items. For complex logic, use multiple todos to ensure you get it all right rather than just a single todo for implementing all logic.",
      parameters: z.object({
        items: z.array(
          z.object({
            description: z.string(),
            completed: z.boolean(),
          })
        ),
      }),
      execute: async () => {
        return {};
      },
    }),
  },
});
