"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";

import { monthlyOverviewChartConfig } from "./overview.config";

interface MonthlyOverviewChartProps {
  currency?: string;
  data?: { month: string; expenses: number; income: number }[];
}

export function MonthlyOverviewChart({ currency = "USD", data = [] }: MonthlyOverviewChartProps) {
  const totals = data.reduce(
    (acc, item) => ({
      expenses: acc.expenses + item.expenses,
      income: acc.income + item.income,
    }),
    { expenses: 0, income: 0 }
  );

  const count = data.length || 1;
  const avgMonthlyExpenses = Math.round(totals.expenses / count);
  const avgMonthlyIncome = Math.round(totals.income / count);
  const savingsRate = avgMonthlyIncome > 0 ? Math.round(((avgMonthlyIncome - avgMonthlyExpenses) / avgMonthlyIncome) * 100) : 0;

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle>Monthly Overview</CardTitle>
        <CardDescription>Compare income, expenses, and budget allocation</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-start justify-between gap-4 py-4 md:flex-row md:items-stretch">
          <div className="flex flex-1 flex-col items-center justify-center gap-1">
            <p className="text-muted-foreground text-xs uppercase">Avg. Monthly Income</p>
            <p className="font-semibold text-xl tabular-nums text-green-500">
              {formatCurrency(avgMonthlyIncome, { currency, noDecimals: true })}
            </p>
          </div>
          <Separator orientation="vertical" className="hidden h-auto! md:block" />
          <div className="flex flex-1 flex-col items-center justify-center gap-1">
            <p className="text-muted-foreground text-xs uppercase">Avg. Monthly Expenses</p>
            <p className="font-semibold text-xl tabular-nums text-destructive">
              {formatCurrency(avgMonthlyExpenses, { currency, noDecimals: true })}
            </p>
          </div>
          <Separator orientation="vertical" className="hidden h-auto! md:block" />
          <div className="flex flex-1 flex-col items-center justify-center gap-1">
            <p className="text-muted-foreground text-xs uppercase">Savings Rate</p>
            <p className="font-semibold text-xl tabular-nums text-blue-500">{savingsRate}%</p>
          </div>
        </div>
        <Separator className="mb-4" />
        <ChartContainer config={monthlyOverviewChartConfig} className="max-h-[280px] w-full">
          <BarChart data={data} margin={{ left: -20, right: 0, top: 10, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickMargin={8}
              tickFormatter={(value) => formatCurrency(value, { currency, noDecimals: true })}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => (
                    <div className="flex min-w-[130px] items-center gap-2 text-xs text-muted-foreground">
                      {monthlyOverviewChartConfig[name as keyof typeof monthlyOverviewChartConfig]?.label || name}
                      <div className="ml-auto flex items-baseline gap-0.5 font-mono font-medium tabular-nums text-foreground">
                        {formatCurrency(Number(value), { currency })}
                      </div>
                    </div>
                  )}
                />
              }
            />
            <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" fill="var(--color-expenses)" radius={[4, 4, 0, 0]} />
            <ChartLegend content={<ChartLegendContent />} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
