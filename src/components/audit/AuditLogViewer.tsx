import React, { useState } from 'react';
import { 
  FileCheck2, 
  Bot, 
  ShieldCheck, 
  UserCheck, 
  CreditCard, 
  Filter, 
  Hash, 
  ChevronDown, 
  ChevronRight,
  ShieldAlert,
  Clock,
  Loader2,
  AlertCircle,
  Inbox
} from 'lucide-react';
import { usePactPay } from '../../context/PactPayContext';
import { AuditLogEntry } from '../../types';

export const AuditLogViewer: React.FC = () => {
  const { auditLogs, isLoadingFirestore, firestoreError } = usePactPay();
  const [filterType, setFilterType] = useState<string>('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const filteredLogs = filterType === 'ALL' 
    ? auditLogs 
    : auditLogs.filter(l => l.eventType === filterType);

  const getActorBadge = (actor: string) => {
    if (actor.includes('AI')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
          <Bot className="w-3 h-3 text-cyan-400" />
          {actor}
        </span>
      );
    }
    if (actor.includes('Guardian') || actor.includes('Firewall')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
          <ShieldCheck className="w-3 h-3 text-indigo-400" />
          {actor}
        </span>
      );
    }
    if (actor.includes('Human')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
          <UserCheck className="w-3 h-3 text-emerald-400" />
          {actor}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
        <CreditCard className="w-3 h-3 text-blue-400" />
        {actor}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-400">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <span>Tamper-Evident Audit Trail</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-cyan-400 border border-cyan-500/30 font-mono">
                Immutable
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Cryptographically verified timeline of AI proposals, Guardian checks, human authorizations, and PayPal captures.
            </p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500 text-xs"
          >
            <option value="ALL">All Audit Events ({auditLogs.length})</option>
            <option value="AI_INTENT_PARSED">AI Intent Parsed</option>
            <option value="GUARDIAN_CHECK_EVALUATED">Guardian Evaluated</option>
            <option value="PAYMENT_FIREWALL_BLOCKED">Firewall Blocked</option>
            <option value="HUMAN_APPROVAL_GRANTED">Human Approvals</option>
            <option value="HUMAN_REJECTION_ISSUED">Human Rejections</option>
            <option value="PAYPAL_PAYMENT_CAPTURED">PayPal Captures</option>
            <option value="POLICY_UPDATED">Policy Updates</option>
          </select>
        </div>
      </div>

      {/* Firestore Error Alert */}
      {firestoreError && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>Firestore Audit Sync: {firestoreError}</span>
        </div>
      )}

      {/* Audit Timeline */}
      <div className="rounded-2xl bg-[#09122a] border border-slate-800/80 p-5 shadow-xl space-y-4">
        {isLoadingFirestore ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-2 text-center">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            <p className="text-xs font-semibold text-slate-200">Loading verified audit trail from Firestore...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-10 flex flex-col items-center justify-center text-center space-y-2">
            <Inbox className="w-8 h-8 text-slate-500" />
            <p className="text-xs font-semibold text-slate-300">No audit records found</p>
            <p className="text-[11px] text-slate-400 max-w-sm">
              All AI purchase requests, Guardian evaluations, human authorization events, and PayPal capture attempts are permanently recorded here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;

              return (
                <div
                  key={log.id}
                  className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition-all space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>

                      <span className="font-mono text-cyan-400 font-bold">{log.id}</span>
                      {log.isSampleData ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          SAMPLE SEED
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          LIVE RECORD
                        </span>
                      )}
                      {getActorBadge(log.actor)}
                    </div>

                    <div className="flex items-center gap-3 text-slate-400 text-[11px] font-mono">
                      <span>Ref: <strong className="text-slate-300">{log.requestId}</strong></span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-200 font-medium pl-6">
                    {log.summary}
                  </p>

                  <div className="pl-6 flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                    <Hash className="w-3 h-3 text-cyan-400/70" />
                    <span className="truncate max-w-sm">Hash: {log.auditHash}</span>
                  </div>

                  {/* Expanded JSON Inspector */}
                  {isExpanded && (
                    <div className="mt-3 pl-6 pt-3 border-t border-slate-800/80 space-y-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Event Payload Details
                      </span>
                      <pre className="p-3 rounded-lg bg-slate-950 text-[11px] font-mono text-cyan-300 overflow-x-auto border border-slate-800">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
