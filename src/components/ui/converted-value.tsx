"use client";

import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { type ConvertedMoney, type DisplayMoney, isConvertedMoney } from "@/lib/fx";
import { 
  formatMoney, 
  formatConvertedMoney, 
  getConversionDisclosure,
  getCurrencySymbol,
  formatAmount,
} from "@/lib/fx";
import { ArrowRightLeft } from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

export interface DisplayValue {
  amount: number;
  currency: string;
  originalAmount?: number;
  originalCurrency?: string;
  exchangeRate?: number;
  rateDate?: string;
  wasConverted: boolean;
}

interface ConvertedValueProps {
  /** The value to display */
  value: DisplayValue | ConvertedMoney;
  /** Additional CSS classes */
  className?: string;
  /** Show plus sign for positive values */
  showSign?: boolean;
  /** Display format */
  format?: "full" | "compact" | "tooltip-only";
  /** Size variant */
  size?: "sm" | "md" | "lg";
}

interface CurrencyValueProps {
  /** Amount to display */
  amount: number;
  /** Currency code (ISO-4217) */
  currency: string;
  /** Original amount if converted */
  originalAmount?: number;
  /** Original currency if converted */
  originalCurrency?: string;
  /** Exchange rate used */
  exchangeRate?: number;
  /** Rate date */
  rateDate?: string;
  /** Additional CSS classes */
  className?: string;
  /** Show plus sign for positive values */
  showSign?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg";
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function isDisplayValue(value: unknown): value is DisplayValue {
  return (
    typeof value === "object" &&
    value !== null &&
    "amount" in value &&
    "currency" in value &&
    "wasConverted" in value
  );
}

function toConvertedMoney(value: DisplayValue): ConvertedMoney {
  return {
    amount: value.amount,
    currency: value.currency,
    originalAmount: value.originalAmount ?? value.amount,
    originalCurrency: value.originalCurrency ?? value.currency,
    exchangeRate: value.exchangeRate ?? 1,
    rateDate: value.rateDate ?? new Date().toISOString().split("T")[0],
    rateSource: "frankfurter",
    wasConverted: value.wasConverted,
  };
}

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * Displays a monetary value with conversion disclosure.
 * When a conversion was applied, shows a tooltip with full details.
 * 
 * @example
 * // No conversion
 * <ConvertedValue value={{ amount: 4078, currency: "INR", wasConverted: false }} />
 * // Renders: ₹4,078.00
 * 
 * @example
 * // With conversion
 * <ConvertedValue value={{
 *   amount: 4078,
 *   currency: "INR",
 *   originalAmount: 49,
 *   originalCurrency: "USD",
 *   exchangeRate: 83.22,
 *   rateDate: "2026-01-17",
 *   wasConverted: true
 * }} />
 * // Renders: ₹4,078.00 with conversion tooltip
 */
export function ConvertedValue({
  value,
  className,
  showSign = false,
  format = "tooltip-only",
  size = "md",
}: ConvertedValueProps) {
  // Normalize to ConvertedMoney
  const converted: ConvertedMoney = isDisplayValue(value)
    ? toConvertedMoney(value)
    : value;

  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  // Format the main amount
  const formattedAmount = formatMoney(
    { amount: converted.amount, currency: converted.currency },
    { showPlusSign: showSign }
  );

  // If no conversion, just render the amount
  if (!converted.wasConverted) {
    return (
      <span className={cn(sizeClasses[size], className)}>
        {formattedAmount}
      </span>
    );
  }

  // Get disclosure text
  const disclosure = getConversionDisclosure(converted);
  const originalFormatted = formatMoney(
    { amount: converted.originalAmount, currency: converted.originalCurrency },
    { showPlusSign: showSign }
  );

  // Render based on format
  if (format === "full") {
    return (
      <span className={cn(sizeClasses[size], className)}>
        {formattedAmount}
        <span className="text-muted-foreground ml-1">
          (from {originalFormatted} @ {converted.exchangeRate.toFixed(2)})
        </span>
      </span>
    );
  }

  if (format === "compact") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn(sizeClasses[size], "cursor-help", className)}>
              {formattedAmount}
              <span className="text-muted-foreground ml-0.5">*</span>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="text-xs">{disclosure}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Default: tooltip-only
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn(
            sizeClasses[size], 
            "cursor-help inline-flex items-center gap-1",
            className
          )}>
            {formattedAmount}
            <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">
              {originalFormatted} → {formattedAmount}
            </p>
            <p className="text-xs text-muted-foreground">
              Rate: {converted.exchangeRate.toFixed(4)} {converted.originalCurrency}→{converted.currency}
            </p>
            <p className="text-xs text-muted-foreground">
              ECB reference rate • {converted.rateDate}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Simpler component that accepts individual props instead of a value object.
 * Automatically determines if conversion was applied.
 */
export function CurrencyValue({
  amount,
  currency,
  originalAmount,
  originalCurrency,
  exchangeRate,
  rateDate,
  className,
  showSign = false,
  size = "md",
}: CurrencyValueProps) {
  const wasConverted = Boolean(
    originalCurrency && 
    originalCurrency !== currency
  );

  const value: DisplayValue = {
    amount,
    currency,
    originalAmount: originalAmount ?? amount,
    originalCurrency: originalCurrency ?? currency,
    exchangeRate: exchangeRate ?? 1,
    rateDate: rateDate ?? new Date().toISOString().split("T")[0],
    wasConverted,
  };

  return (
    <ConvertedValue
      value={value}
      className={className}
      showSign={showSign}
      size={size}
    />
  );
}

/**
 * Displays a gain/loss value with appropriate coloring and conversion disclosure
 */
export function GainLossValue({
  value,
  className,
  size = "md",
}: {
  value: DisplayValue | ConvertedMoney;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const amount = "amount" in value ? value.amount : 0;
  const isPositive = amount > 0;
  const isNegative = amount < 0;

  return (
    <ConvertedValue
      value={value}
      showSign={true}
      size={size}
      className={cn(
        isPositive && "text-green-500",
        isNegative && "text-red-500",
        className
      )}
    />
  );
}

/**
 * Simple badge showing conversion was applied
 */
export function ConversionBadge({ 
  fromCurrency, 
  toCurrency,
  rate,
  className,
}: { 
  fromCurrency: string;
  toCurrency: string;
  rate?: number;
  className?: string;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn(
            "inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded",
            className
          )}>
            <ArrowRightLeft className="h-3 w-3" />
            {fromCurrency}→{toCurrency}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            Converted from {fromCurrency} to {toCurrency}
            {rate && ` @ ${rate.toFixed(4)}`}
          </p>
          <p className="text-xs text-muted-foreground">Using ECB reference rate</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Shows a disclosure message when conversions are present
 */
export function ConversionDisclosure({
  conversions,
  className,
}: {
  conversions: Array<{
    symbol: string;
    fromCurrency: string;
    rate: number;
    rateDate: string;
  }>;
  className?: string;
}) {
  if (conversions.length === 0) return null;

  // Group by currency pair
  const uniquePairs = [...new Set(conversions.map(c => c.fromCurrency))];

  return (
    <div className={cn("text-xs text-muted-foreground", className)}>
      <p className="flex items-center gap-1">
        <ArrowRightLeft className="h-3 w-3" />
        <span>
          Values include {conversions.length} conversion{conversions.length > 1 ? "s" : ""} 
          {" "}from {uniquePairs.join(", ")} using ECB reference rates
        </span>
      </p>
    </div>
  );
}
