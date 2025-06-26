


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

// export async function getUser() {
//   const user = await stackServerApp.getUser();

//   if (!user) {
//     console.warn("⚠️ No user found in getUser()");
//     return null; // <- Instead of throwing
//   }

//   const userId = user.id;

//   // ✅ Ensure user exists in usersTable
//   const [existingUser] = await db
//     .select()
//     .from(usersTable)
//     .where(eq(usersTable.id, userId));

//   if (!existingUser) {
//     await db.insert(usersTable).values({
//       id: userId,
//       plan: "free",
//       creditsRemaining: 5,
//     });
//     console.log("🆕 New user inserted into usersTable:", userId);
//   }

//   // ✅ Only set freestyleIdentity if missing
//   if (!user.serverMetadata?.freestyleIdentity) {
//     const gitIdentity = await freestyle.createGitIdentity();

//     await user.update({
//       serverMetadata: {
//         ...user.serverMetadata, // preserve any other existing metadata
//         freestyleIdentity: gitIdentity.id,
//       },
//     });

//     console.log("🎯 freestyleIdentity created for user:", userId);
//   }

//   return {
//     userId,
//     freestyleIdentity: user.serverMetadata?.freestyleIdentity ?? null,
//   };
// }

export async function getUser(): Promise<null | {
  userId: string;
  freestyleIdentity: string | null;
}> {
  const user = await stackServerApp.getUser();

  if (!user) {
    console.warn("⚠️ No user found in getUser()");
    return null;
  }

  const userId = user.id;

  try {
    // Insert only if user doesn't already exist
    await db
      .insert(usersTable)
      .values({
        id: userId,
        plan: "free",
        creditsRemaining: 5,
      })
      .onConflictDoNothing(); // 👈 this prevents duplicate inserts

    console.log("✅ User checked/inserted:", userId);
  } catch (err) {
    console.error("❌ Failed to insert user:", err);
  }

  // Handle missing freestyle identity
  if (!user.serverMetadata?.freestyleIdentity) {
    try {
      const gitIdentity = await freestyle.createGitIdentity();

      await user.update({
        serverMetadata: {
          ...user.serverMetadata,
          freestyleIdentity: gitIdentity.id,
        },
      });

      console.log("🎯 freestyleIdentity created for user:", userId);
    } catch (e) {
      console.error("❌ Failed to create freestyle identity:", e);
    }
  }

  return {
    userId,
    freestyleIdentity: user.serverMetadata?.freestyleIdentity ?? null,
  };
}

