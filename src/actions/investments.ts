"use server";

import { db } from "@/lib/db";
import { 
  investments, 
  investmentTransactions, 
  users, 
  portfolios,
  portfolioHoldings,
  watchlist,
  priceAlerts,
  type NewInvestment, 
  type NewInvestmentTransaction,
  type NewPortfolio,
  type NewWatchlistItem,
  type NewPriceAlert,
} from "@/lib/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq, and, desc, asc, sql, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import YahooFinance from "yahoo-finance2";
import { getExchangeRate as fetchExchangeRate } from "@/lib/exchange-rates";

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey", "ripHistorical"],
});

/**
 * Get exchange rate between two currencies
 */
export async function getExchangeRate(from: string, to: string): Promise<number> {
  return fetchExchangeRate(from, to);
}

// Exchange mappings for country filtering
const COUNTRY_EXCHANGES: Record<string, string[]> = {
  US: ["NYQ", "NMS", "NGM", "NCM", "NYS", "NAS", "NYSE", "NASDAQ", "AMEX", "ARCA", "BATS", "PCX"],
  IN: ["NSI", "BSE", "NSE", "BOM"],
};

/**
 * Search for stocks/investments using Yahoo Finance
 * @param query - Search query string
 * @param options - Optional filters for asset type and country
 */
export async function searchInvestments(
  query: string,
  options?: {
    assetType?: "stock" | "etf" | "mutual_fund";
    country?: "US" | "IN";
  }
) {
  try {
    const results = await yahooFinance.search(query, {
      quotesCount: 20, // Fetch more to allow for filtering
      newsCount: 0,
    });

    let filteredQuotes = results.quotes;

    // Filter by asset type if specified
    if (options?.assetType) {
      filteredQuotes = filteredQuotes.filter((quote: any) => {
        const quoteType = quote.quoteType?.toUpperCase();
        switch (options.assetType) {
          case "stock":
            return quoteType === "EQUITY";
          case "etf":
            return quoteType === "ETF";
          case "mutual_fund":
            return quoteType === "MUTUALFUND";
          default:
            return true;
        }
      });
    }

    // Filter by country/exchange if specified
    if (options?.country) {
      const allowedExchanges = COUNTRY_EXCHANGES[options.country] || [];
      filteredQuotes = filteredQuotes.filter((quote: any) => {
        const exchange = quote.exchange?.toUpperCase() || "";
        return allowedExchanges.some(ex => exchange.includes(ex));
      });
    }

    return {
      success: true,
      data: filteredQuotes.slice(0, 10).map((quote: any) => ({
        symbol: quote.symbol,
        name: quote.shortname || quote.longname || quote.symbol,
        type: quote.quoteType === "MUTUALFUND" ? "mutual_fund" : 
              quote.quoteType === "ETF" ? "etf" : 
              quote.quoteType === "CRYPTOCURRENCY" ? "crypto" : "stock",
        exchange: quote.exchange || quote.exchDisp || "",
      })),
    };
  } catch (error) {
    console.error("Search investments error:", error);
    return {
      success: false,
      error: "Failed to search investments",
    };
  }
}

/**
 * Get current stock price from Yahoo Finance
 */
export async function getStockPrice(symbol: string) {
  try {
    const quote = await yahooFinance.quote(symbol);
    
    return {
      success: true,
      data: {
        symbol: quote.symbol,
        name: quote.shortName || quote.longName || quote.symbol,
        price: quote.regularMarketPrice,
        previousClose: quote.regularMarketPreviousClose,
        currency: quote.currency || "USD",
        change: quote.regularMarketChange,
        changePercent: quote.regularMarketChangePercent,
        dayHigh: quote.regularMarketDayHigh,
        dayLow: quote.regularMarketDayLow,
        open: quote.regularMarketOpen,
        volume: quote.regularMarketVolume,
        marketCap: quote.marketCap,
        fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
        exchange: quote.exchange,
      },
    };
  } catch (error) {
    console.error("Get stock price error:", error);
    return {
      success: false,
      error: "Failed to fetch stock price",
    };
  }
}

/**
 * Get detailed stock quote with additional info
 */
export async function getStockQuoteDetails(symbol: string) {
  try {
    const [quote, summary] = await Promise.all([
      yahooFinance.quote(symbol),
      yahooFinance.quoteSummary(symbol, { modules: ["assetProfile", "summaryDetail", "financialData"] }).catch(() => null),
    ]);
    
    return {
      success: true,
      data: {
        symbol: quote.symbol,
        name: quote.shortName || quote.longName || quote.symbol,
        price: quote.regularMarketPrice,
        previousClose: quote.regularMarketPreviousClose,
        currency: quote.currency || "USD",
        change: quote.regularMarketChange,
        changePercent: quote.regularMarketChangePercent,
        dayHigh: quote.regularMarketDayHigh,
        dayLow: quote.regularMarketDayLow,
        open: quote.regularMarketOpen,
        volume: quote.regularMarketVolume,
        avgVolume: quote.averageDailyVolume10Day,
        marketCap: quote.marketCap,
        fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
        exchange: quote.exchange,
        sector: summary?.assetProfile?.sector,
        industry: summary?.assetProfile?.industry,
        description: summary?.assetProfile?.longBusinessSummary,
        website: summary?.assetProfile?.website,
        peRatio: quote.trailingPE,
        forwardPE: quote.forwardPE,
        dividendYield: summary?.summaryDetail?.dividendYield,
        eps: quote.epsTrailingTwelveMonths,
        beta: summary?.summaryDetail?.beta,
      },
    };
  } catch (error) {
    console.error("Get stock quote details error:", error);
    return {
      success: false,
      error: "Failed to fetch stock details",
    };
  }
}

