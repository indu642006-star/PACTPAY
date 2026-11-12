import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { 
  PurchaseRequest, 
  GuardianPolicy, 
  TransactionRecord, 
  AuditLogEntry, 
  GuardianEvaluation 
} from '../types';
import { useAuth } from './AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc 
} from 'firebase/firestore';
import confetti from 'canvas-confetti';

export interface PayPalConfigStatus {
  configured: boolean;
  missingCredentials: string[];
  environment: 'sandbox';
  baseUrl: string;
}

export interface ActiveCheckoutSession {
  requestId: string;
  orderId: string;
  approveUrl: string;
  status: 'order_created' | 'awaiting_approval' | 'approved' | 'capturing' | 'completed' | 'failed';
  amountInr: number;
  amountUsd: number;
  merchant: string;
  product: string;
  captureId?: string;
  payerEmail?: string;
  error?: string;
}

interface PactPayContextType {
  requests: PurchaseRequest[];
  transactions: TransactionRecord[];
  auditLogs: AuditLogEntry[];
  policy: GuardianPolicy;
  isProcessing: boolean;
  isLoadingFirestore: boolean;
  firestoreError: string | null;
  activeRequestId: string | null;
  paypalStatus: PayPalConfigStatus | null;
  activeCheckout: ActiveCheckoutSession | null;
  clearActiveCheckout: () => void;
  isDemoMode: boolean;
  toggleDemoMode: () => void;
  refreshPayPalStatus: () => Promise<PayPalConfigStatus>;
  createPurchaseRequest: (prompt: string, fallbackCurrency?: string) => Promise<PurchaseRequest>;
  evaluateGuardian: (requestId: string) => Promise<GuardianEvaluation>;
  authorizeRequest: (requestId: string, note?: string) => Promise<void>;
  rejectRequest: (requestId: string, reason?: string) => Promise<void>;
  initiatePayPalCheckout: (requestId: string) => Promise<{ orderId: string; approveUrl: string }>;
  finalizePayPalPayment: (requestId: string, orderId: string) => Promise<TransactionRecord>;
  cancelPayPalCheckout: (requestId: string, orderId?: string) => Promise<void>;
  checkPayPalOrderStatus: (orderId: string) => Promise<any>;
  executePayPalPayment: (requestId: string) => Promise<TransactionRecord>;
  updatePolicy: (updated: Partial<GuardianPolicy>) => Promise<void>;
  resetToSampleData: () => Promise<void>;
}

const defaultPolicy: GuardianPolicy = {
  id: 'default',
  userId: 'pactpay-officer-001',
  maxPerTransaction: 15000, // ₹15,000 or $200
  dailyLimit: 50000,
  monthlyLimit: 200000,
  currency: 'INR',
  restrictedMerchants: ['Casino', 'BetOnline', 'DarknetMarket', 'CryptoDrain', 'ShadyDropship'],
  allowedCategories: ['Electronics', 'Office Supplies', 'Hardware', 'Software & Cloud', 'Travel', 'General Goods'],
  blockDuplicateWindowMinutes: 15,
  autoRejectHighRisk: true,
  requireHumanNoteAbove: 5000,
  updatedAt: new Date().toISOString(),
};

