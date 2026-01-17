/**
 * Exchange Rate Utilities
 * 
 * Uses Frankfurter API (ECB reference rates) as the authoritative FX source.
 * This module provides backward-compatible exports from the new FX module.
 * 
 * For new code, prefer importing directly from "@/lib/fx"
 */

import { 
  getExchangeRate as fxGetExchangeRate,
  getExchangeRateWithDetails,
  getLatestRate,
  getHistoricalRate,
  type FxRate,
} from "@/lib/fx";

/**
 * Get exchange rate between two currencies using Frankfurter API
 * 
 * @param from - Source currency (ISO-4217 code)
 * @param to - Target currency (ISO-4217 code)
 * @returns Exchange rate as a number, or 1 if conversion fails
 */
export async function getExchangeRate(from: string, to: string): Promise<number> {
  return fxGetExchangeRate(from, to);
}

/**
 * Get exchange rate with full metadata
 * 
 * @param from - Source currency (ISO-4217 code)
 * @param to - Target currency (ISO-4217 code)
 * @param date - Optional historical date (YYYY-MM-DD)
 * @returns FxRate object with rate, date, and source info, or null if failed
 */
export async function getExchangeRateDetails(
  from: string, 
  to: string,
  date?: string
): Promise<FxRate | null> {
  return getExchangeRateWithDetails(from, to, date);
}

// Re-export for convenience
export { getLatestRate, getHistoricalRate, type FxRate };
