"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface QuickActionsCardProps {
  onAddExpense?: () => void;
  onAddIncome?: () => void;
  onCreateBudget?: () => void;
  onViewReports?: () => void;
}

export function QuickActionsCard({
  onAddExpense,
  onAddIncome,
  onCreateBudget,
  onViewReports,
}: QuickActionsCardProps) {
  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common tasks at your fingertips</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Button
            variant="outline"
            className="flex h-auto flex-col gap-2 py-4"
            onClick={onAddExpense}
          >
            <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10">
              <Plus className="size-5 text-destructive" />
            </div>
            <span className="text-xs">Add Expense</span>
          </Button>

          <Button
            variant="outline"
            className="flex h-auto flex-col gap-2 py-4"
            onClick={onAddIncome}
          >
            <div className="flex size-10 items-center justify-center rounded-full bg-green-500/10">
              <Plus className="size-5 text-green-500" />
            </div>
            <span className="text-xs">Add Income</span>
          </Button>

          <Button
            variant="outline"
            className="flex h-auto flex-col gap-2 py-4"
            onClick={onCreateBudget}
          >
            <div className="flex size-10 items-center justify-center rounded-full bg-blue-500/10">
              <Plus className="size-5 text-blue-500" />
            </div>
            <span className="text-xs">Create Budget</span>
          </Button>

          <Button
            variant="outline"
            className="flex h-auto flex-col gap-2 py-4"
            onClick={onViewReports}
          >
            <div className="flex size-10 items-center justify-center rounded-full bg-orange-500/10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-5 text-orange-500"
              >
                <path d="M3 3v18h18" />
                <path d="m19 9-5 5-4-4-3 3" />
              </svg>
            </div>
            <span className="text-xs">View Reports</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
