import { ToolLoopAgent, tool, wrapLanguageModel } from "ai";
import { createGateway } from "@ai-sdk/gateway";
import { devToolsMiddleware } from "@ai-sdk/devtools";
import { z } from "zod";
import { db } from "@/lib/db";
import { conversations, messages, expenses, expenseItems, investments, budgets, categories, financialAccounts, users } from "@/lib/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq, desc, gte, lte, and, sql, sum, between, asc, or, ilike } from "drizzle-orm";

// Create Vercel AI Gateway provider
const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY,
});

// Wrap the model with DevTools middleware for debugging (development only)
const baseModel = gateway("anthropic/claude-haiku-4.5");
const wrappedModel = process.env.NODE_ENV === 'development' 
  ? wrapLanguageModel({
      model: baseModel,
      middleware: devToolsMiddleware(),
    })
  : baseModel;

// Helper function to format currency
function formatCurrency(amount: string | number | null, currency: string): string {
  if (amount === null) return `0.00 ${currency}`;
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `${num.toFixed(2)} ${currency}`;
}

// Helper function to get date range for period
function getDateRangeForPeriod(period: string, timezone: string): { startDate: string; endDate: string; periodLabel: string } {
  const now = new Date();
  // Apply timezone offset for accurate date calculations
  const formatter = new Intl.DateTimeFormat('en-CA', { 
    timeZone: timezone, 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  });
  const todayStr = formatter.format(now);
  const [year, month, day] = todayStr.split('-').map(Number);
  
  switch (period) {
    case 'today':
      return { startDate: todayStr, endDate: todayStr, periodLabel: `Today (${todayStr})` };
    case 'this_week': {
      const startOfWeek = new Date(year, month - 1, day - now.getDay());
      const endOfWeek = new Date(year, month - 1, day + (6 - now.getDay()));
      return { 
        startDate: startOfWeek.toISOString().split('T')[0], 
        endDate: endOfWeek.toISOString().split('T')[0],
        periodLabel: `This Week (${startOfWeek.toISOString().split('T')[0]} to ${endOfWeek.toISOString().split('T')[0]})`
      };
    }
    case 'this_month': {
      const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endOfMonth = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      return { startDate: startOfMonth, endDate: endOfMonth, periodLabel: `This Month (${new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })})` };
    }
    case 'last_month': {
      const lastMonth = month === 1 ? 12 : month - 1;
      const lastMonthYear = month === 1 ? year - 1 : year;
      const startOfLastMonth = `${lastMonthYear}-${String(lastMonth).padStart(2, '0')}-01`;
      const lastDay = new Date(lastMonthYear, lastMonth, 0).getDate();
      const endOfLastMonth = `${lastMonthYear}-${String(lastMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      return { startDate: startOfLastMonth, endDate: endOfLastMonth, periodLabel: `Last Month (${new Date(lastMonthYear, lastMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })})` };
    }
    case 'this_quarter': {
      const quarter = Math.floor((month - 1) / 3);
      const startMonth = quarter * 3 + 1;
      const endMonth = startMonth + 2;
      const startOfQuarter = `${year}-${String(startMonth).padStart(2, '0')}-01`;
      const lastDay = new Date(year, endMonth, 0).getDate();
      const endOfQuarter = `${year}-${String(endMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      return { startDate: startOfQuarter, endDate: endOfQuarter, periodLabel: `Q${quarter + 1} ${year}` };
    }
    case 'this_year': {
      const startOfYear = `${year}-01-01`;
      const endOfYear = `${year}-12-31`;
      return { startDate: startOfYear, endDate: endOfYear, periodLabel: `Year ${year}` };
    }
    case 'last_year': {
      const startOfLastYear = `${year - 1}-01-01`;
      const endOfLastYear = `${year - 1}-12-31`;
      return { startDate: startOfLastYear, endDate: endOfLastYear, periodLabel: `Year ${year - 1}` };
    }
    default:
      return { startDate: todayStr, endDate: todayStr, periodLabel: 'Custom Period' };
  }
}

// Define tools for the insights agent
const insightsTools = {
  getUserContext: tool({
    description: "ALWAYS call this tool FIRST before any other tool. Gets the user's settings including their preferred currency, timezone, locale, date format, and current date/time in their timezone. This context is essential for accurate date-based queries and proper currency formatting.",
    inputSchema: z.object({}),
    execute: async () => {
      const user = await getCurrentUser();
      if (!user) throw new Error("Unauthorized");

      const [userData] = await db
        .select({
          defaultCurrency: users.defaultCurrency,
          timezone: users.timezone,
          locale: users.locale,
          dateFormat: users.dateFormat,
        })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);

      const timezone = userData?.timezone || "UTC";
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-CA', { 
        timeZone: timezone, 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      });
      const timeFormatter = new Intl.DateTimeFormat('en-US', { 
        timeZone: timezone, 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
      
      const currentDate = formatter.format(now);
      const currentTime = timeFormatter.format(now);
      const [year, month] = currentDate.split('-').map(Number);
      const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });

      return {
        currency: userData?.defaultCurrency || "USD",
        currencySymbol: getCurrencySymbol(userData?.defaultCurrency || "USD"),
        timezone: timezone,
        locale: userData?.locale || "en-US",
        dateFormat: userData?.dateFormat || "MM/DD/YYYY",
        currentDateTime: {
          date: currentDate,
          time: currentTime,
          dayOfWeek: new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'long' }).format(now),
          monthName: monthName,
          year: year,
          month: month,
        },
        dateRanges: {
          thisMonth: getDateRangeForPeriod('this_month', timezone),
          lastMonth: getDateRangeForPeriod('last_month', timezone),
          thisWeek: getDateRangeForPeriod('this_week', timezone),
          thisQuarter: getDateRangeForPeriod('this_quarter', timezone),
          thisYear: getDateRangeForPeriod('this_year', timezone),
        }
      };
    },
  }),

  getExpenseSummary: tool({
    description: "Get a comprehensive summary of expenses for a specific time period. Use the predefined periods from getUserContext for accurate date ranges. Returns total spent, transaction count, average per transaction, and daily average.",
    inputSchema: z.object({
      startDate: z.string().describe("Start date in YYYY-MM-DD format. Get this from getUserContext dateRanges."),
      endDate: z.string().describe("End date in YYYY-MM-DD format. Get this from getUserContext dateRanges."),
      categoryId: z.number().optional().describe("Optional: Filter by specific category ID"),
    }),
    execute: async ({ startDate, endDate, categoryId }) => {
      const user = await getCurrentUser();
      if (!user) throw new Error("Unauthorized");

      const [userData] = await db
        .select({ defaultCurrency: users.defaultCurrency })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);
      const currency = userData?.defaultCurrency || "USD";

      let conditions = [eq(expenses.userId, user.id), eq(expenses.type, "expense")];
      conditions.push(gte(expenses.date, startDate));
      conditions.push(lte(expenses.date, endDate));
      if (categoryId) conditions.push(eq(expenses.categoryId, categoryId));

      const result = await db
        .select({
          total: sum(expenses.amount),
          count: sql<number>`count(*)`,
          avgAmount: sql<number>`avg(${expenses.amount})`,
          minAmount: sql<number>`min(${expenses.amount})`,
          maxAmount: sql<number>`max(${expenses.amount})`,
        })
        .from(expenses)
        .where(and(...conditions));

      // Calculate days in period
      const start = new Date(startDate);
      const end = new Date(endDate);
      const daysInPeriod = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      const totalAmount = parseFloat(result[0]?.total || "0");
      const dailyAverage = totalAmount / daysInPeriod;

      return {
        period: { startDate, endDate, daysInPeriod },
        currency,
        totalExpenses: formatCurrency(totalAmount, currency),
        transactionCount: result[0]?.count || 0,
        averagePerTransaction: formatCurrency(result[0]?.avgAmount, currency),
        dailyAverage: formatCurrency(dailyAverage, currency),
        smallestExpense: formatCurrency(result[0]?.minAmount, currency),
        largestExpense: formatCurrency(result[0]?.maxAmount, currency),
      };
    },
  }),

  getExpensesByCategory: tool({
    description: "Get expenses grouped by category for a specific period. Returns a breakdown showing each category's spending, percentage of total, and transaction count. Perfect for understanding where money is going.",
    inputSchema: z.object({
      startDate: z.string().describe("Start date in YYYY-MM-DD format"),
      endDate: z.string().describe("End date in YYYY-MM-DD format"),
      limit: z.number().default(15).describe("Maximum categories to return (default 15)"),
    }),
    execute: async ({ startDate, endDate, limit }) => {
      const user = await getCurrentUser();
      if (!user) throw new Error("Unauthorized");

      const [userData] = await db
        .select({ defaultCurrency: users.defaultCurrency })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);
      const currency = userData?.defaultCurrency || "USD";

      let conditions = [eq(expenses.userId, user.id), eq(expenses.type, "expense")];
      conditions.push(gte(expenses.date, startDate));
      conditions.push(lte(expenses.date, endDate));

      // Get total for percentage calculation
      const [totalResult] = await db
        .select({ total: sum(expenses.amount) })
        .from(expenses)
        .where(and(...conditions));
      const grandTotal = parseFloat(totalResult?.total || "0");

      const result = await db
        .select({
          categoryId: expenses.categoryId,
          categoryName: categories.name,
          categoryIcon: categories.icon,
          categoryColor: categories.color,
          total: sum(expenses.amount),
          count: sql<number>`count(*)`,
          avgAmount: sql<number>`avg(${expenses.amount})`,
        })
        .from(expenses)
        .leftJoin(categories, eq(expenses.categoryId, categories.id))
        .where(and(...conditions))
        .groupBy(expenses.categoryId, categories.name, categories.icon, categories.color)
        .orderBy(desc(sum(expenses.amount)))
        .limit(limit);

      return {
        period: { startDate, endDate },
        currency,
        grandTotal: formatCurrency(grandTotal, currency),
        categoryBreakdown: result.map((row, index) => {
          const amount = parseFloat(row.total || "0");
          return {
            rank: index + 1,
            categoryName: row.categoryName || "Uncategorized",
            categoryIcon: row.categoryIcon,
            amount: formatCurrency(amount, currency),
            percentageOfTotal: grandTotal > 0 ? `${((amount / grandTotal) * 100).toFixed(1)}%` : "0%",
            transactionCount: row.count,
            averagePerTransaction: formatCurrency(row.avgAmount, currency),
          };
        }),
      };
    },
  }),

  getIncomeSummary: tool({
    description: "Get a summary of income for a specific time period. Returns total income, transaction count, and breakdown by category.",
    inputSchema: z.object({
      startDate: z.string().describe("Start date in YYYY-MM-DD format"),
      endDate: z.string().describe("End date in YYYY-MM-DD format"),
    }),
    execute: async ({ startDate, endDate }) => {
      const user = await getCurrentUser();
      if (!user) throw new Error("Unauthorized");

      const [userData] = await db
        .select({ defaultCurrency: users.defaultCurrency })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);
      const currency = userData?.defaultCurrency || "USD";

      let conditions = [eq(expenses.userId, user.id), eq(expenses.type, "income")];
      conditions.push(gte(expenses.date, startDate));
      conditions.push(lte(expenses.date, endDate));

      const [totalResult] = await db
        .select({
          total: sum(expenses.amount),
          count: sql<number>`count(*)`,
        })
        .from(expenses)
        .where(and(...conditions));

      const incomeByCategory = await db
        .select({
          categoryName: categories.name,
          total: sum(expenses.amount),
          count: sql<number>`count(*)`,
        })
        .from(expenses)
        .leftJoin(categories, eq(expenses.categoryId, categories.id))
        .where(and(...conditions))
        .groupBy(categories.name)
        .orderBy(desc(sum(expenses.amount)));

      return {
        period: { startDate, endDate },
        currency,
        totalIncome: formatCurrency(totalResult?.total, currency),
        transactionCount: totalResult?.count || 0,
        incomeBySource: incomeByCategory.map(row => ({
          source: row.categoryName || "Other Income",
          amount: formatCurrency(row.total, currency),
          transactionCount: row.count,
        })),
      };
    },
  }),

  getNetCashFlow: tool({
    description: "Calculate net cash flow (income minus expenses) for a period. Shows income, expenses, and the difference.",
    inputSchema: z.object({
      startDate: z.string().describe("Start date in YYYY-MM-DD format"),
      endDate: z.string().describe("End date in YYYY-MM-DD format"),
    }),
    execute: async ({ startDate, endDate }) => {
      const user = await getCurrentUser();
      if (!user) throw new Error("Unauthorized");

      const [userData] = await db
        .select({ defaultCurrency: users.defaultCurrency })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);
      const currency = userData?.defaultCurrency || "USD";

      const results = await db
        .select({
          type: expenses.type,
          total: sum(expenses.amount),
        })
        .from(expenses)
        .where(and(
          eq(expenses.userId, user.id),
          gte(expenses.date, startDate),
          lte(expenses.date, endDate)
        ))
        .groupBy(expenses.type);

      const income = parseFloat(results.find(r => r.type === 'income')?.total || "0");
      const expenseTotal = parseFloat(results.find(r => r.type === 'expense')?.total || "0");
      const netCashFlow = income - expenseTotal;

      return {
        period: { startDate, endDate },
        currency,
        totalIncome: formatCurrency(income, currency),
        totalExpenses: formatCurrency(expenseTotal, currency),
        netCashFlow: formatCurrency(netCashFlow, currency),
        status: netCashFlow >= 0 ? "SURPLUS" : "DEFICIT",
        savingsRate: income > 0 ? `${((netCashFlow / income) * 100).toFixed(1)}%` : "N/A",
      };
    },
  }),

  getInvestmentSummary: tool({
    description: "Get a comprehensive investment portfolio summary including total invested, current value, gains/losses, and breakdown by investment.",
    inputSchema: z.object({}),
    execute: async () => {
      const user = await getCurrentUser();
      if (!user) throw new Error("Unauthorized");

      const [userData] = await db
        .select({ defaultCurrency: users.defaultCurrency })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);
      const currency = userData?.defaultCurrency || "USD";

      const [summary] = await db
        .select({
          totalInvested: sum(investments.totalInvested),
          currentValue: sum(investments.currentValue),
          totalGainLoss: sum(investments.totalGainLoss),
          count: sql<number>`count(*)`,
        })
        .from(investments)
        .where(and(eq(investments.userId, user.id), eq(investments.isActive, true)));

      const holdingsList = await db
        .select({
          symbol: investments.symbol,
          name: investments.name,
          type: investments.type,
          totalInvested: investments.totalInvested,
          currentValue: investments.currentValue,
          totalGainLoss: investments.totalGainLoss,
          totalGainLossPercent: investments.totalGainLossPercent,
          totalQuantity: investments.totalQuantity,
          currentPrice: investments.currentPrice,
        })
        .from(investments)
        .where(and(eq(investments.userId, user.id), eq(investments.isActive, true)))
        .orderBy(desc(investments.currentValue))
        .limit(10);

      const totalInvested = parseFloat(summary?.totalInvested || "0");
      const currentValue = parseFloat(summary?.currentValue || "0");
      const totalGainLoss = parseFloat(summary?.totalGainLoss || "0");
      const returnPercent = totalInvested > 0 ? ((totalGainLoss / totalInvested) * 100) : 0;

      return {
        currency,
        portfolioSummary: {
          totalInvested: formatCurrency(totalInvested, currency),
          currentValue: formatCurrency(currentValue, currency),
          totalGainLoss: formatCurrency(totalGainLoss, currency),
          returnPercentage: `${returnPercent.toFixed(2)}%`,
          numberOfHoldings: summary?.count || 0,
          status: totalGainLoss >= 0 ? "PROFIT" : "LOSS",
        },
        topHoldings: holdingsList.map((h, index) => ({
          rank: index + 1,
          symbol: h.symbol,
          name: h.name,
          type: h.type,
          invested: formatCurrency(h.totalInvested, currency),
          currentValue: formatCurrency(h.currentValue, currency),
          gainLoss: formatCurrency(h.totalGainLoss, currency),
          returnPercent: `${parseFloat(h.totalGainLossPercent || "0").toFixed(2)}%`,
        })),
      };
    },
  }),

  getBudgetStatus: tool({
    description: "Get detailed budget status showing all active budgets with their spending, remaining amounts, and progress. Essential for budget tracking and analysis.",
    inputSchema: z.object({
      includeInactive: z.boolean().default(false).describe("Include inactive budgets"),
    }),
    execute: async ({ includeInactive }) => {
      const user = await getCurrentUser();
      if (!user) throw new Error("Unauthorized");

      const [userData] = await db
        .select({ 
          defaultCurrency: users.defaultCurrency,
          timezone: users.timezone 
        })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);
      const currency = userData?.defaultCurrency || "USD";
      const timezone = userData?.timezone || "UTC";

      // Get current date in user's timezone
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-CA', { 
        timeZone: timezone, 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      });
      const currentDate = formatter.format(now);

      let budgetConditions = [eq(budgets.userId, user.id)];
      if (!includeInactive) {
        budgetConditions.push(eq(budgets.isActive, true));
      }

      const budgetList = await db
        .select({
          id: budgets.id,
          name: budgets.name,
          amount: budgets.amount,
          period: budgets.period,
          startDate: budgets.startDate,
          endDate: budgets.endDate,
          categoryId: budgets.categoryId,
          categoryName: categories.name,
          alertThreshold: budgets.alertThreshold,
          isActive: budgets.isActive,
        })
        .from(budgets)
        .leftJoin(categories, eq(budgets.categoryId, categories.id))
        .where(and(...budgetConditions))
        .orderBy(budgets.name);

      // For each budget, calculate spending within its period
      const budgetsWithSpending = await Promise.all(
        budgetList.map(async (budget) => {
          // Determine date range based on budget period
          let periodStart = budget.startDate;
          let periodEnd = budget.endDate || currentDate;

          // For recurring budgets, calculate current period
          if (budget.period !== 'daily') {
            const dateRange = getDateRangeForPeriod(
              budget.period === 'monthly' ? 'this_month' : 
              budget.period === 'weekly' ? 'this_week' : 
              budget.period === 'quarterly' ? 'this_quarter' : 
              budget.period === 'yearly' ? 'this_year' : 'this_month',
              timezone
            );
            periodStart = dateRange.startDate;
            periodEnd = dateRange.endDate;
          }

          // Get spending for this budget's category in the period
          let spendingConditions = [
            eq(expenses.userId, user.id),
            eq(expenses.type, "expense"),
            gte(expenses.date, periodStart),
            lte(expenses.date, periodEnd),
          ];
          
          if (budget.categoryId) {
            spendingConditions.push(eq(expenses.categoryId, budget.categoryId));
          }

          const [spending] = await db
            .select({ total: sum(expenses.amount) })
            .from(expenses)
            .where(and(...spendingConditions));

          const budgetAmount = parseFloat(budget.amount);
          const spent = parseFloat(spending?.total || "0");
          const remaining = budgetAmount - spent;
          const percentUsed = (spent / budgetAmount) * 100;
          const alertThreshold = budget.alertThreshold || 80;

          let status: "ON_TRACK" | "WARNING" | "EXCEEDED" | "CRITICAL";
          if (percentUsed >= 100) status = "EXCEEDED";
          else if (percentUsed >= alertThreshold) status = "WARNING";
          else if (percentUsed >= alertThreshold - 10) status = "CRITICAL";
          else status = "ON_TRACK";

          return {
            budgetName: budget.name,
            category: budget.categoryName || "All Categories",
            period: budget.period,
            periodRange: `${periodStart} to ${periodEnd}`,
            budgetAmount: formatCurrency(budgetAmount, currency),
            spent: formatCurrency(spent, currency),
            remaining: formatCurrency(remaining, currency),
            percentUsed: `${percentUsed.toFixed(1)}%`,
            status,
            isActive: budget.isActive,
          };
        })
      );

      // Summary statistics
      const totalBudgeted = budgetsWithSpending.reduce((sum, b) => sum + parseFloat(b.budgetAmount), 0);
      const totalSpent = budgetsWithSpending.reduce((sum, b) => sum + parseFloat(b.spent), 0);
      const exceededCount = budgetsWithSpending.filter(b => b.status === "EXCEEDED").length;
      const warningCount = budgetsWithSpending.filter(b => b.status === "WARNING").length;

      return {
        currency,
        currentDate,
        summary: {
          totalBudgets: budgetsWithSpending.length,
          totalBudgeted: formatCurrency(totalBudgeted, currency),
          totalSpent: formatCurrency(totalSpent, currency),
          overallPercentUsed: `${((totalSpent / totalBudgeted) * 100).toFixed(1)}%`,
          budgetsExceeded: exceededCount,
          budgetsAtWarning: warningCount,
          budgetsOnTrack: budgetsWithSpending.length - exceededCount - warningCount,
        },
        budgets: budgetsWithSpending,
      };
    },
  }),

  getRecentTransactions: tool({
    description: "Get recent transactions with full details including category, merchant, and amounts. Useful for detailed transaction analysis.",
    inputSchema: z.object({
      limit: z.number().default(20).describe("Number of transactions to return (default 20, max 50)"),
      type: z.enum(["expense", "income", "all"]).default("all").describe("Filter by transaction type"),
      startDate: z.string().optional().describe("Optional: Start date filter (YYYY-MM-DD)"),
      endDate: z.string().optional().describe("Optional: End date filter (YYYY-MM-DD)"),
      categoryId: z.number().optional().describe("Optional: Filter by category ID"),
    }),
    execute: async ({ limit, type, startDate, endDate, categoryId }) => {
      const user = await getCurrentUser();
      if (!user) throw new Error("Unauthorized");

      const [userData] = await db
        .select({ defaultCurrency: users.defaultCurrency })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);
      const currency = userData?.defaultCurrency || "USD";

      const actualLimit = Math.min(limit, 50);
      let conditions = [eq(expenses.userId, user.id)];
      
      if (type !== "all") conditions.push(eq(expenses.type, type));
      if (startDate) conditions.push(gte(expenses.date, startDate));
      if (endDate) conditions.push(lte(expenses.date, endDate));
      if (categoryId) conditions.push(eq(expenses.categoryId, categoryId));

      const transactions = await db
        .select({
          id: expenses.id,
          amount: expenses.amount,
          description: expenses.description,
          date: expenses.date,
          time: expenses.time,
          type: expenses.type,
          categoryName: categories.name,
          categoryIcon: categories.icon,
          merchant: expenses.merchant,
          location: expenses.location,
          notes: expenses.notes,
        })
        .from(expenses)
        .leftJoin(categories, eq(expenses.categoryId, categories.id))
        .where(and(...conditions))
        .orderBy(desc(expenses.date), desc(expenses.time))
        .limit(actualLimit);

      return {
        currency,
        transactionCount: transactions.length,
        transactions: transactions.map((t, index) => ({
          number: index + 1,
          date: t.date,
          time: t.time || "",
          type: t.type.toUpperCase(),
          amount: formatCurrency(t.amount, currency),
          description: t.description || "No description",
          category: t.categoryName || "Uncategorized",
          merchant: t.merchant || "",
          location: t.location || "",
        })),
      };
    },
  }),

  getSpendingTrend: tool({
    description: "Analyze spending trends over time. Compares current period with previous period to show if spending is increasing or decreasing.",
    inputSchema: z.object({
      period: z.enum(["week", "month", "quarter"]).describe("Period to analyze"),
    }),
    execute: async ({ period }) => {
      const user = await getCurrentUser();
      if (!user) throw new Error("Unauthorized");

      const [userData] = await db
        .select({ 
          defaultCurrency: users.defaultCurrency,
          timezone: users.timezone 
        })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);
      const currency = userData?.defaultCurrency || "USD";
      const timezone = userData?.timezone || "UTC";

      let currentRange: { startDate: string; endDate: string; periodLabel: string };
      let previousRange: { startDate: string; endDate: string; periodLabel: string };

      if (period === "month") {
        currentRange = getDateRangeForPeriod('this_month', timezone);
        previousRange = getDateRangeForPeriod('last_month', timezone);
      } else if (period === "week") {
        currentRange = getDateRangeForPeriod('this_week', timezone);
        // Calculate last week
        const lastWeekStart = new Date(currentRange.startDate);
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);
        const lastWeekEnd = new Date(currentRange.endDate);
        lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);
        previousRange = {
          startDate: lastWeekStart.toISOString().split('T')[0],
          endDate: lastWeekEnd.toISOString().split('T')[0],
          periodLabel: "Last Week"
        };
      } else {
        currentRange = getDateRangeForPeriod('this_quarter', timezone);
        // Calculate last quarter
        const [year, month] = currentRange.startDate.split('-').map(Number);
        const lastQuarterMonth = month - 3;
        const lastQuarterYear = lastQuarterMonth < 1 ? year - 1 : year;
        const adjustedMonth = lastQuarterMonth < 1 ? lastQuarterMonth + 12 : lastQuarterMonth;
        previousRange = {
          startDate: `${lastQuarterYear}-${String(adjustedMonth).padStart(2, '0')}-01`,
          endDate: `${lastQuarterYear}-${String(adjustedMonth + 2).padStart(2, '0')}-${new Date(lastQuarterYear, adjustedMonth + 2, 0).getDate()}`,
          periodLabel: "Last Quarter"
        };
      }

      // Get current period spending
      const [currentSpending] = await db
        .select({ total: sum(expenses.amount), count: sql<number>`count(*)` })
        .from(expenses)
        .where(and(
          eq(expenses.userId, user.id),
          eq(expenses.type, "expense"),
          gte(expenses.date, currentRange.startDate),
          lte(expenses.date, currentRange.endDate)
        ));

      // Get previous period spending
      const [previousSpending] = await db
        .select({ total: sum(expenses.amount), count: sql<number>`count(*)` })
        .from(expenses)
        .where(and(
          eq(expenses.userId, user.id),
          eq(expenses.type, "expense"),
          gte(expenses.date, previousRange.startDate),
          lte(expenses.date, previousRange.endDate)
        ));

      const currentTotal = parseFloat(currentSpending?.total || "0");
      const previousTotal = parseFloat(previousSpending?.total || "0");
      const change = currentTotal - previousTotal;
      const changePercent = previousTotal > 0 ? ((change / previousTotal) * 100) : 0;

      return {
        currency,
        currentPeriod: {
          label: currentRange.periodLabel,
          dateRange: `${currentRange.startDate} to ${currentRange.endDate}`,
          totalSpent: formatCurrency(currentTotal, currency),
          transactionCount: currentSpending?.count || 0,
        },
        previousPeriod: {
          label: previousRange.periodLabel,
          dateRange: `${previousRange.startDate} to ${previousRange.endDate}`,
          totalSpent: formatCurrency(previousTotal, currency),
          transactionCount: previousSpending?.count || 0,
        },
        comparison: {
          absoluteChange: formatCurrency(change, currency),
          percentageChange: `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}%`,
          trend: change > 0 ? "INCREASED" : change < 0 ? "DECREASED" : "UNCHANGED",
          insight: change > 0 
            ? `Spending increased by ${formatCurrency(Math.abs(change), currency)} (${Math.abs(changePercent).toFixed(1)}%) compared to ${previousRange.periodLabel.toLowerCase()}`
            : change < 0 
            ? `Spending decreased by ${formatCurrency(Math.abs(change), currency)} (${Math.abs(changePercent).toFixed(1)}%) compared to ${previousRange.periodLabel.toLowerCase()}`
            : "Spending remained the same",
        },
      };
    },
  }),

  getTopMerchants: tool({
    description: "Get top merchants/vendors by spending amount for a given period.",
    inputSchema: z.object({
      startDate: z.string().describe("Start date in YYYY-MM-DD format"),
      endDate: z.string().describe("End date in YYYY-MM-DD format"),
      limit: z.number().default(10).describe("Number of merchants to return"),
    }),
    execute: async ({ startDate, endDate, limit }) => {
      const user = await getCurrentUser();
      if (!user) throw new Error("Unauthorized");

      const [userData] = await db
        .select({ defaultCurrency: users.defaultCurrency })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);
      const currency = userData?.defaultCurrency || "USD";

      const merchants = await db
        .select({
          merchant: expenses.merchant,
          total: sum(expenses.amount),
          count: sql<number>`count(*)`,
          avgAmount: sql<number>`avg(${expenses.amount})`,
        })
        .from(expenses)
        .where(and(
          eq(expenses.userId, user.id),
          eq(expenses.type, "expense"),
          gte(expenses.date, startDate),
          lte(expenses.date, endDate),
          sql`${expenses.merchant} IS NOT NULL AND ${expenses.merchant} != ''`
        ))
        .groupBy(expenses.merchant)
        .orderBy(desc(sum(expenses.amount)))
        .limit(limit);

      return {
        period: { startDate, endDate },
        currency,
        topMerchants: merchants.map((m, index) => ({
          rank: index + 1,
          merchant: m.merchant,
          totalSpent: formatCurrency(m.total, currency),
          transactionCount: m.count,
          averageTransaction: formatCurrency(m.avgAmount, currency),
        })),
      };
    },
  }),

  getAllCategories: tool({
    description: "Get all expense and income categories available for the user. Useful for understanding categorization options.",
    inputSchema: z.object({
      type: z.enum(["expense", "income", "all"]).default("all").describe("Filter by category type"),
    }),
    execute: async ({ type }) => {
      const user = await getCurrentUser();
      if (!user) throw new Error("Unauthorized");

      let conditions = [eq(categories.isActive, true)];
      if (type !== "all") {
        conditions.push(eq(categories.type, type));
      }

      const categoryList = await db
        .select({
          id: categories.id,
          name: categories.name,
          type: categories.type,
          icon: categories.icon,
          color: categories.color,
          isSystem: categories.isSystem,
        })
        .from(categories)
        .where(and(
          sql`(${categories.userId} = ${user.id} OR ${categories.isSystem} = true)`,
          ...conditions
        ))
        .orderBy(categories.type, categories.name);

      return {
        categories: categoryList.map(c => ({
          id: c.id,
          name: c.name,
          type: c.type,
          icon: c.icon,
          isSystemCategory: c.isSystem,
        })),
      };
    },
  }),

  // ============================================================================
  // TRANSACTION RECORDING TOOLS
  // ============================================================================

  parseTransactionText: tool({
    description: `Parse natural language transaction text and extract structured transaction data. 
    This tool is used when the user wants to record expenses using @record command or mentions they want to add/record transactions.
    It can handle:
    - Single transactions like "Coffee at Starbucks ₹250"
    - Order receipts with multiple items (Amazon, Blinkit, Zepto, Swiggy, etc.)
    - Bill summaries with discounts, delivery fees, etc.
    
    The tool extracts item names, quantities, prices, and suggests categories based on item names.
    ALWAYS call getAllCategories first to get the list of available categories for accurate matching.`,
    inputSchema: z.object({
      transactionText: z.string().describe("The raw transaction text from user - could be a receipt, order summary, or natural language description"),
      transactionDate: z.string().optional().describe("Transaction date in YYYY-MM-DD format. If not provided, uses current date."),
      merchant: z.string().optional().describe("Merchant/store name if identifiable from context"),
    }),
    execute: async ({ transactionText, transactionDate, merchant }) => {
      const user = await getCurrentUser();
      if (!user) throw new Error("Unauthorized");

      // Get user's currency
      const [userData] = await db
        .select({ 
          defaultCurrency: users.defaultCurrency,
          timezone: users.timezone 
        })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);
      
      const currency = userData?.defaultCurrency || "USD";
      const timezone = userData?.timezone || "UTC";

      // Get current date in user's timezone if not provided
      let date = transactionDate;
      if (!date) {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-CA', { 
          timeZone: timezone, 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit' 
        });
        date = formatter.format(now);
      }

      // Get available categories for matching
      const categoryList = await db
        .select({
          id: categories.id,
          name: categories.name,
          type: categories.type,
        })
        .from(categories)
        .where(and(
          eq(categories.isActive, true),
          eq(categories.type, "expense"),
          sql`(${categories.userId} = ${user.id} OR ${categories.isSystem} = true)`
        ))
        .orderBy(categories.name);

      return {
        message: "Transaction text received. Please analyze the text to extract items and their details.",
        rawText: transactionText,
        suggestedDate: date,
        suggestedMerchant: merchant || null,
        currency: currency,
        availableCategories: categoryList.map(c => ({ id: c.id, name: c.name })),
        instructions: `
          Analyze the transaction text and extract:
          1. Individual items with: name, quantity, unit (if applicable), unit price, total price
          2. Overall transaction total (the final amount paid)
          3. Any discounts applied
          4. Delivery/handling fees if present
          5. Suggest a category for each item based on the available categories
          6. Suggest an overall category for the main transaction
          
          Present the parsed data to the user for confirmation before saving.
        `,
      };
    },
  }),

  suggestCategoryForItem: tool({
    description: "Suggest the most appropriate category for an item based on its name. Uses fuzzy matching against available categories and handles parent categories properly.",
    inputSchema: z.object({
      itemName: z.string().describe("The name of the item to categorize"),
      itemKeywords: z.array(z.string()).optional().describe("Additional keywords to help categorization (e.g., 'food', 'electronics', 'household')"),
    }),
    execute: async ({ itemName, itemKeywords }) => {
      const user = await getCurrentUser();
      if (!user) throw new Error("Unauthorized");

      // Get available expense categories with parent information
      const categoryList = await db
        .select({
          id: categories.id,
          name: categories.name,
          parentId: categories.parentId,
          isSystem: categories.isSystem,
        })
        .from(categories)
        .where(and(
          eq(categories.isActive, true),
          eq(categories.type, "expense"),
          sql`(${categories.userId} = ${user.id} OR ${categories.isSystem} = true)`
        ))
        .orderBy(categories.name);

      // Common category mappings for items
      const categoryMappings: Record<string, string[]> = {
        "Groceries": ["ice cream", "milk", "bread", "vegetables", "fruits", "rice", "dal", "flour", "sugar", "oil", "butter", "cheese", "yogurt", "eggs", "meat", "chicken", "fish", "groceries", "vegetables", "amul", "nestle", "britannia", "maggi", "snacks", "biscuits", "cookies"],
        "Food & Dining": ["restaurant", "cafe", "coffee", "tea", "pizza", "burger", "biryani", "zomato", "swiggy", "dining", "food", "meal", "breakfast", "lunch", "dinner", "snack"],
        "Bakery": ["cake", "muffin", "pastry", "bread", "bakery", "cupcake", "brownie", "cookie", "donut", "croissant"],
        "Health & Wellness": ["medicine", "pharmacy", "doctor", "hospital", "clinic", "health", "vitamin", "supplement", "apollo", "1mg", "pharmeasy", "netmeds"],
        "Shopping": ["amazon", "flipkart", "myntra", "clothing", "shoes", "electronics", "gadgets", "accessories"],
        "Entertainment": ["movie", "netflix", "prime", "spotify", "gaming", "concert", "theater"],
        "Transportation": ["uber", "ola", "rapido", "petrol", "diesel", "fuel", "metro", "bus", "train", "flight", "taxi"],
        "Utilities": ["electricity", "water", "gas", "internet", "phone", "mobile", "recharge", "bill"],
        "Personal Care": ["salon", "haircut", "spa", "cosmetics", "skincare", "beauty"],
        "Household": ["cleaning", "detergent", "soap", "shampoo", "toilet", "kitchen", "home"],
      };

      const itemLower = itemName.toLowerCase();
      const keywords = itemKeywords?.map(k => k.toLowerCase()) || [];
      
      let matchedCategory = null;
      let confidence = "low";

      // Try to match based on item name and keywords
      for (const [categoryName, patterns] of Object.entries(categoryMappings)) {
        for (const pattern of patterns) {
          if (itemLower.includes(pattern) || keywords.some(k => k.includes(pattern))) {
            // Find matching category in user's list - prefer exact matches first
            let found = categoryList.find(c => 
              c.name.toLowerCase() === categoryName.toLowerCase()
            );
            
            // If no exact match, try partial match
            if (!found) {
              found = categoryList.find(c => 
                c.name.toLowerCase().includes(categoryName.toLowerCase()) ||
                categoryName.toLowerCase().includes(c.name.toLowerCase())
              );
            }
            
            if (found) {
              matchedCategory = found;
              confidence = "high";
              break;
            }
          }
        }
        if (matchedCategory) break;
      }

      // If no match found, suggest first available category or null
      if (!matchedCategory && categoryList.length > 0) {
        // Try to find a generic "Other" or "Miscellaneous" category
        matchedCategory = categoryList.find(c => 
          c.name.toLowerCase().includes("other") || 
          c.name.toLowerCase().includes("misc") ||
          c.name.toLowerCase().includes("general")
        ) || categoryList[0];
        confidence = "low";
      }

      return {
        itemName,
        suggestedCategory: matchedCategory ? {
          id: matchedCategory.id,
          name: matchedCategory.name,
          isSystem: matchedCategory.isSystem,
        } : null,
        confidence,
        allCategories: categoryList.map(c => ({ 
          id: c.id, 
          name: c.name,
          isSystem: c.isSystem,
        })),
      };
    },
  }),

  saveTransaction: tool({
    description: `Save a transaction to the database after user confirmation. 
    This tool creates a main expense entry and optionally saves individual items as expense_items.
    IMPORTANT: Only call this after the user has confirmed the transaction details and category assignments.`,
    inputSchema: z.object({
      transaction: z.object({
        amount: z.number().describe("Total transaction amount (final amount paid)"),
        description: z.string().describe("Brief description of the transaction"),
        categoryId: z.number().describe("The category ID for the main transaction"),
        date: z.string().describe("Transaction date in YYYY-MM-DD format"),
        merchant: z.string().optional().describe("Merchant/store name"),
        notes: z.string().optional().describe("Additional notes for the transaction"),
        tags: z.array(z.string()).optional().describe("Tags for the transaction (comma-separated)"),
      }),
      items: z.array(z.object({
        name: z.string().describe("Item name"),
        quantity: z.number().default(1).describe("Quantity"),
        unit: z.string().optional().describe("Unit of measurement (kg, ml, pieces, etc.)"),
        unitPrice: z.number().optional().describe("Price per unit"),
        totalPrice: z.number().describe("Total price for this item"),
        notes: z.string().optional().describe("Notes for this specific item"),
      })).optional().describe("Individual items within the transaction (for grouped purchases)"),
    }),
    execute: async ({ transaction, items }) => {
      const user = await getCurrentUser();
      if (!user) throw new Error("Unauthorized");

      // Get user's default currency
      const [userData] = await db
        .select({ defaultCurrency: users.defaultCurrency })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);
      const currency = userData?.defaultCurrency || "USD";

      // Validate category exists
      const [category] = await db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .where(eq(categories.id, transaction.categoryId))
        .limit(1);

      if (!category) {
        throw new Error(`Category with ID ${transaction.categoryId} not found`);
      }

      // Create the main expense entry
      const [newExpense] = await db
        .insert(expenses)
        .values({
          userId: user.id,
          categoryId: transaction.categoryId,
          type: "expense",
          amount: String(transaction.amount),
          currency: currency,
          description: transaction.description,
          notes: transaction.notes || null,
          tags: transaction.tags ? transaction.tags.join(",") : null,
          date: transaction.date,
          merchant: transaction.merchant || null,
          isConfirmed: true,
        })
        .returning();

      // If there are individual items, save them
      let savedItems: any[] = [];
      if (items && items.length > 0) {
        const itemsToInsert = items.map((item, index) => ({
          expenseId: newExpense.id,
          name: item.name,
          quantity: String(item.quantity),
          unit: item.unit || null,
          unitPrice: item.unitPrice ? String(item.unitPrice) : null,
          totalPrice: String(item.totalPrice),
          notes: item.notes || null,
          sortOrder: index,
        }));

        savedItems = await db
          .insert(expenseItems)
          .values(itemsToInsert)
          .returning();
      }

      return {
        success: true,
        message: `Transaction saved successfully!`,
        expense: {
          id: newExpense.id,
          amount: formatCurrency(transaction.amount, currency),
          description: transaction.description,
          category: category.name,
          date: transaction.date,
          merchant: transaction.merchant || "Not specified",
          notes: transaction.notes || null,
          tags: transaction.tags || [],
        },
        itemCount: savedItems.length,
        savedItems: savedItems.map(item => ({
          name: item.name,
          quantity: item.quantity,
          totalPrice: formatCurrency(item.totalPrice, currency),
          notes: item.notes || null,
        })),
      };
    },
  }),

  saveBulkTransactions: tool({
    description: `Save multiple separate transactions at once. Use this when the user provides multiple unrelated transactions.
    Each transaction is saved as a separate expense entry.
    IMPORTANT: Only call this after the user has confirmed all transaction details.`,
    inputSchema: z.object({
      transactions: z.array(z.object({
        amount: z.number().describe("Transaction amount"),
        description: z.string().describe("Brief description"),
        categoryId: z.number().describe("Category ID"),
        date: z.string().describe("Date in YYYY-MM-DD format"),
        merchant: z.string().optional().describe("Merchant name"),
      })),
    }),
    execute: async ({ transactions }) => {
      const user = await getCurrentUser();
      if (!user) throw new Error("Unauthorized");

      const [userData] = await db
        .select({ defaultCurrency: users.defaultCurrency })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);
      const currency = userData?.defaultCurrency || "USD";

      const savedTransactions: any[] = [];
      const errors: any[] = [];

      for (const txn of transactions) {
        try {
          // Validate category
          const [category] = await db
            .select({ id: categories.id, name: categories.name })
            .from(categories)
            .where(eq(categories.id, txn.categoryId))
            .limit(1);

          if (!category) {
            errors.push({ description: txn.description, error: `Category ID ${txn.categoryId} not found` });
            continue;
          }

          const [newExpense] = await db
            .insert(expenses)
            .values({
              userId: user.id,
              categoryId: txn.categoryId,
              type: "expense",
              amount: String(txn.amount),
              currency: currency,
              description: txn.description,
              date: txn.date,
              merchant: txn.merchant || null,
              isConfirmed: true,
            })
            .returning();

          savedTransactions.push({
            id: newExpense.id,
            amount: formatCurrency(txn.amount, currency),
            description: txn.description,
            category: category.name,
            date: txn.date,
          });
        } catch (error: any) {
          errors.push({ description: txn.description, error: error.message });
        }
      }

      return {
        success: errors.length === 0,
        message: `Saved ${savedTransactions.length} of ${transactions.length} transactions`,
        savedTransactions,
        errors: errors.length > 0 ? errors : undefined,
      };
    },
  }),
};

