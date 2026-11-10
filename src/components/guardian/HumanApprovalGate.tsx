import React, { useState } from 'react';
import { 
  UserCheck, 
  ShieldCheck, 
  ShieldAlert, 
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Lock,
  ArrowRight,
  ExternalLink,
  Loader2,
  FileText,
  DollarSign,
  Store,
  Clock,
  Sparkles,
  Code2,
  Info
} from 'lucide-react';
import { usePactPay } from '../../context/PactPayContext';
import { useAuth } from '../../context/AuthContext';
import { PurchaseRequest } from '../../types';

export const HumanApprovalGate: React.FC = () => {
  const { requests, authorizeRequest, rejectRequest, executePayPalPayment, isProcessing, activeRequestId, paypalStatus } = usePactPay();
  const { user } = useAuth();

  const [selectedReq, setSelectedReq] = useState<PurchaseRequest | null>(null);
  const [approvalNote, setApprovalNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [inspectPayloadReq, setInspectPayloadReq] = useState<PurchaseRequest | null>(null);

  // Filter requests that are awaiting human decision OR human-approved awaiting PayPal execution
  const pendingRequests = requests.filter(r => r.status === 'guardian_approved');
  const authorizedPendingPayment = requests.filter(r => r.status === 'human_approved');
  const pastDecisions = requests.filter(r => ['completed', 'human_rejected', 'guardian_blocked'].includes(r.status));

  const handleAuthorize = async (req: PurchaseRequest) => {
    setAuthError(null);
    try {
      await authorizeRequest(req.id, approvalNote || 'Explicit human authorization granted.');
      setSelectedReq(null);
      setApprovalNote('');
    } catch (err: any) {
      setAuthError(err.message || 'Authorization failed');
    }
  };

  const handleReject = async (req: PurchaseRequest) => {
    setAuthError(null);
    try {
      await rejectRequest(req.id, rejectReason || 'Declined by human authority');
      setShowRejectModal(false);
      setSelectedReq(null);
      setRejectReason('');
    } catch (err: any) {
      setAuthError(err.message || 'Rejection failed');
    }
  };

  const handleExecutePayment = async (requestId: string) => {
    setAuthError(null);
    if (paypalStatus && !paypalStatus.configured) {
      setAuthError(
        `PayPal Sandbox credentials missing: Please configure ${paypalStatus.missingCredentials.join(' and ')} in your server environment variables before executing real PayPal Sandbox payments.`
      );
      return;
    }
    try {
      await executePayPalPayment(requestId);
    } catch (err: any) {
      setAuthError(err.message || 'PayPal payment execution failed');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Title & Security Principle Banner */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-400">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <span>Human Authorization Gate</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono font-bold">
                MANDATORY CHECKPOINT
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Zero-Trust Principle: AI is strictly prohibited from authorizing or executing payments. Every transaction requires verified human sign-off.
            </p>
          </div>
        </div>

        {/* PayPal Credentials Status Warning if missing */}
        {paypalStatus && !paypalStatus.configured && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>PayPal Sandbox Configuration Required for Live Execution</span>
            </div>
            <p className="text-[11px] text-amber-200/90 leading-relaxed">
              PACTPAY strictly adheres to zero false-reporting and never simulates payments. To execute actual transactions on PayPal Sandbox, configure the following server environment variables:
            </p>
            <div className="flex flex-wrap gap-2 pt-1 font-mono text-[11px]">
              {paypalStatus.missingCredentials.map((cred) => (
                <span key={cred} className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/40 text-amber-300">
                  {cred} (MISSING)
                </span>
              ))}
            </div>
            <p className="text-[10px] text-slate-400">
              Obtain Sandbox credentials from <strong>developer.paypal.com &gt; Apps &amp; Credentials &gt; Sandbox</strong>.
            </p>
          </div>
        )}

        {authError && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{authError}</span>
          </div>
        )}
      </div>

      {/* SECTION 1: Ready for PayPal Execution (Already Human-Approved) */}
      {authorizedPendingPayment.length > 0 && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-950/60 via-[#0a1838] to-slate-900 border border-cyan-500/40 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300">
                <Lock className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-white">
                Human Sign-Off Verified • Ready for PayPal Sandbox Execution ({authorizedPendingPayment.length})
              </h2>
            </div>
            <span className="text-[11px] text-cyan-300 font-mono">
              Server-side PayPal v2 Gateway
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {authorizedPendingPayment.map((req) => (
              <div
                key={req.id}
                className="p-4 rounded-xl bg-slate-900/80 border border-slate-700/80 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-cyan-400">{req.id}</span>
                      {req.isSampleData ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-semibold">
                          SAMPLE PROPOSAL
                        </span>
                      ) : (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-semibold">
                          LIVE PROPOSAL
                        </span>
                      )}
                    </div>
                    <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                      Human Authorized
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-100 mt-1">{req.product}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Authorized by: <strong className="text-slate-200">{req.humanDecision?.authorizedBy}</strong>
                  </p>
                  {req.humanDecision?.note && (
                    <p className="text-[11px] italic text-slate-400 mt-1">"{req.humanDecision.note}"</p>
                  )}
                  <button
                    onClick={() => setInspectPayloadReq(req)}
                    className="mt-2 text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>Inspect PayPal REST v2 Payload</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase">Amount</span>
                    <div className="text-base font-extrabold text-cyan-300">
                      {req.currency} {req.estimatedAmount.toLocaleString()}
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <button
                      onClick={() => handleExecutePayment(req.id)}
                      disabled={isProcessing && activeRequestId === req.id}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#0070BA] via-blue-600 to-cyan-500 hover:from-blue-600 hover:to-cyan-400 text-white font-bold text-xs shadow-lg shadow-blue-500/25 disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {isProcessing && activeRequestId === req.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Capturing PayPal...</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Execute PayPal Payment</span>
                          {paypalStatus && !paypalStatus.configured && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-200 border border-amber-400/40 font-mono">
                              Pending Config
                            </span>
                          )}
                        </>
                      )}
                    </button>
                    {paypalStatus && !paypalStatus.configured && (
                      <span className="text-[10px] text-amber-400/80 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        Server credentials pending
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: Pending Human Review & Decision */}
      <div className="rounded-2xl bg-[#09122a] border border-slate-800/80 p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Clock className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-white">
              Requests Awaiting Decision ({pendingRequests.length})
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            Current Reviewer: <strong className="text-slate-200">{user?.displayName || 'FinTech Officer'}</strong>
          </span>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="p-8 rounded-xl bg-slate-900/40 border border-slate-800/60 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="text-xs font-semibold text-slate-200">No pending approvals</p>
            <p className="text-[11px] text-slate-400">
              All purchase requests have been reviewed. Generate new ones using the AI Purchase Assistant.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/30 transition-all space-y-4"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-cyan-400">{req.id}</span>
                      <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                        Guardian Checked
                      </span>
                      {req.isSampleData && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                          Sample Data
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-white">{req.product}</h3>
                    <p className="text-xs text-slate-400 italic">"{req.naturalPrompt}"</p>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">Payment Amount</span>
                    <div className="text-xl font-extrabold text-cyan-300">
                      {req.currency} {req.estimatedAmount.toLocaleString()}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Budget Ceiling: {req.currency} {req.budget.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Specs row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-2 border-t border-slate-800/60">
                  <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
                    <span className="text-slate-400 text-[10px]">Merchant</span>
                    <p className="font-semibold text-slate-200 truncate">{req.merchant}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
                    <span className="text-slate-400 text-[10px]">Category</span>
                    <p className="font-semibold text-slate-200 truncate">{req.category}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
                    <span className="text-slate-400 text-[10px]">Risk Score</span>
                    <p className="font-semibold text-emerald-400">{req.guardianEvaluation?.riskScore || 10}/100 (Safe)</p>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
                    <span className="text-slate-400 text-[10px]">Initiated By</span>
                    <p className="font-semibold text-slate-200 truncate">{req.userEmail}</p>
                  </div>
                </div>

                {/* Guardian Rule Checks Quick Summary */}
                {req.guardianEvaluation && (
                  <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 text-emerald-300 font-semibold text-[11px]">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{req.guardianEvaluation.summary}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[10px]">
                      {req.guardianEvaluation.checks.map((chk, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          ✓ {chk.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Human Actions Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800">
                  <div className="flex-1 max-w-md">
                    <input
                      type="text"
                      placeholder="Optional authorization note (e.g. Approved for engineering requisition)"
                      value={selectedReq?.id === req.id ? approvalNote : ''}
                      onChange={(e) => {
                        setSelectedReq(req);
                        setApprovalNote(e.target.value);
                      }}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedReq(req);
                        setShowRejectModal(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors"
                    >
                      Reject Request
                    </button>
                    <button
                      onClick={() => handleAuthorize(req)}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.02]"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Authorize Payment</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 3: Completed & History */}
      <div className="rounded-2xl bg-[#09122a] border border-slate-800/80 p-5 space-y-3">
        <h2 className="text-sm font-bold text-white">Historical Authorization Log ({pastDecisions.length})</h2>
        <div className="space-y-2">
          {pastDecisions.slice(0, 5).map((req) => (
            <div
              key={req.id}
              className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-slate-400">{req.id}</span>
                <span className="font-semibold text-slate-200">{req.product}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-slate-300">
                  {req.currency} {req.estimatedAmount.toLocaleString()}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  req.status === 'completed'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : req.status === 'human_rejected'
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {req.status === 'completed' ? 'PayPal Executed' : req.status === 'human_rejected' ? 'Rejected by Human' : 'Firewall Blocked'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rejection Modal */}
      {showRejectModal && selectedReq && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">Reject Purchase Request</h3>
            </div>
            <p className="text-xs text-slate-300">
              You are blocking transaction <strong>{selectedReq.id}</strong> ({selectedReq.product}) from payment execution.
            </p>
            <div>
              <label htmlFor="rejection-reason" className="text-xs font-semibold text-slate-400 block mb-1">
                Reason for Rejection
              </label>
              <textarea
                id="rejection-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Budget limit reached for this quarter, or unverified merchant."
                rows={3}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedReq(null);
                }}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(selectedReq)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-colors"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PayPal Sandbox Execution Payload Inspector Modal */}
      {inspectPayloadReq && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl bg-[#09122a] border border-cyan-500/40 p-6 space-y-4 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/20 text-cyan-400 border border-blue-500/30">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">PayPal REST v2 Order Payload</h3>
                  <p className="text-xs text-slate-400">Target Gateway: api-m.sandbox.paypal.com</p>
                </div>
              </div>
              <button
                onClick={() => setInspectPayloadReq(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Target REST API Route</span>
                <p className="font-mono text-cyan-300 text-[11px]">
                  POST https://api-m.sandbox.paypal.com/v2/checkout/orders
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Server Authentication &amp; Headers</span>
                <pre className="font-mono text-slate-300 text-[10px] space-y-0.5">
                  <div>Authorization: Basic Base64(PAYPAL_CLIENT_ID:PAYPAL_CLIENT_SECRET)</div>
                  <div>PayPal-Request-Id: pactpay-idempotent-{inspectPayloadReq.id}</div>
                  <div>Content-Type: application/json</div>
                </pre>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Request Body (JSON)</span>
                <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto max-h-48">
{JSON.stringify({
  intent: "CAPTURE",
  purchase_units: [
    {
      reference_id: inspectPayloadReq.id,
      description: inspectPayloadReq.product,
      custom_id: `pactpay-officer-auth-${inspectPayloadReq.id}`,
      amount: {
        currency_code: inspectPayloadReq.currency,
        value: inspectPayloadReq.estimatedAmount.toFixed(2),
      },
    },
  ],
  application_context: {
    brand_name: "PACTPAY Autonomous Firewall",
    user_action: "CONTINUE",
  },
}, null, 2)}
                </pre>
              </div>

              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 text-[11px] text-amber-200 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Hackathon Verification Notice:</strong> This real payload is dispatched by <code className="text-cyan-300 font-mono">server/paypal.ts</code>. PACTPAY refuses to simulate captures; configure <code className="text-cyan-300 font-mono">PAYPAL_CLIENT_ID</code> and <code className="text-cyan-300 font-mono">PAYPAL_CLIENT_SECRET</code> to finalize live sandbox captures.
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setInspectPayloadReq(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
