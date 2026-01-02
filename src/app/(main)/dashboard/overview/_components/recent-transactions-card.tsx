"use client";

import { ArrowDownLeft, ArrowUpRight, Download, Filter, MoreHorizontal, Plus, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn, formatCurrency } from "@/lib/utils";

interface RecentTransactionsCardProps {
  currency?: string;
  data?: {
    id: number;
    description: string | null;
    amount: number;
    date: string;
    type: "expense" | "income";
    categoryName: string | null;
    categoryColor: string | null;
    categoryIcon: string | null;
  }[];
}

export function RecentTransactionsCard({ currency = "USD", data = [] }: RecentTransactionsCardProps) {
  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
        <CardDescription>Your latest expenses and income</CardDescription>
        <CardAction>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Filter className="size-4" />
              <span className="hidden lg:inline">Filter</span>
            </Button>
            <Button variant="outline" size="sm">
              <Download className="size-4" />
              <span className="hidden lg:inline">Export</span>
            </Button>
            <Button size="sm">
              <Plus className="size-4" />
              <span className="hidden lg:inline">Add Transaction</span>
            </Button>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search transactions..." className="pl-9" />
          </div>
        </div>

        <div className="rounded-md border">
          <div className="hidden border-b bg-muted/50 px-4 py-3 md:grid md:grid-cols-5">
            <span className="text-sm font-medium text-muted-foreground">Description</span>
            <span className="text-sm font-medium text-muted-foreground">Category</span>
            <span className="text-sm font-medium text-muted-foreground">Date</span>
            <span className="text-right text-sm font-medium text-muted-foreground">Amount</span>
            <span className="text-right text-sm font-medium text-muted-foreground">Actions</span>
          </div>

          <div className="divide-y">
            {data.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">No recent transactions found.</div>
            ) : (
              data.map((transaction) => {
                const isExpense = transaction.type === "expense";
                const date = new Date(transaction.date);

                return (
                  <div
                    key={transaction.id}
                    className="grid grid-cols-1 gap-2 px-4 py-3 hover:bg-muted/50 md:grid-cols-5 md:items-center md:gap-0"
                  >
                    {/* Description */}
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-full",
                          isExpense ? "bg-destructive/10" : "bg-green-500/10"
                        )}
                      >
                        {isExpense ? (
                          <ArrowUpRight className="size-4 text-destructive" />
                        ) : (
                          <ArrowDownLeft className="size-4 text-green-500" />
                        )}
                      </div>
                      <span className="text-sm font-medium">{transaction.description || "Untitled"}</span>
                    </div>

                    {/* Category */}
                    <div className="md:pl-0 pl-11">
                      <Badge variant="secondary" className="font-normal">
                        {transaction.categoryName || "Uncategorized"}
                      </Badge>
                    </div>

                    {/* Date */}
                    <div className="pl-11 text-sm text-muted-foreground md:pl-0">
                      {date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </div>

                    {/* Amount */}
                    <div
                      className={cn(
                        "pl-11 text-sm font-medium tabular-nums md:pl-0 md:text-right",
                        isExpense ? "text-destructive" : "text-green-500"
                      )}
                    >
                      {isExpense ? "-" : "+"}
                      {formatCurrency(transaction.amount, { currency })}
                    </div>

                    {/* Actions */}
                    <div className="hidden justify-end md:flex">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
