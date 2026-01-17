/**
 * FX Module - Currency Conversion and Formatting
 * 
 * A comprehensive module for handling currency conversion with full transparency.
 * Uses Frankfurter API (ECB reference rates) as the authoritative FX source.
 * 
 * Core Principle: Money is (amount + currency). No value without currency is valid.
 * 
 * @example
 * ```typescript
 * import { 
 *   money, 
 *   convertMoney, 
 *   formatConvertedMoney,
 *   getExchangeRate 
 * } from "@/lib/fx";
 * 
 * // Create money values
 * const usdValue = money(49.00, "USD");
 * 
 * // Convert to user's preferred currency
 * const inrValue = await convertMoney(usdValue, "INR");
 * 
 * // Format with conversion disclosure
 * const display = formatConvertedMoney(inrValue);
 * // "₹4,078.00 (from $49.00 @ 83.22)"
 * ```
 */

// ============================================================================
// FRANKFURTER API (Exchange Rate Source)
// ============================================================================
export {
  getLatestRate,
  getHistoricalRate,
  getLatestRates,
  clearFxCache,
  getFxCacheStats,
  type FxRate,
  type FxResult,
  type FxRateResponse,
  type FxRateError,
} from "./frankfurter";

// ============================================================================
// MONEY VALUE OBJECT
// ============================================================================
export {
  // Types
  type Money,
  type ConvertedMoney,
  type DisplayMoney,
  
  // Type guards
  isConvertedMoney,
  isValidMoney,
  isValidCurrencyCode,
  isValidAmount,
  
  // Constructors
  money,
  tryMoney,
  zeroMoney,
  noConversion,
  
  // Operations
  addMoney,
  subtractMoney,
  multiplyMoney,
  negateMoney,
  equalsMoney,
  compareMoney,
  isPositive,
  isNegative,
  isZero,
  absMoney,
  roundMoney,
} from "./money";

// ============================================================================
// CONVERSION SERVICE
// ============================================================================
export {
  // Main conversion functions
  convertMoney,
  ensureDisplayCurrency,
  convertMoneyBatch,
  sumMoneyWithConversion,
  
  // Rate helpers
  getExchangeRate,
  getExchangeRateWithDetails,
  needsConversion,
  canConvert,
  getConversionDescription,
  
  // Types
  type ConversionOptions,
  type BatchConversionResult,
} from "./converter";

// ============================================================================
// FORMATTING
// ============================================================================
export {
  // Currency symbols
  CURRENCY_SYMBOLS,
  getCurrencySymbol,
  
  // Basic formatting
  formatMoney,
  formatMoneyIntl,
  
  // Converted money formatting
  formatConvertedMoney,
  getConversionDisclosure,
  getConversionShortInfo,
  
  // Display helpers
  formatDisplayMoney,
  formatMoneyWithSign,
  formatGainLoss,
  
  // Amount formatting
  formatAmount,
  formatPercent,
  
  // Types
  type FormatMoneyOptions,
  type FormatConvertedMoneyOptions,
} from "./format";
