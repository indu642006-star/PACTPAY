/**
 * PACTPAY Currency Conversion Layer
 * 
 * PayPal REST Orders API v2 does not support INR (Indian Rupee) directly.
 * All internal workflows (AI parsing, Guardian firewall rules, budgets, 
 * dashboard metrics, and human sign-offs) operate strictly in INR.
 * 
 * This module converts approved INR amounts into USD before transmission
 * to PayPal Sandbox, ensuring real-time rates with reliable multi-provider
 * fallback and transparent dual-currency recordkeeping.
 */

export interface ExchangeRateResult {
  rate: number;          // 1 INR in USD (e.g. ~0.01064)
  inverseRate: number;   // 1 USD in INR (e.g. ~93.95)
  source: string;
  timestamp: string;
  isFallback: boolean;
  baseCurrency: string;
  targetCurrency: string;
  notice?: string;
}

export interface ConvertedAmountResult {
  originalAmount: number;
  originalCurrency: string;
  convertedAmount: number;
  convertedCurrency: string;
  exchangeRate: number;
  inverseRate: number;
  rateSource: string;
  rateTimestamp: string;
  isFallbackRate: boolean;
  formattedText: string;
}

// In-memory cache with 15-minute TTL to balance accuracy and API rate limits
interface CachedRate {
  result: ExchangeRateResult;
  expiresAt: number;
}

let cachedInrToUsd: CachedRate | null = null;

// Verified fallback reference rate in case external network providers are unreachable
// Based on current foreign exchange rates: ~93.90 INR per USD (0.01065 USD per INR)
const FALLBACK_INR_TO_USD_RATE = 0.01065;

/**
 * Fetch live INR -> USD exchange rate with multi-source fallback.
 * Provider 1: open.er-api.com (Free, high-availability Open Exchange Rates)
 * Provider 2: api.frankfurter.dev (European Central Bank reference data)
 * Fallback: Verified reference rate with explicit flag
 */
export async function getInrToUsdExchangeRate(forceRefresh: boolean = false): Promise<ExchangeRateResult> {
  const now = Date.now();

  // Return cached rate if fresh
  if (!forceRefresh && cachedInrToUsd && now < cachedInrToUsd.expiresAt) {
    return cachedInrToUsd.result;
  }

  // Provider 1: open.er-api.com
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch('https://open.er-api.com/v6/latest/INR', {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const rate = Number(data.rates?.USD);
      if (rate && rate > 0) {
        const result: ExchangeRateResult = {
          rate,
          inverseRate: Number((1 / rate).toFixed(2)),
          source: 'open.er-api.com (Live Forex Market)',
          timestamp: data.time_last_update_utc || new Date().toISOString(),
          isFallback: false,
          baseCurrency: 'INR',
          targetCurrency: 'USD',
        };
        cachedInrToUsd = { result, expiresAt: now + 15 * 60 * 1000 };
        return result;
      }
    }
  } catch (err: any) {
    console.warn('[PACTPAY Currency] Provider 1 (open.er-api.com) failed:', err.message);
  }

  // Provider 2: api.frankfurter.dev (ECB reference rates)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch('https://api.frankfurter.dev/v1/latest?base=INR&symbols=USD', {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const rate = Number(data.rates?.USD);
      if (rate && rate > 0) {
        const result: ExchangeRateResult = {
          rate,
          inverseRate: Number((1 / rate).toFixed(2)),
          source: 'api.frankfurter.dev (European Central Bank Reference)',
          timestamp: data.date ? `${data.date}T00:00:00Z` : new Date().toISOString(),
          isFallback: false,
          baseCurrency: 'INR',
          targetCurrency: 'USD',
        };
        cachedInrToUsd = { result, expiresAt: now + 15 * 60 * 1000 };
        return result;
      }
    }
  } catch (err: any) {
    console.warn('[PACTPAY Currency] Provider 2 (frankfurter.dev) failed:', err.message);
  }

  // Provider 3: Safe fallback reference rate with clear disclaimer
  const fallbackResult: ExchangeRateResult = {
    rate: FALLBACK_INR_TO_USD_RATE,
    inverseRate: Number((1 / FALLBACK_INR_TO_USD_RATE).toFixed(2)),
    source: 'Verified Reference Rate (Live API network fallback)',
    timestamp: new Date().toISOString(),
    isFallback: true,
    baseCurrency: 'INR',
    targetCurrency: 'USD',
    notice: 'Live exchange rate API was temporarily unreachable; utilized verified baseline reference rate.',
  };

  // Cache fallback for only 2 minutes so recovery is re-tested quickly
  cachedInrToUsd = { result: fallbackResult, expiresAt: now + 2 * 60 * 1000 };
  return fallbackResult;
}

/**
 * Converts an INR amount to USD for PayPal Orders API compliance.
 * If the input currency is already USD, returns original with 1:1 rate.
 */
export async function convertToPayPalUsd(
  amount: number,
  currency: string = 'INR'
): Promise<ConvertedAmountResult> {
  const normCurrency = (currency || 'INR').toUpperCase();

  // If already USD, pass-through
  if (normCurrency === 'USD') {
    return {
      originalAmount: amount,
      originalCurrency: 'USD',
      convertedAmount: Number(amount.toFixed(2)),
      convertedCurrency: 'USD',
      exchangeRate: 1,
      inverseRate: 1,
      rateSource: 'Direct USD (No conversion required)',
      rateTimestamp: new Date().toISOString(),
      isFallbackRate: false,
      formattedText: `$${amount.toFixed(2)} USD`,
    };
  }

  // Get live INR -> USD exchange rate
  const rateInfo = await getInrToUsdExchangeRate();
  const rawUsd = amount * rateInfo.rate;
  // Round to 2 decimal places, ensuring a minimum of $0.01 for any positive amount
  const convertedAmount = Math.max(0.01, Number(rawUsd.toFixed(2)));

  const formattedText = `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} INR ≈ $${convertedAmount.toFixed(2)} USD (Rate: 1 USD = ₹${rateInfo.inverseRate.toFixed(2)} INR via ${rateInfo.source})`;

  return {
    originalAmount: amount,
    originalCurrency: 'INR',
    convertedAmount,
    convertedCurrency: 'USD',
    exchangeRate: rateInfo.rate,
    inverseRate: rateInfo.inverseRate,
    rateSource: rateInfo.source,
    rateTimestamp: rateInfo.timestamp,
    isFallbackRate: rateInfo.isFallback,
    formattedText,
  };
}
