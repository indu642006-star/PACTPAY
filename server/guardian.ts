export interface RuleCheck {
  id: string;
  name: string;
  category: 'LIMIT' | 'MERCHANT' | 'DUPLICATE' | 'EXPIRY' | 'AMOUNT' | 'RISK';
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: string;
}

export interface GuardianEvaluationResponse {
  passed: boolean;
  status: 'APPROVED_BY_GUARDIAN' | 'BLOCKED_BY_GUARDIAN';
  riskScore: number; // 0 - 100
  checks: RuleCheck[];
  evaluatedAt: string;
  summary: string;
}

export interface GuardianInput {
  request: {
    id: string;
    product: string;
    budget: number;
    estimatedAmount: number;
    currency: string;
    merchant: string;
    category?: string;
    createdAt: string;
    riskSignals?: {
      level: 'low' | 'medium' | 'high';
      reasons: string[];
      isUnusualOrRestricted: boolean;
    };
  };
  policy: {
    maxPerTransaction: number;
    dailyLimit: number;
    monthlyLimit: number;
    currency: string;
    restrictedMerchants: string[];
    allowedCategories: string[];
    blockDuplicateWindowMinutes: number;
    autoRejectHighRisk: boolean;
  };
  history?: {
    todaySpent: number;
    monthSpent: number;
    recentTransactions: Array<{
      id: string;
      product: string;
      merchant: string;
      amount: number;
      currency: string;
      timestamp: string;
      status: string;
    }>;
  };
}

