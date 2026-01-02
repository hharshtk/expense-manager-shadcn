"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

import { AccountsAndBillsCards } from "./accounts-and-bills-cards";
import { DateRangeSelector } from "./date-range-selector";
import { MonthlyOverviewChart } from "./monthly-overview-chart";
import { RecentTransactionsCard } from "./recent-transactions-card";
import { SpendingByCategoryChart } from "./spending-by-category-chart";
import { SummaryCards } from "./summary-cards";

interface OverviewDashboardProps {
  defaultCurrency: string;
  initialDateRange: { from: Date; to: Date };
  data: {
    summary: any;
    trends: any;
    accounts: any;
    transactions: any;
    monthly: any;
    category: any;
  };
}

export function OverviewDashboard({ defaultCurrency, initialDateRange, data }: OverviewDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = React.useTransition();

  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(initialDateRange);

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range?.to) {
      const from = range.from;
      const to = range.to;
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("from", format(from, "yyyy-MM-dd"));
        params.set("to", format(to, "yyyy-MM-dd"));
        router.replace(`${pathname}?${params.toString()}`);
      });
    }
  };

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Header Section with Date Range Selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Financial Overview</h1>
          <p className="text-muted-foreground text-sm">
            Track your expenses, income, and budget at a glance
          </p>
        </div>
        <DateRangeSelector dateRange={dateRange} onDateRangeChange={handleDateRangeChange} isLoading={isPending} />
      </div>

      {/* Summary Cards Section */}
      <SummaryCards currency={defaultCurrency} data={data.summary} />

      {/* Charts Section - Row 2 */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <MonthlyOverviewChart currency={defaultCurrency} data={data.monthly} />
        </div>
        <div className="xl:col-span-1">
          <SpendingByCategoryChart currency={defaultCurrency} data={data.category} />
        </div>
      </div>

      {/* Accounts and Bills */}
      <AccountsAndBillsCards currency={defaultCurrency} data={data.accounts} />

      {/* Recent Transactions */}
      <RecentTransactionsCard currency={defaultCurrency} data={data.transactions} />
    </div>
  );
}
