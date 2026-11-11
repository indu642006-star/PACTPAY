import crypto from 'crypto';

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
  status: 'READY' | 'PENDING_CONFIGURATION';
  message: string;
  endpoints: {
    createOrder: string;
    approveOrder: string;
    captureOrder: string;
    webhook: string;
    orderDetails: string;
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

// Concurrency lock to prevent simultaneous duplicate capture attempts
const capturingInProgress = new Set<string>();

// In-memory OAuth token cache
let cachedAccessToken: string | null = null;
let cachedTokenExpiresAt: number = 0;

const PAYPAL_BASE_URL = 'https://api-m.sandbox.paypal.com';

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

  return {
    configured: isConfigured,
    missingCredentials: missing,
    environment: 'sandbox',
    baseUrl: PAYPAL_BASE_URL,
    status: isConfigured ? 'READY' : 'PENDING_CONFIGURATION',
    message: isConfigured
      ? 'PayPal Sandbox integration is fully configured and ready for live capture.'
      : 'PayPal Sandbox integration code is complete and active. Real Sandbox credentials pending in server environment variables.',
    endpoints: {
      createOrder: 'POST /api/paypal/create-order',
      approveOrder: 'POST /api/paypal/approve-order',
      captureOrder: 'POST /api/paypal/capture-order',
      webhook: 'POST /api/paypal/webhook',
      orderDetails: 'GET /api/paypal/orders/:orderId',
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

  // Supported PayPal Sandbox currencies
  const validCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'JPY', 'SGD', 'HKD', 'NZD', 'CHF'];
  const currencyCode = validCurrencies.includes(params.currency?.toUpperCase()) 
    ? params.currency.toUpperCase() 
    : 'USD';

  // Obtain verified access token (throws if credentials are missing or invalid)
  const accessToken = await getPayPalAccessToken();

  const orderPayload = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: params.requestId,
        description: `PACTPAY: ${params.product.substring(0, 120)} (${params.merchant})`,
        custom_id: params.requestId,
        amount: {
          currency_code: currencyCode,
          value: params.amount.toFixed(2),
        },
      },
    ],
    application_context: {
      brand_name: 'PACTPAY AI Firewall',
      landing_page: 'NO_PREFERENCE',
      user_action: 'PAY_NOW',
      return_url: `${process.env.APP_URL || 'http://localhost:3000'}/api/paypal/return`,
      cancel_url: `${process.env.APP_URL || 'http://localhost:3000'}/api/paypal/cancel`,
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
    console.error('[PACTPAY PayPal Order Creation Error]', response.status, orderData);
    const detailMsg = orderData.details?.map((d: any) => `${d.issue}: ${d.description}`).join('; ');
    throw new Error(
      `PAYPAL_ORDER_CREATION_FAILED: ${orderData.message || response.statusText}${detailMsg ? ` (${detailMsg})` : ''}`
    );
  }

  if (!orderData.id) {
    throw new Error('PAYPAL_ORDER_CREATION_FAILED: PayPal did not return a valid order ID.');
  }

  return {
    orderId: orderData.id,
    status: orderData.status, // e.g. 'CREATED'
    currency: currencyCode,
    amount: params.amount,
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
    throw new Error(
      `PAYPAL_ORDER_FETCH_FAILED: ${orderData.message || response.statusText}`
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
      console.error('[PACTPAY PayPal Capture Error]', response.status, captureData);
      const detailMsg = captureData.details?.map((d: any) => `${d.issue}: ${d.description}`).join('; ');
      throw new Error(
        `PAYPAL_CAPTURE_FAILED: ${captureData.name || 'Error'} - ${captureData.message || response.statusText}${detailMsg ? ` (${detailMsg})` : ''}`
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

    return {
      success: true,
      status: 'COMPLETED' as const,
      orderId,
      captureId,
      payerEmail,
      payerName,
      executedAt,
      auditProof,
      amount: Number(captureUnit?.amount?.value) || 0,
      currency: captureUnit?.amount?.currency_code || 'USD',
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
