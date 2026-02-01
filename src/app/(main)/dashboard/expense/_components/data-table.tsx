"use client";
"use no memo";

import * as React from "react";

import { format } from "date-fns";
import { ArrowDownLeft, ArrowUpRight, CalendarIcon, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DataTable as DataTableNew } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { Check, ChevronsUpDown } from "lucide-react";
import { icons } from "@/components/ui/icon-picker";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { cn } from "@/lib/utils";
import type { UserSettings } from "@/server/user-settings-actions";

import { createExpense, deleteExpenses } from "../_actions/expense-actions";
import { getCategories } from "@/actions/categories";
import { getAccounts } from "../../accounts/_actions/account-actions";
import { AccountSelector } from "../../accounts/_components/account-selector";
import { createColumns } from "./columns";
import { TransactionSheet } from "./transaction-sheet";
import type { Transaction } from "./schema";

type ExpenseFormState = {
  type: "expense" | "income";
  amount: string;
  description: string;
  date: string;
  notes: string;
  tags: string;
  isConfirmed: boolean;
  accountId: number | null;
  category: string;
};

function RecordTransactionButton({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [accounts, setAccounts] = React.useState<Array<{ id: number; name: string; type: string; color: string | null; currentBalance: string | null; currency: string; isDefault: boolean | null }>>([]);
  // Define a type for categories that matches what the UI expects
  type CategoryOption = { id: number; name: string; type: "expense" | "income"; icon: string | null; color: string | null; subcategories?: CategoryOption[] };
  const [categories, setCategories] = React.useState<CategoryOption[]>([]);

  const [form, setForm] = React.useState<ExpenseFormState>(() => ({
    date: new Date().toISOString().slice(0, 10),
    description: "",
    category: "",
    type: "expense",
    amount: "",
    notes: "",
    tags: "",
    isConfirmed: true,
    accountId: null,
  }));

  // Fetch accounts and categories when dialog opens
  React.useEffect(() => {
    if (open) {
      Promise.all([getAccounts(), getCategories()]).then(([accountsResult, categoriesResult]) => {
        if (accountsResult.success) {
          setAccounts(accountsResult.data);
          // Auto-select the default Cash account if no account is selected
          if (form.accountId === null) {
            const defaultAccount = accountsResult.data.find((acc) => acc.isDefault);
            if (defaultAccount) {
              setForm((prev) => ({ ...prev, accountId: defaultAccount.id }));
            }
          }
        }
        // categoriesResult is the data directly (it's not wrapped in success/data object based on my previous impl of getCategories)
        // Wait, let's check getCategories return type. It returns rootCategories which is an array.
        // It throws error if unauthorized, but doesn't return {success, data} wrapper? 
        // Checking src/actions/categories.ts: Yes, it returns rootCategories directly.
        setCategories(categoriesResult);
      });
    }
  }, [open]);

  const canSubmit = form.description.trim().length > 0 && form.amount.trim().length > 0 && form.accountId !== null && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) {
      if (form.accountId === null) {
        toast.error("Please select an account");
        return;
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createExpense({
        type: form.type,
        amount: form.amount,
        description: form.description,
        category: form.category,
        date: form.date,
        notes: form.notes || undefined,
        tags: form.tags || undefined,
        isConfirmed: true,
        accountId: form.accountId,
      });

      if (result.success) {
        toast.success("Transaction recorded successfully");
        setOpen(false);
        setForm({
          date: new Date().toISOString().slice(0, 10),
          description: "",
          category: "",
          type: "expense",
          amount: "",
          notes: "",
          tags: "",
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus />
          <span className="hidden lg:inline">Record transaction</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Record Transaction</DialogTitle>
          <DialogDescription>
            Enter the details for your transaction.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={form.type}
          onValueChange={(value) => setForm(prev => ({ ...prev, type: value as "expense" | "income" }))}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="expense" className="flex items-center gap-2">
              <ArrowUpRight className="size-4 text-red-600 dark:text-red-400" />
              Expense
            </TabsTrigger>
            <TabsTrigger value="income" className="flex items-center gap-2">
              <ArrowDownLeft className="size-4 text-green-600 dark:text-green-400" />
              Income
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="tx-description">Description</Label>
            <Input
              id="tx-description"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="e.g. Grocery store"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
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
            <div className="grid gap-2">
              <Label htmlFor="tx-date">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn("w-full justify-start text-left font-normal", !form.date && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.date ? format(new Date(form.date), "dd-MMM-yyyy") : <span>Pick a date</span>}
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
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="tx-category">Category</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className={cn(
                    "w-full justify-between font-normal",
                    !form.category && "text-muted-foreground"
                  )}
                >
                  {form.category
                    ? (() => {
                      const catId = Number.parseInt(form.category);
                      const findCategory = (id: number) => {
                        for (const parent of categories) {
                          if (parent.id === id) return parent;
                          if (parent.subcategories) {
                            const sub = parent.subcategories.find((s) => s.id === id);
                            if (sub) return sub;
                          }
                        }
                        return null;
                      };
                      const cat = findCategory(catId);
                      return cat ? (
                        <div className="flex items-center gap-2">
                          {(() => {
                            const Icon = cat.icon && icons[cat.icon as keyof typeof icons] ? icons[cat.icon as keyof typeof icons] : null;
                            return Icon ? <Icon className="size-4 text-muted-foreground" /> : null;
                          })()}
                          <span>{cat.name}</span>
                        </div>
                      ) : "Select category";
                    })()
                    : "Select category"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search category..." />
                  <CommandList className="max-h-[300px] overflow-y-auto">
                    <CommandEmpty>No category found.</CommandEmpty>
                    {categories
                      .filter(c => c.type === form.type)
                      .map((parent) => {
                        const Icon = parent.icon && icons[parent.icon as keyof typeof icons] ? icons[parent.icon as keyof typeof icons] : null;
                        return (
                          <CommandGroup key={parent.id}>
                            <CommandItem
                              value={parent.name} // Search by name
                              onSelect={() => {
                                setForm((prev) => ({ ...prev, category: parent.id.toString() }));
                              }}
                              className="font-medium"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  form.category === parent.id.toString() ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {Icon ? <Icon className="mr-2 size-4 text-muted-foreground" /> : null}
                              {parent.name}
                            </CommandItem>
                            {parent.subcategories?.map((sub) => {
                              const SubIcon = sub.icon && icons[sub.icon as keyof typeof icons] ? icons[sub.icon as keyof typeof icons] : null;
                              return (
                                <CommandItem
                                  key={sub.id}
                                  value={sub.name}
                                  onSelect={() => {
                                    setForm((prev) => ({ ...prev, category: sub.id.toString() }));
                                  }}
                                  className="pl-8"
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      form.category === sub.id.toString() ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {SubIcon ? <SubIcon className="mr-2 size-4 text-muted-foreground" /> : null}
                                  {sub.name}
                                </CommandItem>
                              )
                            })}
                          </CommandGroup>
                        )
                      })}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tx-account">Account</Label>
            <AccountSelector
              accounts={accounts}
              value={form.accountId}
              onValueChange={(accountId) => setForm((prev) => ({ ...prev, accountId }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tx-notes">Notes</Label>
            <Input
              id="tx-notes"
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Optional details"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tx-tags">Tags</Label>
            <Input
              id="tx-tags"
              value={form.tags}
              onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))}
              placeholder="e.g. work, personal, urgent (comma-separated)"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!canSubmit} onClick={handleSubmit}>
            {isSubmitting ? "Saving..." : "Save Transaction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DataTable({ data: initialData, userSettings, testButton }: { data: Transaction[]; userSettings: UserSettings; testButton?: React.ReactNode }) {
  const [data, setData] = React.useState(() => initialData);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [activeView, setActiveView] = React.useState<"all" | "income" | "expense">("all");

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [pendingDeleteId, setPendingDeleteId] = React.useState<number | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = React.useState(false);

  // Edit sheet state
  const [selectedTransaction, setSelectedTransaction] = React.useState<Transaction | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const handleDeleteRequest = React.useCallback((id: number) => {
    setPendingDeleteId(id);
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = React.useCallback(async () => {
    if (pendingDeleteId === null) return;

    const previousData = data;
    setData((prev) => prev.filter((row) => row.id !== pendingDeleteId));

    const result = await deleteExpenses([pendingDeleteId]);
    if (!result.success) {
      setData(previousData);
      toast.error(result.error);
    } else {
      toast.success("Transaction deleted");
    }

    setDeleteDialogOpen(false);
    setPendingDeleteId(null);
  }, [data, pendingDeleteId]);

  const handleUpdate = React.useCallback((updatedItem: Transaction) => {
    setData((prev) => prev.map((row) => (row.id === updatedItem.id ? updatedItem : row)));
  }, []);

  const handleEdit = React.useCallback((item: Transaction) => {
    setSelectedTransaction(item);
    setSheetOpen(true);
  }, []);

  const columns = React.useMemo(
    () => createColumns({ onDelete: handleDeleteRequest, onUpdate: handleUpdate, onEdit: handleEdit, userSettings }),
    [handleDeleteRequest, handleUpdate, handleEdit, userSettings],
  );

  const filteredData = React.useMemo(() => {
    if (activeView === "all") return data;
    return data.filter((row) => row.type === activeView);
  }, [data, activeView]);

  const table = useDataTableInstance({ data: filteredData, columns, getRowId: (row) => row.id.toString() });

  const incomeCount = React.useMemo(() => data.filter((row) => row.type === "income").length, [data]);
  const expenseCount = React.useMemo(() => data.filter((row) => row.type === "expense").length, [data]);

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const hasSelection = selectedRows.length > 0;

  const handleBulkDeleteRequest = () => {
    if (!hasSelection) return;
    setBulkDeleteDialogOpen(true);
  };

  const handleConfirmBulkDelete = async () => {
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
    setBulkDeleteDialogOpen(false);
  };

  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sync with server data
  React.useEffect(() => {
    setData((prev) => {
      if (prev === initialData) return prev;
      return initialData;
    });
  }, [initialData]);

  return (
    <>
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
              <Button variant="destructive" size="sm" onClick={handleBulkDeleteRequest} disabled={isDeleting}>
                <Trash2 className="mr-1 size-4" />
                Delete ({selectedRows.length})
              </Button>
            )}
            <DataTableViewOptions table={table} />
            {testButton && <React.Fragment key="test-button">{testButton}</React.Fragment>}
            <RecordTransactionButton
              onSuccess={() => {
                /* TODO: Handle success */
              }}
            />
          </div>
        </div>
        <TabsContent value={activeView} className="relative flex flex-col gap-4 overflow-auto">
          <div className="overflow-hidden rounded-lg border">
            <DataTableNew table={table} columns={columns} onReorder={setData} userSettings={userSettings} />
          </div>
          <DataTablePagination table={table} />
        </TabsContent>
      </Tabs>

      <TransactionSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        transaction={selectedTransaction}
        onUpdate={handleUpdate}
        userSettings={userSettings}
      />

      {/* Single delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirmation dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transactions</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedRows.length} transaction(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmBulkDelete}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
