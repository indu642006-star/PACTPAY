import React, { useState } from 'react';
import { 
  CreditCard, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  X, 
  Loader2, 
  RefreshCw,
  ShieldCheck,
  UserCheck,
  ArrowRight
} from 'lucide-react';
import { usePactPay, ActiveCheckoutSession } from '../../context/PactPayContext';

interface PayPalCheckoutModalProps {
  session: ActiveCheckoutSession;
  onClose: () => void;
}

export const PayPalCheckoutModal: React.FC<PayPalCheckoutModalProps> = ({ session, onClose }) => {
  const { finalizePayPalPayment, cancelPayPalCheckout, checkPayPalOrderStatus, isProcessing } = usePactPay();
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(session.error || null);

  const handleManualCheckAndCapture = async () => {
    setCheckingStatus(true);
    setLocalError(null);
    setStatusMessage('Querying PayPal Sandbox Orders v2 API...');

    try {
      const order = await checkPayPalOrderStatus(session.orderId);
      if (order.status === 'APPROVED') {
        setStatusMessage('Buyer approval verified! Finalizing capture...');
        await finalizePayPalPayment(session.requestId, session.orderId);
      } else if (order.status === 'COMPLETED') {
        setStatusMessage('Order already captured by PayPal.');
        await finalizePayPalPayment(session.requestId, session.orderId);
      } else {
        setLocalError(
          `PayPal status is "${order.status}". Buyer has not authorized this payment yet. Click "Open PayPal Sandbox Checkout" below, log in with your sandbox buyer account, and click "Agree & Pay".`
        );
      }
    } catch (err: any) {
      setLocalError(err.message || 'Verification failed');
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleOpenPayPal = () => {
    if (session.approveUrl) {
      window.open(session.approveUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCancel = async () => {
    try {
      await cancelPayPalCheckout(session.requestId, session.orderId);
      onClose();
    } catch (err: any) {
      setLocalError(err.message || 'Could not cancel checkout');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl bg-[#09122a] border border-cyan-500/40 p-6 space-y-5 shadow-2xl animate-fadeIn">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/20 text-cyan-400 border border-blue-500/30">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>PayPal Sandbox Two-Phase Checkout</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-mono">
                  LIVE PIPELINE
                </span>
              </h3>
              <p className="text-xs text-slate-400">Order Creation → Buyer Sign-off → Verified Capture</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Multi-step Visual Stepper */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-between">
            <span>Checkout Progress</span>
            <span className="text-cyan-400 font-mono">Ref: {session.requestId}</span>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-1 text-[11px] font-medium">
            {/* Step 1: Created */}
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <div className="truncate">
                <span className="block text-[9px] text-emerald-400/80 font-bold">STEP 1</span>
                <span>Created</span>
              </div>
            </div>

            {/* Step 2: Awaiting Approval */}
            <div className={`p-2 rounded-lg border flex items-center gap-1.5 ${
              session.status === 'completed'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-cyan-500/20 border-cyan-500/40 text-cyan-200 animate-pulse'
            }`}>
              {session.status === 'completed' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              ) : (
                <Clock className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              )}
              <div className="truncate">
                <span className="block text-[9px] text-cyan-400 font-bold">STEP 2</span>
                <span>Approval</span>
              </div>
            </div>

            {/* Step 3: Capturing */}
            <div className={`p-2 rounded-lg border flex items-center gap-1.5 ${
              session.status === 'completed'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : session.status === 'capturing'
                ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-200'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}>
              {session.status === 'capturing' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400 flex-shrink-0" />
              ) : session.status === 'completed' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              ) : (
                <UserCheck className="w-3.5 h-3.5 flex-shrink-0" />
              )}
              <div className="truncate">
                <span className="block text-[9px] text-slate-400 font-bold">STEP 3</span>
                <span>Capture</span>
              </div>
            </div>

            {/* Step 4: Completed */}
            <div className={`p-2 rounded-lg border flex items-center gap-1.5 ${
              session.status === 'completed'
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}>
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              <div className="truncate">
                <span className="block text-[9px] font-bold">STEP 4</span>
                <span>Finalized</span>
              </div>
            </div>
          </div>
        </div>

        {/* Order Details Summary Card */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Target Product &amp; Merchant</span>
              <h4 className="text-sm font-bold text-white">{session.product}</h4>
              <p className="text-xs text-slate-400">{session.merchant}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400">Authorized Charge</span>
              <div className="text-base font-extrabold text-cyan-300">
                ₹{session.amountInr.toLocaleString('en-IN')} INR
              </div>
              <div className="text-xs font-mono text-emerald-400 font-bold">
                ≈ ${session.amountUsd.toFixed(2)} USD
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">PayPal Order ID:</span>
            <span className="text-cyan-300 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              {session.orderId}
            </span>
          </div>
        </div>

        {/* Completion Success State */}
        {session.status === 'completed' ? (
          <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-200 space-y-2 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h4 className="text-sm font-bold text-white">Payment Successfully Captured by PayPal!</h4>
            <p className="text-xs text-emerald-300/90">
              Capture ID: <code className="font-mono bg-emerald-950/80 px-2 py-0.5 rounded text-white">{session.captureId}</code>
            </p>
            <p className="text-[11px] text-slate-400">
              The transaction has been committed to the immutable audit ledger with cryptographic verification proof.
            </p>
            <button
              onClick={onClose}
              className="mt-3 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
            >
              Done &amp; View Ledger
            </button>
          </div>
        ) : (
          /* Active Checkout Action Panel */
          <div className="space-y-3">
            {/* Real-time Status / Polling Banner */}
            <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 text-blue-200 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
                <span>
                  {statusMessage || 'Listening for PayPal approval in real-time...'}
                </span>
              </div>
              <span className="text-[10px] font-mono text-cyan-400">Auto-Polling Active</span>
            </div>

            {/* Error banner if buyer clicked capture before approving */}
            {localError && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-300">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>Buyer Approval Required</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-200/90">{localError}</p>
              </div>
            )}

            {/* Sandbox Credentials Guidance */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400">Sandbox Testing Instructions</span>
              <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
                <li>Click the primary button below to launch the PayPal Sandbox checkout page.</li>
                <li>Sign in with your <strong>PayPal Sandbox Personal Buyer account</strong> (from developer.paypal.com &gt; Sandbox Accounts).</li>
                <li>Review the payment details (${session.amountUsd.toFixed(2)} USD) and click <strong>"Agree &amp; Pay"</strong>.</li>
                <li>PACTPAY automatically detects your authorization and captures the transaction.</li>
              </ol>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <button
                onClick={handleOpenPayPal}
                className="w-full sm:flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0070BA] via-blue-600 to-cyan-500 hover:from-blue-600 hover:to-cyan-400 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Open PayPal Sandbox Checkout</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleManualCheckAndCapture}
                disabled={checkingStatus || isProcessing}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 disabled:opacity-50 transition-colors"
              >
                {checkingStatus ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>I've Approved – Capture</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={handleCancel}
                className="text-[11px] text-slate-400 hover:text-rose-400 transition-colors"
              >
                Cancel Checkout Session
              </button>
              <button
                onClick={onClose}
                className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
              >
                Minimize &amp; Keep in Background
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
