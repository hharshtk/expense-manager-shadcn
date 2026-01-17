import { getInvestments, getPortfolios } from "@/actions/investments";
import { PortfolioList } from "@/components/investments/portfolio-list";
import { InvestmentPageClient } from "./_components/investment-page-client";

export default async function InvestmentPage() {
  const [investmentsResult, portfoliosResult] = await Promise.all([
    getInvestments(),
    getPortfolios(),
  ]);

  const investments = investmentsResult.success ? (investmentsResult.data || []) : [];
  const portfolios = portfoliosResult.success ? (portfoliosResult.data || []) : [];

  return (
    <div className="@container/main flex flex-col gap-4">
      <InvestmentPageClient portfolios={portfolios} />
      <PortfolioList
        portfolios={portfolios}
        investments={investments}
        currency="USD"
      />
    </div>
  );
}
