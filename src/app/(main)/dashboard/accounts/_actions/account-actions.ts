"use server";

import { revalidatePath } from "next/cache";

import { and, eq } from "drizzle-orm";
import { getServerSession } from "next-auth";

import { getCurrentUser } from "@/lib/auth";
import { authOptions } from "@/lib/auth-nextauth";
import { db } from "@/lib/db";
import { financialAccounts } from "@/lib/schema";

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

export type AccountFormData = {
    name: string;
    type: "cash" | "bank" | "credit_card" | "debit_card" | "digital_wallet" | "investment" | "loan" | "other";
    currency?: string;
    initialBalance?: string;
    creditLimit?: string;
    color?: string;
    icon?: string;
    notes?: string;
    includeInTotal?: boolean;
};

/**
 * Ensure default Cash account exists for user
 * Creates one if it doesn't exist
 */
async function ensureDefaultAccount(userId: number): Promise<void> {
    const existingDefault = await db
        .select()
        .from(financialAccounts)
        .where(and(eq(financialAccounts.userId, userId), eq(financialAccounts.isDefault, true)))
        .limit(1);

    if (existingDefault.length === 0) {
        await db.insert(financialAccounts).values({
            userId,
            name: "Cash",
            type: "cash",
            currency: "USD",
            initialBalance: "0",
            currentBalance: "0",
            color: "#22c55e",
            icon: "wallet",
            isActive: true,
            includeInTotal: true,
            isDefault: true,
        });
        console.log("[Accounts] Created default Cash account for user:", userId);
    }
}

/**
 * Get all accounts for the current user
 */
export async function getAccounts(): Promise<ActionResult<typeof financialAccounts.$inferSelect[]>> {
    try {
        const userId = await getAuthenticatedUserId();
        if (!userId) {
            return { success: false, error: "Unauthorized" };
        }

        // Ensure default account exists for existing users
        await ensureDefaultAccount(userId);

        const accounts = await db
            .select()
            .from(financialAccounts)
            .where(and(eq(financialAccounts.userId, userId), eq(financialAccounts.isActive, true)))
            .orderBy(financialAccounts.createdAt);

        return { success: true, data: accounts };
    } catch (error) {
        console.error("Failed to fetch accounts:", error);
        return { success: false, error: "Failed to fetch accounts" };
    }
}

/**
 * Get a specific account by ID
 */
export async function getAccountById(id: number): Promise<ActionResult<typeof financialAccounts.$inferSelect>> {
    try {
        const userId = await getAuthenticatedUserId();
        if (!userId) {
            return { success: false, error: "Unauthorized" };
        }

        const account = await db
            .select()
            .from(financialAccounts)
            .where(and(eq(financialAccounts.id, id), eq(financialAccounts.userId, userId), eq(financialAccounts.isActive, true)))
            .limit(1);

        if (account.length === 0) {
            return { success: false, error: "Account not found" };
        }

        return { success: true, data: account[0] };
    } catch (error) {
        console.error("Failed to fetch account:", error);
        return { success: false, error: "Failed to fetch account" };
    }
}

/**
 * Create a new financial account
 */
export async function createAccount(
    formData: AccountFormData,
): Promise<ActionResult<typeof financialAccounts.$inferSelect>> {
    try {
        const userId = await getAuthenticatedUserId();
        if (!userId) {
            return { success: false, error: "Unauthorized" };
        }

        const initialBalance = formData.initialBalance || "0";

        const [newAccount] = await db
            .insert(financialAccounts)
            .values({
                userId,
                name: formData.name,
                type: formData.type,
                currency: formData.currency || "USD",
                initialBalance,
                currentBalance: initialBalance,
                creditLimit: formData.creditLimit || null,
                color: formData.color || null,
                icon: formData.icon || null,
                notes: formData.notes || null,
                includeInTotal: formData.includeInTotal ?? true,
                isActive: true,
            })
            .returning();

        revalidatePath("/dashboard/accounts");
        revalidatePath("/dashboard/expense");
        return { success: true, data: newAccount };
    } catch (error) {
        console.error("Failed to create account:", error);
        return { success: false, error: "Failed to create account" };
    }
}

/**
 * Update an existing account
 */
