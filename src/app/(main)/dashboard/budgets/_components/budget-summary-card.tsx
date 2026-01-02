"use client";

import { TrendingUp } from "lucide-react";

import type { BudgetWithProgress } from "../_queries/budget-queries";

import { getCurrencySymbol } from "@/lib/currency";

interface BudgetSummaryCardProps {
  budgets: BudgetWithProgress[];
  userCurrency: string;
}

export function BudgetSummaryCard({ budgets, userCurrency }: BudgetSummaryCardProps) {
  const activeBudgets = budgets.filter((b) => b.isActive);
  const totalBudget = activeBudgets.reduce((sum, b) => sum + Number.parseFloat(b.amount), 0);
  const totalSpent = activeBudgets.reduce((sum, b) => sum + b.spent, 0);
  const totalRemaining = activeBudgets.reduce((sum, b) => sum + b.remaining, 0);
  const avgPercentUsed = activeBudgets.length > 0
    ? activeBudgets.reduce((sum, b) => sum + b.percentUsed, 0) / activeBudgets.length
    : 0;
  const overBudgetCount = activeBudgets.filter((b) => b.isOverBudget).length;
  const nearThresholdCount = activeBudgets.filter((b) => b.isNearThreshold && !b.isOverBudget).length;

  const currencySymbol = getCurrencySymbol(userCurrency);

  if (budgets.length === 0) {
    return null;
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card to-muted/30 p-5 shadow-sm">
      {/* Decorative background element */}
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/5 blur-2xl" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
              Total Budget
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-medium text-muted-foreground/60">{currencySymbol}</span>
            <span className="text-3xl font-bold tracking-tight tabular-nums">
              {totalBudget.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <TrendingUp className="size-3" />
            <span>{avgPercentUsed.toFixed(0)}% average usage</span>
          </div>
        </div>

        <div className="flex items-center gap-6 sm:gap-8">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
              Spent
            </span>
            <span className="text-lg font-bold tabular-nums">
              {currencySymbol}{totalSpent.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
              Remaining
            </span>
            <span className="text-lg font-bold tabular-nums">
              {currencySymbol}{totalRemaining.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
              Active
            </span>
            <span className="text-lg font-bold tabular-nums">{activeBudgets.length}</span>
          </div>
          {(overBudgetCount > 0 || nearThresholdCount > 0) && (
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                Alerts
              </span>
              <span className="text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400">
                {overBudgetCount + nearThresholdCount}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
