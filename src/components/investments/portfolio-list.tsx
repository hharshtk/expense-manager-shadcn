"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Briefcase,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Investment, Portfolio } from "@/lib/schema";

interface PortfolioWithStats extends Portfolio {
  totalInvested: number;
  currentValue: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  dayGainLoss: number;
  dayGainLossPercent: number;
  holdingsCount: number;
}

interface PortfolioListProps {
  portfolios: Portfolio[];
  investments: Investment[];
  currency: string;
}

export function PortfolioList({ portfolios, investments, currency }: PortfolioListProps) {
  // Calculate stats for each portfolio
  const portfoliosWithStats = useMemo(() => {
    return portfolios.map((portfolio) => {
      const portfolioInvestments = investments.filter(
        (inv) => inv.portfolioId === portfolio.id && inv.isActive
      );

      let totalInvested = 0;
      let currentValue = 0;
      let totalGainLoss = 0;
      let dayGainLoss = 0;
      let previousDayValue = 0;

      for (const inv of portfolioInvestments) {
        totalInvested += Number(inv.totalInvested || 0);
        currentValue += Number(inv.currentValue || 0);
        totalGainLoss += Number(inv.totalGainLoss || 0);
        const invDayGainLoss = Number(inv.dayGainLoss || 0);
        dayGainLoss += invDayGainLoss;
        previousDayValue += Number(inv.currentValue || 0) - invDayGainLoss;
      }

      return {
        ...portfolio,
        totalInvested,
        currentValue,
        totalGainLoss,
        totalGainLossPercent: totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0,
        dayGainLoss,
        dayGainLossPercent: previousDayValue > 0 ? (dayGainLoss / previousDayValue) * 100 : 0,
        holdingsCount: portfolioInvestments.length,
      } as PortfolioWithStats;
    });
  }, [portfolios, investments]);

  // Calculate total portfolio stats
  const totalStats = useMemo(() => {
    let totalInvested = 0;
    let currentValue = 0;
    let totalGainLoss = 0;
    let dayGainLoss = 0;
    let previousDayValue = 0;

    for (const inv of investments.filter(i => i.isActive)) {
      totalInvested += Number(inv.totalInvested || 0);
      currentValue += Number(inv.currentValue || 0);
      totalGainLoss += Number(inv.totalGainLoss || 0);
      const invDayGainLoss = Number(inv.dayGainLoss || 0);
      dayGainLoss += invDayGainLoss;
      previousDayValue += Number(inv.currentValue || 0) - invDayGainLoss;
    }

    return {
      totalInvested,
      currentValue,
      totalGainLoss,
      totalGainLossPercent: totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0,
      dayGainLoss,
      dayGainLossPercent: previousDayValue > 0 ? (dayGainLoss / previousDayValue) * 100 : 0,
      holdingsCount: investments.filter(i => i.isActive).length,
    };
  }, [investments]);

  const isProfit = totalStats.totalGainLoss >= 0;
  const isDayProfit = totalStats.dayGainLoss >= 0;

  if (portfolios.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No portfolios yet</h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            Create your first portfolio to start organizing and tracking your investments.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Portfolio Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalStats.currentValue, { currency })}
            </div>
            <div className={`flex items-center text-xs mt-1 ${isDayProfit ? "text-green-500" : "text-red-500"}`}>
              {isDayProfit ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
              {formatCurrency(Math.abs(totalStats.dayGainLoss), { currency })} ({totalStats.dayGainLossPercent.toFixed(2)}%) today
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalStats.totalInvested, { currency })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {portfolios.length} portfolio{portfolios.length !== 1 ? "s" : ""} • {totalStats.holdingsCount} holding{totalStats.holdingsCount !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Returns</CardTitle>
            {isProfit ? (
              <ArrowUpRight className="h-4 w-4 text-green-500" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${isProfit ? "text-green-500" : "text-red-500"}`}>
              {isProfit ? "+" : ""}{formatCurrency(totalStats.totalGainLoss, { currency })}
            </div>
            <p className={`text-xs mt-1 ${isProfit ? "text-green-500" : "text-red-500"}`}>
              {isProfit ? "+" : ""}{totalStats.totalGainLossPercent.toFixed(2)}% all time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Change</CardTitle>
            {isDayProfit ? (
              <ArrowUpRight className="h-4 w-4 text-green-500" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${isDayProfit ? "text-green-500" : "text-red-500"}`}>
              {isDayProfit ? "+" : ""}{formatCurrency(totalStats.dayGainLoss, { currency })}
            </div>
            <p className={`text-xs mt-1 ${isDayProfit ? "text-green-500" : "text-red-500"}`}>
              {isDayProfit ? "+" : ""}{totalStats.dayGainLossPercent.toFixed(2)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Portfolio Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Your Portfolios</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {portfoliosWithStats.map((portfolio) => {
            const portfolioIsProfit = portfolio.totalGainLoss >= 0;
            const portfolioIsDayProfit = portfolio.dayGainLoss >= 0;

            return (
              <Link
                key={portfolio.id}
                href={`/dashboard/investment/${portfolio.id}`}
                className="block"
              >
                <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: portfolio.color || "#6366f1" }}
                        />
                        <CardTitle className="text-lg">{portfolio.name}</CardTitle>
                      </div>
                      <Badge variant="secondary">
                        {portfolio.holdingsCount} holding{portfolio.holdingsCount !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                    {portfolio.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                        {portfolio.description}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm text-muted-foreground">Value</span>
                        <span className="text-xl font-bold">
                          {formatCurrency(portfolio.currentValue, { currency })}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Total Returns</span>
                        <div className={`flex items-center ${portfolioIsProfit ? "text-green-500" : "text-red-500"}`}>
                          {portfolioIsProfit ? (
                            <ArrowUpRight className="h-4 w-4 mr-1" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4 mr-1" />
                          )}
                          <span className="font-medium">
                            {portfolioIsProfit ? "+" : ""}
                            {formatCurrency(portfolio.totalGainLoss, { currency })}
                          </span>
                          <span className="text-xs ml-1">
                            ({portfolioIsProfit ? "+" : ""}{portfolio.totalGainLossPercent.toFixed(2)}%)
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="text-sm text-muted-foreground">Today</span>
                        <div className={`flex items-center text-sm ${portfolioIsDayProfit ? "text-green-500" : "text-red-500"}`}>
                          {portfolioIsDayProfit ? (
                            <ArrowUpRight className="h-3 w-3 mr-1" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3 mr-1" />
                          )}
                          <span>
                            {portfolioIsDayProfit ? "+" : ""}
                            {formatCurrency(portfolio.dayGainLoss, { currency })} ({portfolio.dayGainLossPercent.toFixed(2)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
