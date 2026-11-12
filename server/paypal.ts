import crypto from 'crypto';
import { convertToPayPalUsd, type ConvertedAmountResult, getInrToUsdExchangeRate } from './currency';

export type { ConvertedAmountResult };

export interface CreateOrderParams {
  requestId: string;
  product: string;
  amount: number;
  currency: string;
  merchant: string;
  userEmail: string;
  humanApproved: boolean;
  humanAuthorizedBy?: string;
}

export interface CaptureOrderParams {
  orderId: string;
  requestId: string;
  humanApproved: boolean;
}

export interface ApproveOrderParams {
  orderId: string;
  requestId: string;
  humanApproved: boolean;
  humanAuthorizedBy?: string;
  note?: string;
}

export interface ApprovedOrderRecord {
  orderId: string;
  requestId: string;
  authorizedBy: string;
  authorizedAt: string;
  approvalAuditSignature: string;
  note?: string;
}

export interface PayPalConfigStatus {
  configured: boolean;
  missingCredentials: string[];
  environment: 'sandbox';
  baseUrl: string;
  publicBaseUrl?: string;
  publicWebhookUrl?: string;
  status: 'READY' | 'PENDING_CONFIGURATION';
  message: string;
  currencyPolicy: {
    internalCurrency: 'INR';
    gatewayCurrency: 'USD';
    autoConversion: boolean;
    description: string;
  };
  endpoints: {
    createOrder: string;
    approveOrder: string;
    captureOrder: string;
    webhook: string;
    orderDetails: string;
    exchangeRate: string;
  };
}

// In-memory duplicate capture prevention trackers
const capturedOrders = new Set<string>();

export interface CapturedOrderRecord {
  orderId: string;
  captureId: string;
  timestamp: string;
  requestId: string;
}
const capturedOrderRecords = new Map<string, CapturedOrderRecord>();
const approvedOrdersMap = new Map<string, ApprovedOrderRecord>();
const orderConversionsMap = new Map<string, ConvertedAmountResult>();

// Concurrency lock to prevent simultaneous duplicate capture attempts
const capturingInProgress = new Set<string>();

// In-memory OAuth token cache
let cachedAccessToken: string | null = null;
let cachedTokenExpiresAt: number = 0;

const PAYPAL_BASE_URL = 'https://api-m.sandbox.paypal.com';

/**
 * Resolves a valid HTTPS base URL for PayPal return/cancel endpoints.
 * Prioritizes APP_URL, then Render's RENDER_EXTERNAL_URL, then fallback development URL.
 * Strictly guarantees an https:// scheme to prevent PayPal 422 INVALID_PARAMETER_VALUE.
 */
