// src/components/webview-actions.ts
"use server";

import { freestyle } from "@/lib/freestyle";

export async function requestDevServer({
  repoId,
  baseId,
}: {
  repoId: string;
  baseId: string;
}) {
  try {
    const {
      ephemeralUrl,
      devCommandRunning,
      installCommandRunning,
    } = await freestyle.requestDevServer({
      repoId,
      baseId,
    });

    return {
      ephemeralUrl,
      devCommandRunning,
      installCommandRunning,
    };
  } catch (error) {
    console.error("❌ Failed to request dev server:", error);
    throw new Error("Failed to start dev server. Please check the logs.");
  }
}
