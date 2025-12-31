"use client";
"use no memo";

import * as React from "react";

import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DataTable as DataTableNew } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { withDndColumn } from "@/components/data-table/table-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

import { createExpense, deleteExpenses } from "../_actions/expense-actions";
import { getAccounts } from "../../accounts/_actions/account-actions";
import { AccountSelector } from "../../accounts/_components/account-selector";
import { createColumns } from "./columns";
import type { Transaction } from "./schema";

type ExpenseFormState = {
  type: "expense" | "income";
  amount: string;
  description: string;
  date: string;
  notes: string;
  isConfirmed: boolean;
  accountId: number | null;
};

function RecordTransactionButton({ onSuccess }: { onSuccess: () => void }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [accounts, setAccounts] = React.useState<Array<{ id: number; name: string; type: string; color: string | null; currentBalance: string | null; currency: string }>>([]);
  const [form, setForm] = React.useState<ExpenseFormState>(() => ({
    date: new Date().toISOString().slice(0, 10),
    description: "",
    type: "expense",
    amount: "",
    notes: "",
    isConfirmed: true,
    accountId: null,
  }));

  // Fetch accounts when dialog opens
  React.useEffect(() => {
    if (open) {
      getAccounts().then((result) => {
        if (result.success) {
          setAccounts(result.data);
        }
      });
    }
  }, [open]);

  const canSubmit = form.description.trim().length > 0 && form.amount.trim().length > 0 && !isSubmitting;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await createExpense({
        type: form.type,
        amount: form.amount,
        description: form.description,
        date: form.date,
        notes: form.notes || undefined,
        isConfirmed: form.isConfirmed,
        accountId: form.accountId,
      });

      if (result.success) {
        toast.success("Transaction recorded successfully");
        setOpen(false);
        setForm({
          date: new Date().toISOString().slice(0, 10),
          description: "",
          type: "expense",
          amount: "",
          notes: "",
          isConfirmed: true,
          accountId: null,
        });
        onSuccess();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to record transaction");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer direction={isMobile ? "bottom" : "right"} open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus />
          <span className="hidden lg:inline">Record transaction</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <DrawerTitle>Record transaction</DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
          <div className="flex flex-col gap-3">
            <Label htmlFor="tx-description">Description</Label>
            <Input
              id="tx-description"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="e.g. Grocery store"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-3">
              <Label htmlFor="tx-type">Type</Label>
              <Select
                value={form.type}
                onValueChange={(value) => setForm((prev) => ({ ...prev, type: value as "expense" | "income" }))}
              >
                <SelectTrigger id="tx-type" className="w-full">
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor="tx-status">Status</Label>
              <Select
                value={form.isConfirmed ? "confirmed" : "pending"}
                onValueChange={(value) => setForm((prev) => ({ ...prev, isConfirmed: value === "confirmed" }))}
              >
                <SelectTrigger id="tx-status" className="w-full">
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-3">
              <Label htmlFor="tx-date">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn("w-full justify-start text-left font-normal", !form.date && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.date ? format(new Date(form.date), "dd-MMM-yy") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.date ? new Date(form.date) : undefined}
                    onSelect={(date) =>
                      setForm((prev) => ({
                        ...prev,
                        date: date ? format(date, "yyyy-MM-dd") : "",
                      }))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor="tx-amount">Amount</Label>
              <Input
                id="tx-amount"
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Label htmlFor="tx-account">Account</Label>
            <AccountSelector
              accounts={accounts}
              value={form.accountId}
              onValueChange={(accountId) => setForm((prev) => ({ ...prev, accountId }))}
            />
          </div>
          <div className="flex flex-col gap-3">
            <Label htmlFor="tx-notes">Notes</Label>
            <Input
              id="tx-notes"
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Optional"
            />
          </div>
        </div>
        <DrawerFooter>
          <Button disabled={!canSubmit} onClick={handleSubmit}>
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

export function DataTable({ data: initialData }: { data: Transaction[] }) {
  const [data, setData] = React.useState(() => initialData);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = React.useCallback(
    async (id: number) => {
      const previousData = data;
      setData((prev) => prev.filter((row) => row.id !== id));

      const result = await deleteExpenses([id]);
      if (!result.success) {
        setData(previousData);
        toast.error(result.error);
      } else {
        toast.success("Transaction deleted");
      }
    },
    [data],
  );

  const handleUpdate = React.useCallback((updatedItem: Transaction) => {
    setData((prev) => prev.map((row) => (row.id === updatedItem.id ? updatedItem : row)));
  }, []);

  const columns = React.useMemo(
    () => withDndColumn(createColumns({ onDelete: handleDelete, onUpdate: handleUpdate })),
    [handleDelete, handleUpdate],
  );

  const table = useDataTableInstance({ data, columns, getRowId: (row) => row.id.toString() });
  const [activeView, setActiveView] = React.useState<"all" | "income" | "expense">("all");

  const incomeCount = React.useMemo(() => data.filter((row) => row.type === "income").length, [data]);
  const expenseCount = React.useMemo(() => data.filter((row) => row.type === "expense").length, [data]);

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const hasSelection = selectedRows.length > 0;

  const handleBulkDelete = async () => {
    if (!hasSelection) return;

    setIsDeleting(true);
    const ids = selectedRows.map((row) => row.original.id);
    const previousData = data;

    setData((prev) => prev.filter((row) => !ids.includes(row.id)));
    table.resetRowSelection();

    const result = await deleteExpenses(ids);
    if (!result.success) {
      setData(previousData);
      toast.error(result.error);
    } else {
      toast.success(`${result.data.count} transaction(s) deleted`);
    }
    setIsDeleting(false);
  };

  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  React.useEffect(() => {
    if (!isMounted) return;

    const typeColumn = table.getColumn("type");
    if (!typeColumn) return;

    typeColumn.setFilterValue(activeView === "all" ? undefined : activeView);
  }, [activeView, table, isMounted]);

  // Sync with server data
  React.useEffect(() => {
    setData((prev) => {
      if (prev === initialData) return prev;
      return initialData;
    });
  }, [initialData]);

  return (
    <Tabs
      value={activeView}
      onValueChange={(value) => setActiveView(value as typeof activeView)}
      className="w-full flex-col justify-start gap-6"
    >
      <div className="flex items-center justify-between">
        <Label htmlFor="view-selector" className="sr-only">
          View
        </Label>
        <Select value={activeView} onValueChange={(value) => setActiveView(value as typeof activeView)}>
          <SelectTrigger className="flex @4xl/main:hidden w-fit" size="sm" id="view-selector">
            <SelectValue placeholder="Select a view" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All transactions</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
          </SelectContent>
        </Select>
        <TabsList className="@4xl/main:flex hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:bg-muted-foreground/30 **:data-[slot=badge]:px-1">
          <TabsTrigger value="all">All transactions</TabsTrigger>
          <TabsTrigger value="income">
            Income <Badge variant="secondary">{incomeCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="expense">
            Expense <Badge variant="secondary">{expenseCount}</Badge>
          </TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-2">
          {hasSelection && (
            <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={isDeleting}>
              <Trash2 className="mr-1 size-4" />
              Delete ({selectedRows.length})
            </Button>
          )}
          <DataTableViewOptions table={table} />
          <RecordTransactionButton
            onSuccess={() => {
              /* TODO: Handle success */
            }}
          />
        </div>
      </div>
      <TabsContent value={activeView} className="relative flex flex-col gap-4 overflow-auto">
        <div className="overflow-hidden rounded-lg border">
          <DataTableNew dndEnabled table={table} columns={columns} onReorder={setData} />
        </div>
        <DataTablePagination table={table} />
      </TabsContent>
    </Tabs>
  );
}
