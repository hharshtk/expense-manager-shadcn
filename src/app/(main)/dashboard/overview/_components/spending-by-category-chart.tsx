"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatCurrency } from "@/lib/utils";

interface SpendingByCategoryChartProps {
  currency?: string;
  data?: { name: string; value: number; color: string }[];
}

export function SpendingByCategoryChart({ currency = "USD", data = [] }: SpendingByCategoryChartProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const totalSpent = data.reduce((acc, curr) => acc + curr.value, 0);

  // Show top 5 or all categories based on expanded state
  const displayData = isExpanded ? data : data.slice(0, 5);

  // Split data into two columns when expanded
  const mid = Math.ceil(displayData.length / 2);
  const leftData = displayData.slice(0, mid);
  const rightData = displayData.slice(mid);

  // Prepare chart data for bar charts
  const chartData = displayData.map(item => ({
    category: item.name,
    spend: item.value,
  }));

  const leftChartData = leftData.map(item => ({
    category: item.name,
    spend: item.value,
  }));

  const rightChartData = rightData.map(item => ({
    category: item.name,
    spend: item.value,
  }));

  const chartConfig = {
    spend: {
      label: "Spend",
      color: "var(--chart-2)",
    },
    label: {
      color: "var(--background)",
    },
  } satisfies ChartConfig;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Spending by Category</CardTitle>
      </CardHeader>
      <CardContent className={isExpanded ? "h-[200px] overflow-hidden" : "flex-1"}>
        {isExpanded ? (
          <div className="grid grid-cols-2 gap-4 h-full">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <BarChart
                accessibilityLayer
                data={leftChartData}
                layout="vertical"
                margin={{
                  right: 16,
                }}
              >
                <CartesianGrid horizontal={false} />
                <YAxis
                  dataKey="category"
                  type="category"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => value.slice(0, 12)}
                  hide
                />
                <XAxis dataKey="spend" type="number" hide />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="line" />}
                />
                <Bar
                  dataKey="spend"
                  layout="vertical"
                  fill="var(--color-spend)"
                  radius={4}
                >
                  <LabelList
                    dataKey="category"
                    position="insideLeft"
                    offset={8}
                    className="fill-(--color-label)"
                    fontSize={12}
                  />
                  <LabelList
                    dataKey="spend"
                    position="right"
                    offset={8}
                    className="fill-foreground"
                    fontSize={12}
                    formatter={(value: number) => formatCurrency(value, { currency, noDecimals: true })}
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
            <ChartContainer config={chartConfig} className="h-full w-full">
              <BarChart
                accessibilityLayer
                data={rightChartData}
                layout="vertical"
                margin={{
                  right: 16,
                }}
              >
                <CartesianGrid horizontal={false} />
                <YAxis
                  dataKey="category"
                  type="category"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => value.slice(0, 12)}
                  hide
                />
                <XAxis dataKey="spend" type="number" hide />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="line" />}
                />
                <Bar
                  dataKey="spend"
                  layout="vertical"
                  fill="var(--color-spend)"
                  radius={4}
                >
                  <LabelList
                    dataKey="category"
                    position="insideLeft"
                    offset={8}
                    className="fill-(--color-label)"
                    fontSize={12}
                  />
                  <LabelList
                    dataKey="spend"
                    position="right"
                    offset={8}
                    className="fill-foreground"
                    fontSize={12}
                    formatter={(value: number) => formatCurrency(value, { currency, noDecimals: true })}
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <BarChart
              accessibilityLayer
              data={chartData}
              layout="vertical"
              margin={{
                right: 16,
              }}
            >
              <CartesianGrid horizontal={false} />
              <YAxis
                dataKey="category"
                type="category"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value) => value.slice(0, 12)}
                hide
              />
              <XAxis dataKey="spend" type="number" hide />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="line" />}
              />
              <Bar
                dataKey="spend"
                layout="vertical"
                fill="var(--color-spend)"
                radius={4}
              >
                <LabelList
                  dataKey="category"
                  position="insideLeft"
                  offset={8}
                  className="fill-(--color-label)"
                  fontSize={12}
                />
                <LabelList
                  dataKey="spend"
                  position="right"
                  offset={8}
                  className="fill-foreground"
                  fontSize={12}
                  formatter={(value: number) => formatCurrency(value, { currency, noDecimals: true })}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          Total spent: {formatCurrency(totalSpent, { currency })} <TrendingUp className="h-4 w-4" />
        </div>
        <div className="text-muted-foreground leading-none">
          {isExpanded ? `All ${data.length} categories` : `Top 5 of ${data.length} categories`}
        </div>
        <div className="flex gap-2 w-full">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Show All
              </>
            )}
          </Button>
          <Button size="sm" variant="outline" className="flex-1">
            View Details
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
