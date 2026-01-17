"use client";

import { useMemo, useEffect, useState } from "react";
import Link from "next/link";
import { refreshInvestmentPrices } from "@/actions/investments";
import { PortfolioDashboard } from "@/components/investments/portfolio-dashboard";
import { BuyTransactionDialog } from "@/components/investments/buy-transaction-dialog";
import { Button } from "@/components/ui/button";
import { RefreshCw, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { getUserSettings } from "@/server/user-settings-actions";
import type { Investment, InvestmentTransaction, Portfolio } from "@/lib/schema";
import type { DisplayValue } from "@/actions/investments";

type PortfolioInvestment = (Investment & { transactions: InvestmentTransaction[] }) & {
  displayCurrency?: string;
  conversionApplied?: boolean;
  convertedValues?: {
    currentValue: DisplayValue;
    totalInvested: DisplayValue;
    totalGainLoss: DisplayValue;
    dayGainLoss: DisplayValue;
  };
};

interface PortfolioDetailClientProps {
  portfolio: Portfolio;
  investments: PortfolioInvestment[];
  portfolios: Portfolio[];
  portfolioId: number;
}

export function PortfolioDetailClient({
  portfolio,
  investments,
  portfolios,
  portfolioId,
}: PortfolioDetailClientProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [userCurrency, setUserCurrency] = useState("USD");

  useEffect(() => {
    const fetchUserCurrency = async () => {
      const settings = await getUserSettings();
      if (settings.success) {
        setUserCurrency(settings.data.defaultCurrency);
      }
    };
    fetchUserCurrency();
  }, []);

  const summary = useMemo(() => {
    let totalInvested = 0;
    let currentValue = 0;
    let totalGainLoss = 0;
    let dayGainLoss = 0;
    let previousDayValue = 0;

    for (const inv of investments) {
      if (!inv.isActive) continue;

      if (inv.convertedValues?.currentValue) {
        totalInvested += inv.convertedValues.totalInvested.amount;
        currentValue += inv.convertedValues.currentValue.amount;
        totalGainLoss += inv.convertedValues.totalGainLoss.amount;
        const invDayGainLoss = inv.convertedValues.dayGainLoss.amount;
        dayGainLoss += invDayGainLoss;
        previousDayValue += inv.convertedValues.currentValue.amount - invDayGainLoss;
        continue;
      }

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
      investmentCount: investments.filter(i => i.isActive).length,
      currency: userCurrency,
    };
  }, [investments, userCurrency]);

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

  return (
    <div className="container mx-auto py-4 space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/investment">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">{portfolio.name}</h1>
          </div>
          {portfolio.description && (
            <p className="text-sm text-muted-foreground">{portfolio.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshPrices}
            disabled={refreshing}
            className="h-8"
          >
            {refreshing ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            <span className="text-xs ml-1">Refresh</span>
          </Button>
          <BuyTransactionDialog portfolios={portfolios} defaultPortfolioId={portfolioId} />
        </div>
      </div>

      <PortfolioDashboard
        investments={investments}
        portfolios={portfolios}
        summary={summary}
        selectedPortfolioId={portfolioId}
        onPortfolioChange={() => {}}
        hidePortfolioSelector={true}
      />
    </div>
  );
}