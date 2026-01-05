declare module 'currency-converter-lt' {
  interface CurrencyConverterOptions {
    from?: string;
    to?: string;
    amount?: number;
    isDecimalComma?: boolean;
  }

  export default class CurrencyConverter {
    constructor(options?: CurrencyConverterOptions);
    from(currency: string): this;
    to(currency: string): this;
    amount(amount: number): this;
    convert(amount?: number): Promise<number>;
    rates(): Promise<any>;
  }
}
