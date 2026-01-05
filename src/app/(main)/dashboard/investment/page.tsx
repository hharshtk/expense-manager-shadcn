"use client";

import { useState, useEffect } from "react";
import { getInvestmentsWithTransactions, getEnhancedPortfolioSummary, getPortfolios } from "@/actions/investments";
import { PortfolioDashboard } from "@/components/investments/portfolio-dashboard";
import type { Investment, InvestmentTransaction, Portfolio } from "@/lib/schema";

export default function InvestmentPage() {
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<number | null>(null);
  const [investments, setInvestments] = useState<(Investment & { transactions: InvestmentTransaction[] })[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [summary, setSummary] = useState({
    totalInvested: 0,
    currentValue: 0,
    totalGainLoss: 0,
    totalGainLossPercent: 0,
    dayGainLoss: 0,
    dayGainLossPercent: 0,
    investmentCount: 0,
    currency: "USD",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [investmentsResult, summaryResult, portfoliosResult] = await Promise.all([
          getInvestmentsWithTransactions(),
          getEnhancedPortfolioSummary(),
          getPortfolios(),
        ]);

        setInvestments(investmentsResult.success ? (investmentsResult.data || []) : []);
        setPortfolios(portfoliosResult.success ? (portfoliosResult.data || []) : []);
        setSummary(summaryResult.success && summaryResult.data
          ? summaryResult.data
          : {
              totalInvested: 0,
              currentValue: 0,
              totalGainLoss: 0,
              totalGainLossPercent: 0,
              dayGainLoss: 0,
              dayGainLossPercent: 0,
              investmentCount: 0,
              currency: "USD",
            });
      } catch (error) {
        console.error("Failed to fetch investment data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-muted-foreground">Loading investments...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Investment</h1>
        </div>
        <div className="flex items-center gap-3">
          <PortfolioDashboard
            investments={[]}
            portfolios={portfolios}
            summary={{ totalInvested: 0, currentValue: 0, totalGainLoss: 0, totalGainLossPercent: 0, dayGainLoss: 0, dayGainLossPercent: 0, investmentCount: 0, currency: "USD" }}
            showActionsOnly={true}
            selectedPortfolioId={selectedPortfolioId}
            onPortfolioChange={setSelectedPortfolioId}
          />
        </div>
      </div>

      <PortfolioDashboard
        investments={investments}
        portfolios={portfolios}
        summary={summary}
        selectedPortfolioId={selectedPortfolioId}
        onPortfolioChange={setSelectedPortfolioId}
      />
    </div>
  );
}
