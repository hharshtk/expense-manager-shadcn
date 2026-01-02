import type { Metadata } from "next";

import { getCategories } from "@/actions/categories";

import { BudgetDialog } from "./_components/budget-dialog";
import { BudgetList } from "./_components/budget-list";
import { BudgetSummaryCard } from "./_components/budget-summary-card";
import { getBudgetsWithProgress, getUserDefaultCurrency } from "./_queries/budget-queries";

export const metadata: Metadata = {
  title: "Budgets",
  description: "Track your spending with budgets and stay on top of your finances.",
};

export default async function BudgetsPage() {
  const [budgets, categoriesData, userCurrency] = await Promise.all([
    getBudgetsWithProgress(),
    getCategories(),
    getUserDefaultCurrency(),
  ]);

  // Flatten categories for selects (include both parent and children)
  const flatCategories = categoriesData.flatMap((category) => [
    category,
    ...(category.subcategories || []),
  ]);

  return (
    <div className="@container/main flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Budgets</h1>
        </div>
      </div>

      <BudgetSummaryCard budgets={budgets} userCurrency={userCurrency} />
      <BudgetList
        budgets={budgets}
        categories={flatCategories}
        userCurrency={userCurrency}
      />
    </div>
  );
}
