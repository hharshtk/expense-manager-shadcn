"use client";

import { useState, useEffect } from "react";
import { getInvestments, getPortfolios, refreshInvestmentPrices } from "@/actions/investments";
import { PortfolioList } from "@/components/investments/portfolio-list";
import { PortfolioSelector } from "@/components/investments/portfolio-selector";
import { BuyTransactionDialog } from "@/components/investments/buy-transaction-dialog";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type { Investment, Portfolio } from "@/lib/schema";

export default function InvestmentPage() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [investmentsResult, portfoliosResult] = await Promise.all([
          getInvestments(),
          getPortfolios(),
        ]);

        setInvestments(investmentsResult.success ? (investmentsResult.data || []) : []);
        setPortfolios(portfoliosResult.success ? (portfoliosResult.data || []) : []);
      } catch (error) {
        console.error("Failed to fetch investment data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

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

  if (loading) {
    return (
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-muted-foreground">Loading portfolios...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Investment Portfolios</h1>
          <p className="text-muted-foreground mt-1">
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

      <PortfolioList
        portfolios={portfolios}
        investments={investments}
        currency="USD"
      />
    </div>
  );
}
