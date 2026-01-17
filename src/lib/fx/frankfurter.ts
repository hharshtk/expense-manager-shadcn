/**
 * Frankfurter API Client
 * 
 * Uses the Frankfurter API (api.frankfurter.dev) as the authoritative FX data source.
 * Data sourced from ECB (European Central Bank) reference rates.
 * 
 * Key Features:
 * - In-memory caching with daily expiry
 * - Supports latest and historical rates
 * - Type-safe responses
 * - Fallback rates for common pairs when API fails
 */

const FRANKFURTER_BASE_URL = "https://api.frankfurter.dev/v1";

// Cache duration: 1 hour for latest rates, 24 hours for historical
const CACHE_DURATION_LATEST_MS = 60 * 60 * 1000; // 1 hour
const CACHE_DURATION_HISTORICAL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ============================================================================
// TYPES
// ============================================================================

export interface FxRate {
  base: string;
  target: string;
  rate: number;
  date: string; // YYYY-MM-DD format (UTC date from Frankfurter)
  source: "frankfurter" | "fallback";
}

export interface FxRateResponse {
  success: true;
  data: FxRate;
}

export interface FxRateError {
  success: false;
  error: string;
}

export type FxResult = FxRateResponse | FxRateError;

interface FrankfurterRatesResponse {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

interface CacheEntry {
  rate: FxRate;
  expiresAt: number;
}

// ============================================================================
// CACHE
// ============================================================================

// In-memory cache for exchange rates
// Key format: "BASE_TARGET" for latest, "BASE_TARGET_YYYY-MM-DD" for historical
const rateCache = new Map<string, CacheEntry>();

function getCacheKey(base: string, target: string, date?: string): string {
  const key = `${base.toUpperCase()}_${target.toUpperCase()}`;
  return date ? `${key}_${date}` : key;
}

function getCachedRate(base: string, target: string, date?: string): FxRate | null {
  const key = getCacheKey(base, target, date);
  const entry = rateCache.get(key);
  
  if (!entry) return null;
  
  // Check if cache entry has expired
  if (Date.now() > entry.expiresAt) {
    rateCache.delete(key);
    return null;
  }
  
  return entry.rate;
}

function setCachedRate(rate: FxRate, isHistorical: boolean = false): void {
  const key = getCacheKey(rate.base, rate.target, isHistorical ? rate.date : undefined);
  const duration = isHistorical ? CACHE_DURATION_HISTORICAL_MS : CACHE_DURATION_LATEST_MS;
  
  rateCache.set(key, {
    rate,
    expiresAt: Date.now() + duration,
  });
}

// ============================================================================
// FALLBACK RATES
// ============================================================================

// Emergency fallback rates for when API is unavailable
// These are approximate rates and should only be used as last resort
const FALLBACK_RATES: Record<string, Record<string, number>> = {
  USD: {
    INR: 83.50,
    EUR: 0.92,
    GBP: 0.79,
    JPY: 154.50,
    CAD: 1.36,
    AUD: 1.53,
    CHF: 0.88,
    CNY: 7.24,
    SGD: 1.34,
    HKD: 7.80,
  },
  EUR: {
    USD: 1.09,
    INR: 91.00,
    GBP: 0.86,
    JPY: 168.00,
    CHF: 0.96,
  },
  GBP: {
    USD: 1.27,
    EUR: 1.17,
    INR: 106.00,
  },
  INR: {
    USD: 0.012,
    EUR: 0.011,
    GBP: 0.0094,
  },
};

function getFallbackRate(base: string, target: string): number | null {
  const upperBase = base.toUpperCase();
  const upperTarget = target.toUpperCase();
  
  // Direct lookup
  if (FALLBACK_RATES[upperBase]?.[upperTarget]) {
    return FALLBACK_RATES[upperBase][upperTarget];
  }
  
  // Try inverse
  if (FALLBACK_RATES[upperTarget]?.[upperBase]) {
    return 1 / FALLBACK_RATES[upperTarget][upperBase];
  }
  
  // Try cross rate via USD
  if (upperBase !== "USD" && upperTarget !== "USD") {
    const baseToUsd = FALLBACK_RATES[upperBase]?.USD ?? (1 / (FALLBACK_RATES.USD?.[upperBase] ?? 0));
    const usdToTarget = FALLBACK_RATES.USD?.[upperTarget] ?? (1 / (FALLBACK_RATES[upperTarget]?.USD ?? 0));
    
    if (baseToUsd && usdToTarget && isFinite(baseToUsd) && isFinite(usdToTarget)) {
      return baseToUsd * usdToTarget;
    }
  }
  
  return null;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Fetch latest exchange rate from Frankfurter API
 * 
 * @param base - Base currency (ISO-4217 code)
 * @param target - Target currency (ISO-4217 code)
 * @returns FxResult with rate data or error
 */
export async function getLatestRate(base: string, target: string): Promise<FxResult> {
  const upperBase = base.toUpperCase();
  const upperTarget = target.toUpperCase();
  
  // Same currency = rate of 1
  if (upperBase === upperTarget) {
    return {
      success: true,
      data: {
        base: upperBase,
        target: upperTarget,
        rate: 1,
        date: new Date().toISOString().split("T")[0],
        source: "frankfurter",
      },
    };
  }
  
  // Check cache first
  const cached = getCachedRate(upperBase, upperTarget);
  if (cached) {
    return { success: true, data: cached };
  }
  
  try {
    const url = `${FRANKFURTER_BASE_URL}/latest?base=${upperBase}&symbols=${upperTarget}`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 }, // Next.js cache for 1 hour
    });
    
    if (!response.ok) {
      throw new Error(`Frankfurter API error: ${response.status} ${response.statusText}`);
    }
    
    const data: FrankfurterRatesResponse = await response.json();
    
