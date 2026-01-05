import CurrencyConverter from 'currency-converter-lt';

/**
 * Get exchange rate between two currencies using currency-converter-lt
 */
export async function getExchangeRate(from: string, to: string): Promise<number> {
  if (from === to) return 1;
  
  try {
    const currencyConverter = new CurrencyConverter({ from, to, amount: 1 });
    console.log(`Fetching exchange rate from ${from} to ${to}`);
    const rate = await currencyConverter.convert();
    return rate || 1;
  } catch (error) {
    console.error(`Failed to fetch exchange rate for ${from} to ${to}:`, error);
    // Fallback rates for common pairs if the service fails
    if (from === "USD" && to === "INR") return 83.0;
    if (from === "INR" && to === "USD") return 0.012;
    return 1;
  }
}
