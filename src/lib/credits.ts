// // src/lib/credits.ts
import { db } from "@/lib/db";
import { usersTable } from "@/db/schema";
import { eq, sql, and } from "drizzle-orm"; // ✅ added `and`
import { subDays, subMonths, isBefore } from "date-fns"; // 🗓️ for date checks

// 🚦 Main function used in /api/chat to check + deduct credit safely
export async function checkAndConsumeCredit(userId: string) {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user) {
    throw new Error("User not found");
  }

  const now = new Date();
  const lastReset = new Date(user.lastCreditReset);
  let shouldReset = false;
  let creditLimit = 0;

  switch (user.plan) {
    case "free":
      shouldReset = isBefore(lastReset, subDays(now, 1)); // daily reset
      creditLimit = 5;
      break;
    case "pro":
    case "team":
      shouldReset = isBefore(lastReset, subMonths(now, 1)); // monthly reset
      creditLimit = 100;
      break;
    default:
      throw new Error("Invalid user plan");
  }

  // ⏱️ Reset if needed
  if (shouldReset) {
    await db
      .update(usersTable)
      .set({
        creditsRemaining: creditLimit,
        lastCreditReset: now,
      })
      .where(eq(usersTable.id, userId));

    user.creditsRemaining = creditLimit; // Update local cache
  }

  if (user.creditsRemaining <= 0) {
    throw new Error("No credits remaining. Please upgrade your plan.");
  }

  // 💳 Deduct 1 credit
  await db
    .update(usersTable)
    .set({ creditsRemaining: sql`${usersTable.creditsRemaining} - 1` })
    .where(eq(usersTable.id, userId));
}

// 🧪 Optional helper: attempts safe atomic decrement if user has credits
export async function decrementUserCredits(userId: string): Promise<boolean> {
  const result = await db
    .update(usersTable)
    .set({ creditsRemaining: sql`${usersTable.creditsRemaining} - 1` })
    .where(
      and(
        eq(usersTable.id, userId),
        sql`${usersTable.creditsRemaining} > 0`
      )
    );

  return (result.rowCount ?? 0) > 0; // ✅ Type-safe check
}