    if (!data.rates[upperTarget]) {
      throw new Error(`Rate not found for ${upperBase}/${upperTarget}`);
    }
    
    const rate: FxRate = {
      base: upperBase,
      target: upperTarget,
      rate: data.rates[upperTarget],
      date: data.date,
      source: "frankfurter",
    };
    
    // Cache the result
    setCachedRate(rate, false);
    
    return { success: true, data: rate };
  } catch (error) {
    console.error(`Failed to fetch FX rate for ${upperBase}/${upperTarget}:`, error);
    
    // Try fallback rate
    const fallbackRate = getFallbackRate(upperBase, upperTarget);
    if (fallbackRate !== null) {
      console.warn(`Using fallback rate for ${upperBase}/${upperTarget}: ${fallbackRate}`);
      return {
        success: true,
        data: {
          base: upperBase,
          target: upperTarget,
          rate: fallbackRate,
          date: new Date().toISOString().split("T")[0],
          source: "fallback",
        },
      };
    }
    
    return {
      success: false,
      error: `Failed to fetch exchange rate for ${upperBase}/${upperTarget}`,
    };
  }
}

/**
 * Fetch historical exchange rate from Frankfurter API
 * 
 * @param base - Base currency (ISO-4217 code)
 * @param target - Target currency (ISO-4217 code)
 * @param date - Date in YYYY-MM-DD format (UTC)
 * @returns FxResult with rate data or error
 */
export async function getHistoricalRate(
  base: string,
  target: string,
  date: string
): Promise<FxResult> {
  const upperBase = base.toUpperCase();
  const upperTarget = target.toUpperCase();
  
  // Same currency = rate of 1
  if (upperBase === upperTarget) {
    return {
      success: true,
      data: {
        base: upperBase,
        target: upperTarget,
        rate: 1,
        date,
        source: "frankfurter",
      },
    };
  }
  
  // Check cache first
  const cached = getCachedRate(upperBase, upperTarget, date);
  if (cached) {
    return { success: true, data: cached };
  }
  
  try {
    const url = `${FRANKFURTER_BASE_URL}/${date}?base=${upperBase}&symbols=${upperTarget}`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 }, // Next.js cache for 24 hours (historical rates don't change)
    });
    
    if (!response.ok) {
      throw new Error(`Frankfurter API error: ${response.status} ${response.statusText}`);
    }
    
    const data: FrankfurterRatesResponse = await response.json();
    
    if (!data.rates[upperTarget]) {
      throw new Error(`Historical rate not found for ${upperBase}/${upperTarget} on ${date}`);
    }
    
    const rate: FxRate = {
      base: upperBase,
      target: upperTarget,
      rate: data.rates[upperTarget],
      date: data.date, // Use date from response (may differ if requested date was holiday/weekend)
      source: "frankfurter",
    };
    
    // Cache the result
    setCachedRate(rate, true);
    
    return { success: true, data: rate };
  } catch (error) {
    console.error(`Failed to fetch historical FX rate for ${upperBase}/${upperTarget} on ${date}:`, error);
    
    // For historical rates, we fall back to latest rate if available
    return getLatestRate(base, target);
  }
}

/**
 * Batch fetch latest rates for multiple currency pairs
 * More efficient than calling getLatestRate multiple times
 * 
 * @param base - Base currency (ISO-4217 code)
 * @param targets - Array of target currencies
 * @returns Map of target currency to FxRate
 */
export async function getLatestRates(
  base: string,
  targets: string[]
): Promise<Map<string, FxRate>> {
  const upperBase = base.toUpperCase();
  const results = new Map<string, FxRate>();
  const uncachedTargets: string[] = [];
  
  // Check cache first
  for (const target of targets) {
    const upperTarget = target.toUpperCase();
    
    if (upperBase === upperTarget) {
      results.set(upperTarget, {
        base: upperBase,
        target: upperTarget,
        rate: 1,
        date: new Date().toISOString().split("T")[0],
        source: "frankfurter",
      });
    } else {
      const cached = getCachedRate(upperBase, upperTarget);
      if (cached) {
        results.set(upperTarget, cached);
      } else {
        uncachedTargets.push(upperTarget);
      }
    }
  }
  
  // Fetch uncached rates
  if (uncachedTargets.length > 0) {
    try {
      const url = `${FRANKFURTER_BASE_URL}/latest?base=${upperBase}&symbols=${uncachedTargets.join(",")}`;
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        next: { revalidate: 3600 },
      });
      
      if (response.ok) {
        const data: FrankfurterRatesResponse = await response.json();
        
        for (const target of uncachedTargets) {
          if (data.rates[target]) {
            const rate: FxRate = {
              base: upperBase,
              target,
              rate: data.rates[target],
              date: data.date,
              source: "frankfurter",
            };
            setCachedRate(rate, false);
            results.set(target, rate);
          }
        }
      }
    } catch (error) {
      console.error(`Failed to batch fetch FX rates:`, error);
    }
    
    // Fill in any missing rates with fallbacks
    for (const target of uncachedTargets) {
      if (!results.has(target)) {
        const fallbackRate = getFallbackRate(upperBase, target);
        if (fallbackRate !== null) {
          results.set(target, {
            base: upperBase,
            target,
            rate: fallbackRate,
            date: new Date().toISOString().split("T")[0],
            source: "fallback",
          });
        }
      }
    }
  }
  
  return results;
}

/**
 * Clear the FX rate cache
 * Useful for testing or forcing fresh data
 */
export function clearFxCache(): void {
  rateCache.clear();
}

/**
 * Get cache statistics for debugging
 */
export function getFxCacheStats(): { size: number; keys: string[] } {
  return {
    size: rateCache.size,
    keys: Array.from(rateCache.keys()),
  };
}