export function getPayPalPublicBaseUrl(): string {
  const candidate = (process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || '').trim();
  if (candidate) {
    // If it starts with http:// and is not localhost, upgrade to https://
    if (candidate.startsWith('http://') && !candidate.includes('localhost') && !candidate.includes('127.0.0.1')) {
      return candidate.replace(/^http:\/\//i, 'https://').replace(/\/+$/, '');
    }
    // If already absolute URL, return stripped of trailing slashes
    if (candidate.startsWith('http://') || candidate.startsWith('https://')) {
      return candidate.replace(/\/+$/, '');
    }
    return `https://${candidate.replace(/\/+$/, '')}`;
  }
  // Safe default public HTTPS endpoint for webhooks and callbacks
  return 'https://ais-dev-q423y63iv6lo4c3qajzofa-427773228149.asia-southeast1.run.app';
}

/**
 * Sanitizes a string for PayPal purchase unit description.
 * PayPal strictly enforces:
 * - Max length: 127 characters
 * - Safe character set: ASCII alphanumeric, spaces, and basic punctuation: . , - _ / ( )
 * - Strips multi-byte unicode symbols (e.g., ₹ Indian Rupee sign) that trigger 422 SEMANTIC_ERROR / INVALID_STRING_LENGTH.
 */
export function sanitizePayPalDescription(rawText: string, maxLength: number = 120): string {
  if (!rawText) return 'PACTPAY Purchase';
  // Replace Rupee sign ₹ and Rs. with standard ASCII "INR "
  let cleaned = rawText.replace(/₹/g, 'INR ').replace(/Rs\.?/gi, 'INR ');
  // Replace multi-byte or non-ASCII characters with spaces
  cleaned = cleaned.replace(/[^\x20-\x7E]/g, ' ');
  // Collapse whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.substring(0, maxLength - 3).trim() + '...';
}

/**
 * Check whether required PayPal Sandbox credentials exist in the server environment.
 * Secrets are NEVER returned or exposed to the client.
 */
export function getPayPalConfigStatus(): PayPalConfigStatus {
  const missing: string[] = [];
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_ID.trim()) {
    missing.push('PAYPAL_CLIENT_ID');
  }
  if (!process.env.PAYPAL_CLIENT_SECRET || !process.env.PAYPAL_CLIENT_SECRET.trim()) {
    missing.push('PAYPAL_CLIENT_SECRET');
  }

  const isConfigured = missing.length === 0;
  const publicBase = getPayPalPublicBaseUrl();

  return {
    configured: isConfigured,
    missingCredentials: missing,
    environment: 'sandbox',
    baseUrl: PAYPAL_BASE_URL,
    publicBaseUrl: publicBase,
    publicWebhookUrl: `${publicBase}/api/paypal/webhook`,
    status: isConfigured ? 'READY' : 'PENDING_CONFIGURATION',
    message: isConfigured
      ? 'PayPal Sandbox integration is fully configured and ready for live capture.'
      : 'PayPal Sandbox integration code is complete and active. Real Sandbox credentials pending in server environment variables.',
    currencyPolicy: {
      internalCurrency: 'INR',
      gatewayCurrency: 'USD',
      autoConversion: true,
      description: 'Internal amounts & Guardian rules evaluate in INR. Orders convert live INR to USD for PayPal Orders API v2.',
    },
    endpoints: {
      createOrder: 'POST /api/paypal/create-order',
      approveOrder: 'POST /api/paypal/approve-order',
      captureOrder: 'POST /api/paypal/capture-order',
      webhook: 'POST /api/paypal/webhook',
      orderDetails: 'GET /api/paypal/orders/:orderId',
      exchangeRate: 'GET /api/currency/rate',
    },
  };
}

export function getApprovedOrdersList(): ApprovedOrderRecord[] {
  return Array.from(approvedOrdersMap.values());
}

export function getCapturedOrdersList(): CapturedOrderRecord[] {
  return Array.from(capturedOrderRecords.values());
}

/**
 * Obtain a valid OAuth 2.0 Access Token from PayPal Sandbox using client credentials.
 * Throws an explicit error if credentials are missing or if PayPal rejects authentication.
 */
export async function getPayPalAccessToken(): Promise<string> {
  const status = getPayPalConfigStatus();
  if (!status.configured) {
    throw new Error(
      `MISSING_PAYPAL_CREDENTIALS: PayPal Sandbox credentials are not configured on the server. Please set ${status.missingCredentials.join(' and ')} in the server environment variables.`
    );
  }

  // Return cached token if still valid (with 60-second safety buffer)
  if (cachedAccessToken && Date.now() < cachedTokenExpiresAt) {
    return cachedAccessToken;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID!.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET!.trim();
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  try {
    const res = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: 'grant_type=client_credentials',
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error('[PACTPAY PayPal Auth Error]', res.status, data);
      throw new Error(
        `PAYPAL_AUTHENTICATION_FAILED: PayPal Sandbox rejected the credentials (${data.error || res.statusText}: ${data.error_description || 'Invalid client ID or secret'}). Verify your PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.`
      );
    }

    if (!data.access_token) {
      throw new Error('PAYPAL_AUTHENTICATION_FAILED: No access token returned in PayPal response.');
    }

    cachedAccessToken = data.access_token;
    // Cache expiry: default to 9 hours if not provided
    const expiresIn = Number(data.expires_in) || 32400;
    cachedTokenExpiresAt = Date.now() + (expiresIn - 60) * 1000;

    return data.access_token as string;
  } catch (err: any) {
    // Invalidate cached token on error
    cachedAccessToken = null;
    cachedTokenExpiresAt = 0;
    throw err;
  }
}

