"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  MoreHorizontal,
  Eye,
  TrendingDown,
  TrendingUp,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  FolderOpen,
  ArrowRightLeft,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Investment, InvestmentTransaction, Portfolio } from "@/lib/schema";
import type { InvestmentWithConversion, DisplayValue } from "@/actions/investments";
import { SellTransactionDialog } from "./sell-transaction-dialog";
import { AddPurchaseDialog } from "./add-purchase-dialog";
import { AssignPortfolioDialog } from "./portfolio-selector";

// Support both legacy Investment and new InvestmentWithConversion
type InvestmentItem = 
  | (Investment & { transactions: InvestmentTransaction[] } & {
      displayCurrency?: string;
      conversionApplied?: boolean;
      convertedValues?: {
        currentValue: DisplayValue;
        totalInvested: DisplayValue;
        totalGainLoss: DisplayValue;
        dayGainLoss: DisplayValue;
      };
    })
  | InvestmentWithConversion;

interface HoldingsTableProps {
  investments: InvestmentItem[];
  portfolios: Portfolio[];
  displayCurrency: string;
  onViewDetails: (investment: InvestmentItem) => void;
  hidePortfolioTag?: boolean;
}

type SortField = "symbol" | "value" | "gainLoss" | "dayChange" | "quantity";
type SortDirection = "asc" | "desc";

// Type guard to check if investment has conversion data
function hasConversionData(inv: InvestmentItem): inv is InvestmentWithConversion {
  return "currentValue" in inv && typeof inv.currentValue === "object" && inv.currentValue !== null && "amount" in inv.currentValue;
}

// Helper to get values from either format
function getInvestmentValues(inv: InvestmentItem, displayCurrency: string) {
  if (hasConversionData(inv)) {
    // New format with conversion data
    return {
      quantity: inv.quantity,
      currentPrice: inv.currentPrice,
      avgPrice: inv.averagePrice,
      nativeCurrency: inv.nativeCurrency,
      // Display values (already converted)
      currentValue: inv.currentValue.amount,
      totalGainLoss: inv.totalGainLoss.amount,
      dayGainLoss: inv.dayGainLoss.amount,
      totalGainLossPercent: inv.totalGainLossPercent,
      dayChangePercent: inv.dayChangePercent,
      displayCurrency: inv.displayCurrency,
      conversionApplied: inv.conversionApplied,
      exchangeRate: inv.exchangeRate,
      // For display value objects
      currentValueDisplay: inv.currentValue,
      totalGainLossDisplay: inv.totalGainLoss,
      dayGainLossDisplay: inv.dayGainLoss,
    };
  } else if ("convertedValues" in inv && inv.convertedValues?.currentValue) {
    const nativeCurrency = inv.currency || "USD";
    return {
      quantity: Number(inv.totalQuantity || 0),
      currentPrice: Number(inv.currentPrice || 0),
      avgPrice: Number(inv.averagePrice || 0),
      nativeCurrency,
      currentValue: inv.convertedValues.currentValue.amount,
      totalGainLoss: inv.convertedValues.totalGainLoss.amount,
      dayGainLoss: inv.convertedValues.dayGainLoss.amount,
      totalGainLossPercent: Number(inv.totalGainLossPercent || 0),
      dayChangePercent: Number(inv.dayChangePercent || 0),
      displayCurrency: inv.displayCurrency || displayCurrency,
      conversionApplied: Boolean(inv.conversionApplied),
      exchangeRate: inv.convertedValues.currentValue.exchangeRate,
      currentValueDisplay: inv.convertedValues.currentValue,
      totalGainLossDisplay: inv.convertedValues.totalGainLoss,
      dayGainLossDisplay: inv.convertedValues.dayGainLoss,
    };
  } else {
    // Legacy format - use values as-is (no conversion)
    const nativeCurrency = inv.currency || "USD";
    return {
      quantity: Number(inv.totalQuantity || 0),
      currentPrice: Number(inv.currentPrice || 0),
      avgPrice: Number(inv.averagePrice || 0),
      nativeCurrency,
      currentValue: Number(inv.currentValue || 0),
      totalGainLoss: Number(inv.totalGainLoss || 0),
      dayGainLoss: Number(inv.dayGainLoss || 0),
      totalGainLossPercent: Number(inv.totalGainLossPercent || 0),
      dayChangePercent: Number(inv.dayChangePercent || 0),
      displayCurrency: nativeCurrency,
      conversionApplied: false,
      exchangeRate: undefined,
      currentValueDisplay: null,
      totalGainLossDisplay: null,
      dayGainLossDisplay: null,
    };
  }
}

