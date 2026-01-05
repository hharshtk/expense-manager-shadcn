"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, TrendingUp, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface PortfolioSummaryProps {
  summary: {
    totalInvested: number;
    currentValue: number;
    totalGainLoss: number;
    totalGainLossPercent: number;
    investmentCount: number;
    currency?: string;
  };
}

export function PortfolioSummary({ summary }: PortfolioSummaryProps) {
  const isProfit = summary.totalGainLoss >= 0;
  const currency = summary.currency || "USD";

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(summary.totalInvested, { currency })}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Across {summary.investmentCount} investment{summary.investmentCount !== 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Value</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(summary.currentValue, { currency })}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Market value of holdings
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Gain/Loss</CardTitle>
          {isProfit ? (
            <ArrowUpRight className="h-4 w-4 text-green-500" />
          ) : (
            <ArrowDownRight className="h-4 w-4 text-red-500" />
          )}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${isProfit ? "text-green-500" : "text-red-500"}`}>
            {isProfit ? "+" : ""}{formatCurrency(summary.totalGainLoss, { currency })}
          </div>
          <p className={`text-xs mt-1 ${isProfit ? "text-green-500" : "text-red-500"}`}>
            {isProfit ? "+" : ""}{summary.totalGainLossPercent.toFixed(2)}% return
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Portfolio Return</CardTitle>
          <div className={`h-4 w-4 rounded-full ${isProfit ? "bg-green-500" : "bg-red-500"}`} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {summary.totalGainLossPercent.toFixed(2)}%
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {isProfit ? "Profit" : "Loss"} percentage
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