export function evaluatePaymentGuardian(input: GuardianInput): GuardianEvaluationResponse {
  const { request, policy, history } = input;
  const checks: RuleCheck[] = [];
  let riskScore = 10; // Baseline low risk

  // 1. Check Amount Validity
  const amount = Number(request.estimatedAmount);
  const budget = Number(request.budget);

  if (isNaN(amount) || amount <= 0) {
    checks.push({
      id: 'AMOUNT_INVALID',
      name: 'Amount Validity Check',
      category: 'AMOUNT',
      status: 'FAIL',
      message: `Invalid transaction amount: ${request.estimatedAmount}. Must be greater than 0.`,
    });
    riskScore += 50;
  } else if (budget > 0 && amount > budget) {
    checks.push({
      id: 'AMOUNT_OVER_BUDGET',
      name: 'Budget Ceiling Check',
      category: 'AMOUNT',
      status: 'FAIL',
      message: `Estimated cost (${request.currency} ${amount}) exceeds approved budget (${request.currency} ${budget}).`,
    });
    riskScore += 40;
  } else {
    checks.push({
      id: 'AMOUNT_VALID',
      name: 'Amount Validity & Budget Check',
      category: 'AMOUNT',
      status: 'PASS',
      message: `Amount ${request.currency} ${amount.toFixed(2)} is valid and within budget of ${request.currency} ${budget.toFixed(2)}.`,
    });
  }

  // 2. Spending Limits Check: Per-Transaction
  const maxTx = policy.maxPerTransaction || 15000;
  if (amount > maxTx) {
    checks.push({
      id: 'LIMIT_TX_EXCEEDED',
      name: 'Per-Transaction Limit Check',
      category: 'LIMIT',
      status: 'FAIL',
      message: `Amount ${request.currency} ${amount.toFixed(2)} exceeds maximum per-transaction policy limit of ${policy.currency || request.currency} ${maxTx.toFixed(2)}.`,
    });
    riskScore += 45;
  } else if (amount > maxTx * 0.8) {
    checks.push({
      id: 'LIMIT_TX_HIGH',
      name: 'Per-Transaction Limit Check',
      category: 'LIMIT',
      status: 'WARN',
      message: `Amount is close to limit (${(amount / maxTx * 100).toFixed(0)}% of max ${policy.currency || request.currency} ${maxTx.toFixed(2)}).`,
    });
    riskScore += 15;
  } else {
    checks.push({
      id: 'LIMIT_TX_PASS',
      name: 'Per-Transaction Limit Check',
      category: 'LIMIT',
      status: 'PASS',
      message: `Within per-transaction limit (Limit: ${policy.currency || request.currency} ${maxTx.toFixed(2)}).`,
    });
  }

  // Spending Limits: Daily Cumulative
  const todaySpent = Number(history?.todaySpent || 0);
  const dailyLimit = policy.dailyLimit || 50000;
  const projectedDaily = todaySpent + amount;

  if (projectedDaily > dailyLimit) {
    checks.push({
      id: 'LIMIT_DAILY_EXCEEDED',
      name: 'Daily Spending Ceiling Check',
      category: 'LIMIT',
      status: 'FAIL',
      message: `Daily spending would reach ${request.currency} ${projectedDaily.toFixed(2)}, exceeding daily limit of ${policy.currency || request.currency} ${dailyLimit.toFixed(2)} (Spent today: ${request.currency} ${todaySpent.toFixed(2)}).`,
    });
    riskScore += 40;
  } else {
    checks.push({
      id: 'LIMIT_DAILY_PASS',
      name: 'Daily Spending Ceiling Check',
      category: 'LIMIT',
      status: 'PASS',
      message: `Daily quota safe: ${request.currency} ${projectedDaily.toFixed(2)} / ${policy.currency || request.currency} ${dailyLimit.toFixed(2)}.`,
    });
  }

  // 3. Merchant Restrictions Check
  const restrictedMerchants = (policy.restrictedMerchants || []).map(m => m.trim().toLowerCase()).filter(Boolean);
  const merchantName = (request.merchant || '').toLowerCase();
  const matchedRestricted = restrictedMerchants.find(rm => 
    merchantName.includes(rm) || rm.includes(merchantName)
  );

  const globalHighRiskWords = ['casino', 'betting', 'poker', 'darknet', 'ransomware', 'crypto-drain', 'shady-store'];
  const matchedRiskWord = globalHighRiskWords.find(w => merchantName.includes(w) || request.product.toLowerCase().includes(w));

  if (matchedRestricted) {
    checks.push({
      id: 'MERCHANT_RESTRICTED',
      name: 'Merchant Restriction Firewall',
      category: 'MERCHANT',
      status: 'FAIL',
      message: `Merchant "${request.merchant}" is on the restricted merchant blacklist (${matchedRestricted}).`,
    });
    riskScore += 60;
  } else if (matchedRiskWord) {
    checks.push({
      id: 'MERCHANT_HIGH_RISK_KEYWORD',
      name: 'Merchant Restriction Firewall',
      category: 'MERCHANT',
      status: 'FAIL',
      message: `Detected prohibited keyword "${matchedRiskWord}" in merchant or product name.`,
    });
    riskScore += 50;
  } else {
    checks.push({
      id: 'MERCHANT_PASS',
      name: 'Merchant Restriction Firewall',
      category: 'MERCHANT',
      status: 'PASS',
      message: `Merchant "${request.merchant}" is verified and permitted under firewall policy.`,
    });
  }

  // 4. Duplicate Transaction Detection
  const windowMinutes = policy.blockDuplicateWindowMinutes || 15;
  const recentTxs = history?.recentTransactions || [];
  const now = Date.now();
  const windowMs = windowMinutes * 60 * 1000;

  const duplicateTx = recentTxs.find(tx => {
    if (tx.status === 'BLOCKED') return false;
    const txTime = new Date(tx.timestamp).getTime();
    const isWithinWindow = (now - txTime) < windowMs;
    const isSameMerchant = tx.merchant.toLowerCase() === request.merchant.toLowerCase();
    const isSameProduct = tx.product.toLowerCase() === request.product.toLowerCase() ||
      tx.product.toLowerCase().includes(request.product.toLowerCase()) ||
      request.product.toLowerCase().includes(tx.product.toLowerCase());
    const isCloseAmount = Math.abs(tx.amount - amount) < 0.05 * amount;

    return isWithinWindow && (isSameProduct || (isSameMerchant && isCloseAmount));
  });

  if (duplicateTx) {
    checks.push({
      id: 'DUPLICATE_DETECTED',
      name: 'Duplicate Transaction Guard',
      category: 'DUPLICATE',
      status: 'FAIL',
      message: `Suspected duplicate transaction detected! Similar order placed for ${duplicateTx.product} (${request.currency} ${duplicateTx.amount}) within the last ${windowMinutes} minutes.`,
      details: `Matched Transaction ID: ${duplicateTx.id}`,
    });
    riskScore += 40;
  } else {
    checks.push({
      id: 'DUPLICATE_PASS',
      name: 'Duplicate Transaction Guard',
      category: 'DUPLICATE',
      status: 'PASS',
      message: `No duplicate orders detected within ${windowMinutes}-minute rolling window.`,
    });
  }

  // 5. Expired Request Check
  if (request.createdAt) {
    const createdTime = new Date(request.createdAt).getTime();
    const ageMinutes = (now - createdTime) / (60 * 1000);
    if (ageMinutes > 60) {
      checks.push({
        id: 'REQUEST_EXPIRED',
        name: 'Request TTL / Expiry Guard',
        category: 'EXPIRY',
        status: 'FAIL',
        message: `Request has expired (${Math.round(ageMinutes)} mins old). Purchase requests expire after 60 minutes for security freshness.`,
      });
      riskScore += 30;
    } else if (ageMinutes > 30) {
      checks.push({
        id: 'REQUEST_STALE',
        name: 'Request TTL / Expiry Guard',
        category: 'EXPIRY',
        status: 'WARN',
        message: `Request is aging (${Math.round(ageMinutes)} mins old). Prompt authorization recommended.`,
      });
    } else {
      checks.push({
        id: 'EXPIRY_PASS',
        name: 'Request TTL / Expiry Guard',
        category: 'EXPIRY',
        status: 'PASS',
        message: `Request is fresh and active (Created ${Math.max(1, Math.round(ageMinutes))} min(s) ago).`,
      });
    }
  } else {
    checks.push({
      id: 'EXPIRY_PASS',
      name: 'Request TTL / Expiry Guard',
      category: 'EXPIRY',
      status: 'PASS',
      message: 'New request timestamp verified.',
    });
  }

  // 6. AI Risk Signals Assessment
  if (request.riskSignals?.level === 'high') {
    if (policy.autoRejectHighRisk) {
      checks.push({
        id: 'AI_RISK_AUTO_REJECT',
        name: 'Agentic Risk Evaluator',
        category: 'RISK',
        status: 'FAIL',
        message: `AI identified high-risk indicators: ${request.riskSignals.reasons.join(', ')}. Auto-reject policy is enabled.`,
      });
    } else {
      checks.push({
        id: 'AI_RISK_WARNING',
        name: 'Agentic Risk Evaluator',
        category: 'RISK',
        status: 'WARN',
        message: `AI identified elevated risk indicators: ${request.riskSignals.reasons.join(', ')}. Requires elevated scrutiny.`,
      });
    }
    riskScore += 35;
  }

  // Determine overall status
  const hasFailures = checks.some(c => c.status === 'FAIL');
  const finalRiskScore = Math.min(100, Math.max(0, riskScore));
  const passed = !hasFailures;

  return {
    passed,
    status: passed ? 'APPROVED_BY_GUARDIAN' : 'BLOCKED_BY_GUARDIAN',
    riskScore: finalRiskScore,
    checks,
    evaluatedAt: new Date().toISOString(),
    summary: passed 
      ? 'Payment Guardian passed all deterministic rules. Ready for human authorization.'
      : `Payment Guardian blocked the transaction due to ${checks.filter(c => c.status === 'FAIL').map(c => c.name).join(', ')}.`,
  };
}