// Component to display value with optional conversion indicator
function ConvertedValueDisplay({ 
  amount, 
  currency, 
  displayValue,
  showSign = false,
  className = "",
}: { 
  amount: number; 
  currency: string; 
  displayValue?: DisplayValue | null;
  showSign?: boolean;
  className?: string;
}) {
  const formatted = formatCurrency(Math.abs(amount), { currency });
  const sign = showSign ? (amount >= 0 ? "+" : "-") : (amount < 0 ? "-" : "");
  const display = `${sign}${formatted}`;
  
  if (displayValue?.wasConverted && displayValue.originalAmount !== undefined) {
    const originalFormatted = formatCurrency(Math.abs(displayValue.originalAmount), { 
      currency: displayValue.originalCurrency || currency 
    });
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={`inline-flex items-center gap-0.5 cursor-help ${className}`}>
              {display}
              <ArrowRightLeft className="h-3 w-3 text-muted-foreground ml-0.5" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">
            <div className="text-xs space-y-1">
              <p className="font-medium">
                {showSign && displayValue.originalAmount >= 0 ? "+" : ""}{originalFormatted} → {display}
              </p>
              <p className="text-muted-foreground">
                Rate: {displayValue.exchangeRate?.toFixed(4)} {displayValue.originalCurrency}→{currency}
              </p>
              <p className="text-muted-foreground">ECB reference rate</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return <span className={className}>{display}</span>;
}

// Minimal investment data needed for dialogs
interface InvestmentForDialog {
  id: number;
  symbol: string;
  name: string;
  type: string;
  exchange?: string | null;
  currentPrice: number | string | null;
  totalQuantity: number | string | null;
  averagePrice: number | string | null;
  portfolioId: number | null;
  currency?: string;
}

// Extract minimal investment data for dialogs
function toInvestmentForDialog(inv: InvestmentItem): InvestmentForDialog {
  if (hasConversionData(inv)) {
    return {
      id: inv.id,
      symbol: inv.symbol,
      name: inv.name,
      type: inv.type,
      exchange: inv.exchange,
      currentPrice: inv.currentPrice,
      totalQuantity: inv.totalQuantity,
      averagePrice: inv.averagePrice,
      portfolioId: inv.portfolioId,
      currency: inv.nativeCurrency,
    };
  }
  return {
    id: inv.id,
    symbol: inv.symbol,
    name: inv.name,
    type: inv.type,
    exchange: inv.exchange,
    currentPrice: inv.currentPrice,
    totalQuantity: inv.totalQuantity,
    averagePrice: inv.averagePrice,
    portfolioId: inv.portfolioId,
    currency: inv.currency,
  };
}

export function HoldingsTable({ investments, portfolios, displayCurrency, onViewDetails, hidePortfolioTag = false }: HoldingsTableProps) {
  const [sortField, setSortField] = useState<SortField>("value");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedInvestment, setSelectedInvestment] = useState<InvestmentForDialog | null>(null);
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [buyDialogOpen, setBuyDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedInvestments = [...investments].sort((a, b) => {
    const aVals = getInvestmentValues(a, displayCurrency);
    const bVals = getInvestmentValues(b, displayCurrency);
    let comparison = 0;
    
    switch (sortField) {
      case "symbol":
        comparison = a.symbol.localeCompare(b.symbol);
        break;
      case "value":
        comparison = aVals.currentValue - bVals.currentValue;
        break;
      case "gainLoss":
        comparison = aVals.totalGainLossPercent - bVals.totalGainLossPercent;
        break;
      case "dayChange":
        comparison = aVals.dayChangePercent - bVals.dayChangePercent;
        break;
      case "quantity":
        comparison = aVals.quantity - bVals.quantity;
        break;
    }
    
    return sortDirection === "asc" ? comparison : -comparison;
  });

  const handleSell = (investment: InvestmentItem) => {
    setSelectedInvestment(toInvestmentForDialog(investment));
    setSellDialogOpen(true);
  };

  const handleBuyMore = (investment: InvestmentItem) => {
    setSelectedInvestment(toInvestmentForDialog(investment));
    setBuyDialogOpen(true);
  };

  const handleAssignPortfolio = (investment: InvestmentItem) => {
    setSelectedInvestment(toInvestmentForDialog(investment));
    setAssignDialogOpen(true);
  };

  const getPortfolioName = (portfolioId: number | null) => {
    if (!portfolioId) return null;
    const portfolio = portfolios.find(p => p.id === portfolioId);
    return portfolio?.name || null;
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
    }
    return sortDirection === "asc" 
      ? <ChevronUp className="ml-1 h-3 w-3" /> 
      : <ChevronDown className="ml-1 h-3 w-3" />;
  };

  if (investments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <TrendingDown className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No holdings yet</h3>
        <p className="text-sm text-muted-foreground text-center">
          Start building your portfolio by adding your first investment
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8 font-semibold"
                  onClick={() => handleSort("symbol")}
                >
                  Stock
                  <SortIcon field="symbol" />
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="-mr-3 h-8 font-semibold"
                  onClick={() => handleSort("quantity")}
                >
                  Shares
                  <SortIcon field="quantity" />
                </Button>
              </TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Avg Cost</TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="-mr-3 h-8 font-semibold"
                  onClick={() => handleSort("value")}
                >
                  Market Value
                  <SortIcon field="value" />
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="-mr-3 h-8 font-semibold"
                  onClick={() => handleSort("dayChange")}
                >
                  Day Change
                  <SortIcon field="dayChange" />
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="-mr-3 h-8 font-semibold"
                  onClick={() => handleSort("gainLoss")}
                >
                  Total Return
                  <SortIcon field="gainLoss" />
                </Button>
              </TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedInvestments.map((investment) => {
              const isActive = investment.isActive && Number(investment.totalQuantity) > 0;
              const vals = getInvestmentValues(investment, displayCurrency);
              
              const isProfit = vals.totalGainLoss >= 0;
              const isDayProfit = vals.dayGainLoss >= 0;

              return (
                <TableRow 
                  key={investment.id} 
                  className={`cursor-pointer hover:bg-muted/50 ${!isActive ? "opacity-50" : ""}`}
                  onClick={() => onViewDetails(investment)}
                >
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{investment.name}</span>
                        {!isActive && (
                          <Badge variant="secondary" className="text-xs">Sold</Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                        {investment.symbol}
                      </span>
                      {!hidePortfolioTag && getPortfolioName(investment.portfolioId) && (
                        <Badge variant="outline" className="text-xs w-fit mt-1">
                          {getPortfolioName(investment.portfolioId)}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {vals.quantity.toFixed(vals.quantity % 1 === 0 ? 0 : 4)}
                  </TableCell>
                  {/* Price in NATIVE currency (e.g., $49.96 for US stocks) */}
                  <TableCell className="text-right">
                    {formatCurrency(vals.currentPrice, { currency: vals.nativeCurrency })}
                  </TableCell>
                  {/* Avg Cost in NATIVE currency */}
                  <TableCell className="text-right text-muted-foreground">
                    {formatCurrency(vals.avgPrice, { currency: vals.nativeCurrency })}
                  </TableCell>
                  {/* Market Value in DISPLAY currency (with conversion indicator) */}
                  <TableCell className="text-right font-medium">
                    <ConvertedValueDisplay
                      amount={vals.currentValue}
                      currency={displayCurrency}
                      displayValue={vals.currentValueDisplay}
                    />
                  </TableCell>
                  {/* Day Change in DISPLAY currency (with conversion indicator) */}
                  <TableCell className="text-right">
                    <div className={`flex flex-col items-end ${isDayProfit ? "text-green-500" : "text-red-500"}`}>
                      <div className="flex items-center">
                        {isDayProfit ? (
                          <ArrowUpRight className="h-3 w-3 mr-1" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 mr-1" />
                        )}
                        <span>{isDayProfit ? "+" : ""}{vals.dayChangePercent.toFixed(2)}%</span>
                      </div>
                      <span className="text-xs">
                        <ConvertedValueDisplay
                          amount={vals.dayGainLoss}
                          currency={displayCurrency}
                          displayValue={vals.dayGainLossDisplay}
                          showSign
                        />
                      </span>
                    </div>
                  </TableCell>
                  {/* Total Return in DISPLAY currency (with conversion indicator) */}
                  <TableCell className="text-right">
                    <div className={`flex flex-col items-end ${isProfit ? "text-green-500" : "text-red-500"}`}>
                      <div className="flex items-center">
                        {isProfit ? (
                          <ArrowUpRight className="h-3 w-3 mr-1" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 mr-1" />
                        )}
                        <span>{isProfit ? "+" : ""}{vals.totalGainLossPercent.toFixed(2)}%</span>
                      </div>
                      <span className="text-xs">
                        <ConvertedValueDisplay
                          amount={vals.totalGainLoss}
                          currency={displayCurrency}
                          displayValue={vals.totalGainLossDisplay}
                          showSign
                        />
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          onViewDetails(investment);
                        }}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleAssignPortfolio(investment);
                        }}>
                          <FolderOpen className="mr-2 h-4 w-4" />
                          Assign to Portfolio
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleBuyMore(investment);
                        }}>
                          <TrendingUp className="mr-2 h-4 w-4" />
                          Buy More
                        </DropdownMenuItem>
                        {isActive && (
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleSell(investment);
                          }}>
                            <TrendingDown className="mr-2 h-4 w-4" />
                            Sell
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {selectedInvestment && (
        <SellTransactionDialog
          investment={selectedInvestment}
          open={sellDialogOpen}
          onOpenChange={setSellDialogOpen}
        />
      )}

      {selectedInvestment && (
        <AddPurchaseDialog
          investment={selectedInvestment}
          open={buyDialogOpen}
          onOpenChange={setBuyDialogOpen}
        />
      )}

      {selectedInvestment && (
        <AssignPortfolioDialog
          investment={selectedInvestment}
          portfolios={portfolios}
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
        />
      )}
    </>
  );
}