/**
 * Creates an actual PayPal Sandbox Order via PayPal Checkout REST API v2.
 * Requires explicit human approval.
 * Never creates simulated orders or false successes.
 */
export async function createPayPalOrder(params: CreateOrderParams) {
  // CRITICAL REQUIREMENT 4: Allow payment execution only after explicit human approval
  if (!params.humanApproved) {
    throw new Error(
      'SECURITY VIOLATION: Payment creation rejected. Explicit human authorization is required before PayPal order generation.'
    );
  }

  if (isNaN(params.amount) || params.amount <= 0) {
    throw new Error('SECURITY VIOLATION: Invalid payment amount. Amount must be a positive number.');
  }

  // Convert INR amount into USD before sending to PayPal Sandbox Orders API
  // PayPal REST Orders API does not support INR directly.
  const conversion = await convertToPayPalUsd(params.amount, params.currency || 'INR');

  // Obtain verified access token (throws if credentials are missing or invalid)
  const accessToken = await getPayPalAccessToken();

  // Resolve public HTTPS base URL for callbacks
  const publicBaseUrl = getPayPalPublicBaseUrl();
  const returnUrl = `${publicBaseUrl}/api/paypal/return`;
  const cancelUrl = `${publicBaseUrl}/api/paypal/cancel`;

  // Sanitize description: safe ASCII only, no multi-byte characters like ₹, max 120 chars
  const cleanProductName = sanitizePayPalDescription(params.product, 45);
  const safeDescription = sanitizePayPalDescription(
    `PACTPAY: ${cleanProductName} (Orig: ${params.amount.toFixed(2)} INR @ 1 USD = ${conversion.inverseRate.toFixed(2)} INR)`,
    120
  );

  // Modern PayPal Orders v2 Payload (replaces deprecated root application_context)
  // Fixes HTTP 422 "semantically incorrect or failed business validation"
  const orderPayload = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: params.requestId,
        description: safeDescription,
        custom_id: params.requestId,
        amount: {
          currency_code: 'USD', // Send only USD to PayPal Orders API
          value: conversion.convertedAmount.toFixed(2), // 2-decimal string format
        },
      },
    ],
    payment_source: {
      paypal: {
        experience_context: {
          brand_name: 'PACTPAY AI Firewall',
          locale: 'en-US',
          landing_page: 'NO_PREFERENCE',
          shipping_preference: 'NO_SHIPPING', // Digital software / API authorizations
          user_action: 'PAY_NOW',
          return_url: returnUrl,
          cancel_url: cancelUrl,
        },
      },
    },
  };

  const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': `order-${params.requestId}-${Date.now().toString().slice(-6)}`,
    },
    body: JSON.stringify(orderPayload),
  });

  const orderData = await response.json().catch(() => ({}));

  if (!response.ok) {
    const debugId = response.headers.get('paypal-debug-id') || orderData.debug_id || 'N/A';
    console.error('[PACTPAY PayPal Order Creation Error]', {
      status: response.status,
      statusText: response.statusText,
      debugId,
      errorName: orderData.name,
      message: orderData.message,
      details: orderData.details,
      links: orderData.links,
      // Log sanitized payload for debugging (never contains secrets)
      payload: {
        intent: orderPayload.intent,
        amount: orderPayload.purchase_units[0]?.amount,
        reference_id: orderPayload.purchase_units[0]?.reference_id,
        description: orderPayload.purchase_units[0]?.description,
        return_url: returnUrl,
      },
    });

    const detailMsg = Array.isArray(orderData.details)
      ? orderData.details
          .map((d: any) => `${d.field ? `[Field: ${d.field}] ` : ''}${d.issue || 'ISSUE'}: ${d.description || 'Validation error'}`)
          .join('; ')
      : '';

    throw new Error(
      `PAYPAL_ORDER_CREATION_FAILED (Status ${response.status}, Debug ID: ${debugId}): ${
        orderData.message || response.statusText
      }${detailMsg ? ` (${detailMsg})` : ''}`
    );
  }

  if (!orderData.id) {
    throw new Error('PAYPAL_ORDER_CREATION_FAILED: PayPal did not return a valid order ID.');
  }

  // Store conversion metadata for audit and capture reference
  orderConversionsMap.set(orderData.id, conversion);

  const approveLink = orderData.links?.find((l: any) => l.rel === 'payer-action' || l.rel === 'approve');
  const approveUrl = approveLink?.href || `https://www.sandbox.paypal.com/checkoutnow?token=${orderData.id}`;

  return {
    orderId: orderData.id,
    status: orderData.status, // e.g. 'CREATED' or 'PAYER_ACTION_REQUIRED'
    approveUrl,
    currency: 'USD',
    amount: conversion.convertedAmount,
    originalAmount: conversion.originalAmount,
    originalCurrency: conversion.originalCurrency,
    conversion,
    createdAt: orderData.create_time || new Date().toISOString(),
    links: orderData.links || [],
    rawPayPalResponse: orderData,
  };
}

