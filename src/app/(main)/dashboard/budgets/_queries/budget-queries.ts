import { and, eq, gte, inArray, isNull, lte, or, sql, sum } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { budgets, categories, expenses, users, type Budget, type Category } from "@/lib/schema";

export type BudgetWithProgress = Budget & {
  category: Category | null;
  spent: number;
  remaining: number;
  percentUsed: number;
  isOverBudget: boolean;
  isNearThreshold: boolean;
};

export type BudgetPeriodDates = {
  periodStart: string;
  periodEnd: string;
};

/**
 * Get all subcategory IDs for a given parent category
 */
async function getSubcategoryIds(categoryId: number): Promise<number[]> {
  const subcategories = await db.query.categories.findMany({
    where: eq(categories.parentId, categoryId),
    columns: {
      id: true,
    },
  });
  return subcategories.map((cat) => cat.id);
}

/**
 * Calculate period start and end dates based on budget settings
 */
export function calculatePeriodDates(
  period: Budget["period"],
  startDate: string,
  endDate: string | null,
): BudgetPeriodDates {
  const now = new Date();
  const budgetStart = new Date(startDate);
  const budgetEnd = endDate ? new Date(endDate) : null;

  let periodStart: Date;
  let periodEnd: Date;

  switch (period) {
    case "daily":
      periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + 1);
      break;
    case "weekly":
      const dayOfWeek = now.getDay();
      periodStart = new Date(now);
      periodStart.setDate(now.getDate() - dayOfWeek);
      periodStart.setHours(0, 0, 0, 0);
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + 7);
      break;
    case "monthly":
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    case "quarterly":
      const quarter = Math.floor(now.getMonth() / 3);
      periodStart = new Date(now.getFullYear(), quarter * 3, 1);
      periodEnd = new Date(now.getFullYear(), quarter * 3 + 3, 0);
      break;
    case "yearly":
      periodStart = new Date(now.getFullYear(), 0, 1);
      periodEnd = new Date(now.getFullYear(), 11, 31);
      break;
    default:
      periodStart = budgetStart;
      periodEnd = budgetEnd || new Date(now.getFullYear() + 1, 0, 1);
  }

  // Ensure period is within budget dates
  if (periodStart < budgetStart) {
    periodStart = budgetStart;
  }
  if (budgetEnd && periodEnd > budgetEnd) {
    periodEnd = budgetEnd;
  }

  return {
    periodStart: periodStart.toISOString().split("T")[0],
    periodEnd: periodEnd.toISOString().split("T")[0],
  };
}

/**
 * Get all budgets for the current user with spending progress
 */
export async function getBudgetsWithProgress(): Promise<BudgetWithProgress[]> {
  const user = await getCurrentUser();
  if (!user) {
    return [];
  }

  // Get all budgets with their categories
  const userBudgets = await db.query.budgets.findMany({
    where: eq(budgets.userId, user.id),
    with: {
      category: true,
    },
    orderBy: (budgets, { desc }) => [desc(budgets.createdAt)],
  });

  // Calculate spending for each budget
  const budgetsWithProgress = await Promise.all(
    userBudgets.map(async (budget) => {
      const budgetAmount = Number.parseFloat(budget.amount);
      let spent = 0;

      // Only track transactions for active budgets
      if (budget.isActive) {
        const { periodStart, periodEnd } = calculatePeriodDates(
          budget.period,
          budget.startDate,
          budget.endDate,
        );

        // Build the query for expenses
        const conditions = [
          eq(expenses.userId, user.id),
          eq(expenses.type, "expense"),
          gte(expenses.date, periodStart),
          lte(expenses.date, periodEnd),
        ];

        // Filter by category
        // If budget has a category, filter by that category and its subcategories
        // If budget has no category, filter by expenses with no category (overall budget)
        if (budget.categoryId) {
          const subcategoryIds = await getSubcategoryIds(budget.categoryId);
          const categoryIds = [budget.categoryId, ...subcategoryIds];
          conditions.push(inArray(expenses.categoryId, categoryIds));
        } else {
          conditions.push(isNull(expenses.categoryId));
        }

        const [result] = await db
          .select({
            total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)`,
          })
          .from(expenses)
          .where(and(...conditions));

        spent = Number.parseFloat(result?.total || "0");
      }

      const remaining = Math.max(0, budgetAmount - spent);
      const percentUsed = budgetAmount > 0 ? Math.min(100, (spent / budgetAmount) * 100) : 0;
      const isOverBudget = spent > budgetAmount;
      const isNearThreshold = percentUsed >= (budget.alertThreshold ?? 80);

      return {
        ...budget,
        spent,
        remaining,
        percentUsed,
        isOverBudget,
        isNearThreshold,
      };
    }),
  );

  return budgetsWithProgress;
}

/**
 * Get active budgets only
 */
export async function getActiveBudgets(): Promise<BudgetWithProgress[]> {
  const allBudgets = await getBudgetsWithProgress();
  return allBudgets.filter((b) => b.isActive);
}

/**
 * Get a single budget with detailed expense breakdown
 */
export async function getBudgetDetails(budgetId: number) {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const budget = await db.query.budgets.findFirst({
    where: and(eq(budgets.id, budgetId), eq(budgets.userId, user.id)),
    with: {
      category: true,
    },
  });

  if (!budget) {
    return null;
  }

  let budgetExpenses: typeof expenses.$inferSelect[] = [];
  let dailySpending: Record<string, number> = {};
  let spent = 0;

  // Always calculate period dates for consistency
  const { periodStart, periodEnd } = calculatePeriodDates(
    budget.period,
    budget.startDate,
    budget.endDate,
  );

  // Only track transactions for active budgets
  if (budget.isActive) {
    // Get expenses for this budget's period
    const conditions = [
      eq(expenses.userId, user.id),
      eq(expenses.type, "expense"),
      gte(expenses.date, periodStart),
      lte(expenses.date, periodEnd),
    ];

    // Filter by category
    // If budget has a category, filter by that category and its subcategories
    // If budget has no category, filter by expenses with no category (overall budget)
    if (budget.categoryId) {
      const subcategoryIds = await getSubcategoryIds(budget.categoryId);
      const categoryIds = [budget.categoryId, ...subcategoryIds];
      conditions.push(inArray(expenses.categoryId, categoryIds));
    } else {
      conditions.push(isNull(expenses.categoryId));
    }

    budgetExpenses = await db
      .select()
      .from(expenses)
      .where(and(...conditions))
      .orderBy(expenses.date);

    // Calculate daily spending for chart
    dailySpending = budgetExpenses.reduce<Record<string, number>>((acc, expense) => {
      const date = expense.date;
      acc[date] = (acc[date] || 0) + Number.parseFloat(expense.amount);
      return acc;
    }, {});

    spent = budgetExpenses.reduce((sum, e) => sum + Number.parseFloat(e.amount), 0);
  }
  const budgetAmount = Number.parseFloat(budget.amount);
  const remaining = Math.max(0, budgetAmount - spent);
  const percentUsed = budgetAmount > 0 ? Math.min(100, (spent / budgetAmount) * 100) : 0;

  return {
    ...budget,
    spent,
    remaining,
    percentUsed,
    isOverBudget: spent > budgetAmount,
    isNearThreshold: percentUsed >= (budget.alertThreshold ?? 80),
    expenses: budgetExpenses,
    dailySpending,
    periodStart,
    periodEnd,
  };
}

/**
 * Get user's default currency
 */
export async function getUserDefaultCurrency(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) {
    return "USD";
  }

  const userData = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: {
      defaultCurrency: true,
    },
  });

  return userData?.defaultCurrency || "USD";
}
