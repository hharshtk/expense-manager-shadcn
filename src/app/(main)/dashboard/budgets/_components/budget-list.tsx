"use client";

import * as React from "react";

import { PiggyBank, Plus } from "lucide-react";

import type { BudgetWithProgress } from "../_queries/budget-queries";

import { BudgetCard } from "./budget-card";
import { BudgetDialog } from "./budget-dialog";

import { Button } from "@/components/ui/button";
import type { Category } from "@/lib/schema";

interface BudgetListProps {
  budgets: BudgetWithProgress[];
  categories: Category[];
  userCurrency: string;
}

export function BudgetList({ budgets: initialBudgets, categories, userCurrency }: BudgetListProps) {
  const [budgets, setBudgets] = React.useState(initialBudgets);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);

  // Sync with server data when it changes
  React.useEffect(() => {
    setBudgets(initialBudgets);
  }, [initialBudgets]);

  if (budgets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
          <PiggyBank className="size-6 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">No budgets yet</h3>
        <p className="mb-4 mt-2 max-w-sm text-sm text-muted-foreground">
          Get started by creating your first budget to track your spending limits.
        </p>
        <BudgetDialog 
          categories={categories} 
          userCurrency={userCurrency}
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          trigger={
            <Button>
              <Plus className="mr-2 size-4" />
              Add Budget
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Your Budgets
        </h2>
        <BudgetDialog 
          categories={categories} 
          userCurrency={userCurrency}
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          trigger={
            <Button size="sm" variant="outline" className="h-8">
              <Plus className="mr-2 size-3.5" />
              Add Budget
            </Button>
          }
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {budgets.map((budget) => (
          <BudgetCard
            key={budget.id}
            budget={budget}
            categories={categories}
            userCurrency={userCurrency}
          />
        ))}
      </div>
    </div>
  );
}
