import { Router, Request, Response } from 'express';
import { parsePurchaseIntent } from './gemini';
import { evaluatePaymentGuardian, GuardianInput } from './guardian';
import { 
  createPayPalOrder, 
  capturePayPalOrder, 
  getPayPalConfigStatus, 
  verifyPayPalWebhook 
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

// 5. PayPal Sandbox Order Capture
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
    const isDuplicate = error.message?.includes('DUPLICATE');
    const isAuthError = error.message?.includes('CREDENTIALS') || error.message?.includes('AUTHENTICATION');
    res.status(isDuplicate ? 409 : isAuthError ? 401 : 500).json({
      success: false,
      error: error.message || 'PayPal order capture failed',
    });
  }
});

// 6. PayPal Webhooks
apiRouter.post('/paypal/webhook', async (req: Request, res: Response) => {
  try {
    const verified = await verifyPayPalWebhook(req.body, req.headers as Record<string, string>);
    if (!verified) {
      res.status(400).json({ error: 'Webhook signature verification failed' });
      return;
    }

    const event = req.body;
    console.log('[PACTPAY Webhook Received]', event.event_type, event.summary);

    res.json({
      received: true,
      verified: true,
      eventType: event.event_type || 'PAYMENT.CAPTURE.COMPLETED',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[API /paypal/webhook] Error:', error);
    res.status(500).json({ error: 'Webhook processing error' });
  }
});

// 7. System status
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
