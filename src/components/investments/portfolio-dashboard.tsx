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
import type { DisplayValue, InvestmentWithConversion } from "@/actions/investments";

type InvestmentWithTransactions = Investment & { transactions: InvestmentTransaction[] };
type DashboardInvestment =
  | InvestmentWithTransactions
  | (InvestmentWithTransactions & {
      displayCurrency?: string;
      conversionApplied?: boolean;
      convertedValues?: {
        currentValue: DisplayValue;
        totalInvested: DisplayValue;
        totalGainLoss: DisplayValue;
        dayGainLoss: DisplayValue;
      };
    })
  | InvestmentWithConversion;

interface PortfolioDashboardProps {
  investments: DashboardInvestment[];
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
  hidePortfolioSelector?: boolean;
  selectedPortfolioId?: number | null;
  onPortfolioChange?: (id: number | null) => void;
}

export function PortfolioDashboard({ 
  investments, 
  portfolios, 
  summary: globalSummary, 
  showActionsOnly = false,
  hidePortfolioSelector = false,
  selectedPortfolioId: externalSelectedPortfolioId,
  onPortfolioChange: externalOnPortfolioChange
}: PortfolioDashboardProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState<InvestmentWithTransactions | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [internalSelectedPortfolioId, setInternalSelectedPortfolioId] = useState<number | null>(null);
  
  // Use external state if provided, otherwise use internal state
  const selectedPortfolioId = externalSelectedPortfolioId !== undefined ? externalSelectedPortfolioId : internalSelectedPortfolioId;
  const setSelectedPortfolioId = externalOnPortfolioChange || setInternalSelectedPortfolioId;

  const hasTransactions = (inv: DashboardInvestment): inv is InvestmentWithTransactions => {
    return "transactions" in inv;
  };

  const hasConversionData = (inv: DashboardInvestment): inv is InvestmentWithConversion => {
    return "currentValue" in inv && typeof inv.currentValue === "object" && inv.currentValue !== null && "amount" in inv.currentValue;
  };

  const getSummaryValues = (inv: DashboardInvestment) => {
    if (hasConversionData(inv)) {
      return {
        totalInvested: inv.totalInvested.amount,
        currentValue: inv.currentValue.amount,
        totalGainLoss: inv.totalGainLoss.amount,
        dayGainLoss: inv.dayGainLoss.amount,
        totalGainLossPercent: inv.totalGainLossPercent,
        dayGainLossPercent: inv.dayChangePercent,
        isActive: inv.isActive,
      };
    }

    if ("convertedValues" in inv && inv.convertedValues?.currentValue) {
      return {
        totalInvested: inv.convertedValues.totalInvested.amount,
        currentValue: inv.convertedValues.currentValue.amount,
        totalGainLoss: inv.convertedValues.totalGainLoss.amount,
        dayGainLoss: inv.convertedValues.dayGainLoss.amount,
        totalGainLossPercent: Number(inv.totalGainLossPercent || 0),
        dayGainLossPercent: Number(inv.dayChangePercent || 0),
        isActive: Boolean(inv.isActive),
      };
    }

    return {
      totalInvested: Number(inv.totalInvested || 0),
      currentValue: Number(inv.currentValue || 0),
      totalGainLoss: Number(inv.totalGainLoss || 0),
      dayGainLoss: Number(inv.dayGainLoss || 0),
      totalGainLossPercent: Number(inv.totalGainLossPercent || 0),
      dayGainLossPercent: Number(inv.dayChangePercent || 0),
      isActive: Boolean(inv.isActive),
    };
  };

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
      const values = getSummaryValues(inv);
      if (!values.isActive) continue;
      totalInvested += values.totalInvested;
      currentValue += values.currentValue;
      totalGainLoss += values.totalGainLoss;
      const invDayGainLoss = values.dayGainLoss;
      dayGainLoss += invDayGainLoss;
      previousDayValue += values.currentValue - invDayGainLoss;
    }

    return {
      totalInvested,
      currentValue,
      totalGainLoss,
      totalGainLossPercent: totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0,
      dayGainLoss,
      dayGainLossPercent: previousDayValue > 0 ? (dayGainLoss / previousDayValue) * 100 : 0,
      investmentCount: filteredInvestments.filter(i => ("isActive" in i ? Boolean(i.isActive) : true)).length,
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

  const handleViewDetails = (investment: DashboardInvestment) => {
    if (!hasTransactions(investment)) {
      return;
    }
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
        <BuyTransactionDialog portfolios={portfolios} />
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Summary - Compact Row */}
      <Card className="p-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center lg:text-left">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Portfolio Value</p>
            <p className="text-lg font-bold flex items-center justify-center lg:justify-start">
              {formatCurrency(summary.currentValue, { currency })}
            </p>
            <p className={`text-xs flex items-center justify-center lg:justify-start ${isDayProfit ? "text-green-500" : "text-red-500"}`}>
              {isDayProfit ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
              {formatCurrency(Math.abs(summary.dayGainLoss), { currency })} ({summary.dayGainLossPercent.toFixed(2)}%)
            </p>
          </div>

          <div className="text-center lg:text-left">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Invested</p>
            <p className="text-lg font-bold flex items-center justify-center lg:justify-start">
              {formatCurrency(summary.totalInvested, { currency })}
            </p>
            <p className="text-xs text-muted-foreground flex items-center justify-center lg:justify-start">
              {summary.investmentCount} holding{summary.investmentCount !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="text-center lg:text-left">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Returns</p>
            <p className={`text-lg font-bold flex items-center justify-center lg:justify-start ${isProfit ? "text-green-500" : "text-red-500"}`}>
              {isProfit ? "+" : ""}{formatCurrency(summary.totalGainLoss, { currency })}
            </p>
            <p className={`text-xs flex items-center justify-center lg:justify-start ${isProfit ? "text-green-500" : "text-red-500"}`}>
              {isProfit ? "+" : ""}{summary.totalGainLossPercent.toFixed(2)}%
            </p>
          </div>

          <div className="text-center lg:text-left">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Today's Change</p>
            <p className={`text-lg font-bold flex items-center justify-center lg:justify-start ${isDayProfit ? "text-green-500" : "text-red-500"}`}>
              {isDayProfit ? "+" : ""}{formatCurrency(summary.dayGainLoss, { currency })}
            </p>
            <p className={`text-xs flex items-center justify-center lg:justify-start ${isDayProfit ? "text-green-500" : "text-red-500"}`}>
              {isDayProfit ? "+" : ""}{summary.dayGainLossPercent.toFixed(2)}%
            </p>
          </div>
        </div>
      </Card>

      {/* Holdings Table */}
      <HoldingsTable 
        investments={filteredInvestments} 
        portfolios={portfolios}
        displayCurrency={currency}
        onViewDetails={handleViewDetails}
        hidePortfolioTag={hidePortfolioSelector}
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
