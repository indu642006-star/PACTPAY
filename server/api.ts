import { Router, Request, Response } from 'express';
import { parsePurchaseIntent } from './gemini';
import { evaluatePaymentGuardian, GuardianInput } from './guardian';
import { 
  createPayPalOrder, 
  approvePayPalOrder,
  capturePayPalOrder, 
  getPayPalOrderDetails,
  getPayPalConfigStatus, 
  verifyPayPalWebhook,
  getApprovedOrdersList,
  getCapturedOrdersList,
  isDuplicateWebhookEvent,
  recordProcessedWebhookEvent
} from './paypal';

export const apiRouter = Router();

// 1. Check PayPal Sandbox configuration status
apiRouter.get('/paypal/status', (_req: Request, res: Response) => {
  const status = getPayPalConfigStatus();
  res.json({
    success: true,
    status,
  });
});

// 2. AI Purchase Assistant endpoint
apiRouter.post('/ai/parse-intent', async (req: Request, res: Response) => {
  try {
    const { prompt, fallbackCurrency } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'Prompt is required and must be a string' });
      return;
    }

    const intent = await parsePurchaseIntent(prompt, fallbackCurrency || 'INR');
    res.json({
      success: true,
      intent,
    });
  } catch (error: any) {
    console.error('[API /ai/parse-intent] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to parse purchase intent with Gemini AI',
    });
  }
});

// 3. Payment Guardian Firewall evaluation endpoint
apiRouter.post('/guardian/evaluate', (req: Request, res: Response) => {
  try {
    const input: GuardianInput = req.body;
    if (!input || !input.request || !input.policy) {
      res.status(400).json({ error: 'Request and Policy objects are required' });
      return;
    }

    const evaluation = evaluatePaymentGuardian(input);
    res.json({
      success: true,
      evaluation,
    });
  } catch (error: any) {
    console.error('[API /guardian/evaluate] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Guardian evaluation failed',
    });
  }
});

// 4. PayPal Sandbox Order Creation
apiRouter.post('/paypal/create-order', async (req: Request, res: Response) => {
  try {
    const { requestId, product, amount, currency, merchant, userEmail, humanApproved, humanAuthorizedBy } = req.body;

    // Requirement 4: Allow payment execution only after explicit human approval
    if (!humanApproved) {
      res.status(403).json({
        success: false,
        error: 'SECURITY VIOLATION: AI cannot authorize or create PayPal orders. Explicit human authorization required.',
      });
      return;
    }

    // Check credentials
    const configStatus = getPayPalConfigStatus();
    if (!configStatus.configured) {
      res.status(400).json({
        success: false,
        error: `PayPal Sandbox credentials missing: Please configure ${configStatus.missingCredentials.join(' and ')} in your environment variables.`,
        missingCredentials: configStatus.missingCredentials,
      });
      return;
    }

    const order = await createPayPalOrder({
      requestId,
      product,
      amount: Number(amount),
      currency: currency || 'USD',
      merchant: merchant || 'Merchant',
      userEmail: userEmail || 'user@pactpay.internal',
      humanApproved: Boolean(humanApproved),
      humanAuthorizedBy,
    });

    res.json({
      success: true,
      order,
    });
  } catch (error: any) {
    console.error('[API /paypal/create-order] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create PayPal order',
    });
  }
});

// 5. PayPal Sandbox Order Approval Verification (Human authorization checkpoint)
apiRouter.post('/paypal/approve-order', async (req: Request, res: Response) => {
  try {
    const { orderId, requestId, humanApproved, humanAuthorizedBy, note } = req.body;

    // Requirement 4: Allow payment execution only after explicit human approval
    if (!humanApproved) {
      res.status(403).json({
        success: false,
        error: 'SECURITY VIOLATION: Payment approval blocked without explicit human authorization signature.',
      });
      return;
    }

    if (!orderId) {
      res.status(400).json({ success: false, error: 'orderId is required' });
      return;
    }

    // Check credentials
    const configStatus = getPayPalConfigStatus();
    if (!configStatus.configured) {
      res.status(400).json({
        success: false,
        error: `PayPal Sandbox credentials missing: Please configure ${configStatus.missingCredentials.join(' and ')} in your environment variables.`,
        missingCredentials: configStatus.missingCredentials,
      });
      return;
    }

    const approvalResult = await approvePayPalOrder({
      orderId,
      requestId,
      humanApproved: Boolean(humanApproved),
      humanAuthorizedBy,
      note,
    });

    res.json(approvalResult);
  } catch (error: any) {
    console.error('[API /paypal/approve-order] Error:', error);
    const isStateError = error.message?.includes('INVALID_ORDER_STATE') || error.message?.includes('ALREADY_FINALIZED');
    const isAuthError = error.message?.includes('CREDENTIALS') || error.message?.includes('AUTHENTICATION');
    res.status(isStateError ? 409 : isAuthError ? 401 : 500).json({
      success: false,
      error: error.message || 'PayPal order approval verification failed',
    });
  }
});

