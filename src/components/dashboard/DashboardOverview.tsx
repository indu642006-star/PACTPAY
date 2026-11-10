import React from 'react';
import { 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  ShieldX, 
  ArrowUpRight, 
  ArrowRight, 
  Sparkles, 
  CreditCard, 
  AlertTriangle,
  Zap,
  Layers,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { usePactPay } from '../../context/PactPayContext';
import { NavTab } from '../layout/Sidebar';

interface DashboardOverviewProps {
  onNavigate: (tab: NavTab) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onNavigate }) => {
  const { requests, transactions, policy, isLoadingFirestore, firestoreError } = usePactPay();

  // Metrics calculation
  const completedTxs = transactions.filter(t => t.status === 'COMPLETED');
  const blockedTxs = transactions.filter(t => t.status === 'BLOCKED');
  const pendingRequests = requests.filter(r => r.status === 'guardian_approved');

  const totalSpent = completedTxs.reduce((sum, t) => sum + t.amount, 0);
  const totalBlockedAmount = blockedTxs.reduce((sum, t) => sum + t.amount, 0) + 
    requests.filter(r => r.status === 'guardian_blocked').reduce((sum, r) => sum + r.estimatedAmount, 0);

  // Daily quota utilization
  const todaySpent = completedTxs
    .filter(t => new Date(t.timestamp).toDateString() === new Date().toDateString())
    .reduce((sum, t) => sum + t.amount, 0);
  const dailyPct = Math.min(100, Math.round((todaySpent / policy.dailyLimit) * 100));

  return (
    <div className="space-y-6">
      {/* Firestore Sync Alert if any */}
      {firestoreError && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>Firestore Sync Notice: {firestoreError}</span>
        </div>
      )}

      {/* Top Banner: Agentic Payment Firewall Mission */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950 via-[#0e1d42] to-slate-900 border border-blue-500/20 p-6 shadow-xl">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-500/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>AI Payment Firewall for the Agentic Economy</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              Autonomous agents propose. <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">You authorize.</span> PayPal executes.
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Every AI purchase query is parsed by Gemini, scrutinized through 6 deterministic Guardian firewall checks, and halted at the Human Gate before PayPal Sandbox execution.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('assistant')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4" />
              <span>New AI Purchase Request</span>
            </button>
            <button
              onClick={() => onNavigate('approvals')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-semibold text-xs transition-colors"
            >
              <span>Review Approvals ({pendingRequests.length})</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Spending */}
        <div className="p-5 rounded-2xl bg-[#09122a] border border-slate-800/80 hover:border-blue-500/30 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Spending (Executed)</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white tracking-tight">
              {policy.currency} {totalSpent.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-emerald-400 flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5" />
              {completedTxs.length} txs
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Verified across all PayPal Sandbox captures
          </p>
        </div>

        {/* Pending Approvals */}
        <div className="p-5 rounded-2xl bg-[#09122a] border border-slate-800/80 hover:border-cyan-500/30 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Pending Human Sign-off</span>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-cyan-300 tracking-tight">
              {pendingRequests.length}
            </span>
            <span className="text-xs font-medium text-slate-400">awaiting authorization</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Passed Guardian, strictly waiting for human
          </p>
        </div>

        {/* Completed Transactions */}
        <div className="p-5 rounded-2xl bg-[#09122a] border border-slate-800/80 hover:border-emerald-500/30 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Completed Payments</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-400 tracking-tight">
              {completedTxs.length}
            </span>
            <span className="text-xs text-slate-400 font-mono">100% PayPal Confirmed</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Zero duplicate executions allowed
          </p>
        </div>

        {/* Blocked Requests */}
        <div className="p-5 rounded-2xl bg-[#09122a] border border-slate-800/80 hover:border-rose-500/30 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Firewall Blocked</span>
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <ShieldX className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-400 tracking-tight">
              {blockedTxs.length + requests.filter(r => r.status === 'guardian_blocked').length}
            </span>
            <span className="text-xs font-medium text-slate-400">
              Saved ~{policy.currency} {totalBlockedAmount.toLocaleString()}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Deflected spending limit & merchant violations
          </p>
        </div>
      </div>

      {/* Two-Column Midsection: Active Firewall Radar & Pending Approvals List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Pending Human Sign-Off Requests */}
        <div className="lg:col-span-2 rounded-2xl bg-[#09122a] border border-slate-800/80 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                <Clock className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-white">
                Human Authorization Gate ({pendingRequests.length})
              </h2>
            </div>
            <button
              onClick={() => onNavigate('approvals')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="p-8 rounded-xl bg-slate-900/40 border border-slate-800/60 text-center space-y-2">
              <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-xs font-semibold text-slate-200">No requests awaiting authorization</p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                All AI purchase proposals have either been authorized or processed. Enter a new natural language prompt to test the pipeline!
              </p>
              <button
                onClick={() => onNavigate('assistant')}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 text-xs font-semibold"
              >
                <Sparkles className="w-3 h-3" />
                <span>Test AI Assistant</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-cyan-400">{req.id}</span>
                      <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                        Guardian Approved
                      </span>
                      {req.isSampleData && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                          Sample
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-slate-100">{req.product}</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span>Merchant: <strong className="text-slate-300">{req.merchant}</strong></span>
                      <span>•</span>
                      <span>Amount: <strong className="text-cyan-300">{req.currency} {req.estimatedAmount.toLocaleString()}</strong></span>
                      <span>•</span>
                      <span className="text-emerald-400">Risk Score: {req.guardianEvaluation?.riskScore || 10}/100</span>
                    </div>
                  </div>

                  <button
                    onClick={() => onNavigate('approvals')}
                    className="flex-shrink-0 flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs transition-all shadow-md shadow-blue-500/20"
                  >
                    <span>Authorize & Pay</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 1 Col: Live Firewall Status & Limits */}
        <div className="rounded-2xl bg-[#09122a] border border-slate-800/80 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-white">Firewall Radar</h2>
            </div>
            <button
              onClick={() => onNavigate('guardian')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium"
            >
              Configure
            </button>
          </div>

          {/* Daily Quota Meter */}
          <div className="space-y-2 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/60">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Daily Spending Ceiling</span>
              <span className="text-slate-200 font-mono font-semibold">{dailyPct}% used</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  dailyPct > 80 ? 'bg-rose-500' : dailyPct > 50 ? 'bg-amber-400' : 'bg-gradient-to-r from-blue-500 to-cyan-400'
                }`}
                style={{ width: `${dailyPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 font-mono">
              <span>{policy.currency} {todaySpent.toLocaleString()} spent</span>
              <span>Limit: {policy.currency} {policy.dailyLimit.toLocaleString()}</span>
            </div>
          </div>

          {/* Rule Highlights */}
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/40">
              <span className="text-slate-400">Max Per-Tx Limit</span>
              <span className="font-semibold text-slate-200 font-mono">
                {policy.currency} {policy.maxPerTransaction.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/40">
              <span className="text-slate-400">Blacklisted Merchants</span>
              <span className="font-semibold text-rose-400 font-mono">
                {policy.restrictedMerchants.length} blocked
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/40">
              <span className="text-slate-400">Duplicate Window</span>
              <span className="font-semibold text-slate-200 font-mono">
                {policy.blockDuplicateWindowMinutes} mins
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/40">
              <span className="text-slate-400">Auto-Reject High Risk</span>
              <span className={`font-semibold ${policy.autoRejectHighRisk ? 'text-emerald-400' : 'text-slate-400'}`}>
                {policy.autoRejectHighRisk ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
