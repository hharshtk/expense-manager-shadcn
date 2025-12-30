import * as React from "react";

import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";

import { updateExpense } from "../_actions/expense-actions";
import type { Transaction } from "./schema";

const currency = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

type TableCellViewerProps = {
  item: Transaction;
  onUpdate: (item: Transaction) => void;
};

export function TableCellViewer({ item, onUpdate }: TableCellViewerProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [form, setForm] = React.useState({
    type: item.type,
    amount: item.amount,
    description: item.description || "",
    date: item.date,
    notes: item.notes || "",
    isConfirmed: item.isConfirmed ?? true,
  });

  const amount = Number.parseFloat(item.amount);
  const signedAmount = item.type === "expense" ? -amount : amount;

  const canSubmit = form.description.trim().length > 0 && form.amount.trim().length > 0 && !isSubmitting;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await updateExpense(item.id, {
        type: form.type,
        amount: form.amount,
        description: form.description,
        date: form.date,
        notes: form.notes || undefined,
        isConfirmed: form.isConfirmed,
      });

      if (result.success) {
        toast.success("Transaction updated successfully");
        onUpdate(result.data as Transaction);
        setOpen(false);
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to update transaction");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer direction={isMobile ? "bottom" : "right"} open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="link" className="w-fit px-0 text-left text-foreground">
          {item.description || "No description"}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <DrawerTitle>{item.description || "Transaction"}</DrawerTitle>
          <DrawerDescription>
            {item.type === "income" ? "Income" : "Expense"} · {item.date} · {currency.format(signedAmount)}
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
          {!isMobile && (
            <>
              <div className="grid gap-2">
                <div className="flex items-center gap-2 font-medium leading-none">
                  {item.type === "income" ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                  {item.type === "income" ? "Money received" : "Money spent"}
                </div>
                <div className="text-muted-foreground">Review and update transaction details.</div>
              </div>
              <Separator />
            </>
          )}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, type: value as "expense" | "income" }))}
                >
                  <SelectTrigger id="type" className="w-full">
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={form.isConfirmed ? "confirmed" : "pending"}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, isConfirmed: value === "confirmed" }))}
                >
                  <SelectTrigger id="status" className="w-full">
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
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Optional"
              />
            </div>
          </div>
        </div>
        <DrawerFooter>
          <Button disabled={!canSubmit} onClick={handleSubmit}>
            {isSubmitting ? "Saving..." : "Save changes"}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
