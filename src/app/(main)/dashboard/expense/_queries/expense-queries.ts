import { desc, eq } from "drizzle-orm";
import { getServerSession } from "next-auth";

import { getCurrentUser } from "@/lib/auth";
import { authOptions } from "@/lib/auth-nextauth";
import { db } from "@/lib/db";
import { expenses } from "@/lib/schema";

async function getAuthenticatedUserId(): Promise<number | null> {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    return Number.parseInt(session.user.id, 10);
  }

  const customUser = await getCurrentUser();
  if (customUser?.id) {
    return customUser.id;
  }

  return null;
}

/**
 * Fetch all expenses for the current user
 */
export async function getExpenses() {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return [];
  }

  const userExpenses = await db
    .select()
    .from(expenses)
    .where(eq(expenses.userId, userId))
    .orderBy(desc(expenses.date), desc(expenses.createdAt));

  return userExpenses;
}

/**
 * Fetch a single expense by ID
 */
export async function getExpenseById(id: number) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return null;
  }

  const [expense] = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);

  // Ensure expense belongs to user
  if (!expense || expense.userId !== userId) {
    return null;
  }

  return expense;
}
