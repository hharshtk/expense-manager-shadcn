"use client";

import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn, formatCurrency } from "@/lib/utils";

import { insightsData } from "./overview.config";

interface BudgetProgressCardsProps {
  currency?: string;
  data?: {
    id: number;
    name: string;
    category: string;
    color: string;
    spent: number;
    total: number;
    percentage: number;
  }[];
}

export function BudgetProgressCards({ currency = "USD", data = [] }: BudgetProgressCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {/* Budget Progress Card */}
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle>Budget Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-4">No active budgets found.</div>
            ) : (
              data.map((item) => (
                <div key={item.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{item.name}</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-muted-foreground">
                        {formatCurrency(item.spent, { currency, noDecimals: true })} / {formatCurrency(item.total, { currency, noDecimals: true })}
                      </span>
                      <span
                        className={cn(
                          "text-xs font-medium tabular-nums",
                          item.percentage >= 90
                            ? "text-destructive"
                            : item.percentage >= 75
                              ? "text-yellow-500"
                              : "text-green-500"
                        )}
                      >
                        {item.percentage.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <Progress
                    value={item.percentage}
                    className={cn(
                      "[&>div]:transition-all",
                      item.percentage >= 90
                        ? "[&>div]:bg-destructive"
                        : item.percentage >= 75
                          ? "[&>div]:bg-yellow-500"
                          : "[&>div]:bg-green-500"
                    )}
                  />
                </div>
              ))
            )}
          </div>
          <Button variant="outline" size="sm" className="mt-4 w-full">
            View All Budgets
          </Button>
        </CardContent>
      </Card>

      {/* Insights & Alerts Card */}
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle>Insights & Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {insightsData.map((insight) => (
              <div
                key={insight.id}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3",
                  insight.type === "warning" && "border-yellow-500/20 bg-yellow-500/5",
                  insight.type === "success" && "border-green-500/20 bg-green-500/5",
                  insight.type === "info" && "border-blue-500/20 bg-blue-500/5"
                )}
              >
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full",
                    insight.type === "warning" && "bg-yellow-500/10",
                    insight.type === "success" && "bg-green-500/10",
                    insight.type === "info" && "bg-blue-500/10"
                  )}
                >
                  {insight.type === "warning" && <AlertTriangle className="size-4 text-yellow-500" />}
                  {insight.type === "success" && <CheckCircle2 className="size-4 text-green-500" />}
                  {insight.type === "info" && <Info className="size-4 text-blue-500" />}
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">{insight.title}</p>
                  <p className="text-xs text-muted-foreground">{insight.message}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
