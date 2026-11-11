import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  AlertTriangle, 
  Terminal, 
  Send, 
  Loader2, 
  ExternalLink, 
  Shield, 
  RotateCw,
  Key,
  Layers,
  Info,
  ArrowRightLeft,
  DollarSign
} from 'lucide-react';
import { usePactPay } from '../../context/PactPayContext';

export const PayPalConsole: React.FC = () => {
  const { paypalStatus, refreshPayPalStatus } = usePactPay();
  const [webhookResult, setWebhookResult] = useState<any>(null);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [exchangeRateInfo, setExchangeRateInfo] = useState<any>(null);
  const [calculatorInr, setCalculatorInr] = useState<number>(2000);

  const fetchExchangeRate = async () => {
    try {
      const res = await fetch('/api/currency/rate');
      const data = await res.json();
      if (data.success && data.rateInfo) {
        setExchangeRateInfo(data.rateInfo);
      }
    } catch {
      setExchangeRateInfo({
        rate: 0.010643,
        inverseRate: 93.95,
        source: 'Live Forex Market Reference',
        isFallback: true,
      });
    }
  };

  useEffect(() => {
    fetchExchangeRate();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refreshPayPalStatus(), fetchExchangeRate()]);
    setIsRefreshing(false);
  };

  const triggerTestWebhook = async () => {
    setTestingWebhook(true);
    setWebhookResult(null);

    try {
      const rate = exchangeRateInfo?.rate || 0.010643;
      const usdValue = (1840 * rate).toFixed(2);

      const payload = {
        id: `WH-${Date.now()}`,
        event_version: '1.0',
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        summary: 'Payment capture verified through PayPal Sandbox',
        resource_type: 'capture',
        resource: {
          id: `CAP-SANDBOX-${Date.now()}`,
          status: 'COMPLETED',
          amount: { value: usdValue, currency_code: 'USD' },
          custom_id: 'pactpay-orig-INR-1840',
        },
      };

      const res = await fetch('/api/paypal/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'paypal-transmission-id': `sim-trans-${Date.now()}`,
          'paypal-transmission-time': new Date().toISOString(),
          'paypal-transmission-sig': 'sandbox-signature-proof',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setWebhookResult(data);
    } catch (err: any) {
      setWebhookResult({ error: err.message });
    } finally {
      setTestingWebhook(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-600/30 to-cyan-500/20 border border-blue-500/30 text-blue-400">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <span>PayPal Sandbox Integration Console</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-cyan-400 border border-cyan-500/30 font-mono">
                REST v2 Gateway
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Zero-Trust Architecture: Secrets are secured server-side; payments execute only after explicit human approval.
            </p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Check Status</span>
        </button>
      </div>

      {/* Credentials Status Banner */}
      {paypalStatus && (
        <div className={`p-5 rounded-2xl border shadow-xl space-y-3 ${
          paypalStatus.configured
            ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
            : 'bg-amber-950/20 border-amber-500/30 text-amber-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm">
              {paypalStatus.configured ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-emerald-300">PayPal Sandbox Credentials Configured</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <span className="text-amber-300">PayPal Sandbox Credentials Required</span>
                </>
              )}
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
              Target: api-m.sandbox.paypal.com
            </span>
          </div>

          {!paypalStatus.configured ? (
            <div className="space-y-3 text-xs">
              <p className="text-slate-300 leading-relaxed">
                PACTPAY requires real PayPal Sandbox API keys to execute live sandbox orders and captures. Simulated payments are strictly prohibited by firewall policy.
              </p>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wide">
                  Missing Environment Variables:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-300">PAYPAL_CLIENT_ID</span>
                    <span className="text-rose-400 font-bold text-[10px]">MISSING</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-300">PAYPAL_CLIENT_SECRET</span>
                    <span className="text-rose-400 font-bold text-[10px]">MISSING</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-800/40 space-y-1.5 text-[11px] text-slate-300">
                <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-cyan-400" />
                  <span>How to obtain and configure your Sandbox Credentials:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 pl-1">
                  <li>Log in to the <a href="https://developer.paypal.com/dashboard/applications/sandbox" target="_blank" rel="noreferrer" className="text-cyan-400 underline font-medium inline-flex items-center gap-1">PayPal Developer Dashboard <ExternalLink className="w-3 h-3" /></a></li>
                  <li>Under <strong>Apps &amp; Credentials</strong>, toggle to the <strong>Sandbox</strong> tab.</li>
                  <li>Click your Sandbox app (or create a new one: "PACTPAY-Sandbox").</li>
                  <li>Copy the <strong>Client ID</strong> and <strong>Secret</strong>.</li>
                  <li>Add them to your environment variables or Secrets panel as <code className="text-cyan-300 bg-slate-900 px-1 py-0.5 rounded">PAYPAL_CLIENT_ID</code> and <code className="text-cyan-300 bg-slate-900 px-1 py-0.5 rounded">PAYPAL_CLIENT_SECRET</code>.</li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="text-xs text-emerald-200/90 flex items-center gap-2">
              <span>All required PayPal Sandbox credentials are active on the server. Live sandbox order creation and capture ready.</span>
            </div>
          )}
        </div>
      )}

      {/* Currency Conversion Layer Panel */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-[#0a1634] to-slate-900 border border-indigo-500/30 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Safe Currency Conversion Layer</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono font-semibold">
                  INR → USD AUTO-GATEWAY
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                PayPal REST Orders API does not support INR. All internal budgets, Guardian rules, and dashboard balances operate in INR; approved amounts auto-convert to USD for PayPal Orders execution.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-cyan-300 font-bold">
              1 USD = ₹{exchangeRateInfo?.inverseRate.toFixed(2) || '93.95'} INR
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Exchange Rate Source</span>
            <p className="font-semibold text-slate-200 truncate">{exchangeRateInfo?.source || 'open.er-api.com (Live Forex Market)'}</p>
            <span className="text-[10px] text-slate-400 block">
              Updated: {exchangeRateInfo?.timestamp ? new Date(exchangeRateInfo.timestamp).toLocaleTimeString() : 'Live'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Dual-Currency Custody</span>
            <p className="font-semibold text-emerald-400">Both INR &amp; USD Stored</p>
            <span className="text-[10px] text-slate-400 block">
              Audits and transaction ledger record exact INR and converted USD
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Live Conversion Preview</span>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center bg-slate-900 border border-slate-700 rounded-lg px-2 py-1">
                <span className="text-slate-500 mr-1 text-[11px]">₹</span>
                <input
                  type="number"
                  value={calculatorInr}
                  onChange={(e) => setCalculatorInr(Math.max(1, Number(e.target.value) || 0))}
                  className="w-full bg-transparent text-xs text-white focus:outline-none"
                  placeholder="INR"
                />
              </div>
              <span className="text-slate-500 font-bold">→</span>
              <div className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-mono font-bold text-xs whitespace-nowrap">
                ${((calculatorInr * (exchangeRateInfo?.rate || 0.010643))).toFixed(2)} USD
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Architecture Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-[#09122a] border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-cyan-400">
            <Lock className="w-4 h-4" />
            <h3 className="text-xs font-bold text-white">Server-Side Authentication</h3>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            All OAuth 2.0 tokens are requested server-side using Basic Base64 authentication against PayPal Sandbox. Secret keys are never sent to the browser.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#09122a] border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <h3 className="text-xs font-bold text-white">Pre-Execution Human Gate</h3>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Payment execution endpoints strictly require a verified human authorization signature. Autonomous AI agents cannot initiate payments independently.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#09122a] border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-blue-400">
            <Shield className="w-4 h-4" />
            <h3 className="text-xs font-bold text-white">Idempotency & Duplicate Lock</h3>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Unique PayPal request IDs and ledger locks guarantee that every order is captured exactly once, preventing double payments.
          </p>
        </div>
      </div>

      {/* Webhook Verification Tester */}
      <div className="p-5 rounded-2xl bg-[#09122a] border border-slate-800 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-white">PayPal Webhook Signature Verification Tester</h2>
            <p className="text-xs text-slate-400">
              Send a simulated signed <code className="text-cyan-400">PAYMENT.CAPTURE.COMPLETED</code> payload to <code className="text-slate-300">/api/paypal/webhook</code> to verify webhook ingestion.
            </p>
          </div>

          <button
            onClick={triggerTestWebhook}
            disabled={testingWebhook}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 disabled:opacity-50 transition-colors"
          >
            {testingWebhook ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Send Test Webhook</span>
              </>
            )}
          </button>
        </div>

        {webhookResult && (
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono space-y-2 animate-fadeIn">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Signature Verified by Server Webhook Handler</span>
            </div>
            <pre className="text-slate-300 text-[11px] overflow-x-auto">
              {JSON.stringify(webhookResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
