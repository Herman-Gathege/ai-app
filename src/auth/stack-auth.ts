// src/auth/stack-auth.ts
// This file handles user authentication and metadata management using StackFrame's StackServerApp.
import "server-only";

import { StackServerApp } from "@stackframe/stack";
import { freestyle } from "@/lib/freestyle";

// NEW: import db + users table
import { db } from "@/lib/db";
import { usersTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export const stackServerApp = new StackServerApp({
  tokenStore: "nextjs-cookie",
});

export async function getUser() {
  const user = await stackServerApp.getUser();

  if (!user) {
    throw new Error("User not found");
  }

  // NEW: Ensure user exists in usersTable (for credits + plan tracking)
  const [existingUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, user.id));

  if (!existingUser) {
    await db.insert(usersTable).values({
      id: user.id,
      plan: "free", // default plan
      creditsRemaining: 5,
      // createdAt and lastCreditReset will auto-default
    });
    console.log(" New user added to usersTable:", user.id);
  }

  // If user has no freestyleIdentity, generate one
  if (!user?.serverMetadata?.freestyleIdentity) {
    const gitIdentity = await freestyle.createGitIdentity();

    await user.update({
      serverMetadata: {
        freestyleIdentity: gitIdentity.id,
      },
    });
  }

  return {
    userId: user.id,
    freestyleIdentity: user.serverMetadata.freestyleIdentity,
  };
}
