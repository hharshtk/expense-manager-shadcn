"use client";

import { useMemo } from "react";

import { TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { BudgetWithProgress } from "../_queries/budget-queries";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency";

interface BudgetOverviewChartProps {
  budgets: BudgetWithProgress[];
  userCurrency: string;
}

export function BudgetOverviewChart({ budgets, userCurrency }: BudgetOverviewChartProps) {
  const chartData = useMemo(() => {
    // Group budgets by status
    const activeBudgets = budgets.filter((b) => b.isActive);

    return activeBudgets
      .slice(0, 6) // Show top 6 budgets
      .map((budget) => ({
        name: budget.name.length > 15 ? `${budget.name.slice(0, 12)}...` : budget.name,
        spent: budget.spent,
        budget: Number.parseFloat(budget.amount),
        remaining: budget.remaining,
        percentUsed: budget.percentUsed,
      }));
  }, [budgets]);

  const totals = useMemo(() => {
    const activeBudgets = budgets.filter((b) => b.isActive);
    const totalBudget = activeBudgets.reduce((sum, b) => sum + Number.parseFloat(b.amount), 0);
    const totalSpent = activeBudgets.reduce((sum, b) => sum + b.spent, 0);
    const totalRemaining = activeBudgets.reduce((sum, b) => sum + b.remaining, 0);
    const avgPercentUsed = activeBudgets.length > 0
      ? activeBudgets.reduce((sum, b) => sum + b.percentUsed, 0) / activeBudgets.length
      : 0;
    const overBudgetCount = activeBudgets.filter((b) => b.isOverBudget).length;
    const nearThresholdCount = activeBudgets.filter((b) => b.isNearThreshold && !b.isOverBudget).length;

    return {
      totalBudget,
      totalSpent,
      totalRemaining,
      avgPercentUsed,
      overBudgetCount,
      nearThresholdCount,
      activeBudgets: activeBudgets.length,
    };
  }, [budgets]);

  if (budgets.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Summary Cards */}
      <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50">
        <CardHeader className="pb-2">
          <CardDescription className="text-emerald-700 dark:text-emerald-300">
            Total Budget
          </CardDescription>
          <CardTitle className="text-2xl text-emerald-900 dark:text-emerald-100">
            {formatCurrency(totals.totalBudget, userCurrency)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Across {totals.activeBudgets} active budget{totals.activeBudgets !== 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50">
        <CardHeader className="pb-2">
          <CardDescription className="text-blue-700 dark:text-blue-300">
            Total Spent
          </CardDescription>
          <CardTitle className="text-2xl text-blue-900 dark:text-blue-100">
            {formatCurrency(totals.totalSpent, userCurrency)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <TrendingUp className="size-3" />
            <span>{totals.avgPercentUsed.toFixed(0)}% average usage</span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/50 dark:to-purple-950/50">
        <CardHeader className="pb-2">
          <CardDescription className="text-violet-700 dark:text-violet-300">
            Remaining
          </CardDescription>
          <CardTitle className="text-2xl text-violet-900 dark:text-violet-100">
            {formatCurrency(totals.totalRemaining, userCurrency)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Available to spend</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50">
        <CardHeader className="pb-2">
          <CardDescription className="text-amber-700 dark:text-amber-300">
            Alerts
          </CardDescription>
          <CardTitle className="text-2xl text-amber-900 dark:text-amber-100">
            {totals.overBudgetCount + totals.nearThresholdCount}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            {totals.overBudgetCount} over • {totals.nearThresholdCount} near limit
          </p>
        </CardContent>
      </Card>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>Budget Progress Overview</CardTitle>
            <CardDescription>
              Comparison of spent vs budgeted amounts across your active budgets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorBudget" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    className="fill-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => formatCurrency(value, userCurrency)}
                    className="fill-muted-foreground"
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload) return null;
                      return (
                        <div className="rounded-lg border bg-background p-3 shadow-lg">
                          <p className="mb-2 font-medium">{label}</p>
                          {payload.map((entry, index) => (
                            <p
                              key={index}
                              className="text-sm"
                              style={{ color: entry.color }}
                            >
                              {entry.name}: {formatCurrency(Number(entry.value), userCurrency)}
                            </p>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="budget"
                    name="Budget"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#colorBudget)"
                  />
                  <Area
                    type="monotone"
                    dataKey="spent"
                    name="Spent"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#colorSpent)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