/**
 * Get historical data for a stock
 */
export async function getStockHistory(symbol: string, period: "1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y" | "max" = "1mo") {
  try {
    const endDate = new Date();
    let startDate = new Date();
    let interval: "1d" | "1wk" | "1mo" = "1d";

    switch (period) {
      case "1d":
        startDate.setDate(endDate.getDate() - 1);
        interval = "1d";
        break;
      case "5d":
        startDate.setDate(endDate.getDate() - 5);
        interval = "1d";
        break;
      case "1mo":
        startDate.setMonth(endDate.getMonth() - 1);
        interval = "1d";
        break;
      case "3mo":
        startDate.setMonth(endDate.getMonth() - 3);
        interval = "1d";
        break;
      case "6mo":
        startDate.setMonth(endDate.getMonth() - 6);
        interval = "1d";
        break;
      case "1y":
        startDate.setFullYear(endDate.getFullYear() - 1);
        interval = "1wk";
        break;
      case "2y":
        startDate.setFullYear(endDate.getFullYear() - 2);
        interval = "1wk";
        break;
      case "5y":
        startDate.setFullYear(endDate.getFullYear() - 5);
        interval = "1mo";
        break;
      case "max":
        startDate.setFullYear(endDate.getFullYear() - 20);
        interval = "1mo";
        break;
    }

    const history = await yahooFinance.chart(symbol, {
      period1: startDate,
      period2: endDate,
      interval,
    });

    const quotes = history.quotes || [];
    
    return {
      success: true,
      data: quotes.map((q: any) => ({
        date: q.date,
        open: q.open,
        high: q.high,
        low: q.low,
        close: q.close,
        volume: q.volume,
      })),
    };
  } catch (error) {
    console.error("Get stock history error:", error);
    return {
      success: false,
      error: "Failed to fetch stock history",
    };
  }
}

/**
 * Get all investments for the current user
 */
export async function getInvestments() {
  const user = await getCurrentUser();
  if (!user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const userInvestments = await db
      .select()
      .from(investments)
      .where(eq(investments.userId, user.id))
      .orderBy(desc(investments.createdAt));

    return { success: true, data: userInvestments };
  } catch (error) {
    console.error("Get investments error:", error);
    return { success: false, error: "Failed to fetch investments" };
  }
}

/**
 * Get a specific investment by ID
 */
export async function getInvestmentById(id: number) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const investment = await db
      .select()
      .from(investments)
      .where(
        and(
          eq(investments.id, id),
          eq(investments.userId, user.id)
        )
      )
      .limit(1);

    if (investment.length === 0) {
      return { success: false, error: "Investment not found" };
    }

    return { success: true, data: investment[0] };
  } catch (error) {
    console.error("Get investment error:", error);
    return { success: false, error: "Failed to fetch investment" };
  }
}

/**
 * Get investment transactions for a specific investment
 */
export async function getInvestmentTransactions(investmentId: number) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const transactions = await db
      .select()
      .from(investmentTransactions)
      .where(
        and(
          eq(investmentTransactions.investmentId, investmentId),
          eq(investmentTransactions.userId, user.id)
        )
      )
      .orderBy(desc(investmentTransactions.date));

    return { success: true, data: transactions };
  } catch (error) {
    console.error("Get transactions error:", error);
    return { success: false, error: "Failed to fetch transactions" };
  }
}

/**
 * Calculate investment metrics based on transactions
 */
function calculateInvestmentMetrics(transactions: any[], currentPrice: number) {
  let totalQuantity = 0;
  let totalInvested = 0;
  let totalBuyQuantity = 0;

  for (const txn of transactions) {
    const quantity = Number(txn.quantity);
    const price = Number(txn.price);
    const fees = Number(txn.fees || 0);
    const taxes = Number(txn.taxes || 0);

    if (txn.type === "buy") {
      totalQuantity += quantity;
      totalBuyQuantity += quantity;
      totalInvested += quantity * price + fees + taxes;
    } else if (txn.type === "sell") {
      totalQuantity -= quantity;
      // Reduce invested amount proportionally
      if (totalBuyQuantity > 0) {
        totalInvested -= (totalInvested / totalBuyQuantity) * quantity;
      }
    }
  }

  const averagePrice = totalBuyQuantity > 0 ? totalInvested / totalBuyQuantity : 0;
  const currentValue = totalQuantity * currentPrice;
  const totalGainLoss = currentValue - (totalQuantity * averagePrice);
  const totalGainLossPercent = totalQuantity * averagePrice > 0 
    ? (totalGainLoss / (totalQuantity * averagePrice)) * 100 
    : 0;

  return {
    totalQuantity,
    averagePrice,
    totalInvested,
    currentValue,
    totalGainLoss,
    totalGainLossPercent,
  };
}

