// src/actions/create-app.ts
"use server";

import { getUser } from "@/auth/stack-auth";
import { appsTable, appUsers } from "@/db/schema";
import { db } from "@/lib/db";
import { freestyle } from "@/lib/freestyle";
import { memory } from "@/mastra/agents/builder";

export async function createApp({
  initialMessage,
  baseId,
}: {
  initialMessage?: string;
  baseId: string;
}) {
  const user = await getUser();
  if (!user) {
    throw new Error("❌ User not authenticated");
  }

  console.time("create git repo");
  const repo = await freestyle
    .createGitRepository({
      name: "Unnamed App",
      public: true,
      source: {
        url:
          {
            "nextjs-dkjfgdf":
              "https://github.com/freestyle-sh/freestyle-base-nextjs-shadcn",
            "vite-skdjfls":
              "https://github.com/freestyle-sh/freestyle-base-vite-react-typescript-swc",
            "expo-lksadfp": "https://github.com/freestyle-sh/freestyle-expo",
          }[baseId] ??
          "https://github.com/freestyle-sh/freestyle-base-nextjs-shadcn",
        type: "git",
      },
    })
    .catch((e) => {
      console.error("Error creating git repository:", JSON.stringify(e));
      console.timeEnd("create git repo");
      throw new Error("Failed to create git repository");
    });

  console.log(repo);
  await freestyle.grantGitPermission({
    identityId: user.freestyleIdentity,
    repoId: repo.repoId,
    permission: "write",
  });
  console.timeEnd("create git repo");

  // remapping baseIds because we don't have base image for expo yet
  const BASE_IDS = {
    "nextjs-dkjfgdf": "nextjs-dkjfgdf",
    "vite-skdjfls": "vite-skdjfls",
    "expo-lksadfp": "vite-skdjfls",
  };

  console.time("start dev server");
  await freestyle.requestDevServer({
    repoId: repo.repoId,
    baseId: BASE_IDS[baseId],
  });
  console.timeEnd("start dev server");

  const token = await freestyle.createGitAccessToken({
    identityId: user.freestyleIdentity,
  });

  const app = await db.transaction(async (tx) => {
    const appInsertion = await tx
      .insert(appsTable)
      .values({
        gitRepo: repo.repoId,
        name: initialMessage,
        baseId: baseId,
      })
      .returning();

    await tx
      .insert(appUsers)
      .values({
        appId: appInsertion[0].id,
        userId: user.userId,
        permissions: "admin",
        freestyleAccessToken: token.token,
        freestyleAccessTokenId: token.id,
        freestyleIdentity: user.freestyleIdentity,
      })
      .returning();

    return appInsertion[0];
  });

  await memory.createThread({
    threadId: app.id,
    resourceId: app.id,
  });

  return app;
}
