import { notFound, redirect } from "next/navigation";
import { parseISO, startOfMonth, endOfMonth } from "date-fns";

import { getCurrentUser } from "@/lib/auth";
import { getUserSettings } from "@/server/user-settings-actions";
import { getAccountById } from "../_actions/account-actions";
import { AccountDetailDashboard } from "./_components/account-detail-dashboard";
import {
  getAccountTransactions,
  getAccountStatistics,
} from "./_queries/account-detail-queries";

export default async function AccountDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login");
  }

  const accountId = Number.parseInt(resolvedParams.id);
  if (Number.isNaN(accountId)) {
    notFound();
  }

  // Fetch account and user settings
  const [accountResult, settingsResult] = await Promise.all([
    getAccountById(accountId),
    getUserSettings(),
  ]);

  if (!accountResult.success || !accountResult.data) {
    notFound();
  }

  const account = accountResult.data;
  const userSettings = settingsResult.success
    ? settingsResult.data
    : { defaultCurrency: "USD", locale: "en-US", timezone: "UTC", dateFormat: "MM/DD/YYYY" };

  // Parse date range from query params or use current month
  const from = resolvedSearchParams.from ? parseISO(resolvedSearchParams.from) : startOfMonth(new Date());
  const to = resolvedSearchParams.to ? parseISO(resolvedSearchParams.to) : endOfMonth(new Date());

  // Fetch account data for the date range
  const [transactions, statistics] = await Promise.all([
    getAccountTransactions(accountId, from, to),
    getAccountStatistics(accountId, from, to),
  ]);

  return (
    <AccountDetailDashboard
      account={account}
      userSettings={userSettings}
      initialDateRange={{ from, to }}
      data={{
        transactions,
        statistics,
      }}
    />
  );
}
