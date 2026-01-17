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
    <div className="space-y-4">
      {/* Overview Summary - Compact Row */}
      <Card className="p-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center lg:text-left">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Portfolio Value</p>
            <p className="text-lg font-bold flex items-center justify-center lg:justify-start">
              {formatCurrency(totalStats.currentValue, { currency: displayCurrency })}
              {totalStats.hasConversions && <ConversionIndicator currencies={totalStats.conversionsApplied} />}
            </p>
            <p className={`text-xs flex items-center justify-center lg:justify-start ${isDayProfit ? "text-green-500" : "text-red-500"}`}>
              {isDayProfit ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
              {formatCurrency(Math.abs(totalStats.dayGainLoss), { currency: displayCurrency })} ({totalStats.dayGainLossPercent.toFixed(2)}%)
            </p>
          </div>

          <div className="text-center lg:text-left">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Invested</p>
            <p className="text-lg font-bold flex items-center justify-center lg:justify-start">
              {formatCurrency(totalStats.totalInvested, { currency: displayCurrency })}
              {totalStats.hasConversions && <ConversionIndicator currencies={totalStats.conversionsApplied} />}
            </p>
            <p className="text-xs text-muted-foreground flex items-center justify-center lg:justify-start">
              {portfolios.length} portfolio{portfolios.length !== 1 ? "s" : ""} • {totalStats.holdingsCount} holding{totalStats.holdingsCount !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="text-center lg:text-left">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Returns</p>
            <p className={`text-lg font-bold flex items-center justify-center lg:justify-start ${isProfit ? "text-green-500" : "text-red-500"}`}>
              {isProfit ? "+" : ""}{formatCurrency(totalStats.totalGainLoss, { currency: displayCurrency })}
              {totalStats.hasConversions && <ConversionIndicator currencies={totalStats.conversionsApplied} />}
            </p>
            <p className={`text-xs flex items-center justify-center lg:justify-start ${isProfit ? "text-green-500" : "text-red-500"}`}>
              {isProfit ? "+" : ""}{totalStats.totalGainLossPercent.toFixed(2)}%
            </p>
          </div>

          <div className="text-center lg:text-left">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Today's Change</p>
            <p className={`text-lg font-bold flex items-center justify-center lg:justify-start ${isDayProfit ? "text-green-500" : "text-red-500"}`}>
              {isDayProfit ? "+" : ""}{formatCurrency(totalStats.dayGainLoss, { currency: displayCurrency })}
              {totalStats.hasConversions && <ConversionIndicator currencies={totalStats.conversionsApplied} />}
            </p>
            <p className={`text-xs flex items-center justify-center lg:justify-start ${isDayProfit ? "text-green-500" : "text-red-500"}`}>
              {isDayProfit ? "+" : ""}{totalStats.dayGainLossPercent.toFixed(2)}%
            </p>
          </div>
        </div>
      </Card>

      {/* Portfolio Cards */}
      <div>
        <h2 className="text-base font-semibold mb-2">Your Portfolios</h2>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {portfoliosWithStats.map((portfolio) => {
            const portfolioIsProfit = portfolio.totalGainLoss >= 0;
            const portfolioIsDayProfit = portfolio.dayGainLoss >= 0;

            return (
              <Link
                key={portfolio.id}
                href={`/dashboard/investment/${portfolio.id}`}
                className="block"
              >
                <Card className="hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium">{portfolio.name}</h3>
                    </div>
                    <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                      {portfolio.holdingsCount}
                    </Badge>
                  </div>
                  {portfolio.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                      {portfolio.description}
                    </p>
                  )}
                  <div className="space-y-1">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-muted-foreground">Value</span>
                      <span className="text-sm font-bold flex items-center">
                        {formatCurrency(portfolio.currentValue, { currency: displayCurrency })}
                        {portfolio.hasConversions && (
                          <ArrowRightLeft className="h-3 w-3 ml-1 text-muted-foreground" />
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Returns</span>
                      <div className={`flex items-center text-xs ${portfolioIsProfit ? "text-green-500" : "text-red-500"}`}>
                        {portfolioIsProfit ? (
                          <ArrowUpRight className="h-3 w-3 mr-1" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 mr-1" />
                        )}
                        <span className="font-medium">
                          {portfolioIsProfit ? "+" : ""}
                          {formatCurrency(portfolio.totalGainLoss, { currency: displayCurrency })}
                        </span>
                        <span className="ml-1">
                          ({portfolio.totalGainLossPercent.toFixed(1)}%)
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t">
                      <span className="text-xs text-muted-foreground">Today</span>
                      <div className={`flex items-center text-xs ${portfolioIsDayProfit ? "text-green-500" : "text-red-500"}`}>
                        {portfolioIsDayProfit ? (
                          <ArrowUpRight className="h-3 w-3 mr-1" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 mr-1" />
                        )}
                        <span>
                          {portfolioIsDayProfit ? "+" : ""}
                          {formatCurrency(portfolio.dayGainLoss, { currency: displayCurrency })} ({portfolio.dayGainLossPercent.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
