// src/app/app/[id]/page.tsx
"use server";

import { getApp } from "@/actions/get-app";
import AppWrapper from "../../../components/app-wrapper";
import { unstable_ViewTransition as ViewTransition } from "react";
import { freestyle } from "@/lib/freestyle";
import { db } from "@/lib/db";
import { appUsers, messagesTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUser } from "@/auth/stack-auth";
import { memory } from "@/mastra/agents/builder";
import { redirect, RedirectType } from "next/navigation";
import { getStream } from "@/lib/streams";

export default async function AppPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  console.log("🔍 App page params:", params);

  const id = params?.id ?? "";

  // 🧠 Extract unsentMessage safely
  const unsentMessageRaw = searchParams?.unsentMessage;
  const unsentMessage =
    typeof unsentMessageRaw === "string"
      ? unsentMessageRaw
      : Array.isArray(unsentMessageRaw)
      ? unsentMessageRaw[0]
      : undefined;

  console.log("🔍 Unsent message on page load:", unsentMessage);

  // 🧠 If no message but a stream exists, use that as fallback
  const stream = await getStream(id);
  if ((!unsentMessage || unsentMessage === "undefined") && stream) {
    return redirect(
      `/app/${id}?unsentMessage=${encodeURIComponent(stream.prompt)}`,
      RedirectType.replace
    );
  }

  const user = await getUser();

  const userPermission = (
    await db
      .select()
      .from(appUsers)
      .where(eq(appUsers.userId, user.userId))
      .limit(1)
  ).at(0);

  if (!userPermission?.permissions) {
    return (
      <div>
        Project not found or you don&apos;t have permission to access it.
      </div>
    );
  }

  const app = await getApp(id);

  const messages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.appId, id));

  const uiMessages = messages.map((msg) => msg.message);

  console.log("🧠 memory query returned:", uiMessages);

  const { codeServerUrl } = await freestyle.requestDevServer({
    repoId: app?.info.gitRepo,
    baseId: app?.info.baseId,
  });

  console.log("requested dev server");

  const domain = app.info.previewDomain;

  return (
    <ViewTransition>
      <AppWrapper
        baseId={app.info.baseId}
        codeServerUrl={codeServerUrl}
        appName={app.info.name}
        initialMessages={uiMessages}
        repo={app.info.gitRepo}
        appId={app.info.id}
        repoId={app.info.gitRepo}
        domain={domain ?? undefined}
      />
    </ViewTransition>
  );
}
