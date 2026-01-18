"use client";

import { ArrowDownLeft, ArrowUpRight, Banknote, TrendingUp, Wallet } from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface SummaryCardsProps {
  currency?: string;
  data?: {
    income: number;
    expenses: number;
    savings: number;
    cashInHand: number;
    netWorth: number;
    investmentValue: number;
  };
}

export function SummaryCards({
  currency = "USD",
  data = { income: 0, expenses: 0, savings: 0, cashInHand: 0, netWorth: 0, investmentValue: 0 },
}: SummaryCardsProps) {
  const { income, expenses, savings, cashInHand, netWorth, investmentValue } = data;

  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs dark:*:data-[slot=card]:bg-card sm:grid-cols-2 xl:grid-cols-6">
      {/* Cash in Hand Card */}
      <Card className="@container/card">
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <Wallet className="size-4 text-muted-foreground" />
            Cash in Hand
          </CardDescription>
          <CardTitle className="font-semibold text-2xl tabular-nums @[250px]/card:text-3xl">
            {formatCurrency(cashInHand, { currency, noDecimals: true })}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Total Income Card */}
      <Card className="@container/card">
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <ArrowDownLeft className="size-4 text-muted-foreground" />
            Income
          </CardDescription>
          <CardTitle className="font-semibold text-2xl tabular-nums @[250px]/card:text-3xl">
            {formatCurrency(income, { currency, noDecimals: true })}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Total Expenses Card */}
      <Card className="@container/card">
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <ArrowUpRight className="size-4 text-muted-foreground" />
            Expenses
          </CardDescription>
          <CardTitle className="font-semibold text-2xl tabular-nums @[250px]/card:text-3xl">
            {formatCurrency(expenses, { currency, noDecimals: true })}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Net Savings Card */}
      <Card className="@container/card">
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <Banknote className="size-4 text-muted-foreground" />
            Net Savings
          </CardDescription>
          <CardTitle className="font-semibold text-2xl tabular-nums @[250px]/card:text-3xl">
            {formatCurrency(savings, { currency, noDecimals: true })}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Investments Card */}
      <Card className="@container/card">
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <TrendingUp className="size-4 text-muted-foreground" />
            Investments
          </CardDescription>
          <CardTitle className="font-semibold text-2xl tabular-nums @[250px]/card:text-3xl">
            {formatCurrency(investmentValue, { currency, noDecimals: true })}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Net Worth Card */}
      <Card className="@container/card">
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <div className="size-4 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-[10px] font-bold text-primary">$</span>
            </div>
            Net Worth
          </CardDescription>
          <CardTitle className="font-semibold text-2xl tabular-nums @[250px]/card:text-3xl">
            {formatCurrency(netWorth, { currency, noDecimals: true })}
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}
