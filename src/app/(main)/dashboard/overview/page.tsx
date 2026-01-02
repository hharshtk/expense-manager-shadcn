import { getUserDefaultCurrency } from "@/app/(main)/dashboard/budgets/_queries/budget-queries";
import { OverviewDashboard } from "./_components/overview-dashboard";
import {
  getOverviewSummary,
  getExpenseTrends,
  getAccountBalances,
  getRecentTransactions,
  getMonthlyOverview,
  getSpendingByCategory,
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
  const to = resolvedSearchParams.to ? parseISO(resolvedSearchParams.to) : endOfMonth(new Date());

  const [summary, trends, accounts, transactions, monthly, category] = await Promise.all([
    getOverviewSummary(userId, from, to),
    getExpenseTrends(userId, from, to),
    getAccountBalances(userId),
    getRecentTransactions(userId),
    getMonthlyOverview(userId, from, to),
    getSpendingByCategory(userId, from, to),
  ]);

  return (
    <OverviewDashboard
      defaultCurrency={defaultCurrency}
      initialDateRange={{ from, to }}
      data={{
        summary,
        trends,
        accounts,
        transactions,
        monthly,
        category,
      }}
    />
  );
}