/**
 * Create a new investment or get existing one
 * Returns { success: true, investment } or { success: false, error }
 */
async function createOrGetInvestment(userId: number, portfolioId: number, data: Omit<NewInvestment, 'portfolioId'>): Promise<{ success: true; investment: typeof investments.$inferSelect } | { success: false; error: string }> {
  // Check if investment already exists for this symbol and portfolio
  const existingInPortfolio = await db
    .select()
    .from(investments)
    .where(
      and(
        eq(investments.userId, userId),
        eq(investments.symbol, data.symbol),
        eq(investments.portfolioId, portfolioId)
      )
    )
    .limit(1);

  if (existingInPortfolio.length > 0) {
    return { success: true, investment: existingInPortfolio[0] };
  }

  // Check if the symbol exists in a different portfolio (due to unique constraint)
  const existingElsewhere = await db
    .select({
      investment: investments,
      portfolio: portfolios,
    })
    .from(investments)
    .leftJoin(portfolios, eq(investments.portfolioId, portfolios.id))
    .where(
      and(
        eq(investments.userId, userId),
        eq(investments.symbol, data.symbol)
      )
    )
    .limit(1);

  if (existingElsewhere.length > 0) {
    const existingPortfolioName = existingElsewhere[0].portfolio?.name || "another portfolio";
    return { 
      success: false, 
      error: `${data.symbol} already exists in "${existingPortfolioName}". Please add more shares there or move it to this portfolio first.` 
    };
  }

  // Create new investment
  const newInvestment = await db
    .insert(investments)
    .values({
      ...data,
      portfolioId,
    })
    .returning();

  return { success: true, investment: newInvestment[0] };
}

/**
 * Record a buy transaction
 */
export async function recordBuyTransaction(data: {
  symbol: string;
  name: string;
  type: "stock" | "mutual_fund" | "etf" | "bond" | "crypto" | "commodity" | "other";
  portfolioId: number;
  exchange?: string;
  quantity: number;
  price: number;
  fees?: number;
  taxes?: number;
  currency?: string;
  date: string;
  time?: string;
  notes?: string;
}) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  // Validate portfolio ownership
  const portfolio = await db
    .select()
    .from(portfolios)
    .where(
      and(
        eq(portfolios.id, data.portfolioId),
        eq(portfolios.userId, user.id),
        eq(portfolios.isActive, true)
      )
    )
    .limit(1);

  if (portfolio.length === 0) {
    return { success: false, error: "Portfolio not found or not owned by user" };
  }

  try {
    // Get or create investment
    const investmentResult = await createOrGetInvestment(user.id, data.portfolioId, {
      userId: user.id,
      symbol: data.symbol,
      name: data.name,
      type: data.type,
      exchange: data.exchange,
      currency: data.currency || "USD",
      totalQuantity: "0",
      averagePrice: "0",
      totalInvested: "0",
      isActive: true,
    });

    if (!investmentResult.success) {
      return { success: false, error: investmentResult.error };
    }

    const investment = investmentResult.investment;

    // Create transaction
    const totalAmount = data.quantity * data.price + (data.fees || 0) + (data.taxes || 0);
    
    await db.insert(investmentTransactions).values({
      userId: user.id,
      investmentId: investment.id,
      type: "buy",
      quantity: data.quantity.toString(),
      price: data.price.toString(),
      totalAmount: totalAmount.toString(),
      fees: (data.fees || 0).toString(),
      taxes: (data.taxes || 0).toString(),
      currency: data.currency || "USD",
      date: data.date,
      time: data.time,
      notes: data.notes,
    });

    // Update investment metrics
    await updateInvestmentMetrics(investment.id);

    revalidatePath("/dashboard/investment");
    return { success: true, data: investment };
  } catch (error) {
    console.error("Record buy transaction error:", error);
    return { success: false, error: "Failed to record buy transaction" };
  }
}

/**
 * Record a sell transaction
 */
