// src/stack.tsx
import "server-only";

import { StackServerApp } from "@stackframe/stack";

export const stackServerApp = new StackServerApp({
  tokenStore: "nextjs-cookie",
});

// import "server-only";
// import { StackServerApp } from "@stackframe/stack";

// export const stackServerApp = new StackServerApp({
//   projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
//   clientId: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY!,
//   clientSecret: process.env.STACK_SECRET_SERVER_KEY!,
//   baseUrl: "http://72.5.42.211",
//   tokenStore: "nextjs-cookie",
// });
