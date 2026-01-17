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
    <div className="flex justify-between items-center py-2">
      <div>
        <h1 className="text-lg font-bold tracking-tight">Investment Portfolios</h1>
        <p className="text-xs text-muted-foreground">
          Manage and track your investment portfolios
        </p>
      </div>
      <div className="flex items-center gap-2">
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
          className="h-8"
        >
          {refreshing ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          <span className="text-xs ml-1">Refresh</span>
        </Button>
        <BuyTransactionDialog portfolios={portfolios} />
      </div>
    </div>
  );
}