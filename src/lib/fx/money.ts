/**
 * Money Value Object
 * 
 * Core principle: Money is (amount + currency).
 * Any value without currency is invalid and must be rejected.
 * 
 * This module provides:
 * - Type-safe Money representation
 * - Validation functions
 * - Helper constructors
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Represents a monetary value with its currency.
 * This is the canonical representation for all financial values.
 */
export interface Money {
  /** The numeric amount (can be negative for losses) */
  amount: number;
  /** ISO-4217 currency code (e.g., "USD", "INR", "EUR") */
  currency: string;
}

/**
 * Represents a monetary value that has been converted from another currency.
 * Used for display purposes to show conversion transparency.
 */
export interface ConvertedMoney {
  /** The converted amount in target currency */
  amount: number;
  /** The target currency (user's display currency) */
  currency: string;
  /** Original amount before conversion */
  originalAmount: number;
  /** Original currency before conversion */
  originalCurrency: string;
  /** Exchange rate used for conversion (originalCurrency -> currency) */
  exchangeRate: number;
  /** Date of the exchange rate (YYYY-MM-DD) */
  rateDate: string;
  /** Source of the exchange rate */
  rateSource: "frankfurter" | "fallback";
  /** Whether a conversion was actually performed */
  wasConverted: boolean;
}

/**
 * Either native Money (no conversion needed) or ConvertedMoney (conversion applied)
 */
export type DisplayMoney = Money | ConvertedMoney;

/**
 * Type guard to check if DisplayMoney was converted
 */
export function isConvertedMoney(money: DisplayMoney): money is ConvertedMoney {
  return "wasConverted" in money && money.wasConverted === true;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * ISO 4217 currency code pattern (3 uppercase letters)
 */
const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;

/**
 * Validate a currency code
 */
export function isValidCurrencyCode(code: unknown): code is string {
  return (
    typeof code === "string" &&
    CURRENCY_CODE_PATTERN.test(code.toUpperCase())
  );
}

/**
 * Validate a Money object
 */
export function isValidMoney(value: unknown): value is Money {
  if (!value || typeof value !== "object") return false;
  
  const money = value as Record<string, unknown>;
  
  return (
    typeof money.amount === "number" &&
    !Number.isNaN(money.amount) &&
    Number.isFinite(money.amount) &&
    isValidCurrencyCode(money.currency)
  );
}

/**
 * Validate amount is a valid number
 */
export function isValidAmount(amount: unknown): amount is number {
  return (
    typeof amount === "number" &&
    !Number.isNaN(amount) &&
    Number.isFinite(amount)
  );
}

// ============================================================================
// CONSTRUCTORS
// ============================================================================

/**
 * Create a Money object with validation
 * 
 * @throws Error if amount or currency is invalid
 */
export function money(amount: number, currency: string): Money {
  if (!isValidAmount(amount)) {
    throw new Error(`Invalid amount: ${amount}`);
  }
  
  const upperCurrency = currency.toUpperCase();
  if (!isValidCurrencyCode(upperCurrency)) {
    throw new Error(`Invalid currency code: ${currency}`);
  }
  
  return {
    amount,
    currency: upperCurrency,
  };
}

/**
 * Create a Money object, returning null if invalid instead of throwing
 */
export function tryMoney(amount: unknown, currency: unknown): Money | null {
  if (!isValidAmount(amount) || !isValidCurrencyCode(currency)) {
    return null;
  }
  
  return {
    amount: amount as number,
    currency: (currency as string).toUpperCase(),
  };
}

/**
 * Create a Money object with zero amount
 */
export function zeroMoney(currency: string): Money {
  return money(0, currency);
}

/**
 * Create a ConvertedMoney object that represents no conversion (same currency)
 */
export function noConversion(money: Money): ConvertedMoney {
  return {
    amount: money.amount,
    currency: money.currency,
    originalAmount: money.amount,
    originalCurrency: money.currency,
    exchangeRate: 1,
    rateDate: new Date().toISOString().split("T")[0],
    rateSource: "frankfurter",
    wasConverted: false,
  };
}

// ============================================================================
// OPERATIONS
// ============================================================================

/**
 * Add two Money values (must be same currency)
 * 
 * @throws Error if currencies don't match
 */
export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(
      `Cannot add ${a.currency} and ${b.currency}. Convert to same currency first.`
    );
  }
  
  return {
    amount: a.amount + b.amount,
    currency: a.currency,
  };
}

/**
 * Subtract money (a - b, must be same currency)
 * 
 * @throws Error if currencies don't match
 */
export function subtractMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(
      `Cannot subtract ${a.currency} and ${b.currency}. Convert to same currency first.`
    );
  }
  
  return {
    amount: a.amount - b.amount,
    currency: a.currency,
  };
}

/**
 * Multiply money by a scalar
 */
export function multiplyMoney(m: Money, scalar: number): Money {
  if (!isValidAmount(scalar)) {
    throw new Error(`Invalid scalar: ${scalar}`);
  }
  
  return {
    amount: m.amount * scalar,
    currency: m.currency,
  };
}

/**
 * Negate money (flip sign)
 */
export function negateMoney(m: Money): Money {
  return {
    amount: -m.amount,
    currency: m.currency,
  };
}

/**
 * Check if two Money values are equal
 */
export function equalsMoney(a: Money, b: Money): boolean {
  return a.currency === b.currency && a.amount === b.amount;
}

/**
 * Compare two Money values (must be same currency)
 * Returns -1 if a < b, 0 if equal, 1 if a > b
 * 
 * @throws Error if currencies don't match
 */
export function compareMoney(a: Money, b: Money): -1 | 0 | 1 {
  if (a.currency !== b.currency) {
    throw new Error(
      `Cannot compare ${a.currency} and ${b.currency}. Convert to same currency first.`
    );
  }
  
  if (a.amount < b.amount) return -1;
  if (a.amount > b.amount) return 1;
  return 0;
}

/**
 * Check if money is positive
 */
export function isPositive(m: Money): boolean {
  return m.amount > 0;
}

/**
 * Check if money is negative
 */
export function isNegative(m: Money): boolean {
  return m.amount < 0;
}

/**
 * Check if money is zero
 */
export function isZero(m: Money): boolean {
  return m.amount === 0;
}

/**
 * Get absolute value of money
 */
export function absMoney(m: Money): Money {
  return {
    amount: Math.abs(m.amount),
    currency: m.currency,
  };
}

/**
 * Round money to specified decimal places
 */
export function roundMoney(m: Money, decimals: number = 2): Money {
  const factor = Math.pow(10, decimals);
  return {
    amount: Math.round(m.amount * factor) / factor,
    currency: m.currency,
  };
}