export async function recordSellTransaction(data: {
  investmentId: number;
  quantity: number;
  price: number;
  fees?: number;
  taxes?: number;
  date: string;
  time?: string;
  notes?: string;
}) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Verify investment ownership
    const investment = await db
      .select()
      .from(investments)
      .where(
        and(
          eq(investments.id, data.investmentId),
          eq(investments.userId, user.id)
        )
      )
      .limit(1);

    if (investment.length === 0) {
      return { success: false, error: "Investment not found" };
    }

    // Check if user has enough quantity to sell
    const currentQuantity = Number(investment[0].totalQuantity);
    if (currentQuantity < data.quantity) {
      return { 
        success: false, 
        error: `Insufficient quantity. You have ${currentQuantity} units.` 
      };
    }

    // Create sell transaction
    const totalAmount = data.quantity * data.price - (data.fees || 0) - (data.taxes || 0);
    
    await db.insert(investmentTransactions).values({
      userId: user.id,
      investmentId: data.investmentId,
      type: "sell",
      quantity: data.quantity.toString(),
      price: data.price.toString(),
      totalAmount: totalAmount.toString(),
      fees: (data.fees || 0).toString(),
      taxes: (data.taxes || 0).toString(),
      currency: investment[0].currency,
      date: data.date,
      time: data.time,
      notes: data.notes,
    });

    // Update investment metrics
    await updateInvestmentMetrics(data.investmentId);

    revalidatePath("/dashboard/investment");
    return { success: true };
  } catch (error) {
    console.error("Record sell transaction error:", error);
    return { success: false, error: "Failed to record sell transaction" };
  }
}

/**
 * Update investment metrics after transaction
 */
async function updateInvestmentMetrics(investmentId: number) {
  try {
    // Get all transactions for this investment
    const transactions = await db
      .select()
      .from(investmentTransactions)
      .where(eq(investmentTransactions.investmentId, investmentId))
      .orderBy(investmentTransactions.date);

    // Get investment details
    const investment = await db
      .select()
      .from(investments)
      .where(eq(investments.id, investmentId))
      .limit(1);

    if (investment.length === 0) return;

    // Get current price from Yahoo Finance
    const priceData = await getStockPrice(investment[0].symbol);
    const currentPrice = priceData.success && priceData.data ? priceData.data.price : Number(investment[0].currentPrice || 0);
    const previousClose = priceData.success && priceData.data ? priceData.data.previousClose : null;
    const dayChange = priceData.success && priceData.data ? priceData.data.change : null;
    const dayChangePercent = priceData.success && priceData.data ? priceData.data.changePercent : null;

    // Calculate metrics
    const metrics = calculateInvestmentMetrics(transactions, currentPrice);
    
    // Calculate day gain/loss based on position
    const dayGainLoss = dayChange ? metrics.totalQuantity * dayChange : null;

    // Update investment
    await db
      .update(investments)
      .set({
        totalQuantity: metrics.totalQuantity.toString(),
        averagePrice: metrics.averagePrice.toString(),
        totalInvested: metrics.totalInvested.toString(),
        currentPrice: currentPrice.toString(),
        previousClose: previousClose?.toString() || null,
        dayChange: dayChange?.toString() || null,
        dayChangePercent: dayChangePercent?.toString() || null,
        currentValue: metrics.currentValue.toString(),
        totalGainLoss: metrics.totalGainLoss.toString(),
        totalGainLossPercent: metrics.totalGainLossPercent.toString(),
        dayGainLoss: dayGainLoss?.toString() || null,
        lastUpdated: new Date(),
        updatedAt: new Date(),
        isActive: metrics.totalQuantity > 0,
      })
      .where(eq(investments.id, investmentId));
  } catch (error) {
    console.error("Update investment metrics error:", error);
  }
}

/**
 * Refresh all investment prices
 */
export async function refreshInvestmentPrices() {
  const user = await getCurrentUser();
  if (!user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const userInvestments = await db
      .select()
      .from(investments)
      .where(
        and(
          eq(investments.userId, user.id),
          eq(investments.isActive, true)
        )
      );

    for (const investment of userInvestments) {
      await updateInvestmentMetrics(investment.id);
    }

    revalidatePath("/dashboard/investment");
    return { success: true };
  } catch (error) {
    console.error("Refresh prices error:", error);
    return { success: false, error: "Failed to refresh prices" };
  }
}

/**
 * Delete an investment transaction
 */
export async function deleteInvestmentTransaction(id: number) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Get transaction to find investment ID
    const transaction = await db
      .select()
      .from(investmentTransactions)
      .where(
        and(
          eq(investmentTransactions.id, id),
          eq(investmentTransactions.userId, user.id)
        )
      )
      .limit(1);

    if (transaction.length === 0) {
      return { success: false, error: "Transaction not found" };
    }

    const investmentId = transaction[0].investmentId;

    // Delete transaction
    await db
      .delete(investmentTransactions)
      .where(eq(investmentTransactions.id, id));

    // Update metrics
    await updateInvestmentMetrics(investmentId);

    revalidatePath("/dashboard/investment");
    return { success: true };
  } catch (error) {
    console.error("Delete transaction error:", error);
    return { success: false, error: "Failed to delete transaction" };
  }
}

/**
 * Get portfolio summary
 */
