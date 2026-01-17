"use client";

import { Pie, PieChart } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatCurrency } from "@/lib/utils";

interface AccountBalancesChartProps {
  currency?: string;
  data?: {
    id: number;
    name: string;
    type: string;
    balance: number;
    currency: string;
  }[];
}

export function AccountBalancesChart({ currency = "USD", data = [] }: AccountBalancesChartProps) {
  const totalBalance = data.reduce((acc, account) => acc + account.balance, 0);

  // Group accounts by type and sum balances
  const groupedByType = data.reduce((acc, account) => {
    const type = account.type;
    if (!acc[type]) {
      acc[type] = { type, balance: 0, count: 0 };
    }
    acc[type].balance += account.balance;
    acc[type].count += 1;
    return acc;
  }, {} as Record<string, { type: string; balance: number; count: number }>);

  const chartData = Object.values(groupedByType).map((item, index) => ({
    type: item.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    balance: item.balance,
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
        <CardTitle>Account Balances</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[250px]">
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
              dataKey="balance"
              nameKey="type"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              cornerRadius={4}
            />
          </PieChart>
        </ChartContainer>
        {/* Account Type Summary */}
        <div className="mt-4 grid grid-cols-1 gap-2 text-sm">
          {chartData.map((item) => (
            <div key={item.type} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 truncate">
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.fill }} />
                <span className="truncate">{item.type}</span>
                <span className="text-muted-foreground text-xs">({item.count})</span>
              </div>
              <span className="tabular-nums text-muted-foreground">
                {formatCurrency(item.balance, { currency, noDecimals: true })}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}