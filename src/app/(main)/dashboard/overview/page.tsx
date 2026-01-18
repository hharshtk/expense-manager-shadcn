import { getUserDefaultCurrency } from "@/app/(main)/dashboard/budgets/_queries/budget-queries";
import { OverviewDashboard } from "./_components/overview-dashboard";
import {
  getOverviewSummary,
  getExpenseTrends,
  getAccountBalances,
  getRecentTransactions,
  getMonthlyOverview,
  getSpendingByCategory,
  getCashAndNetWorth,
} from "./_queries/overview-queries";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { startOfMonth, endOfMonth, parseISO } from "date-fns";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login");
  }
  const userId = user.id;

  const defaultCurrency = await getUserDefaultCurrency();

  const from = resolvedSearchParams.from ? parseISO(resolvedSearchParams.from) : startOfMonth(new Date());
  const to = resolvedSearchParams.to ? parseISO(resolvedSearchParams.to) : new Date();

  const [summary, trends, accounts, transactions, monthly, category, cashNetWorth] = await Promise.all([
    getOverviewSummary(userId, from, to),
    getExpenseTrends(userId, from, to),
    getAccountBalances(userId),
    getRecentTransactions(userId),
    getMonthlyOverview(userId, from, to),
    getSpendingByCategory(userId, from, to),
    getCashAndNetWorth(userId),
  ]);

  // Combine summary with cash and net worth data
  const enrichedSummary = {
    income: summary.income,
    expenses: summary.expenses,
    savings: summary.savings,
    cashInHand: cashNetWorth.cashInHand,
    netWorth: cashNetWorth.netWorth,
    investmentValue: cashNetWorth.investmentValue,
  };

  return (
    <OverviewDashboard
      defaultCurrency={defaultCurrency}
      initialDateRange={{ from, to }}
      data={{
        summary: enrichedSummary,
        trends,
        accounts,
        transactions,
        monthly,
        category,
      }}
    />
  );
}

