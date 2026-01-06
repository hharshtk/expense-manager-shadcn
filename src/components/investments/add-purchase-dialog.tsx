"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { recordBuyTransaction, getStockPrice } from "@/actions/investments";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Investment } from "@/lib/schema";

const addPurchaseSchema = z.object({
  quantity: z.coerce.number().positive("Quantity must be positive"),
  price: z.coerce.number().positive("Price must be positive"),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

type AddPurchaseForm = z.infer<typeof addPurchaseSchema>;

interface AddPurchaseDialogProps {
  investment: Investment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddPurchaseDialog({ investment, open, onOpenChange }: AddPurchaseDialogProps) {
  const [loading, setLoading] = useState(false);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [currentMarketPrice, setCurrentMarketPrice] = useState<number | null>(null);

  const form = useForm<AddPurchaseForm>({
    resolver: zodResolver(addPurchaseSchema),
    defaultValues: {
      quantity: 0,
      price: 0,
      date: new Date().toISOString().split("T")[0],
      notes: "",
    },
  });

  const quantity = form.watch("quantity");
  const price = form.watch("price");
  const totalCost = quantity * price;

  // Fetch current price when dialog opens
  useEffect(() => {
    if (open) {
      setFetchingPrice(true);
      getStockPrice(investment.symbol)
        .then((result) => {
          if (result.success && result.data) {
            setCurrentMarketPrice(result.data.price);
            form.setValue("price", result.data.price);
          }
        })
        .finally(() => setFetchingPrice(false));
    }
  }, [open, investment.symbol, form]);

  const onSubmit = async (data: AddPurchaseForm) => {
    if (!investment.portfolioId) {
      toast.error("This investment is not assigned to a portfolio. Please assign it to a portfolio first.");
      return;
    }

    setLoading(true);
    try {
      const result = await recordBuyTransaction({
        symbol: investment.symbol,
        name: investment.name,
        type: investment.type as "stock" | "mutual_fund" | "etf" | "bond" | "crypto" | "commodity" | "other",
        portfolioId: investment.portfolioId,
        exchange: investment.exchange || undefined,
        currency: investment.currency || "USD",
        quantity: data.quantity,
        price: data.price,
        date: data.date,
        notes: data.notes,
      });
      
      if (result.success) {
        toast.success(`Added ${data.quantity} shares of ${investment.symbol}`);
        onOpenChange(false);
        form.reset();
      } else {
        toast.error(result.error || "Failed to record purchase");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const currency = investment.currency || "USD";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Buy More {investment.symbol}</DialogTitle>
          <DialogDescription>
            Record an additional purchase of {investment.name}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Current Position Info */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Holdings</span>
                <span className="font-medium">
                  {Number(investment.totalQuantity || 0).toFixed(
                    Number(investment.totalQuantity || 0) % 1 === 0 ? 0 : 4
                  )} shares
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Average Cost</span>
                <span className="font-medium">
                  {formatCurrency(Number(investment.averagePrice || 0), { currency })}
                </span>
              </div>
              {currentMarketPrice && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Market Price</span>
                  <span className="font-medium">
                    {formatCurrency(currentMarketPrice, { currency })}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.0001" {...field} placeholder="10" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price per Share</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          placeholder="150.00"
                          disabled={fetchingPrice}
                        />
                        {fetchingPrice && (
                          <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin" />
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purchase Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Add any notes..." rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Total Cost Preview */}
            {totalCost > 0 && (
              <div className="bg-primary/10 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Cost</span>
                  <span className="text-lg font-bold">
                    {formatCurrency(totalCost, { currency })}
                  </span>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Record Purchase
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