export async function getPortfolioSummary() {
  const user = await getCurrentUser();
  if (!user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Get user's default currency
    const userData = await db
      .select({ defaultCurrency: users.defaultCurrency })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);
    
    const userCurrency = userData[0]?.defaultCurrency || "USD";

    const userInvestments = await db
      .select()
      .from(investments)
      .where(
        and(
          eq(investments.userId, user.id),
          eq(investments.isActive, true)
        )
      );

    const summary = {
      totalInvested: 0,
      currentValue: 0,
      totalGainLoss: 0,
      totalGainLossPercent: 0,
      investmentCount: userInvestments.length,
      currency: userCurrency,
    };

    // Cache exchange rates to avoid redundant calls
    const exchangeRates: Record<string, number> = {};

    for (const inv of userInvestments) {
      const invCurrency = inv.currency || "USD";
      let rate = 1;

      if (invCurrency !== userCurrency) {
        const cacheKey = `${invCurrency}_${userCurrency}`;
        if (exchangeRates[cacheKey]) {
          rate = exchangeRates[cacheKey];
        } else {
          rate = await getExchangeRate(invCurrency, userCurrency);
          exchangeRates[cacheKey] = rate;
        }
      }

      summary.totalInvested += Number(inv.totalInvested || 0) * rate;
      summary.currentValue += Number(inv.currentValue || 0) * rate;
      summary.totalGainLoss += Number(inv.totalGainLoss || 0) * rate;
    }

    summary.totalGainLossPercent = summary.totalInvested > 0 
      ? (summary.totalGainLoss / summary.totalInvested) * 100 
      : 0;

    return { success: true, data: summary };
  } catch (error) {
    console.error("Get portfolio summary error:", error);
    return { success: false, error: "Failed to fetch portfolio summary" };
  }
}

/**
 * Get enhanced portfolio summary with day change
 */
export async function getEnhancedPortfolioSummary() {
  const user = await getCurrentUser();
  if (!user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const userData = await db
      .select({ defaultCurrency: users.defaultCurrency })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);
    
    const userCurrency = userData[0]?.defaultCurrency || "USD";

    const userInvestments = await db
      .select()
      .from(investments)
      .where(
        and(
          eq(investments.userId, user.id),
          eq(investments.isActive, true)
        )
      );

    const summary = {
      totalInvested: 0,
      currentValue: 0,
      totalGainLoss: 0,
      totalGainLossPercent: 0,
      dayGainLoss: 0,
      dayGainLossPercent: 0,
      investmentCount: userInvestments.length,
      currency: userCurrency,
      bestPerformer: null as { symbol: string; name: string; gainPercent: number } | null,
      worstPerformer: null as { symbol: string; name: string; gainPercent: number } | null,
    };

    const exchangeRates: Record<string, number> = {};
    let previousDayValue = 0;

    for (const inv of userInvestments) {
      const invCurrency = inv.currency || "USD";
      let rate = 1;

      if (invCurrency !== userCurrency) {
        const cacheKey = `${invCurrency}_${userCurrency}`;
        if (exchangeRates[cacheKey]) {
          rate = exchangeRates[cacheKey];
        } else {
          rate = await getExchangeRate(invCurrency, userCurrency);
          exchangeRates[cacheKey] = rate;
        }
      }

      const currentValue = Number(inv.currentValue || 0) * rate;
      const dayGainLoss = Number(inv.dayGainLoss || 0) * rate;
      
      summary.totalInvested += Number(inv.totalInvested || 0) * rate;
      summary.currentValue += currentValue;
      summary.totalGainLoss += Number(inv.totalGainLoss || 0) * rate;
      summary.dayGainLoss += dayGainLoss;
      previousDayValue += currentValue - dayGainLoss;

      // Track best/worst performers
      const gainPercent = Number(inv.totalGainLossPercent || 0);
      if (!summary.bestPerformer || gainPercent > summary.bestPerformer.gainPercent) {
        summary.bestPerformer = { symbol: inv.symbol, name: inv.name, gainPercent };
      }
      if (!summary.worstPerformer || gainPercent < summary.worstPerformer.gainPercent) {
        summary.worstPerformer = { symbol: inv.symbol, name: inv.name, gainPercent };
      }
    }

    summary.totalGainLossPercent = summary.totalInvested > 0 
      ? (summary.totalGainLoss / summary.totalInvested) * 100 
      : 0;
    
    summary.dayGainLossPercent = previousDayValue > 0 
      ? (summary.dayGainLoss / previousDayValue) * 100 
      : 0;

    return { success: true, data: summary };
  } catch (error) {
    console.error("Get enhanced portfolio summary error:", error);
    return { success: false, error: "Failed to fetch portfolio summary" };
  }
}

/**
 * Get investments with transactions
 */
