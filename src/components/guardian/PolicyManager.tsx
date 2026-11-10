import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Save, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Sliders, 
  DollarSign, 
  Store, 
  Layers, 
  Clock, 
  ShieldCheck,
  AlertTriangle,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { usePactPay } from '../../context/PactPayContext';

export const PolicyManager: React.FC = () => {
  const { policy, updatePolicy } = usePactPay();
  const [maxPerTx, setMaxPerTx] = useState(policy.maxPerTransaction);
  const [dailyLimit, setDailyLimit] = useState(policy.dailyLimit);
  const [monthlyLimit, setMonthlyLimit] = useState(policy.monthlyLimit);
  const [currency, setCurrency] = useState(policy.currency || 'INR');
  const [duplicateWindow, setDuplicateWindow] = useState(policy.blockDuplicateWindowMinutes || 15);
  const [autoRejectHighRisk, setAutoRejectHighRisk] = useState(policy.autoRejectHighRisk ?? true);
  const [restrictedMerchants, setRestrictedMerchants] = useState<string[]>(policy.restrictedMerchants || []);
  const [newMerchant, setNewMerchant] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleAddMerchant = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newMerchant.trim();
    if (clean && !restrictedMerchants.map(m => m.toLowerCase()).includes(clean.toLowerCase())) {
      setRestrictedMerchants([...restrictedMerchants, clean]);
      setNewMerchant('');
    }
  };

  const handleRemoveMerchant = (merchantToRemove: string) => {
    setRestrictedMerchants(restrictedMerchants.filter(m => m !== merchantToRemove));
  };

  const handleSavePolicy = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await updatePolicy({
        maxPerTransaction: Number(maxPerTx),
        dailyLimit: Number(dailyLimit),
        monthlyLimit: Number(monthlyLimit),
        currency,
        blockDuplicateWindowMinutes: Number(duplicateWindow),
        autoRejectHighRisk,
        restrictedMerchants,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to update policy in Firestore');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <span>Payment Guardian Firewall Policy</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-cyan-400 border border-cyan-500/30 font-mono">
                Deterministic
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Configure strict spending limits, merchant blacklists, and agentic safeguards.
            </p>
          </div>
        </div>

        <button
          onClick={handleSavePolicy}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span>{isSaving ? 'Saving to Firestore...' : 'Save Policy Rules'}</span>
        </button>
      </div>

      {saveError && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>Firewall policy rules updated and persisted to Firestore.</span>
        </div>
      )}

      {/* Grid of Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Spending Limits */}
        <div className="p-5 rounded-2xl bg-[#09122a] border border-slate-800/80 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80">
            <DollarSign className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white">Deterministic Spending Limits</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label htmlFor="currency-select" className="text-slate-300 font-semibold block mb-1">
                Primary Policy Currency
              </label>
              <select
                id="currency-select"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="INR">INR (₹ Indian Rupee)</option>
                <option value="USD">USD ($ US Dollar)</option>
                <option value="EUR">EUR (€ Euro)</option>
                <option value="GBP">GBP (£ British Pound)</option>
              </select>
            </div>

            <div>
              <label htmlFor="max-per-tx" className="text-slate-300 font-semibold block mb-1">
                Max Per-Transaction Limit ({currency})
              </label>
              <input
                id="max-per-tx"
                type="number"
                value={maxPerTx}
                onChange={(e) => setMaxPerTx(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Any purchase instruction with estimated cost exceeding this will be blocked.
              </span>
            </div>

            <div>
              <label htmlFor="daily-limit" className="text-slate-300 font-semibold block mb-1">
                Daily Spending Ceiling ({currency})
              </label>
              <input
                id="daily-limit"
                type="number"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Cumulative completed transactions capped per 24 hours.
              </span>
            </div>

            <div>
              <label htmlFor="monthly-limit" className="text-slate-300 font-semibold block mb-1">
                Monthly Spending Ceiling ({currency})
              </label>
              <input
                id="monthly-limit"
                type="number"
                value={monthlyLimit}
                onChange={(e) => setMonthlyLimit(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Merchant Blacklist */}
        <div className="p-5 rounded-2xl bg-[#09122a] border border-slate-800/80 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80">
            <Store className="w-4 h-4 text-rose-400" />
            <h2 className="text-sm font-bold text-white">Merchant Blacklist Restrictions</h2>
          </div>

          <div className="space-y-3 text-xs">
            <p className="text-slate-400 text-[11px]">
              Guardian immediately rejects AI requests naming these merchants or stores.
            </p>

            <form onSubmit={handleAddMerchant} className="flex gap-2">
              <input
                type="text"
                value={newMerchant}
                onChange={(e) => setNewMerchant(e.target.value)}
                placeholder="e.g. BetOnline, ShadyCasino, UnverifiedMarket"
                className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-200 text-xs placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </form>

            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pt-1">
              {restrictedMerchants.map((merchant, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20 text-xs font-medium"
                >
                  <span>{merchant}</span>
                  <button
                    onClick={() => handleRemoveMerchant(merchant)}
                    className="hover:text-white"
                  >
                    <Trash2 className="w-3 h-3 text-rose-400 hover:text-rose-200" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Card 3: Anti-Duplicate & Agentic Controls */}
        <div className="p-5 rounded-2xl bg-[#09122a] border border-slate-800/80 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80">
            <Clock className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white">Anti-Duplicate Window</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label htmlFor="dup-window" className="text-slate-300 font-semibold block mb-1">
                Duplicate Order Detection Window (Minutes)
              </label>
              <input
                id="dup-window"
                type="number"
                min={1}
                max={120}
                value={duplicateWindow}
                onChange={(e) => setDuplicateWindow(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-amber-500"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Blocks identical item & merchant submissions within this window to protect against malfunctioning autonomous agent loops.
              </span>
            </div>

            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRejectHighRisk}
                  onChange={(e) => setAutoRejectHighRisk(e.target.checked)}
                  className="mt-1 rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                />
                <div>
                  <span className="font-semibold text-slate-200">Auto-Reject Elevated Risk Indicators</span>
                  <p className="text-[11px] text-slate-400">
                    Instantly block requests containing illicit keywords, anonymous gift cards, or crypto vouchers.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Card 4: Permitted Categories */}
        <div className="p-5 rounded-2xl bg-[#09122a] border border-slate-800/80 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80">
            <Layers className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Whitelisted Categories</h2>
          </div>

          <div className="space-y-2 text-xs">
            <p className="text-slate-400 text-[11px]">
              Categories allowed for AI agent purchase requests:
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {['Electronics', 'Office Supplies', 'Hardware', 'Software & Cloud', 'Travel', 'General Goods'].map((cat, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/60 border border-slate-800/60 text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{cat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
