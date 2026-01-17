"use client";

import { useState } from "react";
import { refreshInvestmentPrices } from "@/actions/investments";
import { PortfolioSelector } from "@/components/investments/portfolio-selector";
import { BuyTransactionDialog } from "@/components/investments/buy-transaction-dialog";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type { Portfolio } from "@/lib/schema";

interface InvestmentPageClientProps {
  portfolios: Portfolio[];
}

export function InvestmentPageClient({ portfolios }: InvestmentPageClientProps) {
  const [refreshing, setRefreshing] = useState(false);

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
    <div className="flex justify-between items-start">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Investment Portfolios</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage and track your investment portfolios
        </p>
      </div>
      <div className="flex items-center gap-3">
        <PortfolioSelector
          portfolios={portfolios}
          selectedPortfolioId={null}
          onPortfolioChange={() => {}}
          showCreateOnly={true}
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
          <span className="ml-2">Refresh Prices</span>
        </Button>
        <BuyTransactionDialog portfolios={portfolios} />
      </div>
    </div>
  );
}