export async function getInvestmentsWithTransactions() {
  const user = await getCurrentUser();
  if (!user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const userInvestments = await db
      .select()
      .from(investments)
      .where(eq(investments.userId, user.id))
      .orderBy(desc(investments.currentValue));

    const investmentsWithTxns = await Promise.all(
      userInvestments.map(async (inv) => {
        const txns = await db
          .select()
          .from(investmentTransactions)
          .where(eq(investmentTransactions.investmentId, inv.id))
          .orderBy(desc(investmentTransactions.date));
        
        return {
          ...inv,
          transactions: txns,
        };
      })
    );

    return { success: true, data: investmentsWithTxns };
  } catch (error) {
    console.error("Get investments with transactions error:", error);
    return { success: false, error: "Failed to fetch investments" };
  }
}

/**
 * Get all transactions for the current user
 */
export async function getAllTransactions() {
  const user = await getCurrentUser();
  if (!user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const txns = await db
      .select({
        transaction: investmentTransactions,
        investment: investments,
      })
      .from(investmentTransactions)
      .innerJoin(investments, eq(investmentTransactions.investmentId, investments.id))
      .where(eq(investmentTransactions.userId, user.id))
      .orderBy(desc(investmentTransactions.date));

    return { 
      success: true, 
      data: txns.map(t => ({
        ...t.transaction,
        symbol: t.investment.symbol,
        name: t.investment.name,
      }))
    };
  } catch (error) {
    console.error("Get all transactions error:", error);
    return { success: false, error: "Failed to fetch transactions" };
  }
}

// ============================================================================
// PORTFOLIO MANAGEMENT
// ============================================================================

/**
 * Create a new portfolio
 */
export async function createPortfolio(data: {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const newPortfolio = await db
      .insert(portfolios)
      .values({
        userId: user.id,
        name: data.name,
        description: data.description,
        color: data.color,
        icon: data.icon,
        isDefault: false,
        isActive: true,
      })
      .returning();

    revalidatePath("/dashboard/investment");
    return { success: true, data: newPortfolio[0] };
  } catch (error) {
    console.error("Create portfolio error:", error);
    return { success: false, error: "Failed to create portfolio" };
  }
}

/**
 * Get all portfolios for the current user
 */
export async function getPortfolios() {
  const user = await getCurrentUser();
  if (!user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const userPortfolios = await db
      .select()
      .from(portfolios)
      .where(
        and(
          eq(portfolios.userId, user.id),
          eq(portfolios.isActive, true)
        )
      )
      .orderBy(asc(portfolios.name));

    return { success: true, data: userPortfolios };
  } catch (error) {
    console.error("Get portfolios error:", error);
    return { success: false, error: "Failed to fetch portfolios" };
  }
}

/**
 * Get a specific portfolio by ID
 */
export async function getPortfolioById(id: number) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const portfolio = await db
      .select()
      .from(portfolios)
      .where(
        and(
          eq(portfolios.id, id),
          eq(portfolios.userId, user.id),
          eq(portfolios.isActive, true)
        )
      )
      .limit(1);

    if (portfolio.length === 0) {
      return { success: false, error: "Portfolio not found" };
    }

    return { success: true, data: portfolio[0] };
  } catch (error) {
    console.error("Get portfolio by id error:", error);
    return { success: false, error: "Failed to fetch portfolio" };
  }
}

/**
 * Get all investments for a specific portfolio with transactions
 */
export async function getInvestmentsByPortfolio(portfolioId: number) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Verify portfolio ownership
    const portfolio = await db
      .select()
      .from(portfolios)
      .where(
        and(
          eq(portfolios.id, portfolioId),
          eq(portfolios.userId, user.id)
        )
      )
      .limit(1);

    if (portfolio.length === 0) {
      return { success: false, error: "Portfolio not found" };
    }

    const portfolioInvestments = await db
      .select()
      .from(investments)
      .where(
        and(
          eq(investments.userId, user.id),
          eq(investments.portfolioId, portfolioId)
        )
      )
      .orderBy(desc(investments.currentValue));

    const investmentsWithTxns = await Promise.all(
      portfolioInvestments.map(async (inv) => {
        const txns = await db
          .select()
          .from(investmentTransactions)
          .where(eq(investmentTransactions.investmentId, inv.id))
          .orderBy(desc(investmentTransactions.date));
        
        return {
          ...inv,
          transactions: txns,
        };
      })
    );

    return { success: true, data: investmentsWithTxns };
  } catch (error) {
    console.error("Get investments by portfolio error:", error);
    return { success: false, error: "Failed to fetch investments" };
  }
}

/**
 * Update a portfolio
 */
export async function updatePortfolio(id: number, data: {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
}) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await db
      .update(portfolios)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(portfolios.id, id),
          eq(portfolios.userId, user.id)
        )
      );

    revalidatePath("/dashboard/investment");
    return { success: true };
  } catch (error) {
    console.error("Update portfolio error:", error);
    return { success: false, error: "Failed to update portfolio" };
  }
}

/**
 * Delete a portfolio
 */
export async function deletePortfolio(id: number) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await db
      .update(portfolios)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(portfolios.id, id),
          eq(portfolios.userId, user.id)
        )
      );

    revalidatePath("/dashboard/investment");
    return { success: true };
  } catch (error) {
    console.error("Delete portfolio error:", error);
    return { success: false, error: "Failed to delete portfolio" };
  }
}

