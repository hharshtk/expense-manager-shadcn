import { db } from "@/lib/db";
import { expenses, financialAccounts, budgets, categories } from "@/lib/schema";
import { and, eq, gte, lte, desc, sql, sum } from "drizzle-orm";
import { format } from "date-fns";

export async function getOverviewSummary(userId: number, from: Date, to: Date) {
  const fromStr = format(from, "yyyy-MM-dd");
  const toStr = format(to, "yyyy-MM-dd");

  const result = await db
    .select({
      type: expenses.type,
      total: sum(expenses.amount),
    })
    .from(expenses)
    .where(
      and(
        eq(expenses.userId, userId),
        gte(expenses.date, fromStr),
        lte(expenses.date, toStr)
      )
    )
    .groupBy(expenses.type);

  const income = Number(result.find((r) => r.type === "income")?.total || 0);
  const expense = Number(result.find((r) => r.type === "expense")?.total || 0);
  const savings = income - expense;
  const savingsRate = income > 0 ? (savings / income) * 100 : 0;

  return {
    income,
    expenses: expense,
    savings,
    savingsRate,
  };
}

export async function getExpenseTrends(userId: number, from: Date, to: Date) {
  const fromStr = format(from, "yyyy-MM-dd");
  const toStr = format(to, "yyyy-MM-dd");

  const result = await db
    .select({
      date: expenses.date,
      type: expenses.type,
      amount: sum(expenses.amount),
    })
    .from(expenses)
    .where(
      and(
        eq(expenses.userId, userId),
        gte(expenses.date, fromStr),
        lte(expenses.date, toStr)
      )
    )
    .groupBy(expenses.date, expenses.type)
    .orderBy(expenses.date);

  // Group by date
  const grouped = result.reduce((acc, curr) => {
    const dateStr = curr.date;
    if (!acc[dateStr]) {
      acc[dateStr] = { date: dateStr, expenses: 0, income: 0 };
    }
    if (curr.type === "expense") {
      acc[dateStr].expenses = Number(curr.amount || 0);
    } else {
      acc[dateStr].income = Number(curr.amount || 0);
    }
    return acc;
  }, {} as Record<string, { date: string; expenses: number; income: number }>);

  return Object.values(grouped).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export async function getAccountBalances(userId: number) {
  const accounts = await db
    .select({
      id: financialAccounts.id,
      name: financialAccounts.name,
      type: financialAccounts.type,
      balance: financialAccounts.currentBalance,
      currency: financialAccounts.currency,
    })
    .from(financialAccounts)
    .where(and(eq(financialAccounts.userId, userId), eq(financialAccounts.isActive, true)));

  return accounts.map((acc) => ({
    ...acc,
    balance: Number(acc.balance),
  }));
}

export async function getRecentTransactions(userId: number, limit: number = 5) {
  const transactions = await db
    .select({
      id: expenses.id,
      description: expenses.description,
      amount: expenses.amount,
      date: expenses.date,
      type: expenses.type,
      categoryName: categories.name,
      categoryColor: categories.color,
      categoryIcon: categories.icon,
    })
    .from(expenses)
    .leftJoin(categories, eq(expenses.categoryId, categories.id))
    .where(eq(expenses.userId, userId))
    .orderBy(desc(expenses.date), desc(expenses.createdAt))
    .limit(limit);

  return transactions.map((t) => ({
    ...t,
    amount: Number(t.amount),
  }));
}

export async function getMonthlyOverview(userId: number, from: Date, to: Date) {
  const fromStr = format(from, "yyyy-MM-dd");
  const toStr = format(to, "yyyy-MM-dd");

  const result = await db
    .select({
      month: sql<string>`to_char(${expenses.date}, 'YYYY-MM')`,
      type: expenses.type,
      amount: sum(expenses.amount),
    })
    .from(expenses)
    .where(
      and(
        eq(expenses.userId, userId),
        gte(expenses.date, fromStr),
        lte(expenses.date, toStr)
      )
    )
    .groupBy(sql`to_char(${expenses.date}, 'YYYY-MM')`, expenses.type)
    .orderBy(sql`to_char(${expenses.date}, 'YYYY-MM')`);

  const grouped = result.reduce((acc, curr) => {
    const month = curr.month;
    if (!acc[month]) {
      acc[month] = { month, expenses: 0, income: 0 };
    }
    if (curr.type === "expense") {
      acc[month].expenses = Number(curr.amount || 0);
    } else {
      acc[month].income = Number(curr.amount || 0);
    }
    return acc;
  }, {} as Record<string, { month: string; expenses: number; income: number }>);

  return Object.values(grouped);
}

export async function getSpendingByCategory(userId: number, from: Date, to: Date) {
  const fromStr = format(from, "yyyy-MM-dd");
  const toStr = format(to, "yyyy-MM-dd");

  const result = await db
    .select({
      categoryName: categories.name,
      color: categories.color,
      amount: sum(expenses.amount),
    })
    .from(expenses)
    .leftJoin(categories, eq(expenses.categoryId, categories.id))
    .where(
      and(
        eq(expenses.userId, userId),
        eq(expenses.type, "expense"),
        gte(expenses.date, fromStr),
        lte(expenses.date, toStr)
      )
    )
    .groupBy(categories.name, categories.color)
    .orderBy(desc(sum(expenses.amount)));

  return result.map((r) => ({
    name: r.categoryName || "Uncategorized",
    value: Number(r.amount || 0),
    color: r.color || "#cccccc",
  }));
}
