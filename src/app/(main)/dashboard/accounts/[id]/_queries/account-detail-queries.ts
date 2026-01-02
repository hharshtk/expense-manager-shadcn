import { db } from "@/lib/db";
import { expenses, categories } from "@/lib/schema";
import { eq, and, sql, desc, gte, lte } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { format } from "date-fns";

export async function getAccountTransactions(accountId: number, from: Date, to: Date) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return [];
    }

    const fromStr = format(from, "yyyy-MM-dd");
    const toStr = format(to, "yyyy-MM-dd");

    // Create aliases for parent category
    const parentCategory = {
      id: categories.id,
      name: categories.name,
      icon: categories.icon,
    };

    const result = await db
      .select({
        id: expenses.id,
        amount: expenses.amount,
        type: expenses.type,
        description: expenses.description,
        categoryId: expenses.categoryId,
        categoryName: categories.name,
        categoryIcon: categories.icon,
        parentCategoryId: categories.parentId,
        notes: expenses.notes,
        date: expenses.date,
        createdAt: expenses.createdAt,
      })
      .from(expenses)
      .leftJoin(categories, eq(expenses.categoryId, categories.id))
      .where(
        and(
          eq(expenses.userId, user.id),
          eq(expenses.financialAccountId, accountId),
          gte(expenses.date, fromStr),
          lte(expenses.date, toStr)
        )
      )
      .orderBy(desc(expenses.date))
      .limit(100);

    return result;
  } catch (error) {
    console.error("Error fetching account transactions:", error);
    return [];
  }
}

export async function getAccountStatistics(accountId: number, from: Date, to: Date) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        totalIncome: "0",
        totalExpense: "0",
        netChange: "0",
        transactionCount: 0,
      };
    }

    const fromStr = format(from, "yyyy-MM-dd");
    const toStr = format(to, "yyyy-MM-dd");

    const result = await db
      .select({
        totalIncome: sql<string>`COALESCE(SUM(CASE WHEN ${expenses.type} = 'income' THEN ${expenses.amount} ELSE 0 END), 0)`,
        totalExpense: sql<string>`COALESCE(SUM(CASE WHEN ${expenses.type} = 'expense' THEN ${expenses.amount} ELSE 0 END), 0)`,
        transactionCount: sql<number>`COUNT(*)`,
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.userId, user.id),
          eq(expenses.financialAccountId, accountId),
          gte(expenses.date, fromStr),
          lte(expenses.date, toStr)
        )
      );

    const stats = result[0];
    const totalIncome = Number.parseFloat(stats?.totalIncome || "0");
    const totalExpense = Number.parseFloat(stats?.totalExpense || "0");
    const netChange = totalIncome - totalExpense;

    return {
      totalIncome: stats?.totalIncome || "0",
      totalExpense: stats?.totalExpense || "0",
      netChange: netChange.toString(),
      transactionCount: stats?.transactionCount || 0,
    };
  } catch (error) {
    console.error("Error fetching account statistics:", error);
    return {
      totalIncome: "0",
      totalExpense: "0",
      netChange: "0",
      transactionCount: 0,
    };
  }
}
