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
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Investment, InvestmentTransaction, Portfolio } from "@/lib/schema";
import { SellTransactionDialog } from "./sell-transaction-dialog";
import { AddPurchaseDialog } from "./add-purchase-dialog";
import { AssignPortfolioDialog } from "./portfolio-selector";

interface HoldingsTableProps {
  investments: (Investment & { transactions: InvestmentTransaction[] })[];
  portfolios: Portfolio[];
  currency: string;
  onViewDetails: (investment: Investment & { transactions: InvestmentTransaction[] }) => void;
}

type SortField = "symbol" | "value" | "gainLoss" | "dayChange" | "quantity";
type SortDirection = "asc" | "desc";

export function HoldingsTable({ investments, portfolios, currency, onViewDetails }: HoldingsTableProps) {
  const [sortField, setSortField] = useState<SortField>("value");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
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
    let comparison = 0;
    
    switch (sortField) {
      case "symbol":
        comparison = a.symbol.localeCompare(b.symbol);
        break;
      case "value":
        comparison = Number(a.currentValue || 0) - Number(b.currentValue || 0);
        break;
      case "gainLoss":
        comparison = Number(a.totalGainLossPercent || 0) - Number(b.totalGainLossPercent || 0);
        break;
      case "dayChange":
        comparison = Number(a.dayChangePercent || 0) - Number(b.dayChangePercent || 0);
        break;
      case "quantity":
        comparison = Number(a.totalQuantity || 0) - Number(b.totalQuantity || 0);
        break;
    }
    
    return sortDirection === "asc" ? comparison : -comparison;
  });

  const handleSell = (investment: Investment) => {
    setSelectedInvestment(investment);
    setSellDialogOpen(true);
  };

  const handleBuyMore = (investment: Investment) => {
    setSelectedInvestment(investment);
    setBuyDialogOpen(true);
  };

  const handleAssignPortfolio = (investment: Investment) => {
    setSelectedInvestment(investment);
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
              const currentPrice = Number(investment.currentPrice || 0);
              const avgPrice = Number(investment.averagePrice || 0);
              const quantity = Number(investment.totalQuantity || 0);
              const currentValue = Number(investment.currentValue || 0);
              const totalGainLoss = Number(investment.totalGainLoss || 0);
              const totalGainLossPercent = Number(investment.totalGainLossPercent || 0);
              const dayChange = Number(investment.dayChange || 0);
              const dayChangePercent = Number(investment.dayChangePercent || 0);
              const dayGainLoss = Number(investment.dayGainLoss || 0);
              
              const isProfit = totalGainLoss >= 0;
              const isDayProfit = dayChange >= 0;
              const invCurrency = investment.currency || "USD";

              return (
                <TableRow 
                  key={investment.id} 
                  className={`cursor-pointer hover:bg-muted/50 ${!isActive ? "opacity-50" : ""}`}
                  onClick={() => onViewDetails(investment)}
                >
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{investment.symbol}</span>
                        {!isActive && (
                          <Badge variant="secondary" className="text-xs">Sold</Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                        {investment.name}
                      </span>
                      {getPortfolioName(investment.portfolioId) && (
                        <Badge variant="outline" className="text-xs w-fit mt-1">
                          {getPortfolioName(investment.portfolioId)}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {quantity.toFixed(quantity % 1 === 0 ? 0 : 4)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(currentPrice, { currency: invCurrency })}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatCurrency(avgPrice, { currency: invCurrency })}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(currentValue, { currency: invCurrency })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className={`flex flex-col items-end ${isDayProfit ? "text-green-500" : "text-red-500"}`}>
                      <div className="flex items-center">
                        {isDayProfit ? (
                          <ArrowUpRight className="h-3 w-3 mr-1" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 mr-1" />
                        )}
                        <span>{isDayProfit ? "+" : ""}{dayChangePercent.toFixed(2)}%</span>
                      </div>
                      <span className="text-xs">
                        {isDayProfit ? "+" : ""}{formatCurrency(dayGainLoss, { currency: invCurrency })}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className={`flex flex-col items-end ${isProfit ? "text-green-500" : "text-red-500"}`}>
                      <div className="flex items-center">
                        {isProfit ? (
                          <ArrowUpRight className="h-3 w-3 mr-1" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 mr-1" />
                        )}
                        <span>{isProfit ? "+" : ""}{totalGainLossPercent.toFixed(2)}%</span>
                      </div>
                      <span className="text-xs">
                        {isProfit ? "+" : ""}{formatCurrency(totalGainLoss, { currency: invCurrency })}
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
