import { notFound, redirect } from "next/navigation";
import {
  getPortfolioById,
  getInvestmentsByPortfolio,
  getPortfolios,
} from "@/actions/investments";
import { PortfolioDetailClient } from "../_components/portfolio-detail-client";
import type { Investment, InvestmentTransaction, Portfolio } from "@/lib/schema";

interface PageProps {
  params: Promise<{ portfolioId: string }>;
}

export default async function PortfolioDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const portfolioId = parseInt(resolvedParams.portfolioId, 10);

  if (isNaN(portfolioId)) {
    redirect("/dashboard/investment");
  }

  const [portfolioResult, investmentsResult, portfoliosResult] = await Promise.all([
    getPortfolioById(portfolioId),
    getInvestmentsByPortfolio(portfolioId),
    getPortfolios(),
  ]);

  if (!portfolioResult.success || !portfolioResult.data) {
    notFound();
  }

  const portfolio = portfolioResult.data;
  const investments = investmentsResult.success ? (investmentsResult.data || []) : [];
  const portfolios = portfoliosResult.success ? (portfoliosResult.data || []) : [];

  return (
    <PortfolioDetailClient
      portfolio={portfolio}
      investments={investments}
      portfolios={portfolios}
      portfolioId={portfolioId}
    />
  );
}
