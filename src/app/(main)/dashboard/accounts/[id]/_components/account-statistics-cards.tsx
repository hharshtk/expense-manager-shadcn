import { ArrowDownLeft, ArrowUpRight, TrendingDown, TrendingUp, Activity, Wallet } from "lucide-react";

import { Card, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";
import type { UserSettings } from "@/server/user-settings-actions";
import type { FinancialAccount } from "@/lib/schema";
import { cn, formatCurrency } from "@/lib/utils";

interface AccountStatisticsCardsProps {
  account: FinancialAccount;
  statistics: {
    totalIncome: string;
    totalExpense: string;
    netChange: string;
    transactionCount: number;
  };
  userSettings: UserSettings;
  currency: string;
}

export function AccountStatisticsCards({
  account,
  statistics,
  userSettings,
  currency,
}: AccountStatisticsCardsProps) {
  const totalIncome = Number.parseFloat(statistics.totalIncome);
  const totalExpense = Number.parseFloat(statistics.totalExpense);
  const netChange = Number.parseFloat(statistics.netChange);
  const currentBalance = Number.parseFloat(account.currentBalance || "0");

  const format = (amount: number) =>
    formatCurrency(amount, {
      currency,
      locale: userSettings.locale,
    });

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs dark:*:data-[slot=card]:bg-card">
      <Card className="@container/card py-0 gap-0 min-h-0">
        <CardHeader className="py-2.5 px-3 gap-0.5">
          <CardDescription className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest">Current Balance</span>
            <Wallet className="h-3.5 w-3.5 opacity-70" />
          </CardDescription>
          <CardTitle className="text-lg font-bold tabular-nums tracking-tight">
            {format(currentBalance)}
          </CardTitle>
        </CardHeader>
      </Card>

      <Card className="@container/card py-0 gap-0 min-h-0">
        <CardHeader className="py-2.5 px-3 gap-0.5">
          <CardDescription className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest">Income</span>
            <ArrowUpRight className="h-3.5 w-3.5 opacity-70" />
          </CardDescription>
          <CardTitle className="text-lg font-bold tabular-nums tracking-tight">
            {format(totalIncome)}
          </CardTitle>
        </CardHeader>
      </Card>

      <Card className="@container/card py-0 gap-0 min-h-0">
        <CardHeader className="py-2.5 px-3 gap-0.5">
          <CardDescription className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest">Expenses</span>
            <ArrowDownLeft className="h-3.5 w-3.5 opacity-70" />
          </CardDescription>
          <CardTitle className="text-lg font-bold tabular-nums tracking-tight">
            {format(totalExpense)}
          </CardTitle>
        </CardHeader>
      </Card>

      <Card className="@container/card py-0 gap-0 min-h-0">
        <CardHeader className="py-2.5 px-3 gap-0.5">
          <CardDescription className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest">Net Change</span>
            {netChange >= 0 ? (
              <TrendingUp className="h-3.5 w-3.5 opacity-70" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 opacity-70" />
            )}
          </CardDescription>
          <CardTitle className="text-lg font-bold tabular-nums tracking-tight">
            {netChange >= 0 ? "+" : ""}
            {format(netChange)}
          </CardTitle>
        </CardHeader>
      </Card>

      <Card className="@container/card py-0 gap-0 min-h-0">
        <CardHeader className="py-2.5 px-3 gap-0.5">
          <CardDescription className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest">Transactions</span>
            <Activity className="h-3.5 w-3.5 opacity-70" />
          </CardDescription>
          <CardTitle className="text-lg font-bold tabular-nums tracking-tight">
            {statistics.transactionCount}
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}
