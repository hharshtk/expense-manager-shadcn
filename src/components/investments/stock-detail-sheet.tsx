"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Trash2,
  Plus,
  Minus,
  FolderOpen,
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { deleteInvestmentTransaction, getStockQuoteDetails, deleteInvestment, assignToPortfolio } from "@/actions/investments";
import { toast } from "sonner";
import type { Investment, InvestmentTransaction, Portfolio } from "@/lib/schema";
import { SellTransactionDialog } from "./sell-transaction-dialog";
import { AddPurchaseDialog } from "./add-purchase-dialog";

interface StockDetailSheetProps {
  investment: Investment & { transactions: InvestmentTransaction[] };
  portfolios: Portfolio[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StockDetailSheet({ investment, portfolios, open, onOpenChange }: StockDetailSheetProps) {
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [buyDialogOpen, setBuyDialogOpen] = useState(false);
  const [quoteDetails, setQuoteDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const isActive = investment.isActive && Number(investment.totalQuantity) > 0;
  const currency = investment.currency || "USD";
  const currentPrice = Number(investment.currentPrice || 0);
  const avgPrice = Number(investment.averagePrice || 0);
  const quantity = Number(investment.totalQuantity || 0);
  const currentValue = Number(investment.currentValue || 0);
  const totalInvested = Number(investment.totalInvested || 0);
  const totalGainLoss = Number(investment.totalGainLoss || 0);
  const totalGainLossPercent = Number(investment.totalGainLossPercent || 0);
  const dayChange = Number(investment.dayChange || 0);
  const dayChangePercent = Number(investment.dayChangePercent || 0);
  const dayGainLoss = Number(investment.dayGainLoss || 0);
  
  const isProfit = totalGainLoss >= 0;
  const isDayProfit = dayChange >= 0;

  const portfolioName = portfolios.find(p => p.id === investment.portfolioId)?.name;

  useEffect(() => {
    if (open && !quoteDetails) {
      setLoadingDetails(true);
      getStockQuoteDetails(investment.symbol)
        .then((result) => {
          if (result.success && result.data) {
            setQuoteDetails(result.data);
          }
        })
        .finally(() => setLoadingDetails(false));
    }
  }, [open, investment.symbol, quoteDetails]);

  const handleDeleteTransaction = async (txnId: number) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;

    const result = await deleteInvestmentTransaction(txnId);
    if (result.success) {
      toast.success("Transaction deleted");
      window.location.reload();
    } else {
      toast.error(result.error || "Failed to delete transaction");
    }
  };

  const handleDeleteInvestment = async () => {
    if (!confirm(`Are you sure you want to permanently delete ${investment.symbol}? This will completely remove the investment and all its transaction history. This action cannot be undone.`)) return;

    const result = await deleteInvestment(investment.id);
    if (result.success) {
      toast.success("Investment and all transactions permanently deleted");
      onOpenChange(false); // Close the sheet
      window.location.reload();
    } else {
      toast.error(result.error || "Failed to delete investment");
    }
  };

  const handlePortfolioChange = async (portfolioId: string) => {
    const result = await assignToPortfolio(investment.id, portfolioId === "none" ? null : Number(portfolioId));
    if (result.success) {
      toast.success("Portfolio updated");
      window.location.reload();
    } else {
      toast.error(result.error || "Failed to update portfolio");
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-6">
          <SheetHeader className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <SheetTitle className="text-2xl flex items-center gap-2">
                  {investment.symbol}
                  {investment.exchange && (
                    <Badge variant="outline" className="text-xs font-normal">
                      {investment.exchange}
                    </Badge>
                  )}
                </SheetTitle>
                <SheetDescription className="text-base">
                  {investment.name}
                </SheetDescription>
              </div>
              <Badge variant={isActive ? "default" : "secondary"}>
                {investment.type}
              </Badge>
            </div>

            {/* Current Price Section */}
            <div className="space-y-1">
              <div className="text-3xl font-bold">
                {formatCurrency(currentPrice, { currency })}
              </div>
              <div className={cn(
                "flex items-center text-sm",
                isDayProfit ? "text-green-500" : "text-red-500"
              )}>
                {isDayProfit ? (
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 mr-1" />
                )}
                {isDayProfit ? "+" : ""}{dayChange.toFixed(2)} ({isDayProfit ? "+" : ""}{dayChangePercent.toFixed(2)}%)
                <span className="text-muted-foreground ml-2">Today</span>
              </div>
            </div>
          </SheetHeader>

          <Separator className="my-6" />

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="transactions">
                Transactions ({investment.transactions.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-4">
              {/* Position Summary */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Your Position</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shares</span>
                    <span className="font-medium">{quantity.toFixed(quantity % 1 === 0 ? 0 : 4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Average Cost</span>
                    <span className="font-medium">{formatCurrency(avgPrice, { currency })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Invested</span>
                    <span className="font-medium">{formatCurrency(totalInvested, { currency })}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Market Value</span>
                    <span className="font-bold text-lg">{formatCurrency(currentValue, { currency })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Return</span>
                    <div className={cn("flex items-center font-medium", isProfit ? "text-green-500" : "text-red-500")}>
                      {isProfit ? <ArrowUpRight className="h-4 w-4 mr-1" /> : <ArrowDownRight className="h-4 w-4 mr-1" />}
                      {isProfit ? "+" : ""}{formatCurrency(totalGainLoss, { currency })} ({isProfit ? "+" : ""}{totalGainLossPercent.toFixed(2)}%)
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Today's P/L</span>
                    <div className={cn("flex items-center font-medium", isDayProfit ? "text-green-500" : "text-red-500")}>
                      {isDayProfit ? <ArrowUpRight className="h-4 w-4 mr-1" /> : <ArrowDownRight className="h-4 w-4 mr-1" />}
                      {isDayProfit ? "+" : ""}{formatCurrency(dayGainLoss, { currency })}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stock Info */}
              {quoteDetails && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Stock Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {quoteDetails.sector && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sector</span>
                        <span className="font-medium">{quoteDetails.sector}</span>
                      </div>
                    )}
                    {quoteDetails.industry && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Industry</span>
                        <span className="font-medium text-right max-w-[200px]">{quoteDetails.industry}</span>
                      </div>
                    )}
                    {quoteDetails.marketCap && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Market Cap</span>
                        <span className="font-medium">
                          {formatCurrency(quoteDetails.marketCap, { currency, noDecimals: true })}
                        </span>
                      </div>
                    )}
                    {quoteDetails.peRatio && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">P/E Ratio</span>
                        <span className="font-medium">{quoteDetails.peRatio.toFixed(2)}</span>
                      </div>
                    )}
                    {quoteDetails.eps && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">EPS</span>
                        <span className="font-medium">{formatCurrency(quoteDetails.eps, { currency })}</span>
                      </div>
                    )}
                    {quoteDetails.fiftyTwoWeekHigh && quoteDetails.fiftyTwoWeekLow && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">52 Week Range</span>
                        <span className="font-medium">
                          {formatCurrency(quoteDetails.fiftyTwoWeekLow, { currency })} - {formatCurrency(quoteDetails.fiftyTwoWeekHigh, { currency })}
                        </span>
                      </div>
                    )}
                    {quoteDetails.volume && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Volume</span>
                        <span className="font-medium">{quoteDetails.volume.toLocaleString()}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="space-y-3">
                {/* Portfolio and Buy Row */}
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <Select
                      value={investment.portfolioId?.toString() || "none"}
                      onValueChange={handlePortfolioChange}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select portfolio" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Portfolio</SelectItem>
                        {portfolios.map((portfolio) => (
                          <SelectItem key={portfolio.id} value={portfolio.id.toString()}>
                            <div className="flex items-center gap-2">
                              <FolderOpen className="h-3 w-3" />
                              {portfolio.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="default"
                    onClick={() => setBuyDialogOpen(true)}
                    className="flex-shrink-0"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Buy Stock
                  </Button>
                </div>

                {/* Sell and Delete Row */}
                <div className="flex gap-2">
                  {isActive && (
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setSellDialogOpen(true)}
                    >
                      <Minus className="h-4 w-4 mr-2" />
                      Sell
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    className={isActive ? "flex-1" : "flex-1"}
                    onClick={() => handleDeleteInvestment()}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="transactions" className="mt-4">
              <ScrollArea className="h-[400px] pr-6">
                {investment.transactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <TrendingDown className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No transactions recorded</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Shares</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="w-[40px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {investment.transactions.map((txn) => {
                        const isBuy = txn.type === "buy";
                        const txnQuantity = Number(txn.quantity);
                        const txnPrice = Number(txn.price);
                        const txnTotal = Number(txn.totalAmount);
                        const txnDate = new Date(txn.date);

                        return (
                          <TableRow key={txn.id}>
                            <TableCell className="font-medium">
                              {txnDate.toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={isBuy ? "default" : "destructive"}
                                className="text-xs"
                              >
                                {isBuy ? (
                                  <Plus className="h-3 w-3 mr-1" />
                                ) : (
                                  <Minus className="h-3 w-3 mr-1" />
                                )}
                                {txn.type.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {txnQuantity.toFixed(txnQuantity % 1 === 0 ? 0 : 4)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(txnPrice, { currency })}
                            </TableCell>
                            <TableCell className={cn(
                              "text-right font-medium",
                              isBuy ? "text-red-500" : "text-green-500"
                            )}>
                              {isBuy ? "-" : "+"}{formatCurrency(Math.abs(txnTotal), { currency })}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDeleteTransaction(txn.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* Last Updated */}
          {investment.lastUpdated && (
            <p className="text-xs text-muted-foreground text-center mt-6">
              Last updated: {new Date(investment.lastUpdated).toLocaleString()}
            </p>
          )}
        </SheetContent>
      </Sheet>

      <SellTransactionDialog
        investment={investment}
        open={sellDialogOpen}
        onOpenChange={setSellDialogOpen}
      />

      <AddPurchaseDialog
        investment={investment}
        open={buyDialogOpen}
        onOpenChange={setBuyDialogOpen}
      />
    </>
  );
}
