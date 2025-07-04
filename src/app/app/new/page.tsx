// // src/app/app/new/page.tsx
import { createApp } from "@/actions/create-app";
import { redirect } from "next/navigation";
import "@/components/loader.css";
import { getUser } from "@/auth/stack";

export default async function AppPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] }>;
  params: Promise<{ id: string }>;
}) {
  const user = await getUser().catch(() => undefined);
  const search = await searchParams;

  if (!user) {
    redirect(
      `/handler/sign-in?after_auth_return_to=${
        encodeURIComponent("/app/new?") + new URLSearchParams(search).toString()
      }`
    );
  }

  const { id } = await createApp({
    initialMessage: decodeURIComponent(search.message),
    baseId: search.baseId as string,
  });

  redirect(`/app/${id}?unsentMessage=${search.message}`);
}
