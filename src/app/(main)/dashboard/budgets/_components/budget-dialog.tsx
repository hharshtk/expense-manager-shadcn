"use client";

import * as React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { createBudget, updateBudget } from "../_actions/budget-actions";
import type { BudgetWithProgress } from "../_queries/budget-queries";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import type { Budget, Category } from "@/lib/schema";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  categoryId: z.string().optional(),
  amount: z.string().min(1, "Amount is required").refine(
    (val) => !Number.isNaN(Number.parseFloat(val)) && Number.parseFloat(val) > 0,
    "Amount must be greater than 0"
  ),
  period: z.enum(["daily", "weekly", "monthly", "quarterly", "yearly"]),
  startDate: z.date({ required_error: "Start date is required" }),
  endDate: z.date().optional().nullable(),
  rollover: z.boolean().default(false),
  alertThreshold: z.number().min(0).max(100).default(80),
});

type FormValues = z.infer<typeof formSchema>;

interface BudgetDialogProps {
  budget?: Budget | BudgetWithProgress;
  categories: Category[];
  userCurrency: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const PERIODS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

export function BudgetDialog({
  budget,
  categories,
  userCurrency,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: BudgetDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = controlledOnOpenChange ?? setUncontrolledOpen;

  const isEditing = !!budget;

  const getDefaultValues = React.useCallback((): FormValues => {
    if (budget) {
      return {
        name: budget.name || "",
        categoryId: budget.categoryId?.toString() || "",
        amount: budget.amount?.toString() || "",
        period: budget.period || "monthly",
        startDate: budget.startDate ? new Date(budget.startDate) : new Date(),
        endDate: budget.endDate ? new Date(budget.endDate) : null,
        rollover: budget.rollover ?? false,
        alertThreshold: budget.alertThreshold ?? 80,
      };
    }
    return {
      name: "",
      categoryId: "",
      amount: "",
      period: "monthly",
      startDate: new Date(),
      endDate: null,
      rollover: false,
      alertThreshold: 80,
    };
  }, [budget]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(),
  });

  // Reset form when dialog opens/closes or budget changes
  React.useEffect(() => {
    if (open) {
      form.reset(getDefaultValues());
    }
  }, [open, budget, form, getDefaultValues]);

  // Filter to expense categories only (budgets typically track expenses)
  const expenseCategories = categories.filter((c) => c.type === "expense" && !c.parentId);

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);

      const data = {
        name: values.name,
        categoryId: values.categoryId && values.categoryId !== "none" 
          ? Number.parseInt(values.categoryId) 
          : null,
        amount: values.amount,
        currency: userCurrency,
        period: values.period,
        startDate: format(values.startDate, "yyyy-MM-dd"),
        endDate: values.endDate ? format(values.endDate, "yyyy-MM-dd") : null,
        rollover: values.rollover,
        alertThreshold: values.alertThreshold,
      };

      if (isEditing && budget) {
        await updateBudget(budget.id, data);
        toast.success("Budget updated successfully");
      } else {
        await createBudget(data);
        toast.success("Budget created successfully");
      }

      setOpen(false);
      form.reset();
    } catch (error) {
      console.error("Failed to save budget:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Budget" : "Create New Budget"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your budget settings and tracking preferences."
              : "Set up a new budget to track your spending limits."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Monthly Groceries" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category */}
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="All categories (overall budget)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">All categories (overall budget)</SelectItem>
                      {expenseCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          <span className="flex items-center gap-2">
                            {category.color && (
                              <span
                                className="size-3 rounded-full"
                                style={{ backgroundColor: category.color }}
                              />
                            )}
                            {category.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Leave empty to track all expenses across categories.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amount and Period */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget Amount ({userCurrency})</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="period"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PERIODS.map((period) => (
                          <SelectItem key={period.value} value={period.value}>
                            {period.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Date Range */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 size-4" />
                            {field.value ? format(field.value, "PPP") : "Pick a date"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date (Optional)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 size-4" />
                            {field.value ? format(field.value, "PPP") : "No end date"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ?? undefined}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < (form.getValues("startDate") || new Date())
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Alert Threshold */}
            <FormField
              control={form.control}
              name="alertThreshold"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Alert Threshold</FormLabel>
                    <span className="text-sm font-medium">{field.value}%</span>
                  </div>
                  <FormControl>
                    <Slider
                      min={0}
                      max={100}
                      step={5}
                      value={[field.value]}
                      onValueChange={(vals) => field.onChange(vals[0])}
                      className="py-2"
                    />
                  </FormControl>
                  <FormDescription>
                    Get alerted when spending reaches this percentage of your budget.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Rollover */}
            <FormField
              control={form.control}
              name="rollover"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Enable Rollover</FormLabel>
                    <FormDescription>
                      Carry over unused budget amount to the next period.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                {isEditing ? "Update Budget" : "Create Budget"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
