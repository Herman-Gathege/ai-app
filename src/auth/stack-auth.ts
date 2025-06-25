// // src/auth/stack-auth.ts
// // This file handles user authentication and metadata management using StackFrame's StackServerApp.
// import "server-only";

// import { StackServerApp } from "@stackframe/stack";
// import { freestyle } from "@/lib/freestyle";

// // NEW: import db + users table
// import { db } from "@/lib/db";
// import { usersTable } from "@/db/schema";
// import { eq } from "drizzle-orm";


// export const stackServerApp = new StackServerApp({
//   tokenStore: "nextjs-cookie",
// });

// export async function getUser() {
//   const user = await stackServerApp.getUser();

//   if (!user) {
//     throw new Error("User not found");
//   }

//   // NEW: Ensure user exists in usersTable (for credits + plan tracking)
//   const [existingUser] = await db
//     .select()
//     .from(usersTable)
//     .where(eq(usersTable.id, user.id));

//   if (!existingUser) {
//     await db.insert(usersTable).values({
//       id: user.id,
//       plan: "free", // default plan
//       creditsRemaining: 5,
//       // createdAt and lastCreditReset will auto-default
//     });
//     console.log(" New user added to usersTable:", user.id);
//   }

//   // If user has no freestyleIdentity, generate one
//   if (!user?.serverMetadata?.freestyleIdentity) {
//     const gitIdentity = await freestyle.createGitIdentity();

//     await user.update({
//       serverMetadata: {
//         freestyleIdentity: gitIdentity.id,
//       },
//     });
//   }

//   return {
//     userId: user.id,
//     freestyleIdentity: user.serverMetadata.freestyleIdentity,
//   };
// }


// src/auth/stack-auth.ts
import "server-only";
import { StackServerApp } from "@stackframe/stack";
import { freestyle } from "@/lib/freestyle";
import { db } from "@/lib/db";
import { usersTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export const stackServerApp = new StackServerApp({
  tokenStore: "nextjs-cookie",
});

export async function getUser() {
  const user = await stackServerApp.getUser();

  if (!user) {
    console.warn("⚠️ No user found in getUser()");
    return null; // <- Instead of throwing
  }

  const userId = user.id;

  // ✅ Ensure user exists in usersTable
  const [existingUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!existingUser) {
    await db.insert(usersTable).values({
      id: userId,
      plan: "free",
      creditsRemaining: 5,
    });
    console.log("🆕 New user inserted into usersTable:", userId);
  }

  // ✅ Only set freestyleIdentity if missing
  if (!user.serverMetadata?.freestyleIdentity) {
    const gitIdentity = await freestyle.createGitIdentity();

    await user.update({
      serverMetadata: {
        ...user.serverMetadata, // preserve any other existing metadata
        freestyleIdentity: gitIdentity.id,
      },
    });

    console.log("🎯 freestyleIdentity created for user:", userId);
  }

  return {
    userId,
    freestyleIdentity: user.serverMetadata?.freestyleIdentity ?? null,
  };
}
