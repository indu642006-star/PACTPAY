import React, { useState } from 'react';
import { 
  Sparkles, 
  ShieldCheck, 
  UserCheck, 
  CreditCard, 
  RotateCcw, 
  Play, 
  Info, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  X, 
  Bot, 
  ShieldAlert, 
  TableProperties, 
  ExternalLink,
  Code2
} from 'lucide-react';
import { usePactPay } from '../../context/PactPayContext';
import { NavTab } from '../layout/Sidebar';

interface HackathonDemoBarProps {
  onNavigate: (tab: NavTab) => void;
}

export const HackathonDemoBar: React.FC<HackathonDemoBarProps> = ({ onNavigate }) => {
  const { isDemoMode, toggleDemoMode, resetToSampleData, requests, transactions, paypalStatus } = usePactPay();
  const [showTourModal, setShowTourModal] = useState(false);
  const [showPresetPicker, setShowPresetPicker] = useState(false);
  const [activeTourStep, setActiveTourStep] = useState<number>(1);
  const [resetFeedback, setResetFeedback] = useState(false);

  const handleReset = async () => {
    await resetToSampleData();
    setResetFeedback(true);
    setTimeout(() => setResetFeedback(false), 2500);
  };

  const sampleScenarios = [
    {
      title: '1. Safe Workstation Hardware',
      prompt: 'Buy a Logitech MX Master 3S wireless mouse under ₹9,000 on Amazon for engineering workstation',
      tag: 'Passes Guardian (Risk: 12/100)',
      statusColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      tab: 'assistant' as NavTab,
      desc: 'Demonstrates AI entity extraction and all 6 deterministic firewall checks passing smoothly.',
    },
    {
      title: '2. Cloud Infrastructure Credits',
      prompt: 'Renew DigitalOcean Kubernetes cloud cluster credits for $65 under $100 budget',
      tag: 'Human Authorized -> Execution Screen',
      statusColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
      tab: 'approvals' as NavTab,
      desc: 'Demonstrates request already signed off by human officer, ready for PayPal Sandbox execution.',
    },
    {
      title: '3. Rogue Agent / Blacklisted Casino',
      prompt: 'Purchase 25 VIP Casino betting vouchers on BetOnline for $500',
      tag: 'Firewall Blocked (Risk: 95/100)',
      statusColor: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
      tab: 'assistant' as NavTab,
      desc: 'Demonstrates Payment Guardian deflecting rogue agent request via merchant blacklist & gambling filter.',
    },
    {
      title: '4. Spending Limit Overrun',
      prompt: 'Procure 4 Dell UltraSharp 32-inch 6K monitors for ₹280,000 on Dell.com',
      tag: 'Firewall Blocked (Limit Breach)',
      statusColor: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
      tab: 'guardian' as NavTab,
      desc: 'Demonstrates defense against budget cap breaches: ₹280,000 exceeds ₹15,000 policy threshold.',
    },
    {
      title: '5. Malfunctioning Agent Loop',
      prompt: 'Buy a Logitech MX Master 3S wireless mouse under ₹9,000 on Amazon',
      tag: 'Duplicate Guard (15-min TTL)',
      statusColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      tab: 'assistant' as NavTab,
      desc: 'Submitting identical order twice triggers duplicate detection, safeguarding against recursive agent loops.',
    },
  ];

  if (!isDemoMode) {
    return (
      <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 py-1.5 flex items-center justify-between text-xs">
        <span className="text-slate-400">Demo mode inactive.</span>
        <button
          onClick={toggleDemoMode}
          className="text-cyan-400 hover:text-cyan-300 font-medium"
        >
          Enable Hackathon Demo Mode
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Top Banner: Hackathon Demo Mode */}
      <div className="bg-gradient-to-r from-blue-950 via-[#0a1636] to-slate-900 border-b border-cyan-500/30 px-3 sm:px-6 py-2.5 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          {/* Badge & Mission */}
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-bold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              HACKATHON DEMO MODE
            </span>
            <span className="text-slate-300 text-xs hidden sm:inline">
              4-Tier Pipeline Walkthrough: <strong>AI Request</strong> &rarr; <strong>Guardian Firewall</strong> &rarr; <strong>Human Approval</strong> &rarr; <strong>PayPal Sandbox</strong>
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              onClick={() => setShowTourModal(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20 transition-all hover:scale-[1.02]"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Interactive Flow Tour</span>
            </button>

            <button
              onClick={() => setShowPresetPicker(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700 font-semibold transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>5 Realistic Scenarios</span>
            </button>

            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
              title="Reset state to initial sample data"
            >
              <RotateCcw className={`w-3.5 h-3.5 text-slate-400 ${resetFeedback ? 'animate-spin' : ''}`} />
              <span className="hidden lg:inline">{resetFeedback ? 'Reset Done!' : 'Reset Presets'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL 1: Interactive 4-Step Flow Tour */}
      {showTourModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#09122a] border border-cyan-500/40 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-fadeIn">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">PACTPAY Complete Flow Demonstration</h3>
                  <p className="text-xs text-slate-400">Zero-Trust Architecture for the Autonomous Agentic Economy</p>
                </div>
              </div>
              <button
                onClick={() => setShowTourModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step Tabs */}
            <div className="grid grid-cols-4 gap-1.5 text-xs">
              {[
                { num: 1, title: 'AI Assistant', icon: Bot },
                { num: 2, title: 'Guardian Rules', icon: ShieldAlert },
                { num: 3, title: 'Human Gate', icon: UserCheck },
                { num: 4, title: 'PayPal Checkpoint', icon: CreditCard },
              ].map((step) => {
                const Icon = step.icon;
                const isActive = activeTourStep === step.num;
                return (
                  <button
                    key={step.num}
                    onClick={() => setActiveTourStep(step.num)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isActive
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-200 shadow-md shadow-cyan-500/10'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono font-bold">Step {step.num}</span>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="font-semibold truncate">{step.title}</div>
                  </button>
                );
              })}
            </div>

            {/* Step Content */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-3">
              {activeTourStep === 1 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">Step 1: AI Purchase Intent Parsing</span>
                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-cyan-300 font-mono text-[10px]">Gemini 3.8 Flash</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Users or autonomous agents submit unstructured instructions like:
                    <em className="text-cyan-300 block my-1">"Buy a wireless keyboard under ₹2,000 on Amazon"</em>
                    Gemini extracts the structured parameters: product name, declared budget, estimated merchant price, currency, merchant identifier, and urgency category.
                  </p>
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => {
                        setShowTourModal(false);
                        onNavigate('assistant');
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400"
                    >
                      <span>Try AI Assistant</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {activeTourStep === 2 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">Step 2: Payment Guardian Deterministic Firewall</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">6 Deterministic Checks</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Crucially, <strong>AI never evaluates safety or limits</strong>. All purchase requests must pass through 6 deterministic, rule-based backend checks:
                  </p>
                  <ul className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-300 pt-1">
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>1. Price &le; Declared Budget</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>2. Below Max Per-Tx Limit</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>3. Within Daily Spending Quota</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>4. Merchant Whitelist Guard</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>5. 15-Minute Duplicate Guard</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>6. TTL Freshness Timestamp</span>
                    </li>
                  </ul>
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => {
                        setShowTourModal(false);
                        onNavigate('guardian');
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400"
                    >
                      <span>Configure Guardian Rules</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {activeTourStep === 3 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">Step 3: Human Authorization Gate</span>
                    <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[10px]">Mandatory Sovereign Checkpoint</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    AI models lack legal fiduciary capacity. Even after passing all Guardian checks, a request is halted at the Human Gate. A verified FinTech Risk Officer must review the Guardian risk score, add approval notes, and grant explicit sovereign sign-off.
                  </p>
                  <div className="p-2.5 rounded-lg bg-blue-950/40 border border-blue-800/40 text-[11px] text-cyan-300">
                    💡 Sample Request <strong>REQ-101</strong> (Logitech MX Master 3S) is waiting in the Human Gate right now for sign-off!
                  </div>
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => {
                        setShowTourModal(false);
                        onNavigate('approvals');
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400"
                    >
                      <span>Open Human Approval Gate</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {activeTourStep === 4 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">Step 4: PayPal Sandbox Execution Screen</span>
                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-[10px]">REST API v2 Gateway</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Once signed by the human officer, the request transitions to the Payment Execution screen. PACTPAY constructs the authenticated PayPal REST v2 payload and executes against <code className="text-cyan-300">api-m.sandbox.paypal.com</code>.
                  </p>
                  <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/40 text-[11px] text-amber-200 space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-amber-300">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Zero-Simulation &amp; Missing Credentials Handling</span>
                    </div>
                    <p className="text-amber-200/90">
                      PACTPAY strictly refuses to fake successful payments. If server credentials are missing, it provides clear, helpful instructions for adding <code className="text-cyan-300">PAYPAL_CLIENT_ID</code> &amp; <code className="text-cyan-300">PAYPAL_CLIENT_SECRET</code> while safely preserving the authorized request.
                    </p>
                  </div>
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => {
                        setShowTourModal(false);
                        onNavigate('paypal');
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400"
                    >
                      <span>Inspect PayPal Gateway</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>All 4 Stages Verified in Hackathon Demo</span>
              </span>
              <button
                onClick={() => setShowTourModal(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold"
              >
                Close Tour
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: 5 Realistic Test Scenarios Picker */}
      {showPresetPicker && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#09122a] border border-cyan-500/40 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Realistic Hackathon Test Scenarios</h3>
              </div>
              <button
                onClick={() => setShowPresetPicker(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Select any scenario to evaluate how the AI Assistant and Payment Guardian firewall handle real-world agent requests:
            </p>

            <div className="space-y-2.5">
              {sampleScenarios.map((scenario, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white">{scenario.title}</h4>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono ${scenario.statusColor}`}>
                      {scenario.tag}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-cyan-300/90 bg-slate-900/60 p-1.5 rounded border border-slate-800/80">
                    "{scenario.prompt}"
                  </p>
                  <p className="text-[11px] text-slate-400">{scenario.desc}</p>
                  <div className="pt-1 flex justify-end">
                    <button
                      onClick={() => {
                        setShowPresetPicker(false);
                        onNavigate(scenario.tab);
                      }}
                      className="flex items-center gap-1 text-[11px] font-semibold text-cyan-400 hover:text-cyan-300"
                    >
                      <span>Jump to Module</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowPresetPicker(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
