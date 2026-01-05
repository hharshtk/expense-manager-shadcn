import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getInvestments, getPortfolioSummary } from "@/actions/investments";
import { BuyTransactionDialog } from "@/components/investments/buy-transaction-dialog";
import { InvestmentList } from "@/components/investments/investment-list";
import { PortfolioSummary } from "@/components/investments/portfolio-summary";

export const metadata = {
  title: "Investments - Expense Manager",
  description: "Track and manage your investment portfolio",
};

export default async function InvestmentPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/signin");
  }

  const [investmentsResult, summaryResult] = await Promise.all([
    getInvestments(),
    getPortfolioSummary(),
  ]);

  const investments = investmentsResult.success ? (investmentsResult.data || []) : [];
  const summary = summaryResult.success && summaryResult.data
    ? summaryResult.data
    : {
        totalInvested: 0,
        currentValue: 0,
        totalGainLoss: 0,
        totalGainLossPercent: 0,
        investmentCount: 0,
      };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Investment Portfolio</h1>
          <p className="text-muted-foreground mt-2">
            Track your stocks, mutual funds, and other investments
          </p>
        </div>
        <BuyTransactionDialog />
      </div>

      <PortfolioSummary summary={summary} />

      <InvestmentList investments={investments} />
    </div>
  );
}
