import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Sparkles, 
  UserCheck, 
  CreditCard, 
  LogOut, 
  LogIn, 
  RotateCcw, 
  Activity,
  CheckCircle2,
  ChevronDown,
  Lock,
  Database,
  AlertCircle,
  Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePactPay } from '../../context/PactPayContext';

export const Navbar: React.FC = () => {
  const { user, signInWithGoogle, signInAsDemoUser, signOut } = useAuth();
  const { resetToSampleData, paypalStatus, isLoadingFirestore, firestoreError } = usePactPay();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showPayPalModal, setShowPayPalModal] = useState(false);

  return (
    <>
    <header className="h-16 border-b border-slate-800 bg-[#070d1e]/90 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-6 flex items-center justify-between">
      {/* Brand & Tagline */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 shadow-lg shadow-blue-500/20 ring-1 ring-cyan-400/30">
            <ShieldCheck className="w-6 h-6 text-white" />
            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-300 bg-clip-text text-transparent">
                PACTPAY
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-blue-500/10 text-cyan-400 border border-cyan-500/20">
                Firewall v1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Let AI decide. Let humans authorize. Let PayPal execute.
            </p>
          </div>
        </div>
      </div>

      {/* System Integrity Badges */}
      <div className="hidden xl:flex items-center gap-2 text-xs">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Gemini 3.8 Flash</span>
        </div>

        {/* Firestore Status */}
        {isLoadingFirestore ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/40 border border-cyan-800/40 text-cyan-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>Firestore Syncing...</span>
          </div>
        ) : firestoreError ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/40 border border-amber-800/40 text-amber-300" title={firestoreError}>
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Firestore Offline (Memory Mode)</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-slate-300">
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>Firestore Live</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-slate-300">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>Guardian Zero-Trust</span>
        </div>

        {/* PayPal Sandbox Status Badge with interactive config inspector */}
        {paypalStatus?.configured ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/40 text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
            <span>PayPal Sandbox (Live)</span>
          </div>
        ) : (
          <button
            onClick={() => setShowPayPalModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/40 hover:bg-amber-900/40 border border-amber-800/50 text-amber-300 transition-colors cursor-pointer"
            title="Click to view PayPal Sandbox configuration details"
          >
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-medium">PayPal Sandbox (Pending Config)</span>
          </button>
        )}
      </div>

      {/* User Actions & Auth Profile */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            if (confirm('Reset to standard sample data for demonstration?')) {
              resetToSampleData();
            }
          }}
          title="Reset Sample Demo Data"
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 rounded-lg transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Sample Data</span>
        </button>

        {user ? (
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-800/60 transition-colors border border-transparent hover:border-slate-700/60"
            >
              <div className="relative">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-8 h-8 rounded-lg object-cover ring-1 ring-cyan-500/40"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                    {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-950" />
              </div>
              <div className="text-left hidden md:block">
                <div className="text-xs font-semibold text-slate-200 flex items-center gap-1">
                  <span>{user.displayName || 'FinTech Officer'}</span>
                  {user.isDemo && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                      SAMPLE
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                  {user.email}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
            </button>

            {dropdownOpen && (
              <div 
                className="absolute right-0 mt-2 w-64 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50 text-xs"
                onMouseLeave={() => setDropdownOpen(false)}
              >
                <div className="px-3 py-2 border-b border-slate-800 mb-1">
                  <p className="font-semibold text-slate-200">{user.displayName}</p>
                  <p className="text-slate-400 text-[11px] truncate">{user.email}</p>
                  <div className="mt-1.5 flex items-center gap-1 text-[10px] text-cyan-400 font-medium">
                    <UserCheck className="w-3 h-3" />
                    <span>Role: FinTech Authorizer</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    signInWithGoogle();
                    setDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-slate-300 hover:bg-slate-800/80 rounded-lg transition-colors text-left"
                >
                  <LogIn className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Switch / Sign In with Google</span>
                </button>

                <button
                  onClick={() => {
                    signInAsDemoUser();
                    setDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-slate-300 hover:bg-slate-800/80 rounded-lg transition-colors text-left"
                >
                  <Activity className="w-3.5 h-3.5 text-amber-400" />
                  <span>Use Verified Demo Profile</span>
                </button>

                <div className="border-t border-slate-800 my-1" />

                <button
                  onClick={() => {
                    signOut();
                    setDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors text-left"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={signInAsDemoUser}
              className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Demo Login
            </button>
            <button
              onClick={signInWithGoogle}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-lg shadow-md shadow-blue-500/20 transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          </div>
        )}
      </div>
    </header>

    {/* PayPal Sandbox Status & Credentials Modal */}
    {showPayPalModal && (
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-[#09122a] border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">PayPal Sandbox Configuration</h3>
                <p className="text-xs text-slate-400">Environment: Sandbox (api-m.sandbox.paypal.com)</p>
              </div>
            </div>
            <button
              onClick={() => setShowPayPalModal(false)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/40 text-amber-200 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span>Pending Server-Side Credentials</span>
              </div>
              <p className="text-[11px] text-amber-300/90 leading-relaxed">
                PACTPAY never fakes or simulates payment captures. To execute real sandbox transactions against PayPal REST API v2, configure the following environment variables in your server environment:
              </p>
            </div>

            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="flex items-center justify-between font-mono text-cyan-300">
                  <span>PAYPAL_CLIENT_ID</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">Required</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">PayPal Developer Sandbox App Client ID</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="flex items-center justify-between font-mono text-cyan-300">
                  <span>PAYPAL_CLIENT_SECRET</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">Required (Server Only)</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">PayPal Developer Sandbox App Secret Key (Never exposed to client)</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 space-y-1">
              <span className="font-semibold text-slate-200">Security & Firewall Architecture:</span>
              <ul className="list-disc list-inside text-slate-400 space-y-0.5 text-[11px]">
                <li>Deterministic payment checks halt unauthenticated or unconfigured calls</li>
                <li>Human authorization token is mandatory before PayPal order creation</li>
                <li>Zero-trust idempotency guards prevent duplicate captures</li>
              </ul>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => setShowPayPalModal(false)}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all"
            >
              Understood
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};
