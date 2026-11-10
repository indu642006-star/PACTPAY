import { GoogleGenAI } from '@google/genai';

// Initialize Gemini SDK with process.env.GEMINI_API_KEY
const ai = new GoogleGenAI();

export interface ParsedPurchaseIntent {
  product: string;
  budget: number;
  estimatedAmount: number;
  currency: string;
  merchant: string;
  category: string;
  intentSummary: string;
  urgency: 'low' | 'normal' | 'urgent';
  riskSignals: {
    level: 'low' | 'medium' | 'high';
    reasons: string[];
    isUnusualOrRestricted: boolean;
  };
}

export async function parsePurchaseIntent(prompt: string, fallbackCurrency: string = 'INR'): Promise<ParsedPurchaseIntent> {
  const cleanPrompt = prompt?.trim();
  if (!cleanPrompt) {
    throw new Error('Prompt cannot be empty');
  }

  const systemInstruction = `You are PACTPAY's AI Purchase Assistant.
Your task is to analyze natural language purchase requests from users or autonomous AI agents and extract structured transaction details.
You must:
1. Identify the exact product or service desired.
2. Extract the user's maximum budget ceiling, or infer a realistic one if not explicitly specified.
3. Determine a realistic current market estimated price for the item.
4. Detect the currency explicitly mentioned (e.g., "₹", "Rs", "INR" -> "INR", "$", "USD" -> "USD", "€" -> "EUR", "£" -> "GBP"). If no currency symbol is provided, default to "${fallbackCurrency}".
5. Identify or infer the merchant / vendor (e.g., Amazon, Flipkart, Best Buy, Apple, Expedia, etc.). If unspecified, choose the most sensible reputable marketplace.
6. Categorize the purchase (e.g., "Electronics", "Office Supplies", "Software & Cloud", "Travel", "Books", "Gaming & Entertainment").
7. Evaluate risk signals: Detect if the request mentions suspicious keywords, gambling, adult content, cryptocurrency tokens, untrusted gift cards, illicit items, or unusually high velocity.

Return ONLY a valid JSON object matching the requested schema.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Extract purchase intent for request: "${cleanPrompt}"`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const rawText = response.text?.trim() || '{}';
    const parsed = JSON.parse(rawText);

    // Validate and normalize fields
    const currency = (parsed.currency || fallbackCurrency || 'INR').toUpperCase();
    const budget = Number(parsed.budget) || Number(parsed.estimatedAmount) || 1000;
    const estimatedAmount = Number(parsed.estimatedAmount) || Number(parsed.budget) || budget;

    return {
      product: String(parsed.product || cleanPrompt).substring(0, 255),
      budget: Math.max(0, budget),
      estimatedAmount: Math.max(0.01, estimatedAmount),
      currency: ['INR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD'].includes(currency) ? currency : 'INR',
      merchant: String(parsed.merchant || 'Amazon').substring(0, 255),
      category: String(parsed.category || 'General Goods').substring(0, 100),
      intentSummary: String(parsed.intentSummary || `Purchase of ${parsed.product || 'item'} for up to ${currency} ${budget}`),
      urgency: ['low', 'normal', 'urgent'].includes(parsed.urgency) ? parsed.urgency : 'normal',
      riskSignals: {
        level: ['low', 'medium', 'high'].includes(parsed.riskSignals?.level) ? parsed.riskSignals.level : 'low',
        reasons: Array.isArray(parsed.riskSignals?.reasons) ? parsed.riskSignals.reasons : [],
        isUnusualOrRestricted: Boolean(parsed.riskSignals?.isUnusualOrRestricted),
      },
    };
  } catch (err) {
    console.warn('[PACTPAY Gemini] Fallback heuristic parsing due to API or key issue:', err);
    // Intelligent heuristic fallback
    return heuristicParse(cleanPrompt, fallbackCurrency);
  }
}

function heuristicParse(prompt: string, fallbackCurrency: string): ParsedPurchaseIntent {
  let currency = fallbackCurrency || 'INR';
  if (prompt.includes('₹') || prompt.toLowerCase().includes('rs') || prompt.toLowerCase().includes('inr')) {
    currency = 'INR';
  } else if (prompt.includes('$') || prompt.toLowerCase().includes('usd')) {
    currency = 'USD';
  } else if (prompt.includes('€') || prompt.toLowerCase().includes('eur')) {
    currency = 'EUR';
  } else if (prompt.includes('£') || prompt.toLowerCase().includes('gbp')) {
    currency = 'GBP';
  }

  // Extract number after "under", "below", "for", "max", or currency symbols
  const amountMatch = prompt.match(/(?:under|below|for|max|up to|₹|\$|€|£)?\s*(\d+[\d,]*(?:\.\d+)?)/i);
  let parsedNum = 1500;
  if (amountMatch && amountMatch[1]) {
    parsedNum = parseFloat(amountMatch[1].replace(/,/g, ''));
  }

  // Extract merchant
  let merchant = 'Amazon';
  if (/flipkart/i.test(prompt)) merchant = 'Flipkart';
  else if (/croma/i.test(prompt)) merchant = 'Croma';
  else if (/best\s*buy/i.test(prompt)) merchant = 'Best Buy';
  else if (/apple/i.test(prompt)) merchant = 'Apple Store';
  else if (/staples/i.test(prompt)) merchant = 'Staples';
  else if (/expedia/i.test(prompt)) merchant = 'Expedia';

  // Check risk keywords
  const isHighRisk = /(crypto|bitcoin|casino|betting|lottery|weapons|hack|gift\s*card)/i.test(prompt);

  return {
    product: prompt.replace(/under\s*.*$/i, '').replace(/buy\s+/i, '').replace(/order\s+/i, '').trim() || 'Requested Product',
    budget: parsedNum,
    estimatedAmount: Math.round(parsedNum * 0.92 * 100) / 100,
    currency,
    merchant,
    category: 'General Supplies',
    intentSummary: `AI agent purchase request parsed: ${prompt}`,
    urgency: 'normal',
    riskSignals: {
      level: isHighRisk ? 'high' : 'low',
      reasons: isHighRisk ? ['Restricted keywords or high risk merchant detected'] : ['Standard consumer goods request'],
      isUnusualOrRestricted: isHighRisk,
    },
  };
}