// Initial realistic starter data clearly marked as Sample Data
const initialSampleRequests: PurchaseRequest[] = [
  {
    id: 'REQ-101',
    userId: 'pactpay-officer-001',
    userEmail: 'indu642006@gmail.com',
    naturalPrompt: 'Buy a Logitech MX Master 3S wireless mouse under ₹9,000 on Amazon for engineering workstation',
    product: 'Logitech MX Master 3S Wireless Mouse',
    budget: 9000,
    estimatedAmount: 7995,
    currency: 'INR',
    merchant: 'Amazon',
    intentSummary: 'Precision ergonomic wireless mouse for engineering tasks',
    category: 'Electronics',
    urgency: 'normal',
    status: 'guardian_approved',
    isSampleData: true,
    createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
    guardianEvaluation: {
      passed: true,
      status: 'APPROVED_BY_GUARDIAN',
      riskScore: 12,
      evaluatedAt: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
      summary: 'All deterministic firewall rules passed. Safe for human sign-off.',
      checks: [
        { id: 'CHK-1', name: 'Amount & Budget Check', category: 'AMOUNT', status: 'PASS', message: 'Amount ₹7,995 is within stated budget of ₹9,000' },
        { id: 'CHK-2', name: 'Per-Transaction Limit', category: 'LIMIT', status: 'PASS', message: 'Below policy limit ₹15,000' },
        { id: 'CHK-3', name: 'Daily Cumulative Limit', category: 'LIMIT', status: 'PASS', message: 'Daily quota safe (₹7,995 / ₹50,000)' },
        { id: 'CHK-4', name: 'Merchant Whitelist', category: 'MERCHANT', status: 'PASS', message: 'Merchant "Amazon" is verified and permitted' },
        { id: 'CHK-5', name: 'Duplicate Order Guard', category: 'DUPLICATE', status: 'PASS', message: 'No identical orders in the last 15 minutes' },
        { id: 'CHK-6', name: 'TTL Freshness Guard', category: 'EXPIRY', status: 'PASS', message: 'Request created 12 minutes ago (valid)' },
      ],
    },
  },
  {
    id: 'REQ-102',
    userId: 'pactpay-officer-001',
    userEmail: 'indu642006@gmail.com',
    naturalPrompt: 'Renew DigitalOcean Kubernetes cloud cluster credits for $65 under $100 budget',
    product: 'DigitalOcean Kubernetes Hosting Credits',
    budget: 100,
    estimatedAmount: 65,
    currency: 'USD',
    merchant: 'DigitalOcean',
    intentSummary: 'Cloud infrastructure hosting credits renewal for engineering sprint',
    category: 'Software & Cloud',
    urgency: 'normal',
    status: 'human_approved',
    isSampleData: true,
    createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    guardianEvaluation: {
      passed: true,
      status: 'APPROVED_BY_GUARDIAN',
      riskScore: 8,
      evaluatedAt: new Date(Date.now() - 24 * 60 * 1000).toISOString(),
      summary: 'Verified infrastructure vendor. Low risk profile. Stated price $65 within budget $100.',
      checks: [
        { id: 'CHK-D1', name: 'Amount & Budget Check', category: 'AMOUNT', status: 'PASS', message: 'Amount $65 within budget $100' },
        { id: 'CHK-D2', name: 'Per-Transaction Limit', category: 'LIMIT', status: 'PASS', message: 'Below USD policy threshold' },
        { id: 'CHK-D3', name: 'Merchant Whitelist', category: 'MERCHANT', status: 'PASS', message: 'Merchant "DigitalOcean" is whitelisted cloud provider' },
        { id: 'CHK-D4', name: 'Duplicate Order Guard', category: 'DUPLICATE', status: 'PASS', message: 'No duplicates detected' },
      ],
    },
    humanDecision: {
      approved: true,
      decidedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      authorizedBy: 'FinTech Officer (indu642006@gmail.com)',
      note: 'Verified sprint cluster renewal invoice. Authorized for PayPal Sandbox payment execution.',
      authMethod: 'MANUAL_SIGN_OFF',
    },
  },
  {
    id: 'REQ-103',
    userId: 'pactpay-officer-001',
    userEmail: 'indu642006@gmail.com',
    naturalPrompt: 'Purchase 25 VIP Casino betting vouchers on BetOnline for $500',
    product: 'VIP Casino Betting Vouchers (x25)',
    budget: 500,
    estimatedAmount: 500,
    currency: 'USD',
    merchant: 'BetOnline',
    intentSummary: 'Gambling vouchers request intercepted by agent scanner',
    category: 'Gaming & Entertainment',
    urgency: 'urgent',
    status: 'guardian_blocked',
    isSampleData: true,
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 44 * 60 * 1000).toISOString(),
    guardianEvaluation: {
      passed: false,
      status: 'BLOCKED_BY_GUARDIAN',
      riskScore: 95,
      evaluatedAt: new Date(Date.now() - 44 * 60 * 1000).toISOString(),
      summary: 'Payment Guardian blocked transaction: Prohibited merchant blacklist and restricted gambling classification.',
      checks: [
        { id: 'CHK-B1', name: 'Merchant Restriction Firewall', category: 'MERCHANT', status: 'FAIL', message: 'Merchant "BetOnline" is on the blocked merchant blacklist' },
        { id: 'CHK-B2', name: 'High-Risk Keyword Guard', category: 'RISK', status: 'FAIL', message: 'Prohibited keyword "Casino" detected in purchase parameters' },
        { id: 'CHK-B3', name: 'Per-Transaction Limit', category: 'LIMIT', status: 'PASS', message: 'Within USD limit equivalent' },
      ],
    },
  },
  {
    id: 'REQ-104',
    userId: 'pactpay-officer-001',
    userEmail: 'indu642006@gmail.com',
    naturalPrompt: 'Procure 4 Dell UltraSharp 32-inch 6K monitors for ₹280,000 on Dell.com',
    product: 'Dell UltraSharp 32-inch 6K Monitors (x4)',
    budget: 300000,
    estimatedAmount: 280000,
    currency: 'INR',
    merchant: 'Dell',
    intentSummary: 'High-end monitor hardware procurement exceeding policy bounds',
    category: 'Hardware',
    urgency: 'low',
    status: 'guardian_blocked',
    isSampleData: true,
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 59 * 60 * 1000).toISOString(),
    guardianEvaluation: {
      passed: false,
      status: 'BLOCKED_BY_GUARDIAN',
      riskScore: 88,
      evaluatedAt: new Date(Date.now() - 59 * 60 * 1000).toISOString(),
      summary: 'Payment Guardian BLOCKED: Amount ₹280,000 exceeds maximum per-transaction policy cap (₹15,000).',
      checks: [
        { id: 'CHK-H1', name: 'Per-Transaction Spending Limit', category: 'LIMIT', status: 'FAIL', message: 'Amount ₹280,000 exceeds single transaction policy cap of ₹15,000' },
        { id: 'CHK-H2', name: 'Daily Cumulative Limit', category: 'LIMIT', status: 'FAIL', message: 'Amount ₹280,000 exceeds daily spending limit of ₹50,000' },
        { id: 'CHK-H3', name: 'Merchant Whitelist', category: 'MERCHANT', status: 'PASS', message: 'Merchant "Dell" is verified vendor' },
      ],
    },
  },
];

