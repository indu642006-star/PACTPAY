import React from 'react';
import { 
  LayoutDashboard, 
  Bot, 
  UserCheck, 
  ShieldAlert, 
  TableProperties, 
  FileCheck2, 
  BarChart3, 
  CreditCard,
  ExternalLink
} from 'lucide-react';
import { usePactPay } from '../../context/PactPayContext';

export type NavTab = 
  | 'dashboard'
  | 'assistant'
  | 'approvals'
  | 'guardian'
  | 'transactions'
  | 'audit'
  | 'analytics'
  | 'paypal';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const { requests } = usePactPay();

  // Count requests needing human sign-off
  const pendingApprovalsCount = requests.filter(r => r.status === 'guardian_approved').length;

  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'assistant' as NavTab, label: 'AI Purchase Assistant', icon: Bot, badge: 'Gemini' },
    { 
      id: 'approvals' as NavTab, 
      label: 'Human Authorization', 
      icon: UserCheck, 
      count: pendingApprovalsCount,
      highlight: pendingApprovalsCount > 0 
    },
    { id: 'guardian' as NavTab, label: 'Payment Guardian', icon: ShieldAlert },
    { id: 'transactions' as NavTab, label: 'Transactions (AG Grid)', icon: TableProperties },
    { id: 'audit' as NavTab, label: 'Audit Trail', icon: FileCheck2 },
    { id: 'analytics' as NavTab, label: 'Analytics & Risk', icon: BarChart3 },
    { id: 'paypal' as NavTab, label: 'PayPal Sandbox', icon: CreditCard },
  ];

  return (
    <aside className="w-64 flex-shrink-0 bg-[#070e22] border-r border-slate-800/80 flex flex-col justify-between p-3 min-h-[calc(100vh-4rem)]">
      <div className="space-y-6">
        <div>
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Firewall Control Center
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600/20 via-cyan-500/10 to-transparent text-cyan-300 border-l-2 border-cyan-400 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`} />
                    <span>{item.label}</span>
                  </div>

                  {item.count !== undefined && item.count > 0 && (
                    <span className="flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-cyan-500 text-slate-950 animate-pulse">
                      {item.count}
                    </span>
                  )}

                  {item.badge && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Philosophy Card */}
        <div className="p-3.5 rounded-xl bg-gradient-to-br from-slate-900/90 to-blue-950/30 border border-slate-800/80 text-[11px] space-y-2">
          <div className="flex items-center gap-1.5 text-cyan-400 font-bold uppercase text-[10px] tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
            Zero-Trust Protocol
          </div>
          <p className="text-slate-300 leading-relaxed">
            AI evaluates intent. Guardian verifies limits. Human provides signature. PayPal captures funds.
          </p>
          <div className="pt-1 text-[10px] text-slate-400 font-mono flex items-center justify-between">
            <span>Auth Strictness:</span>
            <span className="text-emerald-400 font-semibold">100% Deterministic</span>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-slate-800/60 px-2 space-y-1 text-[10px] text-slate-400">
        <div className="flex justify-between items-center">
          <span>Environment</span>
          <span className="text-slate-300 font-mono">Sandbox v2</span>
        </div>
        <div className="flex justify-between items-center">
          <span>Security Layer</span>
          <span className="text-emerald-400">Active</span>
        </div>
      </div>
    </aside>
  );
};