/**
 * Fetches authoritative order details directly from PayPal Orders API v2.
 */
export async function getPayPalOrderDetails(orderId: string) {
  if (!orderId || !orderId.trim()) {
    throw new Error('INVALID_ARGUMENT: PayPal orderId is required.');
  }

  const accessToken = await getPayPalAccessToken();
  const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId.trim()}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  const orderData = await response.json().catch(() => ({}));

  if (!response.ok) {
    const debugId = response.headers.get('paypal-debug-id') || orderData.debug_id || 'N/A';
    console.error('[PACTPAY PayPal Order Fetch Error]', {
      status: response.status,
      debugId,
      errorName: orderData.name,
      message: orderData.message,
      details: orderData.details,
    });
    throw new Error(
      `PAYPAL_ORDER_FETCH_FAILED (Status ${response.status}, Debug ID: ${debugId}): ${orderData.message || response.statusText}`
    );
  }

  return orderData;
}

/**
 * Validates human sign-off authorization and verifies PayPal order status before capture.
 * Satisfies the 3-step Orders API pipeline: Create -> Approve -> Capture.
 */
export async function approvePayPalOrder(params: ApproveOrderParams) {
  // CRITICAL REQUIREMENT: Explicit human authorization required
  if (!params.humanApproved) {
    throw new Error(
      'SECURITY VIOLATION: AI cannot approve payments. Explicit human authorization is strictly required before PayPal approval.'
    );
  }

  if (!params.orderId || !params.orderId.trim()) {
    throw new Error('INVALID_ARGUMENT: PayPal orderId is required for approval.');
  }

  const orderId = params.orderId.trim();

  // Prevent approving already captured orders
  if (capturedOrders.has(orderId) || capturedOrderRecords.has(orderId)) {
    throw new Error(
      `ORDER_ALREADY_FINALIZED: Order ${orderId} has already been captured and finalized.`
    );
  }

  // Fetch actual order status from PayPal Sandbox
  const orderData = await getPayPalOrderDetails(orderId);

  // Valid pre-capture statuses in PayPal Orders API v2
  const validPreCaptureStatuses = ['CREATED', 'SAVED', 'APPROVED', 'PAYER_ACTION_REQUIRED'];
  if (!validPreCaptureStatuses.includes(orderData.status)) {
    throw new Error(
      `PAYPAL_INVALID_ORDER_STATE: Order is currently "${orderData.status}". Cannot approve an order with this status.`
    );
  }

  const authorizedAt = new Date().toISOString();
  const authorizedBy = params.humanAuthorizedBy || 'FinTech Officer';

  // Generate cryptographic approval token for audit trail
  const approvalAuditSignature = crypto
    .createHash('sha256')
    .update(`${orderId}:${params.requestId}:${authorizedBy}:${authorizedAt}`)
    .digest('hex');

  const approvedRecord: ApprovedOrderRecord = {
    orderId,
    requestId: params.requestId,
    authorizedBy,
    authorizedAt,
    approvalAuditSignature,
    note: params.note,
  };
  approvedOrdersMap.set(orderId, approvedRecord);

  const conversion = orderConversionsMap.get(orderId);

  return {
    success: true,
    approved: true,
    orderId,
    requestId: params.requestId,
    orderStatus: orderData.status,
    authorizedBy,
    authorizedAt,
    approvalAuditSignature,
    intent: orderData.intent,
    amount: orderData.purchase_units?.[0]?.amount,
    conversion,
    links: orderData.links || [],
    rawPayPalResponse: orderData,
  };
}