const initialSampleTransactions: TransactionRecord[] = [
  {
    id: 'TXN-901',
    userId: 'pactpay-officer-001',
    requestId: 'REQ-102',
    orderId: 'PENDING_PAYPAL_SETUP',
    merchant: 'DigitalOcean',
    product: 'DigitalOcean Kubernetes Hosting Credits',
    amount: 5400,
    currency: 'INR',
    usdAmount: 57.47,
    usdCurrency: 'USD',
    exchangeRate: 0.010643,
    inverseRate: 93.95,
    rateSource: 'open.er-api.com (Live Forex Market)',
    status: 'PENDING',
    timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    guardianRiskScore: 8,
    approvedBy: 'FinTech Officer (indu642006@gmail.com)',
    auditHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    isSampleData: true,
  },
  {
    id: 'TXN-902',
    userId: 'pactpay-officer-001',
    requestId: 'REQ-103',
    orderId: 'N/A - BLOCKED_BY_FIREWALL',
    merchant: 'BetOnline',
    product: 'VIP Casino Betting Vouchers (x25)',
    amount: 42000,
    currency: 'INR',
    usdAmount: 447.00,
    usdCurrency: 'USD',
    exchangeRate: 0.010643,
    inverseRate: 93.95,
    rateSource: 'open.er-api.com (Live Forex Market)',
    status: 'BLOCKED',
    timestamp: new Date(Date.now() - 44 * 60 * 1000).toISOString(),
    guardianRiskScore: 95,
    auditHash: '9a5c88b024479e390c58a698a8a815a51c4a9a081ec941913f0ea277189fa943',
    isSampleData: true,
  },
  {
    id: 'TXN-903',
    userId: 'pactpay-officer-001',
    requestId: 'REQ-104',
    orderId: 'N/A - BLOCKED_BY_FIREWALL',
    merchant: 'Dell',
    product: 'Dell UltraSharp 32-inch 6K Monitors (x4)',
    amount: 280000,
    currency: 'INR',
    usdAmount: 2980.04,
    usdCurrency: 'USD',
    exchangeRate: 0.010643,
    inverseRate: 93.95,
    rateSource: 'open.er-api.com (Live Forex Market)',
    status: 'BLOCKED',
    timestamp: new Date(Date.now() - 59 * 60 * 1000).toISOString(),
    guardianRiskScore: 88,
    auditHash: 'f4c8996fb92427ae41e4649b934ca495991b7852b855e3b0c44298fc1c149afb',
    isSampleData: true,
  },
];

const initialSampleAuditLogs: AuditLogEntry[] = [
  {
    id: 'LOG-001',
    userId: 'pactpay-officer-001',
    requestId: 'REQ-101',
    eventType: 'AI_INTENT_PARSED',
    summary: 'Gemini 3.8 Flash parsed prompt: "Buy a Logitech MX Master 3S wireless mouse under ₹9,000"',
    actor: 'AI Purchase Assistant',
    details: { model: 'gemini-3.8-flash', product: 'Logitech MX Master 3S Wireless Mouse', amount: 7995, currency: 'INR' },
    timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    auditHash: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
    isSampleData: true,
  },
  {
    id: 'LOG-002',
    userId: 'pactpay-officer-001',
    requestId: 'REQ-101',
    eventType: 'GUARDIAN_CHECK_EVALUATED',
    summary: 'Payment Guardian deterministic checks completed: All 6 rules passed.',
    actor: 'Payment Guardian Firewall',
    details: { riskScore: 12, passed: true, limitCheck: 'PASS', merchantCheck: 'PASS' },
    timestamp: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
    auditHash: 'b2c3d4e5f60718293a4b5c6d7e8f90a1',
    isSampleData: true,
  },
  {
    id: 'LOG-003',
    userId: 'pactpay-officer-001',
    requestId: 'REQ-103',
    eventType: 'PAYMENT_FIREWALL_BLOCKED',
    summary: 'Payment Guardian BLOCKED request REQ-103: Merchant "BetOnline" is blacklisted.',
    actor: 'Payment Guardian Firewall',
    details: { riskScore: 95, merchant: 'BetOnline' },
    timestamp: new Date(Date.now() - 44 * 60 * 1000).toISOString(),
    auditHash: 'c3d4e5f60718293a4b5c6d7e8f90a1b2',
    isSampleData: true,
  },
  {
    id: 'LOG-004',
    userId: 'pactpay-officer-001',
    requestId: 'REQ-102',
    eventType: 'PAYPAL_ORDER_CREATED',
    summary: 'PayPal Sandbox Order ORD-SANDBOX-781 created for $57.47 USD (converted from ₹5,400.00 INR @ 1 USD = ₹93.95 INR via open.er-api.com)',
    actor: 'PayPal Sandbox Gateway',
    details: {
      orderId: 'ORD-SANDBOX-781',
      originalAmount: 5400,
      originalCurrency: 'INR',
      convertedAmount: 57.47,
      convertedCurrency: 'USD',
      exchangeRate: 0.010643,
      inverseRate: 93.95,
      rateSource: 'open.er-api.com (Live Forex Market)',
    },
    timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    auditHash: 'd4e5f60718293a4b5c6d7e8f90a1b2c3',
    isSampleData: true,
  },
];