// 6. Inspect PayPal Order Details
apiRouter.get('/paypal/orders/:orderId', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const configStatus = getPayPalConfigStatus();
    if (!configStatus.configured) {
      res.status(400).json({
        success: false,
        error: `PayPal Sandbox credentials missing: ${configStatus.missingCredentials.join(', ')}`,
      });
      return;
    }

    const orderData = await getPayPalOrderDetails(orderId);
    res.json({
      success: true,
      order: orderData,
    });
  } catch (error: any) {
    console.error('[API /paypal/orders/:orderId] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch PayPal order details',
    });
  }
});

// 7. PayPal Sandbox Order Capture
apiRouter.post('/paypal/capture-order', async (req: Request, res: Response) => {
  try {
    const { orderId, requestId, humanApproved } = req.body;

    // Requirement 4: Allow payment execution only after explicit human approval
    if (!humanApproved) {
      res.status(403).json({
        success: false,
        error: 'SECURITY VIOLATION: Payment capture blocked without human authorization signature.',
      });
      return;
    }

    if (!orderId) {
      res.status(400).json({ success: false, error: 'orderId is required' });
      return;
    }

    // Check credentials
    const configStatus = getPayPalConfigStatus();
    if (!configStatus.configured) {
      res.status(400).json({
        success: false,
        error: `PayPal Sandbox credentials missing: Please configure ${configStatus.missingCredentials.join(' and ')} in your environment variables.`,
        missingCredentials: configStatus.missingCredentials,
      });
      return;
    }

    const captureResult = await capturePayPalOrder({
      orderId,
      requestId,
      humanApproved: Boolean(humanApproved),
    });

    res.json(captureResult);
  } catch (error: any) {
    console.error('[API /paypal/capture-order] Error:', error);
    const isDuplicate = error.message?.includes('DUPLICATE') || error.message?.includes('CONCURRENT');
    const isAuthError = error.message?.includes('CREDENTIALS') || error.message?.includes('AUTHENTICATION');
    res.status(isDuplicate ? 409 : isAuthError ? 401 : 500).json({
      success: false,
      error: error.message || 'PayPal order capture failed',
    });
  }
});

// 8a. PayPal Webhook health check & diagnostic route (GET)
apiRouter.get('/paypal/webhook', (_req: Request, res: Response) => {
  const config = getPayPalConfigStatus();
  res.json({
    status: 'ACTIVE',
    endpoint: '/api/paypal/webhook',
    method: 'POST',
    configured: config.configured,
    environment: config.environment,
    description: 'PACTPAY PayPal Sandbox webhook event receiver with cryptographic signature verification.',
    timestamp: new Date().toISOString(),
  });
});

