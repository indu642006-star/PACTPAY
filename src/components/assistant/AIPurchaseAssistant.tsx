import React, { useState } from 'react';
import { 
  Bot, 
  Sparkles, 
  ShieldCheck, 
  ShieldAlert, 
  ArrowRight, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Send,
  Loader2,
  Clock,
  DollarSign,
  Store,
  Tag,
  Shield
} from 'lucide-react';
import { usePactPay } from '../../context/PactPayContext';
import { PurchaseRequest } from '../../types';
import { NavTab } from '../layout/Sidebar';

interface AIPurchaseAssistantProps {
  onNavigate: (tab: NavTab) => void;
}

export const AIPurchaseAssistant: React.FC<AIPurchaseAssistantProps> = ({ onNavigate }) => {
  const { createPurchaseRequest, isProcessing, policy } = usePactPay();
  const [prompt, setPrompt] = useState('Buy a wireless keyboard under ₹2,000.');
  const [currency, setCurrency] = useState('INR');
  const [lastCreated, setLastCreated] = useState<PurchaseRequest | null>(null);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const samplePrompts = [
    { text: 'Buy a wireless keyboard under ₹2,000.', desc: 'Standard gadget within limit', tag: 'Safe', curr: 'INR' },
    { text: 'Order 3 ergonomic vertical mice from Amazon under ₹4,500.', desc: 'Workstation hardware', tag: 'Safe', curr: 'INR' },
    { text: 'Purchase cloud hosting credits on DigitalOcean under $50.', desc: 'Developer infrastructure', tag: 'Safe', curr: 'USD' },
    { text: 'Purchase VIP tokens on BetOnline casino for ₹50,000.', desc: 'Triggers merchant blacklist & spending ceiling', tag: 'Firewall Block Test', curr: 'INR' },
    { text: 'Buy a wireless keyboard under ₹2,000.', desc: 'Duplicate test (run twice within 15 mins)', tag: 'Duplicate Test', curr: 'INR' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isProcessing) return;

    setErrorMsg(null);
    setLastCreated(null);
    setActiveStep(1); // AI Parsing

    try {
      setTimeout(() => setActiveStep(2), 600); // Guardian Evaluating
      const result = await createPurchaseRequest(prompt, currency);
      setActiveStep(3); // Result ready
      setLastCreated(result);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to process purchase request');
      setActiveStep(0);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <span>AI Purchase Assistant</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono">
                Powered by Gemini 3.8 Flash
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Submit natural-language agent purchase instructions. AI extracts parameters, Guardian inspects rules, human retains authorization.
            </p>
          </div>
        </div>
      </div>

      {/* Input Console */}
      <div className="rounded-2xl bg-[#09122a] border border-slate-800/80 p-5 shadow-xl space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="purchase-prompt" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Enter Purchase Instruction</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">Default Currency:</span>
                <select
                  aria-label="Default Currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
            </div>

            <div className="relative">
              <textarea
                id="purchase-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Buy a wireless keyboard under ₹2,000 on Amazon."
                rows={3}
                className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 p-3.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/50 transition-all font-sans"
              />
              <button
                type="submit"
                disabled={isProcessing || !prompt.trim()}
                className="absolute right-3 bottom-3 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 disabled:opacity-50 transition-all"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Evaluate Request</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Quick Sample Prompts */}
        <div className="space-y-2 pt-2 border-t border-slate-800/60">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">Hackathon Demo Scenarios (1-Click Test):</span>
            <span className="text-[10px] text-cyan-400/80 font-mono">Sets prompt & matching currency</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {samplePrompts.map((sp, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setPrompt(sp.text);
                  if (sp.curr) setCurrency(sp.curr);
                }}
                className="text-left px-2.5 py-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-xs text-slate-300 transition-colors flex items-center gap-2 group"
              >
                <span className="group-hover:text-cyan-300 font-medium">"{sp.text}"</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                  sp.tag.includes('Block') ? 'bg-rose-500/20 text-rose-300' : sp.tag.includes('Duplicate') ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'
                }`}>
                  {sp.tag}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Evaluation Pipeline Visualizer */}
      {isProcessing && (
        <div className="p-6 rounded-2xl bg-[#09122a] border border-cyan-500/30 space-y-4">
          <div className="text-center space-y-1">
            <h3 className="text-sm font-bold text-white">PACTPAY Autonomous Firewall Pipeline</h3>
            <p className="text-xs text-slate-400">Inspecting agent instruction and enforcing deterministic bounds</p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className={`p-3 rounded-xl border ${activeStep >= 1 ? 'bg-blue-950/40 border-cyan-500 text-cyan-300' : 'bg-slate-900/40 border-slate-800 text-slate-500'}`}>
              <Sparkles className="w-4 h-4 mx-auto mb-1 animate-pulse" />
              <div className="text-xs font-bold">1. AI Intent Parsing</div>
              <div className="text-[10px]">Gemini 3.8 Flash</div>
            </div>

            <div className={`p-3 rounded-xl border ${activeStep >= 2 ? 'bg-blue-950/40 border-cyan-500 text-cyan-300' : 'bg-slate-900/40 border-slate-800 text-slate-500'}`}>
              <Shield className="w-4 h-4 mx-auto mb-1 animate-pulse" />
              <div className="text-xs font-bold">2. Guardian Firewall</div>
              <div className="text-[10px]">Deterministic Checks</div>
            </div>

            <div className={`p-3 rounded-xl border ${activeStep >= 3 ? 'bg-blue-950/40 border-cyan-500 text-cyan-300' : 'bg-slate-900/40 border-slate-800 text-slate-500'}`}>
              <Clock className="w-4 h-4 mx-auto mb-1" />
              <div className="text-xs font-bold">3. Human Sign-off</div>
              <div className="text-[10px]">Authorization Gate</div>
            </div>
          </div>
        </div>
      )}

      {/* Result Card */}
      {lastCreated && (
        <div className="rounded-2xl bg-[#09122a] border border-slate-800 p-6 space-y-5 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-cyan-400">{lastCreated.id}</span>
                <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                  lastCreated.status === 'guardian_approved'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                }`}>
                  {lastCreated.status === 'guardian_approved' ? 'Guardian Approved • Awaiting Human Sign-off' : 'Firewall Blocked'}
                </span>
              </div>
              <h2 className="text-lg font-bold text-white mt-1">{lastCreated.product}</h2>
            </div>

            {lastCreated.status === 'guardian_approved' ? (
              <button
                onClick={() => onNavigate('approvals')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <span>Proceed to Human Sign-Off Gate</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="text-right">
                <span className="text-xs font-semibold text-rose-400">Payment Blocked</span>
                <p className="text-[11px] text-slate-400">AI cannot proceed further</p>
              </div>
            )}
          </div>

          {/* Extracted Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
                <span>Budget Ceiling</span>
              </span>
              <p className="text-base font-bold text-white mt-1">
                {lastCreated.currency} {lastCreated.budget.toLocaleString()}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-emerald-400" />
                <span>Estimated Price</span>
              </span>
              <p className="text-base font-bold text-cyan-300 mt-1">
                {lastCreated.currency} {lastCreated.estimatedAmount.toLocaleString()}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 flex items-center gap-1">
                <Store className="w-3.5 h-3.5 text-blue-400" />
                <span>Merchant</span>
              </span>
              <p className="text-base font-bold text-white mt-1 truncate">
                {lastCreated.merchant}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>Risk Score</span>
              </span>
              <p className="text-base font-bold text-white mt-1">
                {lastCreated.guardianEvaluation?.riskScore || 10}/100
              </p>
            </div>
          </div>

          {/* Guardian Deterministic Checklist */}
          {lastCreated.guardianEvaluation && (
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                <span>Payment Guardian Deterministic Rule Checks</span>
              </h4>

              <div className="space-y-2">
                {lastCreated.guardianEvaluation.checks.map((chk, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl text-xs flex items-start gap-2.5 border ${
                      chk.status === 'PASS'
                        ? 'bg-emerald-950/20 border-emerald-500/20 text-slate-200'
                        : chk.status === 'WARN'
                        ? 'bg-amber-950/20 border-amber-500/20 text-amber-200'
                        : 'bg-rose-950/20 border-rose-500/20 text-rose-200'
                    }`}
                  >
                    {chk.status === 'PASS' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    ) : chk.status === 'WARN' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className="font-bold">{chk.name}: </span>
                      <span className="opacity-90">{chk.message}</span>
                      {chk.details && (
                        <p className="text-[11px] font-mono text-slate-400 mt-0.5">{chk.details}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
