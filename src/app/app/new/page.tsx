// src/app/app/new/page.tsx
import { createApp } from "@/actions/create-app";
import { redirect } from "next/navigation";
import "@/components/loader.css";
import { getUser } from "@/auth/stack-auth";

export default async function AppNewPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  console.log("🔍 Search params in /app/new:", searchParams);

  const user = await getUser().catch(() => undefined);

  const unsentMessageRaw = searchParams?.unsentMessage;
  const baseId = searchParams?.baseId;

  const unsentMessage =
    typeof unsentMessageRaw === "string" ? unsentMessageRaw : "";

  console.log("🔍 Message from searchParams in /app/new:", unsentMessage);

  if (!user) {
    const returnTo = `/app/new?unsentMessage=${encodeURIComponent(
      unsentMessage
    )}&baseId=${baseId}`;
    redirect(`/handler/sign-in?after_auth_return_to=${encodeURIComponent(returnTo)}`);
  }

  const { id } = await createApp({
    initialMessage: decodeURIComponent(unsentMessage),
    baseId: baseId as string,
  });

  redirect(`/app/${id}?unsentMessage=${unsentMessage}`);
}
