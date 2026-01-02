"use client";

import { ArrowDownLeft, ArrowUpRight, PiggyBank, Target, TrendingDown, TrendingUp, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface SummaryCardsProps {
  currency?: string;
  data?: {
    income: number;
    expenses: number;
    savings: number;
    savingsRate: number;
  };
}

export function SummaryCards({
  currency = "USD",
  data = { income: 0, expenses: 0, savings: 0, savingsRate: 0 },
}: SummaryCardsProps) {
  const { income, expenses, savings, savingsRate } = data;

  // Mock change values for now as I didn't implement comparison query yet
  const expenseChange = 0;
  const incomeChange = 0;
  const savingsChange = 0;

  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs dark:*:data-[slot=card]:bg-card sm:grid-cols-2 xl:grid-cols-4">
      {/* Total Expenses Card */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-destructive/10">
              <ArrowUpRight className="size-4 text-destructive" />
            </div>
            Total Expenses
          </CardDescription>
          <CardTitle className="font-semibold text-2xl tabular-nums @[250px]/card:text-3xl">
            {formatCurrency(expenses, { currency, noDecimals: true })}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={expenseChange < 0 ? "text-green-500" : "text-destructive"}>
              {expenseChange < 0 ? <TrendingDown className="size-3" /> : <TrendingUp className="size-3" />}
              {Math.abs(expenseChange)}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {expenseChange < 0 ? "Spending decreased" : "Spending increased"}
            {expenseChange < 0 ? (
              <TrendingDown className="size-4 text-green-500" />
            ) : (
              <TrendingUp className="size-4 text-destructive" />
            )}
          </div>
          <div className="text-muted-foreground">Compared to previous period</div>
        </CardFooter>
      </Card>

      {/* Total Income Card */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-green-500/10">
              <ArrowDownLeft className="size-4 text-green-500" />
            </div>
            Total Income
          </CardDescription>
          <CardTitle className="font-semibold text-2xl tabular-nums @[250px]/card:text-3xl">
            {formatCurrency(income, { currency, noDecimals: true })}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={incomeChange >= 0 ? "text-green-500" : "text-destructive"}>
              {incomeChange >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              {incomeChange >= 0 ? "+" : ""}
              {incomeChange}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {incomeChange >= 0 ? "Income growing" : "Income decreased"}
            {incomeChange >= 0 ? (
              <TrendingUp className="size-4 text-green-500" />
            ) : (
              <TrendingDown className="size-4 text-destructive" />
            )}
          </div>
          <div className="text-muted-foreground">Compared to previous period</div>
        </CardFooter>
      </Card>

      {/* Net Savings Card */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
              <PiggyBank className="size-4 text-primary" />
            </div>
            Net Savings
          </CardDescription>
          <CardTitle className="font-semibold text-2xl tabular-nums @[250px]/card:text-3xl">
            {formatCurrency(savings, { currency, noDecimals: true })}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={savingsChange >= 0 ? "text-green-500" : "text-destructive"}>
              {savingsChange >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              {savingsChange >= 0 ? "+" : ""}
              {savingsChange}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {savingsChange >= 0 ? "Savings growing" : "Savings decreased"}
            {savingsChange >= 0 ? (
              <TrendingUp className="size-4 text-green-500" />
            ) : (
              <TrendingDown className="size-4 text-destructive" />
            )}
          </div>
          <div className="text-muted-foreground">Compared to previous period</div>
        </CardFooter>
      </Card>

      {/* Budget Utilization Card */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-orange-500/10">
              <Target className="size-4 text-orange-500" />
            </div>
            Savings Rate
          </CardDescription>
          <CardTitle className="font-semibold text-2xl tabular-nums @[250px]/card:text-3xl">
            {savingsRate.toFixed(1)}%
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-muted-foreground">
              <Wallet className="size-3" />
              Target: 20%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {savingsRate >= 20 ? "On track" : "Below target"}
            {savingsRate >= 20 ? (
              <TrendingUp className="size-4 text-green-500" />
            ) : (
              <TrendingDown className="size-4 text-orange-500" />
            )}
          </div>
          <div className="text-muted-foreground">Based on income vs expenses</div>
        </CardFooter>
      </Card>
    </div>
  );
}
