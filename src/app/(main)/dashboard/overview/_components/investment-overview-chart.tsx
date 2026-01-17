"use client";

import { Pie, PieChart } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface InvestmentOverviewChartProps {
  currency?: string;
  data?: {
    summary: {
      totalInvested: number;
      totalCurrentValue: number;
      totalGainLoss: number;
      totalGainLossPercent: number;
      portfolioCount: number;
      totalInvestmentCount: number;
    };
    typeDistribution: {
      type: string;
      value: number;
      count: number;
    }[];
  };
}

export function InvestmentOverviewChart({ currency = "USD", data }: InvestmentOverviewChartProps) {
  if (!data || data.summary.totalInvestmentCount === 0) {
    return (
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>Investment Overview</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">No investments found</p>
            <p className="text-xs mt-1">Start building your portfolio</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { summary, typeDistribution } = data;
  const isProfit = summary.totalGainLoss >= 0;

  // Prepare chart data for investment types
  const chartData = typeDistribution.map((item, index) => ({
    type: item.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value: item.value,
    count: item.count,
    fill: `hsl(var(--chart-${(index % 5) + 1}))`,
  }));

  const chartConfig = chartData.reduce((acc, item) => {
    acc[item.type.toLowerCase().replace(' ', '_')] = {
      label: item.type,
      color: item.fill,
    };
    return acc;
  }, {} as Record<string, { label: string; color: string }>);

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Investment Overview</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[200px]">
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(value, name) => (
                    <div className="flex min-w-[130px] items-center gap-2 text-xs text-muted-foreground">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: chartConfig[name as string]?.color }}
                      />
                      {name}
                      <div className="ml-auto flex items-baseline gap-0.5 font-mono font-medium tabular-nums text-foreground">
                        {formatCurrency(Number(value), { currency })}
                      </div>
                    </div>
                  )}
                />
              }
            />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="type"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              cornerRadius={4}
            />
          </PieChart>
        </ChartContainer>

        {/* Investment Summary */}
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total Value</p>
              <p className="font-semibold">{formatCurrency(summary.totalCurrentValue, { currency })}</p>
            </div>
            <div>
              <p className="text-muted-foreground flex items-center gap-1">
                {isProfit ? <TrendingUp className="h-3 w-3 text-green-500" /> : <TrendingDown className="h-3 w-3 text-red-500" />}
                P&L
              </p>
              <p className={`font-semibold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                {isProfit ? '+' : ''}{formatCurrency(summary.totalGainLoss, { currency })}
                ({isProfit ? '+' : ''}{summary.totalGainLossPercent.toFixed(1)}%)
              </p>
            </div>
          </div>

          {/* Investment Types */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">By Type</p>
            {chartData.slice(0, 4).map((item) => (
              <div key={item.type} className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 truncate">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.fill }} />
                  <span className="truncate">{item.type}</span>
                  <span className="text-muted-foreground">({item.count})</span>
                </div>
                <span className="tabular-nums text-muted-foreground">
                  {formatCurrency(item.value, { currency, noDecimals: true })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}