/**
 * Assign investment to a portfolio
 */
export async function assignToPortfolio(investmentId: number, portfolioId: number | null) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await db
      .update(investments)
      .set({ 
        portfolioId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(investments.id, investmentId),
          eq(investments.userId, user.id)
        )
      );

    revalidatePath("/dashboard/investment");
    return { success: true };
  } catch (error) {
    console.error("Assign to portfolio error:", error);
    return { success: false, error: "Failed to assign investment to portfolio" };
  }
}

// ============================================================================
// WATCHLIST
// ============================================================================

/**
 * Add item to watchlist
 */
export async function addToWatchlist(data: {
  symbol: string;
  name: string;
  type?: "stock" | "mutual_fund" | "etf" | "bond" | "crypto" | "commodity" | "other";
  exchange?: string;
  targetPrice?: number;
  notes?: string;
}) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Get current price for currency info
    const priceData = await getStockPrice(data.symbol);
    const currency = priceData.success && priceData.data ? priceData.data.currency : "USD";

    const newItem = await db
      .insert(watchlist)
      .values({
        userId: user.id,
        symbol: data.symbol,
        name: data.name,
        type: data.type || "stock",
        exchange: data.exchange,
        currency,
        targetPrice: data.targetPrice?.toString(),
        notes: data.notes,
      })
      .returning();

    revalidatePath("/dashboard/investment");
    return { success: true, data: newItem[0] };
  } catch (error) {
    console.error("Add to watchlist error:", error);
    return { success: false, error: "Failed to add to watchlist" };
  }
}

/**
 * Get watchlist with current prices
 */
export async function getWatchlist() {
  const user = await getCurrentUser();
  if (!user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const items = await db
      .select()
      .from(watchlist)
      .where(eq(watchlist.userId, user.id))
      .orderBy(asc(watchlist.symbol));

    // Fetch current prices for all items
    const itemsWithPrices = await Promise.all(
      items.map(async (item) => {
        const priceData = await getStockPrice(item.symbol);
        return {
          ...item,
          currentPrice: priceData.success && priceData.data ? priceData.data.price : null,
          change: priceData.success && priceData.data ? priceData.data.change : null,
          changePercent: priceData.success && priceData.data ? priceData.data.changePercent : null,
        };
      })
    );

    return { success: true, data: itemsWithPrices };
  } catch (error) {
    console.error("Get watchlist error:", error);
    return { success: false, error: "Failed to fetch watchlist" };
  }
}

/**
 * Remove from watchlist
 */
export async function removeFromWatchlist(id: number) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await db
      .delete(watchlist)
      .where(
        and(
          eq(watchlist.id, id),
          eq(watchlist.userId, user.id)
        )
      );

    revalidatePath("/dashboard/investment");
    return { success: true };
  } catch (error) {
    console.error("Remove from watchlist error:", error);
    return { success: false, error: "Failed to remove from watchlist" };
  }
}

// ============================================================================
// PRICE ALERTS
// ============================================================================

/**
 * Create a price alert
 */
export async function createPriceAlert(data: {
  symbol: string;
  alertType: "price_above" | "price_below" | "percent_change";
  targetPrice: number;
  notes?: string;
}) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const priceData = await getStockPrice(data.symbol);
    const currentPrice = priceData.success && priceData.data ? priceData.data.price : null;

    const newAlert = await db
      .insert(priceAlerts)
      .values({
        userId: user.id,
        symbol: data.symbol,
        alertType: data.alertType,
        targetPrice: data.targetPrice.toString(),
        currentPrice: currentPrice?.toString(),
        isTriggered: false,
        isActive: true,
        notes: data.notes,
      })
      .returning();

    revalidatePath("/dashboard/investment");
    return { success: true, data: newAlert[0] };
  } catch (error) {
    console.error("Create price alert error:", error);
    return { success: false, error: "Failed to create price alert" };
  }
}

/**
 * Get all price alerts
 */
export async function getPriceAlerts() {
  const user = await getCurrentUser();
  if (!user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const alerts = await db
      .select()
      .from(priceAlerts)
      .where(
        and(
          eq(priceAlerts.userId, user.id),
          eq(priceAlerts.isActive, true)
        )
      )
      .orderBy(desc(priceAlerts.createdAt));

    return { success: true, data: alerts };
  } catch (error) {
    console.error("Get price alerts error:", error);
    return { success: false, error: "Failed to fetch price alerts" };
  }
}

/**
 * Delete a price alert
 */
export async function deletePriceAlert(id: number) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await db
      .delete(priceAlerts)
      .where(
        and(
          eq(priceAlerts.id, id),
          eq(priceAlerts.userId, user.id)
        )
      );

    revalidatePath("/dashboard/investment");
    return { success: true };
  } catch (error) {
    console.error("Delete price alert error:", error);
    return { success: false, error: "Failed to delete price alert" };
  }
}

