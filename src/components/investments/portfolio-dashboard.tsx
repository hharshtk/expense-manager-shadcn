"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  Wallet,
  RefreshCw,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { refreshInvestmentPrices } from "@/actions/investments";
import { toast } from "sonner";
import { HoldingsTable } from "./holdings-table";
import { StockDetailSheet } from "./stock-detail-sheet";
import { PortfolioSelector } from "./portfolio-selector";
import { BuyTransactionDialog } from "./buy-transaction-dialog";
import type { Investment, InvestmentTransaction, Portfolio } from "@/lib/schema";

interface PortfolioDashboardProps {
  investments: (Investment & { transactions: InvestmentTransaction[] })[];
  portfolios: Portfolio[];
  summary: {
    totalInvested: number;
    currentValue: number;
    totalGainLoss: number;
    totalGainLossPercent: number;
    dayGainLoss: number;
    dayGainLossPercent: number;
    investmentCount: number;
    currency: string;
  };
  showActionsOnly?: boolean;
  selectedPortfolioId?: number | null;
  onPortfolioChange?: (id: number | null) => void;
}

export function PortfolioDashboard({ 
  investments, 
  portfolios, 
  summary: globalSummary, 
  showActionsOnly = false,
  selectedPortfolioId: externalSelectedPortfolioId,
  onPortfolioChange: externalOnPortfolioChange
}: PortfolioDashboardProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState<(Investment & { transactions: InvestmentTransaction[] }) | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [internalSelectedPortfolioId, setInternalSelectedPortfolioId] = useState<number | null>(null);
  
  // Use external state if provided, otherwise use internal state
  const selectedPortfolioId = externalSelectedPortfolioId !== undefined ? externalSelectedPortfolioId : internalSelectedPortfolioId;
  const setSelectedPortfolioId = externalOnPortfolioChange || setInternalSelectedPortfolioId;

  // Filter investments by selected portfolio
  const filteredInvestments = useMemo(() => {
    if (selectedPortfolioId === null) {
      return investments;
    }
    return investments.filter(inv => inv.portfolioId === selectedPortfolioId);
  }, [investments, selectedPortfolioId]);

  // Calculate summary for filtered investments
  const summary = useMemo(() => {
    if (selectedPortfolioId === null) {
      return globalSummary;
    }

    let totalInvested = 0;
    let currentValue = 0;
    let totalGainLoss = 0;
    let dayGainLoss = 0;
    let previousDayValue = 0;

    for (const inv of filteredInvestments) {
      if (!inv.isActive) continue;
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
      investmentCount: filteredInvestments.filter(i => i.isActive).length,
      currency: globalSummary.currency,
    };
  }, [filteredInvestments, selectedPortfolioId, globalSummary]);

  const handleRefreshPrices = async () => {
    setRefreshing(true);
    try {
      const result = await refreshInvestmentPrices();
      if (result.success) {
        toast.success("Prices refreshed successfully");
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to refresh prices");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setRefreshing(false);
    }
  };

  const handleViewDetails = (investment: Investment & { transactions: InvestmentTransaction[] }) => {
    setSelectedInvestment(investment);
    setDetailOpen(true);
  };

  const isProfit = summary.totalGainLoss >= 0;
  const isDayProfit = summary.dayGainLoss >= 0;
  const currency = summary.currency || "USD";

  // Render only action buttons when showActionsOnly is true
  if (showActionsOnly) {
    return (
      <div className="flex items-center gap-3">
        <PortfolioSelector
          portfolios={portfolios}
          selectedPortfolioId={selectedPortfolioId}
          onPortfolioChange={setSelectedPortfolioId}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshPrices}
          disabled={refreshing}
        >
          {refreshing ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="ml-2">Refresh</span>
        </Button>
        <BuyTransactionDialog />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.currentValue, { currency })}
            </div>
            <div className={`flex items-center text-xs mt-1 ${isDayProfit ? "text-green-500" : "text-red-500"}`}>
              {isDayProfit ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
              {formatCurrency(Math.abs(summary.dayGainLoss), { currency })} ({summary.dayGainLossPercent.toFixed(2)}%) today
            </div>
          </CardContent>
        </Card>

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
              Across {summary.investmentCount} holding{summary.investmentCount !== 1 ? "s" : ""}
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
              {isProfit ? "+" : ""}{formatCurrency(summary.totalGainLoss, { currency })}
            </div>
            <p className={`text-xs mt-1 ${isProfit ? "text-green-500" : "text-red-500"}`}>
              {isProfit ? "+" : ""}{summary.totalGainLossPercent.toFixed(2)}% all time
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
              {isDayProfit ? "+" : ""}{formatCurrency(summary.dayGainLoss, { currency })}
            </div>
            <p className={`text-xs mt-1 ${isDayProfit ? "text-green-500" : "text-red-500"}`}>
              {isDayProfit ? "+" : ""}{summary.dayGainLossPercent.toFixed(2)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Holdings Table */}
      <HoldingsTable 
        investments={filteredInvestments} 
        portfolios={portfolios}
        currency={currency}
        onViewDetails={handleViewDetails}
      />

      {/* Stock Detail Sheet */}
      {selectedInvestment && (
        <StockDetailSheet
          investment={selectedInvestment}
          portfolios={portfolios}
          open={detailOpen}
          onOpenChange={setDetailOpen}
        />
      )}
    </div>
  );
}
