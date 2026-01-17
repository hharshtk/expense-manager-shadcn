/**
 * Currency Formatting Utilities
 * 
 * Provides formatting functions that ensure proper currency display with
 * conversion transparency when applicable.
 * 
 * UI Display Rules:
 * - Same currency: ₹4,078
 * - Different currency (converted): ₹4,078 (converted from $49 @ 83.22)
 */

import { type Money, type ConvertedMoney, isConvertedMoney, type DisplayMoney } from "./money";

// ============================================================================
// CURRENCY SYMBOLS
// ============================================================================

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "₹",
  JPY: "¥",
  CAD: "C$",
  AUD: "A$",
  CHF: "Fr",
  CNY: "¥",
  BRL: "R$",
  KRW: "₩",
  MXN: "MX$",
  RUB: "₽",
  SGD: "S$",
  HKD: "HK$",
  NZD: "NZ$",
  SEK: "kr",
  NOK: "kr",
  DKK: "kr",
  ZAR: "R",
  AED: "د.إ",
  SAR: "﷼",
  THB: "฿",
  MYR: "RM",
  PHP: "₱",
  IDR: "Rp",
  VND: "₫",
  PKR: "₨",
  BDT: "৳",
  NGN: "₦",
  EGP: "E£",
  TRY: "₺",
  PLN: "zł",
  CZK: "Kč",
  HUF: "Ft",
  ILS: "₪",
  CLP: "CL$",
  COP: "CO$",
  PEN: "S/",
  ARS: "AR$",
};

/**
 * Get currency symbol for a currency code
 */
export function getCurrencySymbol(currencyCode: string): string {
  return CURRENCY_SYMBOLS[currencyCode.toUpperCase()] || currencyCode;
}

// ============================================================================
// FORMATTING OPTIONS
// ============================================================================

export interface FormatMoneyOptions {
  /** Locale for number formatting (default: "en-US") */
  locale?: string;
  /** Show + sign for positive values (default: false) */
  showPlusSign?: boolean;
  /** Minimum fraction digits (default: 2) */
  minimumFractionDigits?: number;
  /** Maximum fraction digits (default: 2) */
  maximumFractionDigits?: number;
  /** Use compact notation for large numbers (default: false) */
  compact?: boolean;
}

export interface FormatConvertedMoneyOptions extends FormatMoneyOptions {
  /** Format for conversion disclosure */
  disclosureFormat?: "full" | "compact" | "tooltip-only";
}

// ============================================================================
// BASIC FORMATTING
// ============================================================================

/**
 * Format a Money value for display
 * 
 * @example
 * formatMoney({ amount: 4078, currency: "INR" }) // "₹4,078.00"
 * formatMoney({ amount: -50, currency: "USD" }, { showPlusSign: true }) // "-$50.00"
 */
export function formatMoney(value: Money, options?: FormatMoneyOptions): string {
  const {
    locale = "en-US",
    showPlusSign = false,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    compact = false,
  } = options ?? {};
  
  const symbol = getCurrencySymbol(value.currency);
  const absAmount = Math.abs(value.amount);
  
  const formatOptions: Intl.NumberFormatOptions = {
    minimumFractionDigits,
    maximumFractionDigits,
    ...(compact && { notation: "compact", compactDisplay: "short" }),
  };
  
  const formattedNumber = new Intl.NumberFormat(locale, formatOptions).format(absAmount);
  
  const sign = value.amount < 0 ? "-" : (showPlusSign && value.amount > 0 ? "+" : "");
  
  return `${sign}${symbol}${formattedNumber}`;
}

/**
 * Format money using Intl.NumberFormat with currency style
 * (More locale-aware but less control over symbol placement)
 */
export function formatMoneyIntl(value: Money, locale: string = "en-US"): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: value.currency,
      maximumFractionDigits: 2,
    }).format(value.amount);
  } catch {
    // Fallback for unsupported currencies
    return formatMoney(value, { locale });
  }
}

// ============================================================================
// CONVERTED MONEY FORMATTING
// ============================================================================

/**
 * Format the original amount portion of a conversion
 */
function formatOriginal(converted: ConvertedMoney, locale: string): string {
  const symbol = getCurrencySymbol(converted.originalCurrency);
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(converted.originalAmount));
  
  return `${symbol}${formatted}`;
}

