/**
 * Currency formatting utilities
 * Maps currency codes to symbols and provides formatting functions
 */

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
    MXN: "$",
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
    CLP: "$",
    COP: "$",
    PEN: "S/",
    ARS: "$",
};

/**
 * Get currency symbol for a currency code
 */
export function getCurrencySymbol(currencyCode: string): string {
    return CURRENCY_SYMBOLS[currencyCode.toUpperCase()] || currencyCode;
}

/**
 * Format a number as currency with the proper symbol
 */
export function formatCurrency(
    amount: number,
    currencyCode: string = "USD",
    locale: string = "en-US",
): string {
    const symbol = getCurrencySymbol(currencyCode);
    const formattedNumber = new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Math.abs(amount));

    // For currencies that typically put the symbol after (not common, but can be configured)
    // For now, always put symbol before
    const sign = amount < 0 ? "-" : "";
    return `${sign}${symbol}${formattedNumber}`;
}

/**
 * Create a currency formatter that can be reused
 */
export function createCurrencyFormatter(
    currencyCode: string = "USD",
    locale: string = "en-US",
) {
    return (amount: number) => formatCurrency(amount, currencyCode, locale);
}

/**
 * Format currency using Intl.NumberFormat (for more accurate locale-based formatting)
 */
export function formatCurrencyIntl(
    amount: number,
    currencyCode: string = "USD",
    locale: string = "en-US",
): string {
    try {
        return new Intl.NumberFormat(locale, {
            style: "currency",
            currency: currencyCode,
            maximumFractionDigits: 2,
        }).format(amount);
    } catch {
        // Fallback if currency code is not valid
        return formatCurrency(amount, currencyCode, locale);
    }
}
