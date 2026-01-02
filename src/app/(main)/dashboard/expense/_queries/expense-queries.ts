import { desc, eq } from "drizzle-orm";
import { getServerSession } from "next-auth";

import { getCurrentUser } from "@/lib/auth";
import { authOptions } from "@/lib/auth-nextauth";
import { db } from "@/lib/db";
import { categories, expenses } from "@/lib/schema";

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
    .select({
      id: expenses.id,
      userId: expenses.userId,
      description: expenses.description,
      amount: expenses.amount,
      date: expenses.date,
      type: expenses.type,
      notes: expenses.notes,
      isConfirmed: expenses.isConfirmed,
      categoryId: expenses.categoryId,
      financialAccountId: expenses.financialAccountId,
      paymentMethodId: expenses.paymentMethodId,
      budgetId: expenses.budgetId,
      currency: expenses.currency,
      time: expenses.time,
      location: expenses.location,
      merchant: expenses.merchant,
      tags: expenses.tags,
      isRecurring: expenses.isRecurring,
      recurrenceType: expenses.recurrenceType,
      recurrenceEndDate: expenses.recurrenceEndDate,
      parentExpenseId: expenses.parentExpenseId,
      isExcludedFromStats: expenses.isExcludedFromStats,
      createdAt: expenses.createdAt,
      updatedAt: expenses.updatedAt,
      category: {
        id: categories.id,
        name: categories.name,
        icon: categories.icon,
        color: categories.color,
      },
    })
    .from(expenses)
    .leftJoin(categories, eq(expenses.categoryId, categories.id))
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