// ============================================================================
// ANALYTICS
// ============================================================================

/**
 * Get sector allocation for portfolio
 */
export async function getSectorAllocation() {
  const user = await getCurrentUser();
  if (!user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const userInvestments = await db
      .select()
      .from(investments)
      .where(
        and(
          eq(investments.userId, user.id),
          eq(investments.isActive, true)
        )
      );

    // Group by sector
    const sectorMap: Record<string, { value: number; count: number }> = {};
    
    for (const inv of userInvestments) {
      const sector = inv.sector || "Unknown";
      const value = Number(inv.currentValue || 0);
      
      if (sectorMap[sector]) {
        sectorMap[sector].value += value;
        sectorMap[sector].count += 1;
      } else {
        sectorMap[sector] = { value, count: 1 };
      }
    }

    const totalValue = Object.values(sectorMap).reduce((sum, s) => sum + s.value, 0);
    
    const allocation = Object.entries(sectorMap).map(([sector, data]) => ({
      sector,
      value: data.value,
      count: data.count,
      percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
    }));

    return { success: true, data: allocation.sort((a, b) => b.value - a.value) };
  } catch (error) {
    console.error("Get sector allocation error:", error);
    return { success: false, error: "Failed to fetch sector allocation" };
  }
}

/**
 * Get asset type allocation
 */
export async function getAssetTypeAllocation() {
  const user = await getCurrentUser();
  if (!user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const userInvestments = await db
      .select()
      .from(investments)
      .where(
        and(
          eq(investments.userId, user.id),
          eq(investments.isActive, true)
        )
      );

    // Group by type
    const typeMap: Record<string, { value: number; count: number }> = {};
    
    for (const inv of userInvestments) {
      const type = inv.type || "other";
      const value = Number(inv.currentValue || 0);
      
      if (typeMap[type]) {
        typeMap[type].value += value;
        typeMap[type].count += 1;
      } else {
        typeMap[type] = { value, count: 1 };
      }
    }

    const totalValue = Object.values(typeMap).reduce((sum, t) => sum + t.value, 0);
    
    const allocation = Object.entries(typeMap).map(([type, data]) => ({
      type,
      value: data.value,
      count: data.count,
      percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
    }));

    return { success: true, data: allocation.sort((a, b) => b.value - a.value) };
  } catch (error) {
    console.error("Get asset type allocation error:", error);
    return { success: false, error: "Failed to fetch asset type allocation" };
  }
}

/**
 * Get top performers and losers
 */
export async function getPerformanceLeaderboard() {
  const user = await getCurrentUser();
  if (!user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const userInvestments = await db
      .select()
      .from(investments)
      .where(
        and(
          eq(investments.userId, user.id),
          eq(investments.isActive, true)
        )
      );

    const sorted = [...userInvestments].sort(
      (a, b) => Number(b.totalGainLossPercent || 0) - Number(a.totalGainLossPercent || 0)
    );

    return {
      success: true,
      data: {
        topPerformers: sorted.slice(0, 5).map(inv => ({
          symbol: inv.symbol,
          name: inv.name,
          currentValue: Number(inv.currentValue || 0),
          gainLoss: Number(inv.totalGainLoss || 0),
          gainLossPercent: Number(inv.totalGainLossPercent || 0),
          dayChange: Number(inv.dayChangePercent || 0),
        })),
        worstPerformers: sorted.slice(-5).reverse().map(inv => ({
          symbol: inv.symbol,
          name: inv.name,
          currentValue: Number(inv.currentValue || 0),
          gainLoss: Number(inv.totalGainLoss || 0),
          gainLossPercent: Number(inv.totalGainLossPercent || 0),
          dayChange: Number(inv.dayChangePercent || 0),
        })),
      },
    };
  } catch (error) {
    console.error("Get performance leaderboard error:", error);
    return { success: false, error: "Failed to fetch performance data" };
  }
}

/**
 * Delete an investment completely (hard delete with all transactions)
 */
export async function deleteInvestment(id: number) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Verify investment ownership
    const investment = await db
      .select()
      .from(investments)
      .where(
        and(
          eq(investments.id, id),
          eq(investments.userId, user.id)
        )
      )
      .limit(1);

    if (investment.length === 0) {
      return { success: false, error: "Investment not found" };
    }

    // Delete all transactions associated with this investment first
    await db
      .delete(investmentTransactions)
      .where(
        and(
          eq(investmentTransactions.investmentId, id),
          eq(investmentTransactions.userId, user.id)
        )
      );

    // Then delete the investment itself
    await db
      .delete(investments)
      .where(
        and(
          eq(investments.id, id),
          eq(investments.userId, user.id)
        )
      );

    revalidatePath("/dashboard/investment");
    return { success: true };
  } catch (error) {
    console.error("Delete investment error:", error);
    return { success: false, error: "Failed to delete investment" };
  }
}
