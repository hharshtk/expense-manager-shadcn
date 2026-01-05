"use server";

import { db } from "@/lib/db";
import { investments, investmentTransactions, users, type NewInvestment, type NewInvestmentTransaction } from "@/lib/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq, and, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey", "ripHistorical"],
});

/**
 * Get exchange rate between two currencies
 */
export async function getExchangeRate(from: string, to: string): Promise<number> {
  if (from === to) return 1;
  
  try {
    const symbol = `${from}${to}=X`;
    const quote = await yahooFinance.quote(symbol);
    return quote.regularMarketPrice || 1;
  } catch (error) {
    console.error(`Failed to fetch exchange rate for ${from} to ${to}:`, error);
    // Fallback rates for common pairs if Yahoo fails
    if (from === "USD" && to === "INR") return 83;
    if (from === "INR" && to === "USD") return 1/83;
    return 1;
  }
}

/**
 * Search for stocks/investments using Yahoo Finance
 */
export async function searchInvestments(query: string) {
  try {
    const results = await yahooFinance.search(query, {
      quotesCount: 10,
      newsCount: 0,
    });

    return {
      success: true,
      data: results.quotes.map((quote: any) => ({
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
        price: quote.regularMarketPrice,
        currency: quote.currency || "USD",
        change: quote.regularMarketChange,
        changePercent: quote.regularMarketChangePercent,
        dayHigh: quote.regularMarketDayHigh,
        dayLow: quote.regularMarketDayLow,
        volume: quote.regularMarketVolume,
        marketCap: quote.marketCap,
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
 */
async function createOrGetInvestment(userId: number, data: NewInvestment) {
  // Check if investment already exists
  const existing = await db
    .select()
    .from(investments)
    .where(
      and(
        eq(investments.userId, userId),
        eq(investments.symbol, data.symbol)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // Create new investment
  const newInvestment = await db
    .insert(investments)
    .values(data)
    .returning();

  return newInvestment[0];
}

/**
 * Record a buy transaction
 */
export async function recordBuyTransaction(data: {
  symbol: string;
  name: string;
  type: "stock" | "mutual_fund" | "etf" | "bond" | "crypto" | "commodity" | "other";
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

  try {
    // Get or create investment
    const investment = await createOrGetInvestment(user.id, {
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

    // Calculate metrics
    const metrics = calculateInvestmentMetrics(transactions, currentPrice);

    // Update investment
    await db
      .update(investments)
      .set({
        totalQuantity: metrics.totalQuantity.toString(),
        averagePrice: metrics.averagePrice.toString(),
        totalInvested: metrics.totalInvested.toString(),
        currentPrice: currentPrice.toString(),
        currentValue: metrics.currentValue.toString(),
        totalGainLoss: metrics.totalGainLoss.toString(),
        totalGainLossPercent: metrics.totalGainLossPercent.toString(),
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
