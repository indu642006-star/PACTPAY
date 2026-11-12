export type RequestStatus =
  | 'draft'
  | 'evaluating'
  | 'guardian_approved'
  | 'guardian_blocked'
  | 'human_approved'
  | 'human_rejected'
  | 'awaiting_paypal_approval'
  | 'payment_pending'
  | 'completed'
  | 'failed';

export type CheckStatus = 'PASS' | 'FAIL' | 'WARN';

export interface GuardianRuleCheck {
  id: string;
  name: string;
  category: 'LIMIT' | 'MERCHANT' | 'DUPLICATE' | 'EXPIRY' | 'AMOUNT' | 'RISK';
  status: CheckStatus;
  message: string;
  details?: string;
}

export interface GuardianEvaluation {
  passed: boolean;
  status: 'APPROVED_BY_GUARDIAN' | 'BLOCKED_BY_GUARDIAN';
  riskScore: number; // 0 - 100
  checks: GuardianRuleCheck[];
  evaluatedAt: string;
  summary: string;
}

export interface HumanDecision {
  approved: boolean;
  decidedAt: string;
  authorizedBy: string;
  note?: string;
  authMethod?: 'MANUAL_SIGN_OFF' | 'BIOMETRIC_PASSKEY' | 'MFA_CONFIRMED';
}

export interface CurrencyConversionInfo {
  originalAmount: number;
  originalCurrency: string; // 'INR'
  convertedAmount: number;  // Converted USD amount sent to PayPal
  convertedCurrency: string;// 'USD'
  exchangeRate: number;     // 1 INR in USD
  inverseRate: number;      // 1 USD in INR
  rateSource: string;
  rateTimestamp: string;
  isFallbackRate: boolean;
  formattedText: string;
}

export interface PaymentDetails {
  orderId: string;
  captureId?: string;
  paypalStatus: string;
  approveUrl?: string;
  payerEmail?: string;
  payerName?: string;
  amount: number;
  currency: string;
  originalAmount?: number;
  originalCurrency?: string;
  conversion?: CurrencyConversionInfo;
  executedAt: string;
  simulated?: boolean;
}

export interface PurchaseRequest {
  id: string;
  userId: string;
  userEmail: string;
  naturalPrompt: string;
  product: string;
  budget: number;
  estimatedAmount: number;
  currency: string;
  conversionPreview?: CurrencyConversionInfo;
  merchant: string;
  intentSummary: string;
  category: string;
  urgency: 'low' | 'normal' | 'urgent';
  status: RequestStatus;
  guardianEvaluation?: GuardianEvaluation;
  humanDecision?: HumanDecision;
  paymentDetails?: PaymentDetails;
  paypalOrderId?: string;
  paypalApproveUrl?: string;
  paypalStatus?: string;
  paypalConversion?: CurrencyConversionInfo;
  createdAt: string;
  updatedAt: string;
  isSampleData?: boolean;
}

export interface GuardianPolicy {
  id: string;
  userId: string;
  maxPerTransaction: number;
  dailyLimit: number;
  monthlyLimit: number;
  currency: string;
  restrictedMerchants: string[];
  allowedCategories: string[];
  blockDuplicateWindowMinutes: number;
  autoRejectHighRisk: boolean;
  requireHumanNoteAbove: number;
  updatedAt: string;
}

export interface TransactionRecord {
  id: string;
  userId: string;
  requestId: string;
  orderId: string;
  captureId?: string;
  merchant: string;
  product: string;
  amount: number; // Internal INR amount
  currency: string; // 'INR'
  usdAmount?: number; // Converted USD amount sent to PayPal
  usdCurrency?: string; // 'USD'
  exchangeRate?: number;
  inverseRate?: number;
  rateSource?: string;
  conversion?: CurrencyConversionInfo;
  status: 'COMPLETED' | 'BLOCKED' | 'DECLINED' | 'PENDING';
  paypalPayerEmail?: string;
  timestamp: string;
  guardianRiskScore: number;
  approvedBy?: string;
  auditHash: string;
  isSampleData?: boolean;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  requestId: string;
  eventType: 
    | 'AI_INTENT_PARSED'
    | 'GUARDIAN_CHECK_EVALUATED'
    | 'HUMAN_APPROVAL_GRANTED'
    | 'HUMAN_REJECTION_ISSUED'
    | 'PAYPAL_ORDER_CREATED'
    | 'PAYPAL_PAYMENT_CAPTURED'
    | 'PAYMENT_FIREWALL_BLOCKED'
    | 'POLICY_UPDATED';
  summary: string;
  actor: 'AI Purchase Assistant' | 'Payment Guardian Firewall' | 'Human Sign-off' | 'PayPal Sandbox Gateway' | 'System';
  details: Record<string, any>;
  timestamp: string;
  auditHash: string;
  isSampleData?: boolean;
}
