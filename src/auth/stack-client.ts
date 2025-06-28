'use client';

import { StackClientApp } from "@stackframe/stack";

export const stackClientApp = new StackClientApp({
  projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
  tokenStore: "nextjs-cookie", // ✅ Required
});
