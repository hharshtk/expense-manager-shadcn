"use client";

import { useState } from "react";
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
import { recordSellTransaction, getStockPrice } from "@/actions/investments";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { Investment } from "@/lib/schema";
import { formatCurrency } from "@/lib/utils";

const sellTransactionSchema = z.object({
  investmentId: z.number(),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  price: z.coerce.number().positive("Price must be positive"),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

type SellTransactionForm = z.infer<typeof sellTransactionSchema>;

interface SellTransactionDialogProps {
  investment: Investment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SellTransactionDialog({
  investment,
  open,
  onOpenChange,
}: SellTransactionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [fetchingPrice, setFetchingPrice] = useState(false);

  const form = useForm<SellTransactionForm>({
    resolver: zodResolver(sellTransactionSchema),
    defaultValues: {
      investmentId: investment.id,
      quantity: 0,
      price: Number(investment.currentPrice) || 0,
      date: new Date().toISOString().split("T")[0],
      notes: "",
    },
  });

  const handleFetchCurrentPrice = async () => {
    setFetchingPrice(true);
    try {
      const priceResult = await getStockPrice(investment.symbol);
      if (priceResult.success && priceResult.data) {
        form.setValue("price", priceResult.data.price);
        toast.success(`Current price: ${formatCurrency(priceResult.data.price, { currency: priceResult.data.currency })}`);
      } else {
        toast.error("Failed to fetch current price");
      }
    } catch (error) {
      toast.error("Failed to fetch price");
    } finally {
      setFetchingPrice(false);
    }
  };

  const onSubmit = async (data: SellTransactionForm) => {
    setLoading(true);
    try {
      const result = await recordSellTransaction(data);
      if (result.success) {
        toast.success("Sell transaction recorded successfully");
        onOpenChange(false);
        form.reset();
      } else {
        toast.error(result.error || "Failed to record transaction");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Sell {investment.symbol}</DialogTitle>
          <DialogDescription>
            Record a sale of {investment.name}. You currently hold{" "}
            {Number(investment.totalQuantity).toFixed(4)} units.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.0001"
                          {...field}
                          placeholder="10"
                          max={Number(investment.totalQuantity)}
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
                        Available: {Number(investment.totalQuantity).toFixed(4)}
                      </p>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price per Unit</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            placeholder="150.00"
                            disabled={fetchingPrice}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={handleFetchCurrentPrice}
                            disabled={fetchingPrice}
                          >
                            {fetchingPrice ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "↻"
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Add any notes..." rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Transaction Summary */}
              <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
                <h4 className="font-medium">Transaction Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Quantity:</span>
                  <span>{form.watch("quantity") || 0}</span>
                  <span className="text-muted-foreground">Price per unit:</span>
                  <span>
                    {formatCurrency(form.watch("price") || 0, { currency: investment.currency || "USD" })}
                  </span>
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>
                    {formatCurrency((form.watch("quantity") || 0) * (form.watch("price") || 0), { currency: investment.currency || "USD" })}
                  </span>
                  <span className="font-medium">Total Proceeds:</span>
                  <span className="font-medium">
                    {formatCurrency((form.watch("quantity") || 0) * (form.watch("price") || 0), { currency: investment.currency || "USD" })}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Record Sale
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
