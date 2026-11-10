/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { PactPayProvider, usePactPay } from './context/PactPayContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { AIPurchaseAssistant } from './components/assistant/AIPurchaseAssistant';
import { HumanApprovalGate } from './components/guardian/HumanApprovalGate';
import { PolicyManager } from './components/guardian/PolicyManager';
import { TransactionGrid } from './components/transactions/TransactionGrid';
import { AuditLogViewer } from './components/audit/AuditLogViewer';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { PayPalConsole } from './components/paypal/PayPalConsole';
import { HackathonDemoBar } from './components/demo/HackathonDemoBar';
import { 
  Shield, 
  Menu, 
  X, 
  LayoutDashboard, 
  Bot, 
  UserCheck, 
  TableProperties, 
  Sliders,
  MoreHorizontal
} from 'lucide-react';

function PactPayApp() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { requests } = usePactPay();

  const pendingApprovalsCount = requests.filter(r => r.status === 'guardian_approved').length;

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardOverview onNavigate={setCurrentTab} />;
      case 'assistant':
        return <AIPurchaseAssistant onNavigate={setCurrentTab} />;
      case 'approvals':
        return <HumanApprovalGate />;
      case 'guardian':
        return <PolicyManager />;
      case 'transactions':
        return <TransactionGrid />;
      case 'audit':
        return <AuditLogViewer />;
      case 'analytics':
        return <AnalyticsView />;
      case 'paypal':
        return <PayPalConsole />;
      default:
        return <DashboardOverview onNavigate={setCurrentTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#050a17] text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      <Navbar />
      <HackathonDemoBar onNavigate={setCurrentTab} />

      {/* Mobile Nav Top Bar */}
      <div className="lg:hidden px-4 py-2.5 bg-[#070e22] border-b border-slate-800 flex items-center justify-between sticky top-16 z-30">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
        >
          {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          <span>All Modules</span>
        </button>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400">View:</span>
          <span className="text-cyan-400 font-bold capitalize">{currentTab}</span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} />
        </div>

        {/* Mobile Slide-in Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div 
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative z-10 w-72 bg-[#070e22] h-full shadow-2xl flex flex-col">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <span className="font-bold text-sm text-white">PACTPAY Navigation</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <Sidebar 
                  currentTab={currentTab} 
                  onSelectTab={(tab) => {
                    setCurrentTab(tab);
                    setMobileMenuOpen(false);
                  }} 
                />
              </div>
            </div>
          </div>
        )}

        {/* Main Workspace Area (padding adjusted for mobile bottom bar) */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8">
          {renderContent()}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar for Instant Thumb Access */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#070d1e]/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-around py-2 px-1">
        <button
          onClick={() => setCurrentTab('dashboard')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
            currentTab === 'dashboard' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Home</span>
        </button>

        <button
          onClick={() => setCurrentTab('assistant')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
            currentTab === 'assistant' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>Assistant</span>
        </button>

        <button
          onClick={() => setCurrentTab('approvals')}
          className={`relative flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
            currentTab === 'approvals' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Approvals</span>
          {pendingApprovalsCount > 0 && (
            <span className="absolute -top-1 right-2 w-4 h-4 rounded-full bg-cyan-500 text-slate-950 text-[9px] font-bold flex items-center justify-center animate-pulse">
              {pendingApprovalsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setCurrentTab('transactions')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
            currentTab === 'transactions' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <TableProperties className="w-4 h-4" />
          <span>Ledger</span>
        </button>

        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] font-semibold text-slate-400 hover:text-slate-200"
        >
          <MoreHorizontal className="w-4 h-4" />
          <span>More</span>
        </button>
      </nav>

      {/* Desktop Status Bar */}
      <footer className="hidden lg:flex h-8 border-t border-slate-800/80 bg-[#040813] px-4 items-center justify-between text-[11px] text-slate-500 font-mono">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-cyan-500" />
          <span className="text-slate-400">PACTPAY Autonomous Payment Firewall</span>
          <span>•</span>
          <span className="text-emerald-400">Human Authority Active</span>
          <span>•</span>
          <span>Zero Autonomous Captures</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Gemini 3.8 Flash</span>
          <span>•</span>
          <span>AG Grid Community 36</span>
          <span>•</span>
          <span>PayPal Sandbox REST v2</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PactPayProvider>
        <PactPayApp />
      </PactPayProvider>
    </AuthProvider>
  );
}