/**
 * Captures an authorized PayPal Sandbox Order via PayPal Checkout REST API v2.
 * Verifies PayPal's actual response status before marking any payment successful.
 * Prevents duplicate capture execution with memory guards and concurrent locks.
 */
export async function capturePayPalOrder(params: CaptureOrderParams) {
  // CRITICAL REQUIREMENT 4: Allow payment execution only after explicit human approval
  if (!params.humanApproved) {
    throw new Error(
      'SECURITY VIOLATION: Payment capture blocked. Human authorization signature missing.'
    );
  }

  if (!params.orderId || !params.orderId.trim()) {
    throw new Error('INVALID_ARGUMENT: PayPal orderId is required for capture.');
  }

  const orderId = params.orderId.trim();

  // CRITICAL REQUIREMENT 4 & 8: Handle duplicate requests safely
  if (capturedOrders.has(orderId) || capturedOrderRecords.has(orderId)) {
    const existing = capturedOrderRecords.get(orderId);
    throw new Error(
      `DUPLICATE_PAYMENT_BLOCKED: This PayPal order (${orderId}) has already been captured and finalized${
        existing ? ` with Capture ID ${existing.captureId} at ${existing.timestamp}` : ''
      }. Duplicate execution prevented.`
    );
  }

  // Prevent concurrent race-condition captures
  if (capturingInProgress.has(orderId)) {
    throw new Error(
      `CONCURRENT_CAPTURE_BLOCKED: Payment capture for order ${orderId} is currently being processed. Duplicate execution prevented.`
    );
  }

  capturingInProgress.add(orderId);

  try {
    // Authoritative check: verify order status from PayPal before attempting capture
    const currentOrder = await getPayPalOrderDetails(orderId);
    if (currentOrder.status === 'COMPLETED') {
      capturedOrders.add(orderId);
      const captureUnit = currentOrder.purchase_units?.[0]?.payments?.captures?.[0];
      const captureId = captureUnit?.id || `CAP-${orderId}`;
      const executedAt = captureUnit?.create_time || currentOrder.update_time || new Date().toISOString();
      return {
        success: true,
        status: 'COMPLETED' as const,
        orderId,
        captureId,
        payerEmail: currentOrder.payer?.email_address || 'verified-sandbox-payer@pactpay.internal',
        payerName: `${currentOrder.payer?.name?.given_name || ''} ${currentOrder.payer?.name?.surname || ''}`.trim() || 'PayPal Sandbox User',
        executedAt,
        auditProof: 'VERIFIED_PAYPAL_COMPLETED',
        amount: Number(captureUnit?.amount?.value) || 0,
        currency: captureUnit?.amount?.currency_code || 'USD',
        originalAmount: orderConversionsMap.get(orderId)?.originalAmount,
        originalCurrency: orderConversionsMap.get(orderId)?.originalCurrency || 'INR',
        conversion: orderConversionsMap.get(orderId),
        rawPayPalResponse: currentOrder,
      };
    }

    if (currentOrder.status !== 'APPROVED') {
      const approveLink = currentOrder.links?.find((l: any) => l.rel === 'payer-action' || l.rel === 'approve');
      const approveUrl = approveLink?.href || `https://www.sandbox.paypal.com/checkoutnow?token=${orderId}`;
      throw new Error(
        `ORDER_NOT_APPROVED: PayPal Order ${orderId} has status "${currentOrder.status}". Payer must approve the payment on PayPal before capture can be finalized. Please complete authorization at: ${approveUrl}`
      );
    }

    // Obtain verified access token (throws if credentials are missing or invalid)
    const accessToken = await getPayPalAccessToken();

    const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': `capture-${orderId}`,
      },
    });

    const captureData = await response.json().catch(() => ({}));

    if (!response.ok) {
      const debugId = response.headers.get('paypal-debug-id') || captureData.debug_id || 'N/A';
      console.error('[PACTPAY PayPal Capture Error]', {
        status: response.status,
        statusText: response.statusText,
        debugId,
        errorName: captureData.name,
        message: captureData.message,
        details: captureData.details,
      });
      const detailMsg = Array.isArray(captureData.details)
        ? captureData.details
            .map((d: any) => `${d.field ? `[Field: ${d.field}] ` : ''}${d.issue || 'ISSUE'}: ${d.description || ''}`)
            .join('; ')
        : '';
      throw new Error(
        `PAYPAL_CAPTURE_FAILED (Status ${response.status}, Debug ID: ${debugId}): ${
          captureData.name || 'Error'
        } - ${captureData.message || response.statusText}${detailMsg ? ` (${detailMsg})` : ''}`
      );
    }

    // CRITICAL REQUIREMENT 6 & 10: Verify payment status using PayPal's actual response. Never simulate or falsely report.
    const overallStatus = captureData.status;
    const captureUnit = captureData.purchase_units?.[0]?.payments?.captures?.[0];
    const captureStatus = captureUnit?.status || overallStatus;

    if (captureStatus !== 'COMPLETED') {
      throw new Error(
        `PAYPAL_PAYMENT_NOT_COMPLETED: PayPal returned status "${captureStatus}". Payment was not completed by PayPal.`
      );
    }

    // Mark as captured to block duplicate executions permanently
    capturedOrders.add(orderId);

    const captureId = captureUnit?.id || `CAP-${orderId}`;
    const executedAt = captureUnit?.create_time || captureData.update_time || new Date().toISOString();
    const payerEmail = captureData.payer?.email_address || 'verified-sandbox-payer@pactpay.internal';
    const payerName = `${captureData.payer?.name?.given_name || ''} ${captureData.payer?.name?.surname || ''}`.trim() || 'PayPal Sandbox User';

    // Cryptographic audit proof
    const auditProof = crypto
      .createHash('sha256')
      .update(`${orderId}:${params.requestId}:${captureId}:${executedAt}`)
      .digest('hex');

    capturedOrderRecords.set(orderId, {
      orderId,
      captureId,
      timestamp: executedAt,
      requestId: params.requestId,
    });

    const conversion = orderConversionsMap.get(orderId);

    return {
      success: true,
      status: 'COMPLETED' as const,
      orderId,
      captureId,
      payerEmail,
      payerName,
      executedAt,
      auditProof,
      amount: Number(captureUnit?.amount?.value) || conversion?.convertedAmount || 0,
      currency: captureUnit?.amount?.currency_code || 'USD',
      originalAmount: conversion?.originalAmount,
      originalCurrency: conversion?.originalCurrency || 'INR',
      conversion,
      rawPayPalResponse: captureData,
    };
  } finally {
    capturingInProgress.delete(orderId);
  }
}

