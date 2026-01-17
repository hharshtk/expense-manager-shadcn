import { getInvestmentsWithConversion, getPortfolios, getUserDisplayCurrency } from "@/actions/investments";
import { PortfolioList } from "@/components/investments/portfolio-list";
import { InvestmentPageClient } from "./_components/investment-page-client";

export default async function InvestmentPage() {
  const [investmentsResult, portfoliosResult, displayCurrency] = await Promise.all([
    getInvestmentsWithConversion(),
    getPortfolios(),
    getUserDisplayCurrency(),
  ]);

  const investments = investmentsResult.success ? (investmentsResult.data || []) : [];
  const portfolios = portfoliosResult.success ? (portfoliosResult.data || []) : [];

  return (
    <div className="@container/main flex flex-col gap-2">
      <InvestmentPageClient portfolios={portfolios} />
      <PortfolioList
        portfolios={portfolios}
        investments={investments}
        displayCurrency={displayCurrency}
      />
    </div>
  );
}