// 8b. PayPal Webhook signature verification & event ingestion (POST)
apiRouter.post('/paypal/webhook', async (req: Request, res: Response) => {
  try {
    const event = req.body || {};
    const transmissionId = (req.headers['paypal-transmission-id'] || req.headers['PAYPAL-TRANSMISSION-ID']) as string | undefined;
    const eventId = event.id || transmissionId;

    // Duplicate event protection: ignore previously processed webhook transmissions
    if (eventId && isDuplicateWebhookEvent(eventId)) {
      console.log('[PACTPAY Webhook] Duplicate event detected and skipped:', eventId, event.event_type);
      res.status(200).json({
        received: true,
        verified: true,
        status: 'DUPLICATE_EVENT_ACKNOWLEDGED',
        duplicate: true,
        eventId,
        eventType: event.event_type || 'UNKNOWN',
        note: 'Event was already processed and recorded. Duplicate skipped.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const verifyResult = await verifyPayPalWebhook(event, req.headers as Record<string, string>);

    if (!verifyResult.verified) {
      // Standard webhook protocol: Acknowledge receipt with 200 OK while marking verification status
      // This stops webhook delivery retry loops, avoids logging error alarms, and prevents fake executions.
      res.status(200).json({ 
        received: true,
        verified: false,
        status: 'UNVERIFIED',
        reason: verifyResult.reason,
        eventType: event.event_type || 'UNKNOWN',
        note: 'Payload received and acknowledged without execution. Real signature verification requires PayPal transmission headers and server credentials.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Record processed event to prevent future duplicate execution
    if (eventId) {
      recordProcessedWebhookEvent(eventId);
    }

    // Cryptographically verified by PayPal's signature verification API
    console.log('[PACTPAY Webhook Verified & Processed]', event.event_type, event.summary);

    // Handle key event types: CHECKOUT.ORDER.APPROVED, PAYMENT.CAPTURE.COMPLETED, PAYMENT.CAPTURE.DENIED
    res.status(200).json({
      received: true,
      verified: true,
      status: 'VERIFIED',
      eventType: event.event_type || 'PAYMENT.CAPTURE.COMPLETED',
      resourceId: event.resource?.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(200).json({
      received: true,
      verified: false,
      error: 'Webhook processing error',
      details: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// 9. Inspect server-side recorded PayPal orders (Approved and Captured registries)
apiRouter.get('/paypal/orders', (_req: Request, res: Response) => {
  const status = getPayPalConfigStatus();
  res.json({
    success: true,
    status: status.status,
    configured: status.configured,
    approvedOrders: getApprovedOrdersList(),
    capturedOrders: getCapturedOrdersList(),
    totalApproved: getApprovedOrdersList().length,
    totalCaptured: getCapturedOrdersList().length,
  });
});

// 10. Developer Guide for configuring real PayPal Sandbox credentials
apiRouter.get('/paypal/credentials-guide', (_req: Request, res: Response) => {
  res.json({
    title: 'PACTPAY PayPal Sandbox Configuration Guide',
    policy: 'Strict Zero-Simulation Policy: PACTPAY never synthesizes fake captures or fabricated transactions.',
    steps: [
      {
        step: 1,
        instruction: 'Log in to developer.paypal.com with your PayPal account.',
      },
      {
        step: 2,
        instruction: 'Navigate to Dashboard > Apps & Credentials > Sandbox.',
      },
      {
        step: 3,
        instruction: 'Select or create a REST API App (e.g., "PACTPAY-Firewall").',
      },
      {
        step: 4,
        instruction: 'Copy the Client ID and Secret Key.',
      },
      {
        step: 5,
        instruction: 'Add them to your server environment variables or .env file:',
        variables: {
          PAYPAL_CLIENT_ID: 'Your sandbox client ID',
          PAYPAL_CLIENT_SECRET: 'Your sandbox secret key',
          PAYPAL_WEBHOOK_ID: '(Optional) Your webhook ID for signature verification',
        },
      },
    ],
    restEndpoints: {
      auth: 'POST https://api-m.sandbox.paypal.com/v1/oauth2/token',
      createOrder: 'POST https://api-m.sandbox.paypal.com/v2/checkout/orders',
      orderDetails: 'GET https://api-m.sandbox.paypal.com/v2/checkout/orders/{order_id}',
      captureOrder: 'POST https://api-m.sandbox.paypal.com/v2/checkout/orders/{order_id}/capture',
      verifyWebhook: 'POST https://api-m.sandbox.paypal.com/v1/notifications/verify-webhook-signature',
    },
  });
});

// 11. Test Webhook Parser endpoint (safely test webhook event structure without faking payment execution)
apiRouter.post('/paypal/webhook/test', (req: Request, res: Response) => {
  const event = req.body;
  if (!event || !event.event_type) {
    res.status(400).json({
      success: false,
      error: 'Invalid webhook payload: event_type is required',
    });
    return;
  }

  const supportedTypes = [
    'CHECKOUT.ORDER.APPROVED',
    'PAYMENT.CAPTURE.COMPLETED',
    'PAYMENT.CAPTURE.DENIED',
    'PAYMENT.CAPTURE.REFUNDED',
    'CHECKOUT.ORDER.COMPLETED',
  ];

  res.json({
    success: true,
    testMode: true,
    eventType: event.event_type,
    isStandardPayPalEvent: supportedTypes.includes(event.event_type),
    resourceId: event.resource?.id || 'N/A',
    summary: event.summary || 'Test webhook simulation',
    note: 'Test payload parsed successfully without executing real monetary capture.',
    timestamp: new Date().toISOString(),
  });
});

// 12. System status
apiRouter.get('/system/status', (_req: Request, res: Response) => {
  const paypalStatus = getPayPalConfigStatus();
  res.json({
    app: 'PACTPAY',
    version: '1.0.0',
    tagline: 'Let AI decide. Let humans authorize. Let PayPal execute.',
    aiModel: 'gemini-3.8-flash',
    paypal: {
      mode: paypalStatus.configured ? 'Sandbox-Active' : 'Sandbox-PendingCredentials',
      configured: paypalStatus.configured,
      missingCredentials: paypalStatus.missingCredentials,
      environment: 'sandbox',
    },
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});
