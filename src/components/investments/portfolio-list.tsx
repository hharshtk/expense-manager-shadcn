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
  ArrowRightLeft,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Portfolio } from "@/lib/schema";
import type { InvestmentWithConversion } from "@/actions/investments";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PortfolioWithStats extends Portfolio {
  totalInvested: number;
  currentValue: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  dayGainLoss: number;
  dayGainLossPercent: number;
  holdingsCount: number;
  hasConversions: boolean;
}

interface PortfolioListProps {
  portfolios: Portfolio[];
  investments: InvestmentWithConversion[];
  displayCurrency: string;
}

export function PortfolioList({ portfolios, investments, displayCurrency }: PortfolioListProps) {
  // Calculate stats for each portfolio using converted values
  const portfoliosWithStats = useMemo(() => {
    return portfolios.map((portfolio) => {
      const portfolioInvestments = investments.filter(
        (inv) => inv.portfolioId === portfolio.id && inv.quantity > 0
      );

      let totalInvested = 0;
      let currentValue = 0;
      let totalGainLoss = 0;
      let dayGainLoss = 0;
      let previousDayValue = 0;
      let hasConversions = false;

      for (const inv of portfolioInvestments) {
        // Use already-converted values from the server
        totalInvested += inv.totalInvested.amount;
        currentValue += inv.currentValue.amount;
        totalGainLoss += inv.totalGainLoss.amount;
        const invDayGainLoss = inv.dayGainLoss.amount;
        dayGainLoss += invDayGainLoss;
        previousDayValue += inv.currentValue.amount - invDayGainLoss;
        
        if (inv.conversionApplied) {
          hasConversions = true;
        }
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
        hasConversions,
      } as PortfolioWithStats;
    });
  }, [portfolios, investments]);

  // Calculate total portfolio stats using converted values
  const totalStats = useMemo(() => {
    let totalInvested = 0;
    let currentValue = 0;
    let totalGainLoss = 0;
    let dayGainLoss = 0;
    let previousDayValue = 0;
    let hasConversions = false;
    const conversionsApplied: string[] = [];

    for (const inv of investments.filter(i => i.quantity > 0)) {
      // Use already-converted values from the server
      totalInvested += inv.totalInvested.amount;
      currentValue += inv.currentValue.amount;
      totalGainLoss += inv.totalGainLoss.amount;
      const invDayGainLoss = inv.dayGainLoss.amount;
      dayGainLoss += invDayGainLoss;
      previousDayValue += inv.currentValue.amount - invDayGainLoss;
      
      if (inv.conversionApplied && inv.nativeCurrency) {
        hasConversions = true;
        if (!conversionsApplied.includes(inv.nativeCurrency)) {
          conversionsApplied.push(inv.nativeCurrency);
        }
      }
    }

    return {
      totalInvested,
      currentValue,
      totalGainLoss,
      totalGainLossPercent: totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0,
      dayGainLoss,
      dayGainLossPercent: previousDayValue > 0 ? (dayGainLoss / previousDayValue) * 100 : 0,
      holdingsCount: investments.filter(i => i.quantity > 0).length,
      hasConversions,
      conversionsApplied,
    };
  }, [investments]);

  const isProfit = totalStats.totalGainLoss >= 0;
  const isDayProfit = totalStats.dayGainLoss >= 0;

  // Helper to show conversion indicator
  const ConversionIndicator = ({ currencies }: { currencies: string[] }) => {
    if (currencies.length === 0) return null;
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground ml-1">
              <ArrowRightLeft className="h-3 w-3" />
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">
              Includes conversions from {currencies.join(", ")} to {displayCurrency}
            </p>
            <p className="text-xs text-muted-foreground">Using ECB reference rates</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

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
            <div className="text-2xl font-bold flex items-center">
              {formatCurrency(totalStats.currentValue, { currency: displayCurrency })}
              {totalStats.hasConversions && <ConversionIndicator currencies={totalStats.conversionsApplied} />}
            </div>
            <div className={`flex items-center text-xs mt-1 ${isDayProfit ? "text-green-500" : "text-red-500"}`}>
              {isDayProfit ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
              {formatCurrency(Math.abs(totalStats.dayGainLoss), { currency: displayCurrency })} ({totalStats.dayGainLossPercent.toFixed(2)}%) today
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
              {formatCurrency(totalStats.totalInvested, { currency: displayCurrency })}
              {totalStats.hasConversions && <ConversionIndicator currencies={totalStats.conversionsApplied} />}
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
            <div className={`text-2xl font-bold flex items-center ${isProfit ? "text-green-500" : "text-red-500"}`}>
              {isProfit ? "+" : ""}{formatCurrency(totalStats.totalGainLoss, { currency: displayCurrency })}
              {totalStats.hasConversions && <ConversionIndicator currencies={totalStats.conversionsApplied} />}
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
            <div className={`text-2xl font-bold flex items-center ${isDayProfit ? "text-green-500" : "text-red-500"}`}>
              {isDayProfit ? "+" : ""}{formatCurrency(totalStats.dayGainLoss, { currency: displayCurrency })}
              {totalStats.hasConversions && <ConversionIndicator currencies={totalStats.conversionsApplied} />}
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
                        <span className="text-xl font-bold flex items-center">
                          {formatCurrency(portfolio.currentValue, { currency: displayCurrency })}
                          {portfolio.hasConversions && (
                            <ArrowRightLeft className="h-3 w-3 ml-1 text-muted-foreground" />
                          )}
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
                            {formatCurrency(portfolio.totalGainLoss, { currency: displayCurrency })}
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
                            {formatCurrency(portfolio.dayGainLoss, { currency: displayCurrency })} ({portfolio.dayGainLossPercent.toFixed(2)}%)
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
