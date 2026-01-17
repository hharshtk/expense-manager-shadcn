"use client";

import { useState, useEffect, useRef } from "react";
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
  DialogTrigger,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { searchInvestments, recordBuyTransaction, getStockPrice } from "@/actions/investments";
import { toast } from "sonner";
import { Loader2, Search, TrendingUp, AlertCircle, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Portfolio } from "@/lib/schema";

type AssetTab = "stock" | "etf" | "mutual_fund";
type CountryFilter = "US" | "IN";

const COUNTRY_OPTIONS: { value: CountryFilter; label: string; flag: string }[] = [
  { value: "US", label: "USA", flag: "🇺🇸" },
  { value: "IN", label: "India", flag: "🇮🇳" },
];

const buyTransactionSchema = z.object({
  symbol: z.string().min(1, "Symbol is required"),
  name: z.string().min(1, "Name is required"),
  type: z.enum(["stock", "mutual_fund", "etf", "bond", "crypto", "commodity", "other"]),
  portfolioId: z.coerce.number().min(1, "Portfolio is required"),
  exchange: z.string().optional(),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  price: z.coerce.number().positive("Price must be positive"),
  currency: z.string().default("USD"),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

type BuyTransactionForm = z.infer<typeof buyTransactionSchema>;

interface BuyTransactionDialogProps {
  portfolios: Portfolio[];
  defaultPortfolioId?: number;
}

export function BuyTransactionDialog({ portfolios, defaultPortfolioId }: BuyTransactionDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [activeTab, setActiveTab] = useState<AssetTab>("stock");
  const [selectedCountry, setSelectedCountry] = useState<CountryFilter>("US");
  const latestSearchId = useRef(0);

  const form = useForm<BuyTransactionForm>({
    resolver: zodResolver(buyTransactionSchema),
    defaultValues: {
      symbol: "",
      name: "",
      type: "stock",
      portfolioId: defaultPortfolioId || 0,
      exchange: "",
      quantity: 0,
      price: 0,
      currency: "USD",
      date: new Date().toISOString().split("T")[0],
      notes: "",
    },
  });

  // Reset form when tab changes
  useEffect(() => {
    form.setValue("symbol", "");
    form.setValue("name", "");
    form.setValue("exchange", "");
    form.setValue("type", activeTab);
    setSearchResults([]);
  }, [activeTab, form]);

  // Reset search results when country changes
  useEffect(() => {
    setSearchResults([]);
  }, [selectedCountry]);

  useEffect(() => {
    if (!searchOpen) {
      return;
    }

    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    const searchId = ++latestSearchId.current;
    const timeout = setTimeout(async () => {
      try {
        const result = await searchInvestments(trimmed, {
          assetType: activeTab,
          country: activeTab === "stock" ? selectedCountry : undefined,
        });
        if (latestSearchId.current !== searchId) {
          return;
        }
        if (result.success && result.data) {
          setSearchResults(result.data);
        } else {
          toast.error(result.error);
        }
      } catch (error) {
        if (latestSearchId.current === searchId) {
          toast.error("Failed to search");
        }
      } finally {
        if (latestSearchId.current === searchId) {
          setSearchLoading(false);
        }
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [searchQuery, searchOpen, activeTab, selectedCountry]);

  // Update default portfolio when prop changes
  useEffect(() => {
    if (defaultPortfolioId) {
      form.setValue("portfolioId", defaultPortfolioId);
    }
  }, [defaultPortfolioId, form]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleSelectStock = async (stock: any) => {
    form.setValue("symbol", stock.symbol);
    form.setValue("name", stock.name);
    form.setValue("type", stock.type);
    form.setValue("exchange", stock.exchange);
    setSearchOpen(false);

    // Fetch current price
    setFetchingPrice(true);
    try {
      const priceResult = await getStockPrice(stock.symbol);
      if (priceResult.success && priceResult.data) {
        form.setValue("price", priceResult.data.price);
        form.setValue("currency", priceResult.data.currency);
        toast.success(`Current price: ${formatCurrency(priceResult.data.price, { currency: priceResult.data.currency })}`);
      }
    } catch (error) {
      console.error("Failed to fetch price:", error);
    } finally {
      setFetchingPrice(false);
    }
  };

  const onSubmit = async (data: BuyTransactionForm) => {
    if (!data.portfolioId || data.portfolioId === 0) {
      toast.error("Please select a portfolio");
      return;
    }

    setLoading(true);
    try {
      const result = await recordBuyTransaction(data);
      if (result.success) {
        toast.success("Buy transaction recorded successfully");
        setOpen(false);
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

  const hasNoPortfolios = portfolios.length === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <TrendingUp className="mr-2 h-4 w-4" />
          Buy Stock
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Buy Transaction</DialogTitle>
          <DialogDescription>
            Add stocks, ETFs, or mutual funds to your portfolio
          </DialogDescription>
        </DialogHeader>

        {hasNoPortfolios ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You need to create a portfolio first before adding investments. Please create a portfolio from the main investment page.
            </AlertDescription>
          </Alert>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AssetTab)} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="stock">Stocks</TabsTrigger>
              <TabsTrigger value="etf">ETFs</TabsTrigger>
              <TabsTrigger value="mutual_fund">Mutual Funds</TabsTrigger>
            </TabsList>
            
            {/* Stocks Tab Content */}
            <TabsContent value="stock" className="space-y-4 mt-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-4">
                    {/* Portfolio Selection and Country Filter - Same Row */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="portfolioId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Portfolio *</FormLabel>
                            <Select
                              onValueChange={(value) => field.onChange(parseInt(value, 10))}
                              value={field.value?.toString() || ""}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a portfolio" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {portfolios.map((portfolio) => (
                                  <SelectItem key={portfolio.id} value={portfolio.id.toString()}>
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: portfolio.color || "#6366f1" }}
                                      />
                                      {portfolio.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Country Filter for Stocks */}
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Select
                                value={selectedCountry}
                                onValueChange={(v) => setSelectedCountry(v as CountryFilter)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select country" />
                                </SelectTrigger>
                                <SelectContent>
                                  {COUNTRY_OPTIONS.map((country) => (
                                    <SelectItem key={country.value} value={country.value}>
                                      <span className="flex items-center gap-2">
                                        <span>{country.flag}</span>
                                        <span>{country.label}</span>
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Search will be restricted to {selectedCountry === "US" ? "US" : "Indian"} stock exchanges</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </FormItem>
                    </div>

                    <FormField
                      control={form.control}
                      name="symbol"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Search Stock</FormLabel>
                          <FormControl>
                            <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              className="w-full justify-between"
                            >
                              {field.value || "Search for a stock..."}
                              <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0" align="start">
                            <Command shouldFilter={false}>
                              <CommandInput
                                placeholder="Search stocks..."
                                onValueChange={handleSearch}
                              />
                              <CommandEmpty>
                                {searchLoading ? "Searching..." : "No stocks found"}
                              </CommandEmpty>
                              <CommandGroup className="max-h-64 overflow-auto">
                                {searchResults.map((stock, index) => (
                                  <CommandItem
                                    key={`${stock.symbol}-${index}`}
                                    onSelect={() => handleSelectStock(stock)}
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-medium">{stock.symbol}</span>
                                      <span className="text-sm text-muted-foreground">
                                        {stock.name}
                                      </span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                        </PopoverContent>
                      </Popover>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="symbol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Symbol</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="AAPL" readOnly className="bg-muted" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Apple Inc." readOnly className="bg-muted" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                      <FormLabel>Price per Unit</FormLabel>
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="USD" readOnly className="bg-muted" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
            </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Record Purchase
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </TabsContent>

            {/* ETFs Tab Content - Coming Soon */}
            <TabsContent value="etf" className="mt-4">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Clock className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">ETFs Coming Soon</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  ETF tracking is under development. You&apos;ll soon be able to add and track
                  Exchange-Traded Funds in your portfolio.
                </p>
              </div>
            </TabsContent>

            {/* Mutual Funds Tab Content - Coming Soon */}
            <TabsContent value="mutual_fund" className="mt-4">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Clock className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Mutual Funds Coming Soon</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Mutual fund tracking is under development. You&apos;ll soon be able to add and track
                  Mutual Funds in your portfolio.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
