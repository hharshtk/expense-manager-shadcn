"use server";

import { desc, eq, sql } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { financialAccounts } from "@/lib/schema";

/**
 * Get all financial accounts for a user
 */
export async function getAccountsForUser() {
    const user = await getCurrentUser();
    if (!user) {
        throw new Error("Unauthorized");
    }

    const accounts = await db
        .select()
        .from(financialAccounts)
        .where(eq(financialAccounts.userId, user.id))
        .orderBy(desc(financialAccounts.createdAt));

    return accounts;
}

/**
 * Get account summary (total balance, account count, etc.)
 */
export async function getAccountSummary() {
    const user = await getCurrentUser();
    if (!user) {
        throw new Error("Unauthorized");
    }

    const summary = await db
        .select({
            totalBalance: sql<string>`COALESCE(SUM(CASE WHEN ${financialAccounts.includeInTotal} = true THEN CAST(${financialAccounts.currentBalance} AS DECIMAL) ELSE 0 END), 0)`,
            accountCount: sql<number>`COUNT(*)`,
            activeAccountCount: sql<number>`SUM(CASE WHEN ${financialAccounts.isActive} = true THEN 1 ELSE 0 END)`,
        })
        .from(financialAccounts)
        .where(eq(financialAccounts.userId, user.id));

    return summary[0] || { totalBalance: "0", accountCount: 0, activeAccountCount: 0 };
}

/**
 * Get a single account by ID
 */
export async function getAccountById(accountId: number) {
    const user = await getCurrentUser();
    if (!user) {
        throw new Error("Unauthorized");
    }

    const account = await db
        .select()
        .from(financialAccounts)
        .where(eq(financialAccounts.id, accountId))
        .limit(1);

    if (account.length === 0 || account[0].userId !== user.id) {
        throw new Error("Account not found");
    }

    return account[0];
}
