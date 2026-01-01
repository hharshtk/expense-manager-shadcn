"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { eq } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { authOptions } from "@/lib/auth-nextauth";
import { db } from "@/lib/db";
import { expenses, financialAccounts, categories } from "@/lib/schema";

export type ActionResult<T = unknown> = { success: true; data: T } | { success: false; error: string };

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
 * Get all accounts for the current user
 */
export async function getUserAccounts(): Promise<ActionResult<Array<{ id: number; name: string; type: string; currency: string }>>> {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const accounts = await db
      .select({
        id: financialAccounts.id,
        name: financialAccounts.name,
        type: financialAccounts.type,
        currency: financialAccounts.currency,
      })
      .from(financialAccounts)
      .where(eq(financialAccounts.userId, userId));

    return { success: true, data: accounts };
  } catch (error) {
    console.error("Failed to fetch accounts:", error);
    return { success: false, error: "Failed to fetch accounts" };
  }
}

/**
 * Generate random test transactions
 */
export async function generateTestTransactions(params: {
  count: number;
  accountId: number;
  startDate: string;
  endDate: string;
}): Promise<ActionResult<{ created: number }>> {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Verify account belongs to user
    const [account] = await db
      .select()
      .from(financialAccounts)
      .where(eq(financialAccounts.id, params.accountId))
      .limit(1);

    if (!account || account.userId !== userId) {
      return { success: false, error: "Account not found or unauthorized" };
    }

    // Get user's categories
    const userCategories = await db
      .select({
        id: categories.id,
        type: categories.type,
      })
      .from(categories)
      .where(eq(categories.userId, userId));

    if (userCategories.length === 0) {
      return { success: false, error: "No categories found. Please create categories first." };
    }

    const expenseCategories = userCategories.filter(c => c.type === "expense");
    const incomeCategories = userCategories.filter(c => c.type === "income");

    if (expenseCategories.length === 0 && incomeCategories.length === 0) {
      return { success: false, error: "No categories available" };
    }

    // Generate random transactions
    const startTime = new Date(params.startDate).getTime();
    const endTime = new Date(params.endDate).getTime();
    
    const descriptions = [
      "Grocery shopping",
      "Gas station",
      "Restaurant",
      "Coffee shop",
      "Online purchase",
      "Utilities",
      "Subscription",
      "Entertainment",
      "Transport",
      "Healthcare",
      "Salary",
      "Freelance work",
      "Investment return",
      "Gift received",
      "Refund",
    ];

    const transactionsToCreate = [];

    for (let i = 0; i < params.count; i++) {
      // Random date between start and end
      const randomTime = startTime + Math.random() * (endTime - startTime);
      const randomDate = new Date(randomTime).toISOString().split('T')[0];

      // 70% chance of expense, 30% chance of income
      const isExpense = Math.random() < 0.7;
      const type: "expense" | "income" = isExpense ? "expense" : "income";
      
      // Get appropriate category
      const categoryPool = isExpense ? expenseCategories : incomeCategories;
      const randomCategory = categoryPool.length > 0 
        ? categoryPool[Math.floor(Math.random() * categoryPool.length)]
        : null;

      // Random amount between 5 and 500
      const amount = (Math.random() * 495 + 5).toFixed(2);

      // Random description
      const description = descriptions[Math.floor(Math.random() * descriptions.length)];

      transactionsToCreate.push({
        userId,
        type,
        amount,
        description,
        categoryId: randomCategory?.id || null,
        date: randomDate,
        notes: `Test data generated on ${new Date().toLocaleDateString()}`,
        isConfirmed: true,
        financialAccountId: params.accountId,
        currency: account.currency,
      });
    }

    // Insert all transactions
    await db.insert(expenses).values(transactionsToCreate);

    // Update account balance
    const totalChange = transactionsToCreate.reduce((sum, t) => {
      const amount = Number.parseFloat(t.amount);
      return sum + (t.type === "expense" ? -amount : amount);
    }, 0);

    await db
      .update(financialAccounts)
      .set({
        currentBalance: (Number.parseFloat(account.currentBalance || "0") + totalChange).toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(financialAccounts.id, params.accountId));

    revalidatePath("/dashboard/expense");
    revalidatePath("/dashboard/accounts");

    return { success: true, data: { created: params.count } };
  } catch (error) {
    console.error("Failed to generate test transactions:", error);
    return { success: false, error: "Failed to generate test transactions" };
  }
}
