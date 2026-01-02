"use client";

import * as React from "react";

import {
  AlertTriangle,
  Calendar,
  Edit,
  MoreVertical,
  PiggyBank,
  Trash2,
  TrendingUp,
} from "lucide-react";

import { deleteBudget, toggleBudgetStatus } from "../_actions/budget-actions";
import type { BudgetWithProgress } from "../_queries/budget-queries";

import { BudgetDialog } from "./budget-dialog";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/currency";
import type { Category } from "@/lib/schema";
import { cn } from "@/lib/utils";

interface BudgetCardProps {
  budget: BudgetWithProgress;
  categories: Category[];
  userCurrency: string;
}

const PERIOD_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

export function BudgetCard({ budget, categories, userCurrency }: BudgetCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [showEditDialog, setShowEditDialog] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const getProgressColor = () => {
    if (budget.isOverBudget) return "bg-destructive";
    if (budget.isNearThreshold) return "bg-amber-500";
    return "bg-primary";
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteBudget(budget.id);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error("Failed to delete budget:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async () => {
    try {
      await toggleBudgetStatus(budget.id, !budget.isActive);
    } catch (error) {
      console.error("Failed to toggle budget status:", error);
    }
  };

  return (
    <>
      <Card
        className={cn(
          "group relative overflow-hidden transition-all duration-200 hover:shadow-md",
          !budget.isActive && "opacity-60",
        )}
      >
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold leading-none tracking-tight">{budget.name}</h3>
              {budget.isOverBudget && (
                <AlertTriangle className="size-4 text-destructive" />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {PERIOD_LABELS[budget.period]}
              </Badge>
              {budget.category && (
                <Badge variant="outline" className="text-xs">
                  {budget.category.name}
                </Badge>
              )}
              {!budget.isActive && (
                <Badge variant="secondary" className="text-xs">
                  Inactive
                </Badge>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreVertical className="size-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                <Edit className="mr-2 size-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleToggleStatus}>
                <PiggyBank className="mr-2 size-4" />
                {budget.isActive ? "Deactivate" : "Activate"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Amount display */}
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-bold">
                {formatCurrency(budget.spent, budget.currency)}
              </span>
              <span className="text-muted-foreground">
                {" "}
                / {formatCurrency(Number.parseFloat(budget.amount), budget.currency)}
              </span>
            </div>
            <span
              className={cn(
                "text-sm font-medium",
                budget.isOverBudget
                  ? "text-destructive"
                  : budget.isNearThreshold
                    ? "text-amber-500"
                    : "text-muted-foreground",
              )}
            >
              {budget.percentUsed.toFixed(0)}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  getProgressColor(),
                )}
                style={{ width: `${Math.min(100, budget.percentUsed)}%` }}
              />
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              <TrendingUp className="size-3.5" />
              <span>
                {formatCurrency(budget.remaining, budget.currency)} remaining
              </span>
            </div>
            {budget.rollover && (
              <Badge variant="outline" className="text-xs">
                Rollover
              </Badge>
            )}
          </div>

          {/* Date range */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="size-3" />
            <span>
              {new Date(budget.startDate).toLocaleDateString()}
              {budget.endDate && ` - ${new Date(budget.endDate).toLocaleDateString()}`}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <BudgetDialog
        budget={budget}
        categories={categories}
        userCurrency={userCurrency}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Budget</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{budget.name}&quot;? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
