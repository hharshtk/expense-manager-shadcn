/**
 * Currency Conversion Service
 * 
 * Handles display-time conversion of monetary values with full transparency.
 * 
 * Key principles:
 * - Convert at display time only, never at storage time
 * - Always preserve original value information
 * - Use historical rates for transaction history
 * - Use latest rates for current portfolio value
 */

import { getLatestRate, getHistoricalRate, getLatestRates, type FxRate } from "./frankfurter";
import { 
  type Money, 
  type ConvertedMoney, 
  money, 
  noConversion,
  isValidCurrencyCode,
} from "./money";

// ============================================================================
// TYPES
// ============================================================================

export interface ConversionOptions {
  /** Use historical rate for this date (YYYY-MM-DD format, UTC) */
  historicalDate?: string;
}

export interface BatchConversionResult {
  /** Successfully converted values */
  converted: ConvertedMoney[];
  /** Any errors that occurred */
  errors: Array<{ index: number; error: string }>;
}

// ============================================================================
// SINGLE CONVERSION
// ============================================================================

/**
 * Convert a Money value to a target currency.
 * Returns ConvertedMoney with full conversion transparency.
 * 
 * @param source - The money to convert
 * @param targetCurrency - ISO-4217 target currency code
 * @param options - Optional: use historical rate
 * @returns ConvertedMoney with conversion details, or source as ConvertedMoney if same currency
 */
export async function convertMoney(
  source: Money,
  targetCurrency: string,
  options?: ConversionOptions
): Promise<ConvertedMoney> {
  const upperTarget = targetCurrency.toUpperCase();
  
  // Same currency - no conversion needed
  if (source.currency === upperTarget) {
    return noConversion(source);
  }
  
  // Fetch exchange rate
  const rateResult = options?.historicalDate
    ? await getHistoricalRate(source.currency, upperTarget, options.historicalDate)
    : await getLatestRate(source.currency, upperTarget);
  
  if (!rateResult.success) {
    // If conversion fails, return with rate of 1 and mark as not converted
    // This prevents silent failures but logs warning
    console.error(`Currency conversion failed: ${rateResult.error}`);
    return {
      amount: source.amount,
      currency: source.currency, // Keep original currency
      originalAmount: source.amount,
      originalCurrency: source.currency,
      exchangeRate: 1,
      rateDate: new Date().toISOString().split("T")[0],
      rateSource: "fallback",
      wasConverted: false,
    };
  }
  
  const { rate, date, source: rateSource } = rateResult.data;
  const convertedAmount = source.amount * rate;
  
  return {
    amount: convertedAmount,
    currency: upperTarget,
    originalAmount: source.amount,
    originalCurrency: source.currency,
    exchangeRate: rate,
    rateDate: date,
    rateSource,
    wasConverted: true,
  };
}

/**
 * Convert money only if currencies differ, otherwise return as-is
 * This is a convenience wrapper that always returns ConvertedMoney
 */
export async function ensureDisplayCurrency(
  source: Money,
  displayCurrency: string,
  options?: ConversionOptions
): Promise<ConvertedMoney> {
  return convertMoney(source, displayCurrency, options);
}

// ============================================================================
// BATCH CONVERSION
// ============================================================================

/**
 * Convert multiple Money values to a target currency efficiently.
 * Uses batch rate fetching for better performance.
 * 
 * @param sources - Array of Money to convert
 * @param targetCurrency - Target currency for all conversions
 * @returns BatchConversionResult with all conversions
 */
