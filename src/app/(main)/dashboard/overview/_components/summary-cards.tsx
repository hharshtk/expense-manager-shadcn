"use client";

import { CreditCard, DollarSign, PiggyBank, Target } from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface SummaryCardsProps {
  currency?: string;
  data?: {
    income: number;
    expenses: number;
    savings: number;
    savingsRate: number;
    incomeChange?: number;
    expenseChange?: number;
    savingsChange?: number;
  };
}

export function SummaryCards({
  currency = "USD",
  data = { income: 0, expenses: 0, savings: 0, savingsRate: 0, incomeChange: 0, expenseChange: 0, savingsChange: 0 },
}: SummaryCardsProps) {
  const { income, expenses, savings, savingsRate } = data;

  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs dark:*:data-[slot=card]:bg-card sm:grid-cols-2 xl:grid-cols-4">
      {/* Total Expenses Card */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <CreditCard className="size-4 text-muted-foreground" />
            Total Expenses
          </CardDescription>
          <CardTitle className="font-semibold text-2xl tabular-nums @[250px]/card:text-3xl">
            {formatCurrency(expenses, { currency, noDecimals: true })}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Total Income Card */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <DollarSign className="size-4 text-muted-foreground" />
            Total Income
          </CardDescription>
          <CardTitle className="font-semibold text-2xl tabular-nums @[250px]/card:text-3xl">
            {formatCurrency(income, { currency, noDecimals: true })}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Net Savings Card */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <PiggyBank className="size-4 text-muted-foreground" />
            Net Savings
          </CardDescription>
          <CardTitle className="font-semibold text-2xl tabular-nums @[250px]/card:text-3xl">
            {formatCurrency(savings, { currency, noDecimals: true })}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Budget Utilization Card */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <Target className="size-4 text-muted-foreground" />
            Savings Rate
          </CardDescription>
          <CardTitle className="font-semibold text-2xl tabular-nums">
            {savingsRate.toFixed(1)}%
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}
