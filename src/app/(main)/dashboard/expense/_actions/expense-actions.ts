"use server";

import { revalidatePath } from "next/cache";

import { and, eq } from "drizzle-orm";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth-nextauth";
import { db } from "@/lib/db";
import { expenses } from "@/lib/schema";

export type ExpenseFormData = {
  type: "expense" | "income";
  amount: string;
  description: string;
  category?: string;
  date: string;
  notes?: string;
  isConfirmed?: boolean;
};

export type ActionResult<T = unknown> = { success: true; data: T } | { success: false; error: string };

import { getCurrentUser } from "@/lib/auth";

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
 * Create a new expense
 */
export async function createExpense(formData: ExpenseFormData): Promise<ActionResult<typeof expenses.$inferSelect>> {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const [newExpense] = await db
      .insert(expenses)
      .values({
        userId,
        type: formData.type,
        amount: formData.amount,
        description: formData.description,
        date: formData.date,
        notes: formData.notes || null,
        isConfirmed: formData.isConfirmed ?? true,
      })
      .returning();

    revalidatePath("/dashboard/expense");
    return { success: true, data: newExpense };
  } catch (error) {
    console.error("Failed to create expense:", error);
    return { success: false, error: "Failed to create expense" };
  }
}

/**
 * Update an existing expense
 */
export async function updateExpense(
  id: number,
  formData: Partial<ExpenseFormData>,
): Promise<ActionResult<typeof expenses.$inferSelect>> {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if expense belongs to user
    const existingExpense = await db
      .select()
      .from(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
      .limit(1);

    if (existingExpense.length === 0) {
      return { success: false, error: "Expense not found" };
    }

    const updateData: Partial<typeof expenses.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (formData.type !== undefined) updateData.type = formData.type;
    if (formData.amount !== undefined) updateData.amount = formData.amount;
    if (formData.description !== undefined) updateData.description = formData.description;
    if (formData.date !== undefined) updateData.date = formData.date;
    if (formData.notes !== undefined) updateData.notes = formData.notes || null;
    if (formData.isConfirmed !== undefined) updateData.isConfirmed = formData.isConfirmed;

    const [updatedExpense] = await db
      .update(expenses)
      .set(updateData)
      .where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
      .returning();

    revalidatePath("/dashboard/expense");
    return { success: true, data: updatedExpense };
  } catch (error) {
    console.error("Failed to update expense:", error);
    return { success: false, error: "Failed to update expense" };
  }
}

/**
 * Delete an expense
 */
export async function deleteExpense(id: number): Promise<ActionResult<{ id: number }>> {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const deleted = await db
      .delete(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
      .returning({ id: expenses.id });

    if (deleted.length === 0) {
      return { success: false, error: "Expense not found" };
    }

    revalidatePath("/dashboard/expense");
    return { success: true, data: { id } };
  } catch (error) {
    console.error("Failed to delete expense:", error);
    return { success: false, error: "Failed to delete expense" };
  }
}

/**
 * Delete multiple expenses
 */
export async function deleteExpenses(ids: number[]): Promise<ActionResult<{ count: number }>> {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    let deletedCount = 0;
    for (const id of ids) {
      const result = await db
        .delete(expenses)
        .where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
        .returning({ id: expenses.id });

      if (result.length > 0) {
        deletedCount++;
      }
    }

    revalidatePath("/dashboard/expense");
    return { success: true, data: { count: deletedCount } };
  } catch (error) {
    console.error("Failed to delete expenses:", error);
    return { success: false, error: "Failed to delete expenses" };
  }
}
