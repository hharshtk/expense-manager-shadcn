"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { ArrowLeft, Edit, Settings } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { FinancialAccount } from "@/lib/schema";
import type { UserSettings } from "@/server/user-settings-actions";
import { DateRangeSelector } from "../../../overview/_components/date-range-selector";
import { AccountHeader } from "./account-header";
import { AccountStatisticsCards } from "./account-statistics-cards";
import { AccountTransactionsTable } from "./account-transactions-table";
import { EditAccountDialog } from "../../_components/edit-account-dialog";

interface AccountDetailDashboardProps {
  account: FinancialAccount;
  userSettings: UserSettings;
  initialDateRange: { from: Date; to: Date };
  data: {
    transactions: any[];
    statistics: {
      totalIncome: string;
      totalExpense: string;
      netChange: string;
      transactionCount: number;
    };
  };
}

export function AccountDetailDashboard({
  account,
  userSettings,
  initialDateRange,
  data,
}: AccountDetailDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = React.useTransition();
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [currentAccount, setCurrentAccount] = React.useState(account);

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

  const handleAccountUpdate = (updatedAccount: FinancialAccount) => {
    setCurrentAccount(updatedAccount);
  };

  return (
    <div className="@container/main flex flex-col gap-3">
      {/* Header with Back Button, Account Info, and Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
            <Link href="/dashboard/accounts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <AccountHeader account={currentAccount} userSettings={userSettings} />
        </div>

        <div className="flex items-center gap-2 ml-10 sm:ml-0">
          <DateRangeSelector
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
            isLoading={isPending}
          />
          <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)} className="h-9">
            <Settings className="h-3.5 w-3.5 mr-1.5" />
            Edit
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <AccountStatisticsCards
        account={currentAccount}
        statistics={data.statistics}
        userSettings={userSettings}
        currency={currentAccount.currency || userSettings.defaultCurrency}
      />

      {/* Transactions Table */}
      <AccountTransactionsTable
        transactions={data.transactions}
        userSettings={userSettings}
        currency={currentAccount.currency || userSettings.defaultCurrency}
      />

      {/* Edit Account Dialog */}
      <EditAccountDialog
        account={currentAccount}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={handleAccountUpdate}
      />
    </div>
  );
}
