/**
 * Interactive Yahoo Finance API Demo
 * Menu-driven interface for exploring yahoo-finance2 features
 * Supports US stocks, Indian stocks, and mutual funds
 */

import YahooFinance from 'yahoo-finance2';
import * as readline from 'readline';

async function createInteractiveDemo() {
  const yahooFinance = new YahooFinance({
    suppressNotices: ['yahooSurvey', 'ripHistorical']
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(query, resolve);
    });
  };

  // Helper function to format Indian stock symbols
  const formatIndianSymbol = (symbol: string): string => {
    const upperSymbol = symbol.toUpperCase();
    // If already has .NS or .BO suffix, return as is
    if (upperSymbol.includes('.NS') || upperSymbol.includes('.BO')) {
      return upperSymbol;
    }
    // Default to NSE (.NS) for Indian stocks
    return `${upperSymbol}.NS`;
  };

  // Helper function to detect if symbol is likely Indian
  const isLikelyIndianSymbol = (symbol: string): boolean => {
    const upperSymbol = symbol.toUpperCase();
    // Common Indian stock patterns or explicit suffixes
    return upperSymbol.includes('.NS') ||
           upperSymbol.includes('.BO') ||
           ['RELIANCE', 'TCS', 'HDFC', 'ICICI', 'INFY', 'WIPRO', 'BAJAJ', 'MARUTI', 'ITC', 'LT'].some(company =>
             upperSymbol.startsWith(company)
           );
  };

  // Helper function to detect if symbol is likely a mutual fund
  const isLikelyMutualFund = (symbol: string): boolean => {
    const upperSymbol = symbol.toUpperCase();
    // Common mutual fund patterns
    return upperSymbol.includes('AX') || // Admiral shares
           upperSymbol.includes('IX') || // Institutional shares
           upperSymbol.includes('FX') || // Fidelity funds
           upperSymbol.includes('GX') || // Government funds
           upperSymbol.includes('MX') || // Money market
           upperSymbol.includes('PX') || // Preferred
           upperSymbol.includes('RX') || // Retirement
           upperSymbol.includes('SX') || // Special
           upperSymbol.includes('TX') || // Tax-exempt
           upperSymbol.includes('UX') || // Utilities
           upperSymbol.includes('VX') || // Value
           upperSymbol.includes('WX') || // World
           upperSymbol.includes('YX') || // Yield
           upperSymbol.includes('ZX');   // Index
  };

  const displayMenu = () => {
    console.log('\n=== Interactive Yahoo Finance Demo ===');
    console.log('Supports US stocks, Indian stocks, and mutual funds');
    console.log('1. Search for stocks/mutual funds');
    console.log('2. Get stock/mutual fund quote');
    console.log('3. Get multiple quotes');
    console.log('4. Get historical data');
    console.log('5. Get detailed company/fund info');
    console.log('6. Get trending symbols');
    console.log('7. Get chart data');
    console.log('8. Run full demo');
    console.log('9. Exit');
    console.log('=====================================');
  };

  const safeApiCall = async <T>(operation: string, apiCall: () => Promise<T>): Promise<T | null> => {
    try {
      console.log(`\n${operation}...`);
      const result = await apiCall();
      return result;
    } catch (error) {
      console.log(`❌ ${operation} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  };

  const handleSearch = async () => {
    const query = await question('Enter search term (e.g., "Apple", "Tesla", "Reliance", "TCS", "Vanguard", "Fidelity"): ');
    if (!query.trim()) {
      console.log('Search term cannot be empty.');
      return;
    }

    const results = await safeApiCall(`Searching for "${query}"`, () =>
      yahooFinance.search(query, { quotesCount: 5, newsCount: 0 })
    );

    if (results) {
      console.log('\nSearch Results:');
      results.quotes.forEach((quote: any, index: number) => {
        const symbol = quote.symbol || 'N/A';
        const name = quote.shortname || quote.longname || 'N/A';
        const type = quote.quoteType === 'MUTUALFUND' ? 'Mutual Fund' :
                    symbol.includes('.NS') ? 'NSE Stock' :
                    symbol.includes('.BO') ? 'BSE Stock' : 'Stock/ETF';
        console.log(`${index + 1}. ${symbol} (${type}): ${name}`);
      });
    } else {
      console.log('No results found or search failed.');
    }
  };

  const handleQuote = async () => {
    const symbolInput = await question('Enter stock/mutual fund symbol (e.g., AAPL, GOOGL, RELIANCE.NS, TCS.BO, VFINX, VFIAX): ');
    if (!symbolInput.trim()) {
      console.log('Symbol cannot be empty.');
      return;
    }

    // Auto-format Indian symbols
    let symbol = symbolInput.toUpperCase();
    if (isLikelyIndianSymbol(symbol) && !symbol.includes('.NS') && !symbol.includes('.BO')) {
      const choice = await question('Is this an Indian stock? (y/n) [y]: ');
      if (choice.toLowerCase() !== 'n') {
        const exchange = await question('NSE or BSE? (NS/BO) [NS]: ');
        const suffix = exchange.toUpperCase().startsWith('B') ? '.BO' : '.NS';
        symbol = `${symbol}${suffix}`;
        console.log(`Using symbol: ${symbol}`);
      }
    }

    const quote = await safeApiCall(`Getting quote for ${symbol}`, () =>
      yahooFinance.quote(symbol)
    );

    if (quote) {
      const isMutualFund = quote.quoteType === 'MUTUALFUND';
      const currencySymbol = quote.currency === 'INR' ? '₹' : '$';

      console.log(`\nQuote for ${quote.symbol} (${isMutualFund ? 'Mutual Fund' : 'Stock'}):`);
      console.log(`  Price: ${currencySymbol}${quote.regularMarketPrice} ${quote.currency}`);
      console.log(`  Change: ${quote.regularMarketChange?.toFixed(2)} (${quote.regularMarketChangePercent?.toFixed(2)}%)`);
      console.log(`  Day High: ${quote.regularMarketDayHigh}`);
      console.log(`  Day Low: ${quote.regularMarketDayLow}`);
      console.log(`  Volume: ${quote.regularMarketVolume?.toLocaleString()}`);
      if (!isMutualFund) {
        console.log(`  Market Cap: ${currencySymbol}${quote.marketCap?.toLocaleString()}`);
      }
      if (quote.fiftyTwoWeekHigh && quote.fiftyTwoWeekLow) {
        console.log(`  52 Week Range: ${currencySymbol}${quote.fiftyTwoWeekLow} - ${currencySymbol}${quote.fiftyTwoWeekHigh}`);
      }
    } else {
      console.log('Failed to get quote data.');
    }
  };

  const handleMultipleQuotes = async () => {
    const symbolsInput = await question('Enter stock/mutual fund symbols separated by commas (e.g., AAPL,GOOGL,RELIANCE.NS,TCS.BO,VFINX,VFIAX): ');
    let symbols = symbolsInput.split(',').map(s => s.trim().toUpperCase()).filter(s => s);

    if (symbols.length === 0) {
      console.log('No valid symbols provided.');
      return;
    }

    // Auto-format Indian symbols
    symbols = symbols.map(symbol => {
      if (isLikelyIndianSymbol(symbol) && !symbol.includes('.NS') && !symbol.includes('.BO')) {
        return formatIndianSymbol(symbol);
      }
      return symbol;
    });

    console.log(`Fetching quotes for: ${symbols.join(', ')}`);

    const quotes = await safeApiCall(`Getting quotes for ${symbols.join(', ')}`, () =>
      yahooFinance.quote(symbols)
    );

    if (quotes) {
      console.log('\nMultiple Quotes:');
      quotes.forEach((q: any) => {
        const isMutualFund = q.quoteType === 'MUTUALFUND';
        const currencySymbol = q.currency === 'INR' ? '₹' : '$';
        const type = isMutualFund ? 'Mutual Fund' : 'Stock';
        console.log(`  ${q.symbol} (${type}): ${currencySymbol}${q.regularMarketPrice} ${q.currency} (${q.regularMarketChangePercent?.toFixed(2)}%)`);
      });
    } else {
      console.log('Failed to get quote data.');
    }
  };

  const handleHistorical = async () => {
    const symbol = await question('Enter stock/mutual fund symbol: ');
    const daysInput = await question('Enter number of days (1-365): ');
    const days = parseInt(daysInput);

    if (!symbol.trim() || isNaN(days) || days < 1 || days > 365) {
      console.log('Invalid input. Symbol required, days must be 1-365.');
      return;
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const historical = await safeApiCall(`Getting ${days} days of historical data for ${symbol.toUpperCase()}`, () =>
      yahooFinance.historical(symbol.toUpperCase(), {
        period1: startDate,
        period2: endDate,
        interval: '1d'
      })
    );

    if (historical && historical.length > 0) {
      console.log(`\nHistorical data (${historical.length} entries):`);
      historical.slice(-10).forEach((day: any) => {
        const currencySymbol = day.currency === 'INR' ? '₹' : '$';
        console.log(`  ${day.date.toLocaleDateString()}: Open ${currencySymbol}${day.open?.toFixed(2)}, Close ${currencySymbol}${day.close?.toFixed(2)}, Volume: ${day.volume?.toLocaleString()}`);
      });
    } else {
      console.log('No historical data available.');
    }
  };

  const handleCompanyInfo = async () => {
    const symbol = await question('Enter stock/mutual fund symbol: ');

    if (!symbol.trim()) {
      console.log('Symbol cannot be empty.');
      return;
    }

    const summary = await safeApiCall(`Getting detailed info for ${symbol.toUpperCase()}`, () =>
      yahooFinance.quoteSummary(symbol.toUpperCase(), {
        modules: ['price', 'summaryDetail', 'assetProfile', 'financialData', 'fundProfile']
      })
    );

    if (summary) {
      const isMutualFund = summary.price?.quoteType === 'MUTUALFUND';
      const currencySymbol = summary.price?.currency === 'INR' ? '₹' : '$';

      if (summary.price) {
        console.log(`\n${isMutualFund ? 'Fund' : 'Price'} Information:`);
        if (!isMutualFund) {
          console.log(`  Market Cap: ${currencySymbol}${summary.price.marketCap?.toLocaleString()}`);
        }
        console.log(`  52 Week High: ${currencySymbol}${summary.summaryDetail?.fiftyTwoWeekHigh}`);
        console.log(`  52 Week Low: ${currencySymbol}${summary.summaryDetail?.fiftyTwoWeekLow}`);
        if (!isMutualFund) {
          console.log(`  Average Volume: ${summary.summaryDetail?.averageVolume?.toLocaleString()}`);
        }
      }

      if (summary.fundProfile && isMutualFund) {
        console.log('\nFund Profile:');
        console.log(`  Category: ${summary.fundProfile.categoryName}`);
        console.log(`  Family: ${summary.fundProfile.family}`);
        console.log(`  Net Assets: ${currencySymbol}${summary.fundProfile.netAssets?.toLocaleString()}`);
        console.log(`  Yield: ${typeof summary.fundProfile.yield === 'number' ? (summary.fundProfile.yield * 100).toFixed(2) : 'N/A'}%`);
        console.log(`  Inception Date: ${summary.fundProfile.inceptionDate}`);
      } else if (summary.assetProfile && !isMutualFund) {
        console.log('\nCompany Profile:');
        console.log(`  Industry: ${summary.assetProfile.industry}`);
        console.log(`  Sector: ${summary.assetProfile.sector}`);
        console.log(`  Employees: ${summary.assetProfile.fullTimeEmployees?.toLocaleString()}`);
        console.log(`  Website: ${summary.assetProfile.website}`);
        console.log(`  Description: ${summary.assetProfile.longBusinessSummary?.substring(0, 200)}...`);
      }

      if (summary.financialData && !isMutualFund) {
        console.log('\nFinancial Data:');
        console.log(`  Revenue: ${currencySymbol}${summary.financialData.totalRevenue?.toLocaleString()}`);
        console.log(`  Profit Margin: ${typeof summary.financialData.profitMargins === 'number' ? (summary.financialData.profitMargins * 100).toFixed(2) : 'N/A'}%`);
      }
    } else {
      console.log('Failed to get company/fund information.');
    }
  };

  const handleTrending = async () => {
    const regionInput = await question('Enter region (US, IN, GB, DE, etc.) [default: US]: ');
    const region = regionInput.trim().toUpperCase() || 'US';

    const regionNames: { [key: string]: string } = {
      'US': 'United States',
      'IN': 'India',
      'GB': 'United Kingdom',
      'DE': 'Germany',
      'FR': 'France',
      'JP': 'Japan',
      'CN': 'China',
      'HK': 'Hong Kong'
    };

    const regionName = regionNames[region] || region;

    const trending = await safeApiCall(`Getting trending symbols for ${regionName}`, () =>
      yahooFinance.trendingSymbols(region)
    );

    if (trending) {
      console.log(`\nTrending stocks in ${regionName}:`);
      trending.quotes.slice(0, 10).forEach((t: any, index: number) => {
        const symbol = t.symbol || 'N/A';
        const name = t.shortName || 'N/A';
        const exchange = symbol.includes('.NS') ? 'NSE' :
                        symbol.includes('.BO') ? 'BSE' : 'Other';
        console.log(`${index + 1}. ${symbol} (${exchange}): ${name}`);
      });
    } else {
      console.log('Failed to get trending symbols.');
    }
  };

  const handleChart = async () => {
    const symbol = await question('Enter stock/mutual fund symbol: ');
    const daysInput = await question('Enter number of days (1-365): ');
    const days = parseInt(daysInput);

    if (!symbol.trim() || isNaN(days) || days < 1 || days > 365) {
      console.log('Invalid input. Symbol required, days must be 1-365.');
      return;
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const chart = await safeApiCall(`Getting chart data for ${symbol.toUpperCase()}`, () =>
      yahooFinance.chart(symbol.toUpperCase(), {
        period1: startDate,
        period2: endDate,
        interval: '1d'
      })
    );

    if (chart) {
      console.log(`\nChart data for ${chart.meta.symbol}:`);
      console.log(`  Currency: ${chart.meta.currency}`);
      console.log(`  Exchange: ${chart.meta.exchangeName}`);
      console.log(`  Data points: ${chart.quotes.length}`);
      console.log(`  Timezone: ${chart.meta.timezone}`);

      if (chart.quotes.length > 0) {
        console.log('\nRecent data points:');
        chart.quotes.slice(-5).forEach((point: any, index: number) => {
          const date = new Date(point.date * 1000);
          const currencySymbol = chart.meta.currency === 'INR' ? '₹' : '$';
          console.log(`  ${date.toLocaleDateString()}: Open ${currencySymbol}${point.open?.toFixed(2)}, Close ${currencySymbol}${point.close?.toFixed(2)}, Volume: ${point.volume?.toLocaleString()}`);
        });
      }
    } else {
      console.log('Failed to get chart data.');
    }
  };

  const runFullDemo = async () => {
    console.log('\nRunning full demo...');
    await handleSearch();
    await handleQuote();
    await handleMultipleQuotes();
    await handleHistorical();
    await handleCompanyInfo();
    await handleTrending();
    await handleChart();
  };

  let running = true;

  while (running) {
    displayMenu();
    const choice = await question('Choose an option (1-9): ');

    switch (choice.trim()) {
      case '1':
        await handleSearch();
        break;
      case '2':
        await handleQuote();
        break;
      case '3':
        await handleMultipleQuotes();
        break;
      case '4':
        await handleHistorical();
        break;
      case '5':
        await handleCompanyInfo();
        break;
      case '6':
        await handleTrending();
        break;
      case '7':
        await handleChart();
        break;
      case '8':
        await runFullDemo();
        break;
      case '9':
        console.log('Goodbye!');
        running = false;
        break;
      default:
        console.log('Invalid choice. Please select 1-9.');
    }

    if (running) {
      await question('\nPress Enter to continue...');
    }
  }

  rl.close();
}

// Run the interactive demo
createInteractiveDemo().catch(console.error);