/**
 * Format a ConvertedMoney value with full disclosure
 * 
 * @example
 * // Full format (wasConverted = true):
 * // "₹4,078.00 (converted from $49.00 @ 83.22 USD→INR)"
 * 
 * // Same currency (wasConverted = false):
 * // "₹4,078.00"
 */
export function formatConvertedMoney(
  value: ConvertedMoney,
  options?: FormatConvertedMoneyOptions
): string {
  const {
    locale = "en-US",
    showPlusSign = false,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    disclosureFormat = "full",
  } = options ?? {};
  
  // Format the main (converted) amount
  const mainAmount = formatMoney(
    { amount: value.amount, currency: value.currency },
    { locale, showPlusSign, minimumFractionDigits, maximumFractionDigits }
  );
  
  // If no conversion happened, just return the amount
  if (!value.wasConverted) {
    return mainAmount;
  }
  
  // Add conversion disclosure based on format
  switch (disclosureFormat) {
    case "tooltip-only":
      // Just the amount - caller will handle tooltip
      return mainAmount;
    
    case "compact":
      // Short disclosure with asterisk
      return `${mainAmount}*`;
    
    case "full":
    default:
      // Full disclosure inline
      const original = formatOriginal(value, locale);
      const rateDisplay = value.exchangeRate.toFixed(2);
      return `${mainAmount} (from ${original} @ ${rateDisplay})`;
  }
}

/**
 * Get conversion disclosure text for tooltip or footnote
 */
export function getConversionDisclosure(value: ConvertedMoney): string | null {
  if (!value.wasConverted) {
    return null;
  }
  
  const rate = value.exchangeRate.toFixed(4);
  const source = value.rateSource === "frankfurter" ? "ECB reference rate" : "fallback rate";
  
  return `Converted from ${value.originalCurrency} ${value.originalAmount.toFixed(2)} @ ${rate} ${value.originalCurrency}→${value.currency} (${source}, ${value.rateDate})`;
}

/**
 * Get short conversion info for compact displays
 */
export function getConversionShortInfo(value: ConvertedMoney): string | null {
  if (!value.wasConverted) {
    return null;
  }
  
  return `${value.originalCurrency} @ ${value.exchangeRate.toFixed(2)}`;
}

// ============================================================================
// DISPLAY MONEY FORMATTING (handles both Money and ConvertedMoney)
// ============================================================================

/**
 * Format any DisplayMoney value appropriately
 */
export function formatDisplayMoney(
  value: DisplayMoney,
  options?: FormatConvertedMoneyOptions
): string {
  if (isConvertedMoney(value)) {
    return formatConvertedMoney(value, options);
  }
  return formatMoney(value, options);
}

/**
 * Format a value with sign indication (for gain/loss displays)
 */
export function formatMoneyWithSign(value: Money, options?: FormatMoneyOptions): string {
  return formatMoney(value, { ...options, showPlusSign: true });
}

/**
 * Format a value as gain/loss with color class suggestion
 */
export function formatGainLoss(value: Money, options?: FormatMoneyOptions): {
  formatted: string;
  colorClass: string;
  isPositive: boolean;
  isNegative: boolean;
  isZero: boolean;
} {
  const formatted = formatMoney(value, { ...options, showPlusSign: true });
  const isPositive = value.amount > 0;
  const isNegative = value.amount < 0;
  const isZero = value.amount === 0;
  
  return {
    formatted,
    colorClass: isPositive ? "text-green-500" : isNegative ? "text-red-500" : "text-muted-foreground",
    isPositive,
    isNegative,
    isZero,
  };
}

// ============================================================================
// AMOUNT ONLY FORMATTING
// ============================================================================

/**
 * Format just the numeric amount without currency symbol
 */
export function formatAmount(
  amount: number,
  options?: {
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    showPlusSign?: boolean;
  }
): string {
  const {
    locale = "en-US",
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    showPlusSign = false,
  } = options ?? {};
  
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(Math.abs(amount));
  
  const sign = amount < 0 ? "-" : (showPlusSign && amount > 0 ? "+" : "");
  
  return `${sign}${formatted}`;
}

/**
 * Format percentage value
 */
export function formatPercent(
  value: number,
  options?: {
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    showPlusSign?: boolean;
  }
): string {
  const {
    locale = "en-US",
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    showPlusSign = false,
  } = options ?? {};
  
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(Math.abs(value));
  
  const sign = value < 0 ? "-" : (showPlusSign && value > 0 ? "+" : "");
  
  return `${sign}${formatted}%`;
}