export interface WebhookVerifyResult {
  verified: boolean;
  reason?: string;
  missingHeaders?: boolean;
  isPendingConfig?: boolean;
}

// In-memory duplicate webhook event idempotency tracker
const processedWebhookEventIds = new Set<string>();

export function isDuplicateWebhookEvent(eventId?: string): boolean {
  if (!eventId) return false;
  return processedWebhookEventIds.has(eventId);
}

export function recordProcessedWebhookEvent(eventId?: string): void {
  if (!eventId) return;
  processedWebhookEventIds.add(eventId);
  // Keep set bounded to prevent unbounded memory growth
  if (processedWebhookEventIds.size > 10000) {
    const oldest = Array.from(processedWebhookEventIds).slice(0, 2000);
    oldest.forEach(id => processedWebhookEventIds.delete(id));
  }
}

/**
 * Verifies PayPal Webhook transmission signatures using PayPal's verification API.
 * Safely parses headers case-insensitively, enforces timestamp freshness (10-min replay guard),
 * and verifies cryptographic signature against PayPal's REST API.
 */
export async function verifyPayPalWebhook(
  payload: any,
  headers: Record<string, string | string[] | undefined>
): Promise<WebhookVerifyResult> {
  // Case-insensitive header extractor
  const getHeader = (key: string): string | undefined => {
    const target = key.toLowerCase();
    for (const [k, v] of Object.entries(headers)) {
      if (k.toLowerCase() === target) {
        return Array.isArray(v) ? v[0] : v;
      }
    }
    return undefined;
  };

  const transmissionId = getHeader('paypal-transmission-id');
  const transmissionTime = getHeader('paypal-transmission-time');
  const certUrl = getHeader('paypal-cert-url');
  const authAlgo = getHeader('paypal-auth-algo');
  const actualSig = getHeader('paypal-transmission-sig');

  if (!transmissionId || !transmissionTime || !actualSig) {
    return {
      verified: false,
      missingHeaders: true,
      reason: 'PayPal transmission headers not present (unauthenticated test or probe request)',
    };
  }

  // Check freshness (10 minutes) to prevent replay attacks
  const timeDiff = Math.abs(Date.now() - new Date(transmissionTime).getTime());
  if (isNaN(timeDiff) || timeDiff > 10 * 60 * 1000) {
    return {
      verified: false,
      reason: 'EXPIRED_WEBHOOK_TRANSMISSION: Webhook timestamp is outside acceptable 10-minute window',
    };
  }

  // Check credentials
  const status = getPayPalConfigStatus();
  if (!status.configured) {
    return {
      verified: false,
      isPendingConfig: true,
      reason: `CREDENTIALS_MISSING: Cannot verify signature without ${status.missingCredentials.join(' and ')} in environment`,
    };
  }

  try {
    const accessToken = await getPayPalAccessToken();
    const webhookId = process.env.PAYPAL_WEBHOOK_ID || 'WH-PACTPAY-SANDBOX';

    const verifyRes = await fetch(`${PAYPAL_BASE_URL}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transmission_id: transmissionId,
        transmission_time: transmissionTime,
        cert_url: certUrl,
        auth_algo: authAlgo,
        transmission_sig: actualSig,
        webhook_id: webhookId,
        webhook_event: payload,
      }),
    });

    if (verifyRes.ok) {
      const result = await verifyRes.json();
      if (result.verification_status === 'SUCCESS') {
        return { verified: true };
      }
      return {
        verified: false,
        reason: `PayPal signature verification status: ${result.verification_status}`,
      };
    } else {
      const errText = await verifyRes.text().catch(() => '');
      return {
        verified: false,
        reason: `PayPal verification API responded with status ${verifyRes.status}: ${errText}`,
      };
    }
  } catch (err: any) {
    return {
      verified: false,
      reason: err.message || 'Webhook verification request failed',
    };
  }
}