export async function updateAccount(
    id: number,
    formData: Partial<AccountFormData>,
): Promise<ActionResult<typeof financialAccounts.$inferSelect>> {
    try {
        const userId = await getAuthenticatedUserId();
        if (!userId) {
            return { success: false, error: "Unauthorized" };
        }

        // Verify account belongs to user
        const existingAccount = await db
            .select()
            .from(financialAccounts)
            .where(and(eq(financialAccounts.id, id), eq(financialAccounts.userId, userId)))
            .limit(1);

        if (existingAccount.length === 0) {
            return { success: false, error: "Account not found" };
        }

        const updateData: Partial<typeof financialAccounts.$inferInsert> = {
            updatedAt: new Date(),
        };

        if (formData.name !== undefined) updateData.name = formData.name;
        if (formData.type !== undefined) updateData.type = formData.type;
        if (formData.currency !== undefined) updateData.currency = formData.currency;
        if (formData.creditLimit !== undefined) updateData.creditLimit = formData.creditLimit || null;
        if (formData.color !== undefined) updateData.color = formData.color || null;
        if (formData.icon !== undefined) updateData.icon = formData.icon || null;
        if (formData.notes !== undefined) updateData.notes = formData.notes || null;
        if (formData.includeInTotal !== undefined) updateData.includeInTotal = formData.includeInTotal;

        const [updatedAccount] = await db
            .update(financialAccounts)
            .set(updateData)
            .where(and(eq(financialAccounts.id, id), eq(financialAccounts.userId, userId)))
            .returning();

        revalidatePath("/dashboard/accounts");
        revalidatePath("/dashboard/expense");
        return { success: true, data: updatedAccount };
    } catch (error) {
        console.error("Failed to update account:", error);
        return { success: false, error: "Failed to update account" };
    }
}

/**
 * Delete an account (soft delete)
 */
export async function deleteAccount(id: number): Promise<ActionResult<{ id: number }>> {
    try {
        const userId = await getAuthenticatedUserId();
        if (!userId) {
            return { success: false, error: "Unauthorized" };
        }

        // Check if account is a default account
        const account = await db
            .select()
            .from(financialAccounts)
            .where(and(eq(financialAccounts.id, id), eq(financialAccounts.userId, userId)))
            .limit(1);

        if (account.length === 0) {
            return { success: false, error: "Account not found" };
        }

        if (account[0].isDefault) {
            return { success: false, error: "Cannot delete the default Cash account" };
        }

        // Soft delete by setting isActive to false
        const deleted = await db
            .update(financialAccounts)
            .set({ isActive: false, updatedAt: new Date() })
            .where(and(eq(financialAccounts.id, id), eq(financialAccounts.userId, userId)))
            .returning({ id: financialAccounts.id });

        revalidatePath("/dashboard/accounts");
        revalidatePath("/dashboard/expense");
        return { success: true, data: { id } };
    } catch (error) {
        console.error("Failed to delete account:", error);
        return { success: false, error: "Failed to delete account" };
    }
}

/**
 * Adjust account balance (add or withdraw money)
 */
export async function adjustAccountBalance(
    id: number,
    amount: string,
    type: "add" | "withdraw",
    description?: string,
): Promise<ActionResult<typeof financialAccounts.$inferSelect>> {
    try {
        const userId = await getAuthenticatedUserId();
        if (!userId) {
            return { success: false, error: "Unauthorized" };
        }

        // Get current account
        const existingAccount = await db
            .select()
            .from(financialAccounts)
            .where(and(eq(financialAccounts.id, id), eq(financialAccounts.userId, userId)))
            .limit(1);

        if (existingAccount.length === 0) {
            return { success: false, error: "Account not found" };
        }

        const currentBalance = Number.parseFloat(existingAccount[0].currentBalance || "0");
        const adjustmentAmount = Number.parseFloat(amount);

        if (Number.isNaN(adjustmentAmount) || adjustmentAmount <= 0) {
            return { success: false, error: "Invalid amount" };
        }

        const newBalance = type === "add" ? currentBalance + adjustmentAmount : currentBalance - adjustmentAmount;

        const [updatedAccount] = await db
            .update(financialAccounts)
            .set({
                currentBalance: newBalance.toFixed(2),
                updatedAt: new Date(),
            })
            .where(and(eq(financialAccounts.id, id), eq(financialAccounts.userId, userId)))
            .returning();

        revalidatePath("/dashboard/accounts");
        return { success: true, data: updatedAccount };
    } catch (error) {
        console.error("Failed to adjust account balance:", error);
        return { success: false, error: "Failed to adjust account balance" };
    }
}
