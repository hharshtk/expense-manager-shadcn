/**
 * Yahoo Finance API Demo
 * Demonstrates various features of yahoo-finance2 package
 */

import YahooFinance from 'yahoo-finance2';

async function demonstrateYahooFinance() {
  console.log('=== Yahoo Finance API Demo ===\n');

  // Initialize YahooFinance instance with error suppression
  const yahooFinance = new YahooFinance({
    suppressNotices: ['yahooSurvey', 'ripHistorical']
  });

  // Helper function to handle API calls with error recovery
  async function safeApiCall<T>(operation: string, apiCall: () => Promise<T>): Promise<T | null> {
    try {
      console.log(`${operation}...`);
      const result = await apiCall();
      return result;
    } catch (error) {
      console.log(`❌ ${operation} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  try {
    // 1. Search for a stock
    const searchResults = await safeApiCall('1. Searching for "Apple"', () =>
      yahooFinance.search('Apple', { quotesCount: 3, newsCount: 0 })
    );

    if (searchResults) {
      console.log('Search Results:');
      searchResults.quotes.forEach((quote: any) => {
        console.log(`  - ${quote.symbol}: ${quote.shortname || quote.longname}`);
      });
    } else {
      console.log('Search Results (Mock Data):');
      console.log('  - AAPL: Apple Inc.');
      console.log('  - APLE: Apple Hospitality REIT, Inc.');
      console.log('  - 0R2V.L: APPLE INC APPLE ORD');
    }
    console.log();

    // 2. Get quote for a specific stock
    const quote = await safeApiCall('2. Getting quote for AAPL', () =>
      yahooFinance.quote('AAPL')
    );

    if (quote) {
      console.log(`Quote for ${quote.symbol}:`);
      console.log(`  Price: ${quote.regularMarketPrice} ${quote.currency}`);
      console.log(`  Change: ${quote.regularMarketChange} (${quote.regularMarketChangePercent?.toFixed(2)}%)`);
      console.log(`  Day High: ${quote.regularMarketDayHigh}`);
      console.log(`  Day Low: ${quote.regularMarketDayLow}`);
      console.log(`  Volume: ${quote.regularMarketVolume?.toLocaleString()}`);
    } else {
      console.log('Quote for AAPL (Mock Data):');
      console.log('  Price: $271.01 USD');
      console.log('  Change: -0.85 (-0.31%)');
      console.log('  Day High: $277.82');
      console.log('  Day Low: $269.02');
      console.log('  Volume: 37,746,172');
    }
    console.log();

    // 3. Get multiple quotes
    const multiQuotes = await safeApiCall('3. Getting quotes for multiple stocks', () =>
      yahooFinance.quote(['AAPL', 'GOOGL', 'MSFT'])
    );

    if (multiQuotes) {
      console.log('Multiple Quotes:');
      multiQuotes.forEach((q: any) => {
        console.log(`  ${q.symbol}: $${q.regularMarketPrice} ${q.currency}`);
      });
    } else {
      console.log('Multiple Quotes (Mock Data):');
      console.log('  AAPL: $271.01 USD');
      console.log('  GOOGL: $315.15 USD');
      console.log('  MSFT: $472.94 USD');
    }
    console.log();

    // 4. Get historical data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const historical = await safeApiCall('4. Getting historical data for AAPL (last 7 days)', () =>
      yahooFinance.historical('AAPL', {
        period1: startDate,
        period2: endDate,
        interval: '1d'
      })
    );

    if (historical && historical.length > 0) {
      console.log(`Historical data (${historical.length} entries):`);
      historical.slice(0, 3).forEach((day: any) => {
        console.log(`  ${day.date.toLocaleDateString()}: Open $${day.open}, Close $${day.close}`);
      });
    } else {
      console.log('Historical data (Mock Data):');
      console.log('  12/29/2025: Open $272.69, Close $273.76');
      console.log('  12/30/2025: Open $272.81, Close $273.08');
      console.log('  12/31/2025: Open $273.06, Close $271.86');
    }
    console.log();

    // 5. Get quote summary with detailed modules
    const quoteSummary = await safeApiCall('5. Getting detailed quote summary for AAPL', () =>
      yahooFinance.quoteSummary('AAPL', {
        modules: ['price', 'summaryDetail', 'assetProfile']
      })
    );

    if (quoteSummary) {
      if (quoteSummary.price) {
        console.log('Price Information:');
        console.log(`  Market Cap: $${quoteSummary.price.marketCap?.toLocaleString()}`);
        console.log(`  52 Week High: $${quoteSummary.summaryDetail?.fiftyTwoWeekHigh}`);
        console.log(`  52 Week Low: $${quoteSummary.summaryDetail?.fiftyTwoWeekLow}`);
      }

      if (quoteSummary.assetProfile) {
        console.log('Company Profile:');
        console.log(`  Industry: ${quoteSummary.assetProfile.industry}`);
        console.log(`  Sector: ${quoteSummary.assetProfile.sector}`);
        console.log(`  Employees: ${quoteSummary.assetProfile.fullTimeEmployees?.toLocaleString()}`);
        console.log(`  Website: ${quoteSummary.assetProfile.website}`);
      }
    } else {
      console.log('Quote Summary (Mock Data):');
      console.log('Price Information:');
      console.log('  Market Cap: $4,021,894,250,496');
      console.log('  52 Week High: $288.62');
      console.log('  52 Week Low: $169.21');
      console.log('Company Profile:');
      console.log('  Industry: Consumer Electronics');
      console.log('  Sector: Technology');
      console.log('  Employees: 166,000');
      console.log('  Website: https://www.apple.com');
    }
    console.log();

    // 6. Get trending symbols
    const trending = await safeApiCall('6. Getting trending symbols', () =>
      yahooFinance.trendingSymbols('US')
    );

    if (trending) {
      console.log('Trending stocks:');
      trending.quotes.slice(0, 5).forEach((t: any) => {
        console.log(`  ${t.symbol}: $${t.regularMarketPrice}`);
      });
    } else {
      console.log('Trending stocks (Mock Data):');
      console.log('  BTC-USD: $95,000');
      console.log('  NVDA: $1,200');
      console.log('  TSLA: $350');
      console.log('  AAPL: $271');
      console.log('  MSFT: $473');
    }
    console.log();

    // 7. Get chart data
    const chart = await safeApiCall('7. Getting chart data for AAPL', () =>
      yahooFinance.chart('AAPL', {
        period1: startDate,
        period2: endDate,
        interval: '1d'
      })
    );

    if (chart) {
      console.log(`Chart data for ${chart.meta.symbol}:`);
      console.log(`  Currency: ${chart.meta.currency}`);
      console.log(`  Exchange: ${chart.meta.exchangeName}`);
      console.log(`  Data points: ${chart.quotes.length}`);
    } else {
      console.log('Chart data (Mock Data):');
      console.log('  Symbol: AAPL');
      console.log('  Currency: USD');
      console.log('  Exchange: NMS');
      console.log('  Data points: 4');
    }
    console.log();

    console.log('=== Demo Complete ===');

  } catch (error) {
    console.error('Error occurred:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
    }
  }
}

// Run the demo
demonstrateYahooFinance();
