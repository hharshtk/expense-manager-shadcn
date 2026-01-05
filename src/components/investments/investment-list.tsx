"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight, TrendingDown, RefreshCw } from "lucide-react";
import type { Investment } from "@/lib/schema";
import { SellTransactionDialog } from "./sell-transaction-dialog";
import { refreshInvestmentPrices } from "@/actions/investments";
import { toast } from "sonner";

interface InvestmentListProps {
  investments: Investment[];
}

export function InvestmentList({ investments: initialInvestments }: InvestmentListProps) {
  const [investments, setInvestments] = useState(initialInvestments);
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
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
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setRefreshing(false);
    }
  };

  const handleSell = (investment: Investment) => {
    setSelectedInvestment(investment);
    setSellDialogOpen(true);
  };

  if (investments.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <TrendingDown className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No investments yet</h3>
          <p className="text-sm text-muted-foreground text-center mb-4">
            Start building your portfolio by recording your first investment
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Your Portfolio</h2>
          <Button variant="outline" size="sm" onClick={handleRefreshPrices} disabled={refreshing}>
            {refreshing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2">Refresh Prices</span>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {investments.map((investment) => {
            const totalGainLoss = Number(investment.totalGainLoss) || 0;
            const totalGainLossPercent = Number(investment.totalGainLossPercent) || 0;
            const isProfit = totalGainLoss >= 0;
            const currentValue = Number(investment.currentValue) || 0;
            const totalInvested = Number(investment.totalInvested) || 0;
            const currentPrice = Number(investment.currentPrice) || 0;
            const quantity = Number(investment.totalQuantity) || 0;

            return (
              <Card key={investment.id}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{investment.symbol}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {investment.name}
                      </p>
                    </div>
                    <Badge variant={investment.isActive ? "default" : "secondary"}>
                      {investment.type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm text-muted-foreground">Current Value</span>
                      <span className="text-2xl font-bold">
                        {investment.currency} {currentValue.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between items-baseline">
                      <span className="text-sm text-muted-foreground">Quantity</span>
                      <span className="text-sm font-medium">{quantity.toFixed(4)}</span>
                    </div>

                    <div className="flex justify-between items-baseline">
                      <span className="text-sm text-muted-foreground">Current Price</span>
                      <span className="text-sm font-medium">
                        {investment.currency} {currentPrice.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between items-baseline">
                      <span className="text-sm text-muted-foreground">Avg. Price</span>
                      <span className="text-sm font-medium">
                        {investment.currency} {Number(investment.averagePrice).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-muted-foreground">Total Gain/Loss</span>
                      <div className="flex items-center gap-1">
                        {isProfit ? (
                          <ArrowUpRight className="h-4 w-4 text-green-500" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-red-500" />
                        )}
                        <span
                          className={`text-sm font-medium ${
                            isProfit ? "text-green-500" : "text-red-500"
                          }`}
                        >
                          {investment.currency} {Math.abs(totalGainLoss).toFixed(2)} (
                          {totalGainLossPercent.toFixed(2)}%)
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-baseline text-xs text-muted-foreground">
                      <span>Invested: {investment.currency} {totalInvested.toFixed(2)}</span>
                      {investment.lastUpdated && (
                        <span>
                          Updated: {new Date(investment.lastUpdated).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {investment.isActive && quantity > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleSell(investment)}
                    >
                      Sell
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {selectedInvestment && (
        <SellTransactionDialog
          investment={selectedInvestment}
          open={sellDialogOpen}
          onOpenChange={setSellDialogOpen}
        />
      )}
    </>
  );
}
