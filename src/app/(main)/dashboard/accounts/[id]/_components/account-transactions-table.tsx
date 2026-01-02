import { format } from "date-fns";
import { Activity } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { UserSettings } from "@/server/user-settings-actions";
import { cn, formatCurrency } from "@/lib/utils";

interface Transaction {
  id: number;
  amount: string;
  type: "income" | "expense" | "transfer";
  description: string | null;
  categoryId: number | null;
  categoryName: string | null;
  categoryIcon: string | null;
  parentCategoryId: number | null;
  notes: string | null;
  date: Date;
  createdAt: Date;
}

interface AccountTransactionsTableProps {
  transactions: Transaction[];
  userSettings: UserSettings;
  currency: string;
}

export function AccountTransactionsTable({
  transactions,
  userSettings,
  currency,
}: AccountTransactionsTableProps) {
  const formatAmount = (amount: string) =>
    formatCurrency(Number.parseFloat(amount), {
      currency,
      locale: userSettings.locale,
    });

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      {transactions.length > 0 ? (
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[100px] text-[10px] font-bold text-muted-foreground uppercase tracking-widest h-10">Date</TableHead>
              <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest h-10">Transaction</TableHead>
              <TableHead className="w-[140px] text-[10px] font-bold text-muted-foreground uppercase tracking-widest h-10">Category</TableHead>
              <TableHead className="text-right w-[120px] text-[10px] font-bold text-muted-foreground uppercase tracking-widest h-10">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction.id} className="hover:bg-muted/50 transition-colors group">
                <TableCell className="py-3">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium">
                      {format(new Date(transaction.date), "MMM dd")}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(transaction.date), "yyyy")}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "size-1.5 rounded-full shrink-0",
                      transaction.type === "income" ? "bg-green-500" : "bg-red-500"
                    )} />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold tracking-tight">
                        {transaction.description || "No description"}
                      </span>
                      {transaction.notes && (
                        <span className="text-[10px] text-muted-foreground line-clamp-1 italic">
                          {transaction.notes}
                        </span>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-3">
                  {transaction.categoryName ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      {transaction.categoryIcon && (
                        <span className="text-xs">{transaction.categoryIcon}</span>
                      )}
                      <span className="text-[11px] font-medium">{transaction.categoryName}</span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-muted-foreground italic">Uncategorized</span>
                  )}
                </TableCell>
                <TableCell className="text-right py-3">
                  <span
                    className={cn(
                      "text-sm font-bold tabular-nums tracking-tight",
                      transaction.type === "income" ? "text-green-600 dark:text-green-500" : "",
                      transaction.type === "expense" ? "text-red-600 dark:text-red-500" : "",
                    )}
                  >
                    {transaction.type === "expense" ? "-" : transaction.type === "income" ? "+" : ""}
                    {formatAmount(transaction.amount)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="size-10 rounded-full bg-muted flex items-center justify-center mb-3">
            <Activity className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            No transactions found
          </p>
          <p className="text-xs text-muted-foreground/60">
            Try adjusting your date range
          </p>
        </div>
      )}
    </div>
  );
}
