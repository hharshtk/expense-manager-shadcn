"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { budgets, expenses, type NewBudget } from "@/lib/schema";

export type BudgetFormData = {
  name: string;
  categoryId?: number | null;
  amount: string;
  currency: string;
  period: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  startDate: string;
  endDate?: string | null;
  rollover?: boolean;
  alertThreshold?: number;
};

export async function createBudget(data: BudgetFormData) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const budgetData: NewBudget = {
    userId: user.id,
    name: data.name,
    categoryId: data.categoryId ?? null,
    amount: data.amount,
    currency: data.currency,
    period: data.period,
    startDate: data.startDate,
    endDate: data.endDate ?? null,
    rollover: data.rollover ?? false,
    alertThreshold: data.alertThreshold ?? 80,
    isActive: true,
  };

  const [newBudget] = await db.insert(budgets).values(budgetData).returning();

  revalidatePath("/dashboard/budgets");
  return newBudget;
}

export async function updateBudget(id: number, data: Partial<BudgetFormData>) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const updateData: Partial<NewBudget> = {
    ...(data.name !== undefined && { name: data.name }),
    ...(data.categoryId !== undefined && { categoryId: data.categoryId ?? null }),
    ...(data.amount !== undefined && { amount: data.amount }),
    ...(data.period !== undefined && { period: data.period }),
    ...(data.startDate !== undefined && { startDate: data.startDate }),
    ...(data.endDate !== undefined && { endDate: data.endDate ?? null }),
    ...(data.rollover !== undefined && { rollover: data.rollover }),
    ...(data.alertThreshold !== undefined && { alertThreshold: data.alertThreshold }),
    updatedAt: new Date(),
  };

  const [updated] = await db
    .update(budgets)
    .set(updateData)
    .where(and(eq(budgets.id, id), eq(budgets.userId, user.id)))
    .returning();

  revalidatePath("/dashboard/budgets");
  return updated;
}

export async function deleteBudget(id: number) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  await db.delete(budgets).where(and(eq(budgets.id, id), eq(budgets.userId, user.id)));

  revalidatePath("/dashboard/budgets");
}

export async function toggleBudgetStatus(id: number, isActive: boolean) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const [updated] = await db
    .update(budgets)
    .set({ isActive, updatedAt: new Date() })
    .where(and(eq(budgets.id, id), eq(budgets.userId, user.id)))
    .returning();

  revalidatePath("/dashboard/budgets");
  return updated;
}

export async function linkExpenseToBudget(expenseId: number, budgetId: number | null) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  // Verify expense belongs to user
  const [expense] = await db
    .select()
    .from(expenses)
    .where(and(eq(expenses.id, expenseId), eq(expenses.userId, user.id)));

  if (!expense) {
    throw new Error("Expense not found");
  }

  // If budgetId provided, verify budget belongs to user
  if (budgetId !== null) {
    const [budget] = await db
      .select()
      .from(budgets)
      .where(and(eq(budgets.id, budgetId), eq(budgets.userId, user.id)));

    if (!budget) {
      throw new Error("Budget not found");
    }
  }

  const [updated] = await db
    .update(expenses)
    .set({ budgetId, updatedAt: new Date() })
    .where(and(eq(expenses.id, expenseId), eq(expenses.userId, user.id)))
    .returning();

  revalidatePath("/dashboard/budgets");
  revalidatePath("/dashboard/expense");
  return updated;
}

export async function unlinkExpenseFromBudget(expenseId: number) {
  return linkExpenseToBudget(expenseId, null);
}
