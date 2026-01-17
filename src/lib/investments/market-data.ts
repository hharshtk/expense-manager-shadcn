import YahooFinance from "yahoo-finance2";

export type AssetTypeFilter = "stock" | "etf" | "mutual_fund";
export type CountryFilter = "US" | "IN";

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey", "ripHistorical"],
});

// Exchange mappings for country filtering
const COUNTRY_EXCHANGES: Record<CountryFilter, string[]> = {
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
    assetType?: AssetTypeFilter;
    country?: CountryFilter;
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
        return allowedExchanges.some((ex) => exchange.includes(ex));
      });
    }

    return {
      success: true,
      data: filteredQuotes.slice(0, 10).map((quote: any) => ({
        symbol: quote.symbol,
        name: quote.shortname || quote.longname || quote.symbol,
        type:
          quote.quoteType === "MUTUALFUND"
            ? "mutual_fund"
            : quote.quoteType === "ETF"
              ? "etf"
              : quote.quoteType === "CRYPTOCURRENCY"
                ? "crypto"
                : "stock",
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
export async function getStockHistory(
  symbol: string,
  period: "1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y" | "max" = "1mo"
) {
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