// // src/auth/stack-auth.ts
// import "server-only";
// import { StackServerApp } from "@stackframe/stack";
// import { freestyle } from "@/lib/freestyle";
// import { db } from "@/lib/db";
// import { usersTable } from "@/db/schema";
// import { eq } from "drizzle-orm";

// export const stackServerApp = new StackServerApp({
//   appId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
//   clientId: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY!,
//   clientSecret: process.env.STACK_SECRET_SERVER_KEY!,

//   // ✅ Correct: Use Stack’s actual base URL
//   baseUrl: "https://api.stackframe.dev",

//   tokenStore: "nextjs-cookie",
// });


// export async function getUser(): Promise<null | {
//   userId: string;
//   freestyleIdentity: string | null;
// }> {
//   const user = await stackServerApp.getUser();

//   if (!user) {
//     console.warn("⚠️ No user found in getUser()");
//     return null;
//   }

//   const userId = user.id;

//   try {
//     // Insert only if user doesn't already exist
//     await db
//       .insert(usersTable)
//       .values({
//         id: userId,
//         plan: "free",
//         creditsRemaining: 5,
//       })
//       .onConflictDoNothing(); // 👈 this prevents duplicate inserts

//     console.log("✅ User checked/inserted:", userId);
//   } catch (err) {
//     console.error("❌ Failed to insert user:", err);
//   }

//   // Handle missing freestyle identity
//   if (!user.serverMetadata?.freestyleIdentity) {
//     try {
//       const gitIdentity = await freestyle.createGitIdentity();

//       await user.update({
//         serverMetadata: {
//           ...user.serverMetadata,
//           freestyleIdentity: gitIdentity.id,
//         },
//       });

//       console.log("🔐 Stack user payload:", {
//         id: user.id,
//         email: user.email,
//         metadata: user.serverMetadata,
//       });

//       console.log("🎯 freestyleIdentity created for user:", userId);
//     } catch (e) {
//       console.error("❌ Failed to create freestyle identity:", e);
//     }
//   }

//   return {
//     userId,
//     freestyleIdentity: user.serverMetadata?.freestyleIdentity ?? null,
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