// Helper function to get currency symbol
function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    USD: "$", EUR: "€", GBP: "£", INR: "₹", JPY: "¥", 
    CAD: "C$", AUD: "A$", CHF: "Fr", CNY: "¥", BRL: "R$",
  };
  return symbols[currency] || currency;
}

// Create the insights agent with enhanced instructions
const insightsAgent = new ToolLoopAgent({
  model: wrappedModel,
  instructions: `You are an expert financial insights assistant for a personal finance management application. Your role is to help users understand their spending patterns, track budgets, analyze investments, and make informed financial decisions.

## CRITICAL: ALWAYS START BY CALLING getUserContext
Before answering ANY question about finances, dates, or money, you MUST first call the \`getUserContext\` tool to get:
- The user's preferred currency (use this for ALL monetary values)
- The user's timezone (use this for accurate date calculations)
- The current date/time in their timezone
- Pre-calculated date ranges for common periods (this month, last month, etc.)

## @record COMMAND - TRANSACTION RECORDING
When the user types **@record** or mentions they want to add/record/log a transaction or expense, immediately recognize this as a transaction recording request and respond with helpful guidance:

### Immediate Response to @record
When you see "@record", respond with:
"📝 **Transaction Recording Mode**
I can help you record transactions! Here are some examples:

**Single transaction:**
@record Coffee at Starbucks ₹250

**Order receipt (multiple items):**
@record
B0CYQGKSWM Amul Vanilla Gold Ice Cream 1 L ₹210
B0DR8CKJT7 Amul Dark Chocolate Frostik Ice Cream 70 ml ₹35
B0DR8D4377 Amul Coffee Bar Ice Cream 60 ml ₹18
₹20 discount
Delivery fee ₹30
You pay ₹485

**Natural language:**
@record Spent ₹150 on groceries at Big Bazaar

Just paste your receipt or describe your transaction after @record, and I'll parse it automatically!"

### Step 1: Parse the Transaction
Use \`parseTransactionText\` with the user's input. This could be:
- A simple transaction: "@record Coffee at Starbucks ₹250"
- An order receipt with multiple items (from Amazon, Blinkit, Zepto, Swiggy, etc.)
- Bill summaries with discounts, delivery fees, etc.

### Step 2: Extract & Analyze Items
From the raw text, intelligently extract:
1. **Individual items**: name, quantity, unit (if applicable), unit price, total price
2. **Transaction total**: The final amount paid (look for "You pay", "Total", "Grand Total")
3. **Discounts**: Any savings or discounts applied
4. **Extra fees**: Delivery fees, handling charges, etc.
5. **Merchant**: Identify the store/platform from context

### Step 3: Suggest Categories
For each item and the overall transaction, suggest appropriate categories based on:
- Item names (e.g., "Ice Cream" → Groceries, "Muffin" → Bakery/Groceries)
- Merchant type (e.g., Swiggy → Food & Dining, Amazon → Shopping)
- Use the \`suggestCategoryForItem\` tool for better matching

### Step 4: Present for Confirmation
Show the user a clear summary table:

**📝 Transaction Summary**
| # | Item | Qty | Price | Category |
|---|------|-----|-------|----------|
| 1 | Amul Ice Cream | 1 L | ₹210 | Groceries |
| 2 | Choco Muffin | 1 | ₹31 | Groceries |

**💰 Bill Details**
- Items Total: ₹426
- Delivery: Free
- **You Pay: ₹426**

**🏷️ Main Category:** Groceries
**📅 Date:** 2026-02-01
**🏪 Merchant:** Blinkit

Ask: "Should I save this transaction? You can also change the category by telling me."

### Step 5: Handle User Response
- If user says **"yes"**, **"save"**, **"confirm"**: Call \`saveTransaction\` with the data
- If user wants to **change category**: Update and show again
- If user says **"no"** or **"cancel"**: Acknowledge and don't save

### Step 6: Confirm Save
After saving, show confirmation:
"✅ Transaction saved! ₹426 recorded under Groceries for Feb 1, 2026."

### Special Cases:
- **Multiple unrelated transactions**: Use \`saveBulkTransactions\`
- **Single item transactions**: Don't need to save expense_items, just the main expense
- **Order with multiple items**: Save as one expense with expense_items for detail tracking

## Date Handling Rules
- When user says "this month", use the dateRanges.thisMonth from getUserContext
- When user says "last month", use the dateRanges.lastMonth from getUserContext
- When user says "this week", use the dateRanges.thisWeek from getUserContext
- ALWAYS use the exact startDate and endDate from these pre-calculated ranges
- NEVER assume or hardcode dates - always use the context provided

## Response Formatting Guidelines
Present data in a clear, organized manner using these formats:

### For Category Breakdowns - Use Tables:
| Category | Amount | % of Total | Transactions |
|----------|--------|------------|--------------|
| Groceries | $450.00 | 25.5% | 12 |
| Dining | $320.00 | 18.1% | 8 |

### For Budget Status - Use Tables with Status Indicators:
| Budget | Allocated | Spent | Remaining | Status |
|--------|-----------|-------|-----------|--------|
| Groceries | $500 | $450 | $50 | ⚠️ 90% used |
| Entertainment | $200 | $150 | $50 | ✅ On track |

### For Comparisons - Use Clear Sections:
**📊 This Month vs Last Month**
- Current: $2,500 (45 transactions)
- Previous: $2,100 (38 transactions)  
- Change: +$400 (+19.0%) 📈

### Status Indicators:
- ✅ ON_TRACK - Under 70% of budget
- ⚠️ WARNING - 70-90% of budget  
- 🔴 EXCEEDED - Over 100% of budget
- 📈 INCREASED - Spending went up
- 📉 DECREASED - Spending went down
- 💰 SURPLUS - Positive cash flow
- 🔻 DEFICIT - Negative cash flow

## Response Structure
1. **Summary** - Start with a brief overview of key findings
2. **Detailed Data** - Present data in tables when there are 3+ items
3. **Insights** - Provide 2-3 actionable insights based on the data
4. **Recommendations** - If relevant, suggest actions the user could take

## Budget Awareness
- Always check budget status when discussing spending
- Warn users if they're approaching or exceeding budgets
- Compare spending against budgets when relevant
- Highlight categories that are over budget

## Currency Handling
- ALWAYS display amounts in the user's preferred currency
- Include the currency symbol before amounts
- Format numbers with proper thousands separators when needed

## Example Responses

**Good Response:**
"Based on your spending this month (January 2026), here's your breakdown:

**📊 Spending Summary**
- Total Spent: $2,450.00
- Transactions: 42
- Daily Average: $79.03

**📋 Top Categories**
| Category | Amount | % of Total |
|----------|--------|------------|
| Groceries | $580.00 | 23.7% |
| Dining | $420.00 | 17.1% |
| Utilities | $350.00 | 14.3% |

**⚠️ Budget Alert**
Your Dining budget is at 84% - consider reducing restaurant visits.

**💡 Insights**
1. Groceries remain your largest expense at nearly 1/4 of spending
2. Dining spending is up 15% from last month"

Remember: Be concise, use proper formatting, and always provide actionable insights.`,
  tools: insightsTools,
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { messages: uiMessages, conversationId } = await req.json();

    let activeConversationId = conversationId;

    // Create a new conversation if not provided
    if (!activeConversationId) {
      const [newConversation] = await db
        .insert(conversations)
        .values({
          userId: user.id,
          title: uiMessages[0]?.content?.slice(0, 50) || "Financial Insights",
        })
        .returning();
      activeConversationId = newConversation.id;
    }

    // Get the last user message
    const lastUserMessage = uiMessages[uiMessages.length - 1];

    // Save the user message to database
    if (lastUserMessage?.role === "user") {
      await db.insert(messages).values({
        conversationId: activeConversationId,
        role: "user",
        content: lastUserMessage.content,
      });

      // Update conversation updatedAt to bring it to top
      await db
        .update(conversations)
        .set({ updatedAt: new Date() })
        .where(eq(conversations.id, activeConversationId));
    }

    const abortController = new AbortController();

    // Convert messages to the format expected by the agent
    const agentMessages = uiMessages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    const result = await insightsAgent.stream({
      messages: agentMessages,
      abortSignal: abortController.signal,
    });

    let fullText = '';

    const responseStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.textStream) {
            fullText += chunk;
            // Send the chunk as plain text (similar to chat API)
            controller.enqueue(new TextEncoder().encode(chunk));
          }
          controller.close();

          // Save the assistant response to database after streaming
          await db.insert(messages).values({
            conversationId: activeConversationId,
            role: "assistant",
            content: fullText,
          });

          // Update conversation updatedAt to bring it to top
          await db
            .update(conversations)
            .set({
              title: lastUserMessage?.content?.slice(0, 50) || "Financial Insights",
              updatedAt: new Date(),
            })
            .where(eq(conversations.id, activeConversationId));
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(responseStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Conversation-Id': String(activeConversationId),
      },
    });
  } catch (error) {
    console.error("Insights API error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const url = new URL(req.url);
    const conversationId = url.searchParams.get("conversationId");

    if (conversationId) {
      // Get messages for a specific conversation
      const messagesData = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, parseInt(conversationId)))
        .orderBy(messages.createdAt);

      return new Response(JSON.stringify(messagesData), {
        headers: { "Content-Type": "application/json" },
      });
    } else {
      // Get all conversations for the user
      const conversationsData = await db
        .select()
        .from(conversations)
        .where(eq(conversations.userId, user.id))
        .orderBy(desc(conversations.updatedAt));

      return new Response(JSON.stringify(conversationsData), {
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Insights API GET error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const url = new URL(req.url);
    const conversationId = url.searchParams.get("conversationId");

    if (!conversationId) {
      return new Response("Conversation ID required", { status: 400 });
    }

    // Delete messages first
    await db
      .delete(messages)
      .where(eq(messages.conversationId, parseInt(conversationId)));

    // Delete conversation
    await db
      .delete(conversations)
      .where(and(
        eq(conversations.id, parseInt(conversationId)),
        eq(conversations.userId, user.id)
      ));

    return new Response("Conversation deleted", { status: 200 });
  } catch (error) {
    console.error("Insights API DELETE error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}