export async function convertMoneyBatch(
  sources: Money[],
  targetCurrency: string
): Promise<BatchConversionResult> {
  const upperTarget = targetCurrency.toUpperCase();
  const converted: ConvertedMoney[] = [];
  const errors: Array<{ index: number; error: string }> = [];
  
  // Find unique source currencies that need conversion
  const uniqueCurrencies = [...new Set(
    sources
      .map(s => s.currency)
      .filter(c => c !== upperTarget)
  )];
  
  // Batch fetch rates for all unique currencies
  const ratesMap = new Map<string, FxRate>();
  
  if (uniqueCurrencies.length > 0) {
    // For each unique source currency, get rate to target
    // Note: Frankfurter API is base-centric, so we need to handle this
    for (const sourceCurrency of uniqueCurrencies) {
      const rateResult = await getLatestRate(sourceCurrency, upperTarget);
      if (rateResult.success) {
        ratesMap.set(sourceCurrency, rateResult.data);
      }
    }
  }
  
  // Convert each source
  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    
    // Same currency - no conversion
    if (source.currency === upperTarget) {
      converted.push(noConversion(source));
      continue;
    }
    
    // Get rate from cache
    const rate = ratesMap.get(source.currency);
    
    if (!rate) {
      errors.push({
        index: i,
        error: `No exchange rate available for ${source.currency} to ${upperTarget}`,
      });
      // Add unconverted value to maintain array alignment
      converted.push({
        amount: source.amount,
        currency: source.currency,
        originalAmount: source.amount,
        originalCurrency: source.currency,
        exchangeRate: 1,
        rateDate: new Date().toISOString().split("T")[0],
        rateSource: "fallback",
        wasConverted: false,
      });
      continue;
    }
    
    converted.push({
      amount: source.amount * rate.rate,
      currency: upperTarget,
      originalAmount: source.amount,
      originalCurrency: source.currency,
      exchangeRate: rate.rate,
      rateDate: rate.date,
      rateSource: rate.source,
      wasConverted: true,
    });
  }
  
  return { converted, errors };
}

// ============================================================================
// AGGREGATION WITH CONVERSION
// ============================================================================

/**
 * Sum multiple Money values, converting all to target currency first.
 * Returns detailed breakdown of conversion.
 * 
 * @param values - Array of Money values to sum
 * @param targetCurrency - Currency for the sum
 * @returns Object with total and individual conversion details
 */
export async function sumMoneyWithConversion(
  values: Money[],
  targetCurrency: string
): Promise<{
  total: ConvertedMoney;
  items: ConvertedMoney[];
  hasConversions: boolean;
  conversionCount: number;
}> {
  const upperTarget = targetCurrency.toUpperCase();
  const { converted, errors } = await convertMoneyBatch(values, upperTarget);
  
  if (errors.length > 0) {
    console.warn(`Some conversions failed during sum:`, errors);
  }
  
  const totalAmount = converted.reduce((sum, item) => sum + item.amount, 0);
  const conversionCount = converted.filter(c => c.wasConverted).length;
  
  return {
    total: {
      amount: totalAmount,
      currency: upperTarget,
      originalAmount: totalAmount, // For sum, original is the sum itself
      originalCurrency: upperTarget,
      exchangeRate: 1,
      rateDate: new Date().toISOString().split("T")[0],
      rateSource: "frankfurter",
      wasConverted: conversionCount > 0,
    },
    items: converted,
    hasConversions: conversionCount > 0,
    conversionCount,
  };
}

// ============================================================================
// RATE HELPERS
// ============================================================================

/**
 * Get exchange rate between two currencies.
 * Convenience wrapper around getLatestRate.
 * 
 * @returns The exchange rate as a number, or 1 if failed
 */
export async function getExchangeRate(from: string, to: string): Promise<number> {
  if (from.toUpperCase() === to.toUpperCase()) {
    return 1;
  }
  
  const result = await getLatestRate(from, to);
  return result.success ? result.data.rate : 1;
}

/**
 * Get exchange rate with full metadata
 */
export async function getExchangeRateWithDetails(
  from: string,
  to: string,
  historicalDate?: string
): Promise<FxRate | null> {
  const result = historicalDate
    ? await getHistoricalRate(from, to, historicalDate)
    : await getLatestRate(from, to);
  
  return result.success ? result.data : null;
}

/**
 * Check if conversion will be needed
 */
export function needsConversion(sourceCurrency: string, targetCurrency: string): boolean {
  return sourceCurrency.toUpperCase() !== targetCurrency.toUpperCase();
}

// ============================================================================
// CONVERSION VALIDATION
// ============================================================================

/**
 * Validate that a conversion can be performed
 */
export function canConvert(from: string, to: string): boolean {
  return isValidCurrencyCode(from) && isValidCurrencyCode(to);
}

/**
 * Get a human-readable conversion description
 */
export function getConversionDescription(converted: ConvertedMoney): string {
  if (!converted.wasConverted) {
    return "";
  }
  
  return `Converted from ${converted.originalCurrency} @ ${converted.exchangeRate.toFixed(4)} (${converted.rateSource}, ${converted.rateDate})`;
}
