"use client";

import { Label, Pie, PieChart } from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatCurrency } from "@/lib/utils";

interface SpendingByCategoryChartProps {
  currency?: string;
  data?: { name: string; value: number; color: string }[];
}

export function SpendingByCategoryChart({ currency = "USD", data = [] }: SpendingByCategoryChartProps) {
  const totalSpent = data.reduce((acc, curr) => acc + curr.value, 0);

  // Generate chart config dynamically
  const chartConfig = data.reduce((acc, item) => {
    acc[item.name] = {
      label: item.name,
      color: item.color,
    };
    return acc;
  }, {} as Record<string, { label: string; color: string }>);

  const chartData = data.map(item => ({
    category: item.name,
    amount: item.value,
    fill: item.color,
  }));

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Spending by Category</CardTitle>
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
              dataKey="amount"
              nameKey="category"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              cornerRadius={4}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground font-bold text-2xl tabular-nums"
                        >
                          {formatCurrency(totalSpent, { currency, noDecimals: true })}
                        </tspan>
                        <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 24} className="fill-muted-foreground text-sm">
                          Total Spent
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
        {/* Custom Legend */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            {chartData.slice(0, 6).map((item) => (
                <div key={item.category} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                        <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.fill }} />
                        <span className="truncate">{item.category}</span>
                    </div>
                    <span className="tabular-nums text-muted-foreground">{formatCurrency(item.amount, { currency, noDecimals: true })}</span>
                </div>
            ))}
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button size="sm" variant="outline" className="flex-1">
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
}