const PactPayContext = createContext<PactPayContextType | null>(null);

export const PactPayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PurchaseRequest[]>(initialSampleRequests);
  const [transactions, setTransactions] = useState<TransactionRecord[]>(initialSampleTransactions);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(initialSampleAuditLogs);
  const [policy, setPolicy] = useState<GuardianPolicy>(defaultPolicy);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [paypalStatus, setPaypalStatus] = useState<PayPalConfigStatus | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);

  const toggleDemoMode = () => setIsDemoMode(prev => !prev);

  const refreshPayPalStatus = async (): Promise<PayPalConfigStatus> => {
    try {
      const res = await fetch('/api/paypal/status');
      const data = await res.json();
      if (data.status) {
        setPaypalStatus(data.status);
        return data.status;
      }
    } catch (e) {
      console.warn('Could not check PayPal status:', e);
    }
    const fallback: PayPalConfigStatus = {
      configured: false,
      missingCredentials: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET'],
      environment: 'sandbox',
      baseUrl: 'https://api-m.sandbox.paypal.com',
    };
    setPaypalStatus(fallback);
    return fallback;
  };

  useEffect(() => {
    refreshPayPalStatus();
  }, []);

  const [isLoadingFirestore, setIsLoadingFirestore] = useState(true);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  // Sync with Firestore for the active user
  useEffect(() => {
    if (!user) return;
    setIsLoadingFirestore(true);
    setFirestoreError(null);

    // Listen to requests
    const requestsPath = `users/${user.uid}/purchaseRequests`;
    const unsubRequests = onSnapshot(
      collection(db, requestsPath),
      (snapshot) => {
        setIsLoadingFirestore(false);
        if (!snapshot.empty) {
          const list: PurchaseRequest[] = [];
          snapshot.forEach(docSnap => list.push(docSnap.data() as PurchaseRequest));
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setRequests(list);
        } else {
          // Initialize starter sample requests in Firestore
          initialSampleRequests.forEach(req => {
            setDoc(doc(db, requestsPath, req.id), { ...req, userId: user.uid }).catch(() => {});
          });
        }
      },
      (error) => {
        setIsLoadingFirestore(false);
        setFirestoreError(error.message);
        handleFirestoreError(error, OperationType.GET, requestsPath);
      }
    );

    // Listen to policy
    const policyPath = `users/${user.uid}/guardianPolicy`;
    const unsubPolicy = onSnapshot(
      collection(db, policyPath),
      (snapshot) => {
        if (!snapshot.empty) {
          snapshot.forEach(docSnap => setPolicy(docSnap.data() as GuardianPolicy));
        } else {
          setDoc(doc(db, policyPath, 'default'), { ...defaultPolicy, userId: user.uid }).catch(() => {});
        }
      },
      (error) => handleFirestoreError(error, OperationType.GET, policyPath)
    );

    // Listen to transactions
    const txPath = `users/${user.uid}/transactions`;
    const unsubTx = onSnapshot(
      collection(db, txPath),
      (snapshot) => {
        if (!snapshot.empty) {
          const list: TransactionRecord[] = [];
          snapshot.forEach(docSnap => list.push(docSnap.data() as TransactionRecord));
          list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setTransactions(list);
        } else {
          initialSampleTransactions.forEach(tx => {
            setDoc(doc(db, txPath, tx.id), { ...tx, userId: user.uid }).catch(() => {});
          });
        }
      },
      (error) => handleFirestoreError(error, OperationType.GET, txPath)
    );

    // Listen to audit logs
    const logsPath = `users/${user.uid}/auditLogs`;
    const unsubLogs = onSnapshot(
      collection(db, logsPath),
      (snapshot) => {
        if (!snapshot.empty) {
          const list: AuditLogEntry[] = [];
          snapshot.forEach(docSnap => list.push(docSnap.data() as AuditLogEntry));
          list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setAuditLogs(list);
        } else {
          initialSampleAuditLogs.forEach(log => {
            setDoc(doc(db, logsPath, log.id), { ...log, userId: user.uid }).catch(() => {});
          });
        }
      },
      (error) => handleFirestoreError(error, OperationType.GET, logsPath)
    );

    return () => {
      unsubRequests();
      unsubPolicy();
      unsubTx();
      unsubLogs();
    };
  }, [user]);

  // Append audit log helper
  const addAuditLog = async (entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'auditHash'>) => {
    const id = `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const timestamp = new Date().toISOString();
    const auditHash = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);

    const fullLog: AuditLogEntry = {
      ...entry,
      id,
      timestamp,
      auditHash,
    };

    setAuditLogs(prev => [fullLog, ...prev]);

    if (user) {
      try {
        await setDoc(doc(db, `users/${user.uid}/auditLogs`, id), fullLog);
      } catch (err) {
        console.warn('[PACTPAY Firestore] Could not write audit log doc:', err);
      }
    }
  };

  // 1. Create Purchase Request via AI Assistant
  const createPurchaseRequest = async (prompt: string, fallbackCurrency: string = 'INR'): Promise<PurchaseRequest> => {
    setIsProcessing(true);
    try {
      // Step 1: Parse intent via Gemini AI
      const aiRes = await fetch('/api/ai/parse-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, fallbackCurrency }),
      });

      if (!aiRes.ok) {
        throw new Error('AI parse failed');
      }

      const { intent } = await aiRes.json();
      const requestId = `REQ-${Date.now().toString().slice(-6)}`;
      const now = new Date().toISOString();

      let conversionPreview: any = undefined;
      try {
        const convRes = await fetch('/api/currency/convert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: intent.estimatedAmount, currency: intent.currency || 'INR' }),
        });
        if (convRes.ok) {
          const convData = await convRes.json();
          conversionPreview = convData.conversion;
        }
      } catch (err) {
        console.warn('[PACTPAY Currency] Conversion preview error:', err);
      }

      const newRequest: PurchaseRequest = {
        id: requestId,
        userId: user?.uid || 'pactpay-officer-001',
        userEmail: user?.email || 'indu642006@gmail.com',
        naturalPrompt: prompt,
        product: intent.product,
        budget: intent.budget,
        estimatedAmount: intent.estimatedAmount,
        currency: intent.currency,
        conversionPreview,
        merchant: intent.merchant,
        intentSummary: intent.intentSummary,
        category: intent.category,
        urgency: intent.urgency,
        status: 'evaluating',
        createdAt: now,
        updatedAt: now,
      };

      // Log AI Parsing
      await addAuditLog({
        userId: user?.uid || 'pactpay-officer-001',
        requestId,
        eventType: 'AI_INTENT_PARSED',
        summary: `Gemini AI extracted product "${intent.product}" (${intent.currency} ${intent.estimatedAmount}) from intent`,
        actor: 'AI Purchase Assistant',
        details: { intent, originalPrompt: prompt },
      });

      // Step 2: Immediate Payment Guardian deterministic evaluation
      const guardianRes = await fetch('/api/guardian/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request: newRequest,
          policy,
          history: {
            todaySpent: transactions
              .filter(t => t.status === 'COMPLETED' && new Date(t.timestamp).toDateString() === new Date().toDateString())
              .reduce((sum, t) => sum + t.amount, 0),
            monthSpent: transactions
              .filter(t => t.status === 'COMPLETED')
              .reduce((sum, t) => sum + t.amount, 0),
            recentTransactions: transactions.slice(0, 10),
          },
        }),
      });

      const { evaluation } = await guardianRes.json();
      newRequest.guardianEvaluation = evaluation;
      newRequest.status = evaluation.passed ? 'guardian_approved' : 'guardian_blocked';

      // Log Guardian check
      await addAuditLog({
        userId: user?.uid || 'pactpay-officer-001',
        requestId,
        eventType: evaluation.passed ? 'GUARDIAN_CHECK_EVALUATED' : 'PAYMENT_FIREWALL_BLOCKED',
        summary: evaluation.passed 
          ? `Guardian evaluated ${newRequest.id}: All deterministic checks passed. Awaiting human approval.`
          : `Guardian BLOCKED ${newRequest.id}: Risk score ${evaluation.riskScore}/100. Violations detected.`,
        actor: 'Payment Guardian Firewall',
        details: { evaluation },
      });

      // Update state
      setRequests(prev => [newRequest, ...prev]);

      // If blocked, also add to transactions table as BLOCKED for visibility
      if (!evaluation.passed) {
        const blockedTx: TransactionRecord = {
          id: `TXN-BLK-${Date.now().toString().slice(-5)}`,
          userId: user?.uid || 'pactpay-officer-001',
          requestId: newRequest.id,
          orderId: 'N/A - BLOCKED_BY_FIREWALL',
          merchant: newRequest.merchant,
          product: newRequest.product,
          amount: newRequest.estimatedAmount,
          currency: newRequest.currency,
          status: 'BLOCKED',
          timestamp: new Date().toISOString(),
          guardianRiskScore: evaluation.riskScore,
          auditHash: Math.random().toString(36).substring(2),
        };
        setTransactions(prev => [blockedTx, ...prev]);
        if (user) {
          try {
            await setDoc(doc(db, `users/${user.uid}/transactions`, blockedTx.id), blockedTx);
          } catch (e) {
            console.warn('[PACTPAY Firestore] Could not save blocked transaction:', e);
          }
        }
      }

      if (user) {
        try {
          await setDoc(doc(db, `users/${user.uid}/purchaseRequests`, newRequest.id), newRequest);
        } catch (e) {
          console.warn('[PACTPAY Firestore] Could not save purchase request:', e);
        }
      }

      return newRequest;
    } finally {
      setIsProcessing(false);
    }
  };

  // Re-run Guardian on request
  const evaluateGuardian = async (requestId: string): Promise<GuardianEvaluation> => {
    const target = requests.find(r => r.id === requestId);
    if (!target) throw new Error('Request not found');

    const guardianRes = await fetch('/api/guardian/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        request: target,
        policy,
        history: {
          todaySpent: transactions
            .filter(t => t.status === 'COMPLETED' && new Date(t.timestamp).toDateString() === new Date().toDateString())
            .reduce((sum, t) => sum + t.amount, 0),
          monthSpent: transactions
            .filter(t => t.status === 'COMPLETED')
            .reduce((sum, t) => sum + t.amount, 0),
          recentTransactions: transactions.slice(0, 10),
        },
      }),
    });

    const { evaluation } = await guardianRes.json();

    setRequests(prev => prev.map(r => {
      if (r.id === requestId) {
        return {
          ...r,
          guardianEvaluation: evaluation,
          status: evaluation.passed ? 'guardian_approved' : 'guardian_blocked',
          updatedAt: new Date().toISOString(),
        };
      }
      return r;
    }));

    return evaluation;
  };

  // 2. Explicit Human Authorization
  const authorizeRequest = async (requestId: string, note?: string) => {
    const target = requests.find(r => r.id === requestId);
    if (!target) throw new Error('Request not found');

    const updatedDecision = {
      approved: true,
      decidedAt: new Date().toISOString(),
      authorizedBy: user?.email || 'indu642006@gmail.com',
      note: note || 'Explicit Human Sign-off verified',
      authMethod: 'MANUAL_SIGN_OFF' as const,
    };

    setRequests(prev => prev.map(r => {
      if (r.id === requestId) {
        return {
          ...r,
          humanDecision: updatedDecision,
          status: 'human_approved',
          updatedAt: new Date().toISOString(),
        };
      }
      return r;
    }));

    await addAuditLog({
      userId: user?.uid || 'pactpay-officer-001',
      requestId,
      eventType: 'HUMAN_APPROVAL_GRANTED',
      summary: `Human Risk Officer ${user?.email || 'indu642006@gmail.com'} authorized payment for "${target.product}"`,
      actor: 'Human Sign-off',
      details: { note, request: target },
    });

    if (user) {
      try {
        await updateDoc(doc(db, `users/${user.uid}/purchaseRequests`, requestId), {
          humanDecision: updatedDecision,
          status: 'human_approved',
          updatedAt: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('[PACTPAY Firestore] Update error:', e);
      }
    }
  };

  // 3. Human Rejection
  const rejectRequest = async (requestId: string, reason?: string) => {
    const target = requests.find(r => r.id === requestId);
    if (!target) throw new Error('Request not found');

    const updatedDecision = {
      approved: false,
      decidedAt: new Date().toISOString(),
      authorizedBy: user?.email || 'indu642006@gmail.com',
      note: reason || 'Declined by human authority',
    };

    setRequests(prev => prev.map(r => {
      if (r.id === requestId) {
        return {
          ...r,
          humanDecision: updatedDecision,
          status: 'human_rejected',
          updatedAt: new Date().toISOString(),
        };
      }
      return r;
    }));

    await addAuditLog({
      userId: user?.uid || 'pactpay-officer-001',
      requestId,
      eventType: 'HUMAN_REJECTION_ISSUED',
      summary: `Human Risk Officer rejected transaction "${target.product}": ${reason || 'Denied'}`,
      actor: 'Human Sign-off',
      details: { reason, request: target },
    });

    if (user) {
      try {
        await updateDoc(doc(db, `users/${user.uid}/purchaseRequests`, requestId), {
          humanDecision: updatedDecision,
          status: 'human_rejected',
          updatedAt: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('[PACTPAY Firestore] Update error:', e);
      }
    }
  };

  // 4. Execute PayPal Payment
  const executePayPalPayment = async (requestId: string): Promise<TransactionRecord> => {
    const target = requests.find(r => r.id === requestId);
    if (!target) throw new Error('Request not found');

    // CRITICAL REQUIREMENT 4: Allow payment execution only after explicit human approval
    if (target.status !== 'human_approved') {
      throw new Error('SECURITY GATE VIOLATION: AI cannot execute payment. Explicit human authorization must be granted first.');
    }

    setIsProcessing(true);
    setActiveRequestId(requestId);

    try {
      // Step A: Server creates PayPal Sandbox Order
      const createOrderRes = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: target.id,
          product: target.product,
          amount: target.estimatedAmount,
          currency: target.currency,
          merchant: target.merchant,
          userEmail: target.userEmail,
          humanApproved: true,
          humanAuthorizedBy: target.humanDecision?.authorizedBy,
        }),
      });

      if (!createOrderRes.ok) {
        const errJson = await createOrderRes.json().catch(() => ({}));
        const errMsg = errJson.error || 'Failed to create PayPal Sandbox order';

        // Update request to failed status safely
        setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'failed', updatedAt: new Date().toISOString() } : r));

        await addAuditLog({
          userId: user?.uid || 'pactpay-officer-001',
          requestId: target.id,
          eventType: 'PAYMENT_FIREWALL_BLOCKED',
          summary: `PayPal Sandbox order creation failed: ${errMsg}`,
          actor: 'PayPal Sandbox Gateway',
          details: { error: errMsg, request: target },
        });

        if (user) {
          try {
            await updateDoc(doc(db, `users/${user.uid}/purchaseRequests`, target.id), {
              status: 'failed',
              updatedAt: new Date().toISOString(),
            });
          } catch (e) {
            console.warn('[PACTPAY Firestore] Failed status update error:', e);
          }
        }

        throw new Error(errMsg);
      }

      const { order } = await createOrderRes.json();

      await addAuditLog({
        userId: user?.uid || 'pactpay-officer-001',
        requestId: target.id,
        eventType: 'PAYPAL_ORDER_CREATED',
        summary: `PayPal Sandbox Order ${order.orderId} created for $${Number(order.amount).toFixed(2)} USD (converted from ₹${target.estimatedAmount.toLocaleString('en-IN')} INR @ 1 USD = ₹${order.conversion?.inverseRate ? Number(order.conversion.inverseRate).toFixed(2) : '93.95'} INR via ${order.conversion?.rateSource || 'Forex'})`,
        actor: 'PayPal Sandbox Gateway',
        details: { order, conversion: order.conversion, originalAmount: target.estimatedAmount, originalCurrency: target.currency },
      });

      // Step B: Server verifies and approves PayPal Order with human sign-off signature
      const approveOrderRes = await fetch('/api/paypal/approve-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.orderId,
          requestId: target.id,
          humanApproved: true,
          humanAuthorizedBy: target.humanDecision?.authorizedBy || 'FinTech Officer',
          note: target.humanDecision?.note,
        }),
      });

      if (!approveOrderRes.ok) {
        const errJson = await approveOrderRes.json().catch(() => ({}));
        const errMsg = errJson.error || 'Failed to verify PayPal order approval';

        setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'failed', updatedAt: new Date().toISOString() } : r));

        await addAuditLog({
          userId: user?.uid || 'pactpay-officer-001',
          requestId: target.id,
          eventType: 'PAYMENT_FIREWALL_BLOCKED',
          summary: `PayPal order approval check failed: ${errMsg}`,
          actor: 'PayPal Sandbox Gateway',
          details: { error: errMsg, orderId: order.orderId },
        });

        if (user) {
          try {
            await updateDoc(doc(db, `users/${user.uid}/purchaseRequests`, target.id), {
              status: 'failed',
              updatedAt: new Date().toISOString(),
            });
          } catch (e) {
            console.warn('[PACTPAY Firestore] Failed status update error:', e);
          }
        }

        throw new Error(errMsg);
      }

      const approveResult = await approveOrderRes.json();

      await addAuditLog({
        userId: user?.uid || 'pactpay-officer-001',
        requestId: target.id,
        eventType: 'HUMAN_APPROVAL_GRANTED',
        summary: `PayPal Sandbox Order ${order.orderId} verified and approved by ${approveResult.authorizedBy} (${approveResult.orderStatus})`,
        actor: 'Human Sign-off',
        details: { approveResult },
      });

      // Step C: Server captures PayPal Sandbox Order
      const captureRes = await fetch('/api/paypal/capture-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.orderId,
          requestId: target.id,
          humanApproved: true,
        }),
      });

      if (!captureRes.ok) {
        const errJson = await captureRes.json().catch(() => ({}));
        const errMsg = errJson.error || 'Failed to capture PayPal payment';

        // Requirement 8: Handle failed payments safely in ledger
        const failedTx: TransactionRecord = {
          id: `TXN-FAILED-${Date.now().toString().slice(-6)}`,
          userId: user?.uid || 'pactpay-officer-001',
          requestId: target.id,
          orderId: order.orderId,
          merchant: target.merchant,
          product: target.product,
          amount: target.estimatedAmount,
          currency: target.currency || 'INR',
          usdAmount: order.amount,
          usdCurrency: 'USD',
          exchangeRate: order.conversion?.exchangeRate,
          inverseRate: order.conversion?.inverseRate,
          rateSource: order.conversion?.rateSource,
          status: 'DECLINED',
          timestamp: new Date().toISOString(),
          guardianRiskScore: target.guardianEvaluation?.riskScore || 10,
          approvedBy: target.humanDecision?.authorizedBy,
          auditHash: Math.random().toString(36).substring(2),
        };

        setTransactions(prev => [failedTx, ...prev]);

        setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'failed', updatedAt: new Date().toISOString() } : r));

        await addAuditLog({
          userId: user?.uid || 'pactpay-officer-001',
          requestId: target.id,
          eventType: 'PAYMENT_FIREWALL_BLOCKED',
          summary: `PayPal capture failed for Order ${order.orderId}: ${errMsg}`,
          actor: 'PayPal Sandbox Gateway',
          details: { error: errMsg, orderId: order.orderId },
        });

        if (user) {
          try {
            await setDoc(doc(db, `users/${user.uid}/transactions`, failedTx.id), failedTx);
            await updateDoc(doc(db, `users/${user.uid}/purchaseRequests`, target.id), {
              status: 'failed',
              updatedAt: new Date().toISOString(),
            });
          } catch (e) {
            console.warn('[PACTPAY Firestore] Failed record error:', e);
          }
        }

        throw new Error(errMsg);
      }

      const captureResult = await captureRes.json();

      // Requirement 6: Verify payment status using PayPal's actual response
      if (captureResult.status !== 'COMPLETED') {
        throw new Error(`PayPal returned non-completed status: ${captureResult.status}. Payment was not finalized.`);
      }

      // Step C: Record verified successful transaction in ledger with both currencies
      const conversionData = captureResult.conversion || order.conversion;
      const newTx: TransactionRecord = {
        id: `TXN-${Date.now().toString().slice(-6)}`,
        userId: user?.uid || 'pactpay-officer-001',
        requestId: target.id,
        orderId: captureResult.orderId,
        captureId: captureResult.captureId,
        merchant: target.merchant,
        product: target.product,
        amount: target.estimatedAmount, // Internal INR amount
        currency: target.currency || 'INR', // 'INR'
        usdAmount: Number(captureResult.amount) || order.amount, // Converted USD captured by PayPal
        usdCurrency: captureResult.currency || 'USD',
        exchangeRate: conversionData?.exchangeRate,
        inverseRate: conversionData?.inverseRate,
        rateSource: conversionData?.rateSource,
        conversion: conversionData,
        status: 'COMPLETED',
        paypalPayerEmail: captureResult.payerEmail || user?.email || 'verified-payer@paypal.sandbox',
        timestamp: captureResult.executedAt || new Date().toISOString(),
        guardianRiskScore: target.guardianEvaluation?.riskScore || 10,
        approvedBy: target.humanDecision?.authorizedBy || 'Verified Human Sign-off',
        auditHash: captureResult.auditProof || Math.random().toString(36).substring(2),
      };

      setTransactions(prev => [newTx, ...prev]);

      // Update purchase request status to completed with real PayPal confirmation
      setRequests(prev => prev.map(r => {
        if (r.id === requestId) {
          return {
            ...r,
            status: 'completed',
            paymentDetails: {
              orderId: captureResult.orderId,
              captureId: captureResult.captureId,
              paypalStatus: captureResult.status,
              payerEmail: captureResult.payerEmail,
              payerName: captureResult.payerName,
              amount: newTx.usdAmount || newTx.amount,
              currency: newTx.usdCurrency || 'USD',
              originalAmount: target.estimatedAmount,
              originalCurrency: target.currency || 'INR',
              conversion: conversionData,
              executedAt: captureResult.executedAt,
            },
            updatedAt: new Date().toISOString(),
          };
        }
        return r;
      }));

      // Log verified PayPal execution confirmation with both currencies
      await addAuditLog({
        userId: user?.uid || 'pactpay-officer-001',
        requestId: target.id,
        eventType: 'PAYPAL_PAYMENT_CAPTURED',
        summary: `PayPal Sandbox captured $${(newTx.usdAmount || 0).toFixed(2)} USD for ${target.product} (Authorized: ₹${target.estimatedAmount.toLocaleString('en-IN')} INR @ 1 USD = ₹${(conversionData?.inverseRate || 93.95).toFixed(2)} INR). Capture ID: ${captureResult.captureId}`,
        actor: 'PayPal Sandbox Gateway',
        details: { captureResult, tx: newTx, conversion: conversionData },
      });

      // Requirement 7: Record successful transactions in Firestore
      if (user) {
        try {
          await setDoc(doc(db, `users/${user.uid}/transactions`, newTx.id), newTx);
          await updateDoc(doc(db, `users/${user.uid}/purchaseRequests`, target.id), {
            status: 'completed',
            paymentDetails: {
              orderId: captureResult.orderId,
              captureId: captureResult.captureId,
              paypalStatus: captureResult.status,
              amount: newTx.amount,
              currency: newTx.currency,
              executedAt: captureResult.executedAt,
            },
            updatedAt: new Date().toISOString(),
          });
        } catch (e) {
          console.warn('[PACTPAY Firestore] Tx write error:', e);
        }
      }

      // Confetti celebration for authorized payment execution
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#0070BA', '#00CFDE', '#10B981', '#38BDF8'],
        });
      } catch (e) {
        // ignore
      }

      return newTx;
    } finally {
      setIsProcessing(false);
      setActiveRequestId(null);
    }
  };

  // 5. Update Guardian Firewall Policy
  const updatePolicy = async (updated: Partial<GuardianPolicy>) => {
    const newPolicy: GuardianPolicy = {
      ...policy,
      ...updated,
      updatedAt: new Date().toISOString(),
    };
    setPolicy(newPolicy);

    await addAuditLog({
      userId: user?.uid || 'pactpay-officer-001',
      requestId: 'POLICY',
      eventType: 'POLICY_UPDATED',
      summary: `Guardian firewall policy modified: Max Tx = ${newPolicy.currency} ${newPolicy.maxPerTransaction}, Daily = ${newPolicy.currency} ${newPolicy.dailyLimit}`,
      actor: 'Payment Guardian Firewall',
      details: { newPolicy },
    });

    if (user) {
      try {
        await setDoc(doc(db, `users/${user.uid}/guardianPolicy`, 'default'), newPolicy);
      } catch (e) {
        console.warn('[PACTPAY Firestore] Policy update error:', e);
      }
    }
  };

  // Reset demo data helper
  const resetToSampleData = async () => {
    setRequests(initialSampleRequests);
    setTransactions(initialSampleTransactions);
    setAuditLogs(initialSampleAuditLogs);
    setPolicy(defaultPolicy);
  };

  return (
    <PactPayContext.Provider
      value={{
        requests,
        transactions,
        auditLogs,
        policy,
        isProcessing,
        isLoadingFirestore,
        firestoreError,
        activeRequestId,
        paypalStatus,
        isDemoMode,
        toggleDemoMode,
        refreshPayPalStatus,
        createPurchaseRequest,
        evaluateGuardian,
        authorizeRequest,
        rejectRequest,
        executePayPalPayment,
        updatePolicy,
        resetToSampleData,
      }}
    >
      {children}
    </PactPayContext.Provider>
  );
};

export const usePactPay = () => {
  const context = useContext(PactPayContext);
  if (!context) {
    throw new Error('usePactPay must be used within a PactPayProvider');
  }
  return context;
};
