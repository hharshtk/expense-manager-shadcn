"use client";

import * as React from "react";
import { CalendarIcon, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import { generateTestTransactions, getUserAccounts } from "../_actions/test-data-actions";

type TestDataFormState = {
  count: string;
  accountId: string;
  startDate: Date;
  endDate: Date;
};

export function TestTransactionButton() {
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [accounts, setAccounts] = React.useState<Array<{ id: number; name: string; type: string; currency: string }>>([]);
  
  const [form, setForm] = React.useState<TestDataFormState>(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Default to last 30 days
    
    return {
      count: "50",
      accountId: "",
      startDate,
      endDate,
    };
  });

  // Fetch accounts when dialog opens
  React.useEffect(() => {
    if (open) {
      getUserAccounts().then((result) => {
        if (result.success) {
          setAccounts(result.data);
          // Auto-select first account if available
          if (result.data.length > 0 && !form.accountId) {
            setForm(prev => ({ ...prev, accountId: result.data[0].id.toString() }));
          }
        } else {
          toast.error(result.error);
        }
      });
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const count = Number.parseInt(form.count);
    if (Number.isNaN(count) || count < 1 || count > 1000) {
      toast.error("Please enter a valid count between 1 and 1000");
      return;
    }

    if (!form.accountId) {
      toast.error("Please select an account");
      return;
    }

    if (form.startDate >= form.endDate) {
      toast.error("Start date must be before end date");
      return;
    }

    setIsSubmitting(true);

    const result = await generateTestTransactions({
      count,
      accountId: Number.parseInt(form.accountId),
      startDate: form.startDate.toISOString().split('T')[0],
      endDate: form.endDate.toISOString().split('T')[0],
    });

    setIsSubmitting(false);

    if (result.success) {
      toast.success(`Successfully created ${result.data.created} test transactions!`);
      setOpen(false);
      // Reset form
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      setForm({
        count: "50",
        accountId: "",
        startDate,
        endDate,
      });
    } else {
      toast.error(result.error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FlaskConical className="mr-2 h-4 w-4" />
          Generate Test Data
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Generate Test Transactions</DialogTitle>
            <DialogDescription>
              Create random transactions for testing purposes. This will add expenses and income to the selected account.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="count">Number of Transactions</Label>
              <Input
                id="count"
                type="number"
                min="1"
                max="1000"
                value={form.count}
                onChange={(e) => setForm({ ...form, count: e.target.value })}
                placeholder="50"
              />
              <p className="text-xs text-muted-foreground">Maximum 1000 transactions</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="account">Account</Label>
              <Select
                value={form.accountId}
                onValueChange={(value) => setForm({ ...form, accountId: value })}
              >
                <SelectTrigger id="account">
                  <SelectValue placeholder="Select an account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.name} ({account.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Date Range</Label>
              <div className="grid grid-cols-2 gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !form.startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.startDate ? format(form.startDate, "PPP") : "Start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.startDate}
                      onSelect={(date) => date && setForm({ ...form, startDate: date })}
                      disabled={(date) => date > new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !form.endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.endDate ? format(form.endDate, "PPP") : "End date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.endDate}
                      onSelect={(date) => date && setForm({ ...form, endDate: date })}
                      disabled={(date) => date > new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <p className="text-xs text-muted-foreground">
                Transactions will be randomly distributed within this period
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Generating..." : "Generate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
