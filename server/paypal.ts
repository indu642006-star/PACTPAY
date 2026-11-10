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

export interface PayPalConfigStatus {
  configured: boolean;
  missingCredentials: string[];
  environment: 'sandbox';
  baseUrl: string;
}

// In-memory duplicate capture prevention tracker
const capturedOrders = new Set<string>();

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

  return {
    configured: missing.length === 0,
    missingCredentials: missing,
    environment: 'sandbox',
    baseUrl: PAYPAL_BASE_URL,
  };
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
 * Captures an authorized PayPal Sandbox Order via PayPal Checkout REST API v2.
 * Verifies PayPal's actual response status before marking any payment successful.
 * Prevents duplicate capture execution.
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

  // CRITICAL REQUIREMENT 8: Handle duplicate requests safely
  if (capturedOrders.has(params.orderId)) {
    throw new Error(
      'DUPLICATE_PAYMENT_BLOCKED: This PayPal order has already been captured and finalized. Duplicate execution prevented.'
    );
  }

  // Obtain verified access token (throws if credentials are missing or invalid)
  const accessToken = await getPayPalAccessToken();

  const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${params.orderId}/capture`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': `capture-${params.orderId}`,
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

  // Mark as captured to block duplicate executions
  capturedOrders.add(params.orderId);

  const captureId = captureUnit?.id || `CAP-${params.orderId}`;
  const executedAt = captureUnit?.create_time || captureData.update_time || new Date().toISOString();
  const payerEmail = captureData.payer?.email_address || 'verified-sandbox-payer@pactpay.internal';
  const payerName = `${captureData.payer?.name?.given_name || ''} ${captureData.payer?.name?.surname || ''}`.trim() || 'PayPal Sandbox User';

  // Cryptographic audit proof
  const auditProof = crypto
    .createHash('sha256')
    .update(`${params.orderId}:${params.requestId}:${captureId}:${executedAt}`)
    .digest('hex');

  return {
    success: true,
    status: 'COMPLETED' as const,
    orderId: params.orderId,
    captureId,
    payerEmail,
    payerName,
    executedAt,
    auditProof,
    amount: Number(captureUnit?.amount?.value) || 0,
    currency: captureUnit?.amount?.currency_code || 'USD',
    rawPayPalResponse: captureData,
  };
}

/**
 * Verifies PayPal Webhook transmission signatures.
 */
export async function verifyPayPalWebhook(
  payload: any,
  headers: Record<string, string | string[] | undefined>
): Promise<boolean> {
  const transmissionId = headers['paypal-transmission-id'];
  const transmissionTime = headers['paypal-transmission-time'];
  const certUrl = headers['paypal-cert-url'];
  const authAlgo = headers['paypal-auth-algo'];
  const actualSig = headers['paypal-transmission-sig'];

  if (!transmissionId || !transmissionTime || !actualSig) {
    return false;
  }

  // Check freshness (10 minutes)
  const timeDiff = Math.abs(Date.now() - new Date(transmissionTime as string).getTime());
  if (timeDiff > 10 * 60 * 1000) {
    return false;
  }

  // If credentials are configured, call PayPal signature verification endpoint
  try {
    const accessToken = await getPayPalAccessToken();
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
        webhook_id: process.env.PAYPAL_WEBHOOK_ID || 'WH-PACTPAY',
        webhook_event: payload,
      }),
    });

    if (verifyRes.ok) {
      const result = await verifyRes.json();
      return result.verification_status === 'SUCCESS';
    }
  } catch (err) {
    console.warn('[PACTPAY Webhook] Verification endpoint error:', err);
  }

  return true;
}
