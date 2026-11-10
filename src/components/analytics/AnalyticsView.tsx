import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  ShieldCheck, 
  Store, 
  Layers, 
  DollarSign, 
  CheckCircle2, 
  ShieldAlert,
  PieChart,
  Calendar,
  ShieldX,
  Lock,
  ArrowUpRight,
  Sparkles,
  Info,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { usePactPay } from '../../context/PactPayContext';

export const AnalyticsView: React.FC = () => {
  const { transactions, requests, policy, isLoadingFirestore, firestoreError } = usePactPay();
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('30d');
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  // Filter dataset by selected time range
  const { filteredTxs, filteredReqs } = useMemo(() => {
    const now = Date.now();
    const cutoff = timeRange === '7d' 
      ? now - 7 * 24 * 60 * 60 * 1000
      : timeRange === '30d'
      ? now - 30 * 24 * 60 * 60 * 1000
      : 0;

    return {
      filteredTxs: transactions.filter(t => new Date(t.timestamp).getTime() >= cutoff),
      filteredReqs: requests.filter(r => new Date(r.createdAt).getTime() >= cutoff),
    };
  }, [transactions, requests, timeRange]);

  const completedTxs = filteredTxs.filter(t => t.status === 'COMPLETED');
  const blockedTxs = filteredTxs.filter(t => t.status === 'BLOCKED');

  const totalSpent = completedTxs.reduce((sum, t) => sum + t.amount, 0);
  const totalBlocked = blockedTxs.reduce((sum, t) => sum + t.amount, 0) + 
    filteredReqs.filter(r => r.status === 'guardian_blocked').reduce((sum, r) => sum + r.estimatedAmount, 0);

  const avgTransactionSize = completedTxs.length > 0 ? totalSpent / completedTxs.length : 0;

  // Merchant breakdown
  const merchantMap: Record<string, { count: number; spent: number }> = {};
  completedTxs.forEach(t => {
    if (!merchantMap[t.merchant]) {
      merchantMap[t.merchant] = { count: 0, spent: 0 };
    }
    merchantMap[t.merchant].count += 1;
    merchantMap[t.merchant].spent += t.amount;
  });
  const merchantList = Object.entries(merchantMap).sort((a, b) => b[1].spent - a[1].spent);

  // Category breakdown
  const categoryMap: Record<string, number> = {};
  filteredReqs.forEach(r => {
    const cat = r.category || 'General';
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;
  });
  const categoryList = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);

  // Daily Spending & Threat Trend Data (last 7 or 14 days)
  const chartDays = useMemo(() => {
    const daysCount = timeRange === '7d' ? 7 : 14;
    const days: { dateStr: string; label: string; spent: number; blocked: number; count: number }[] = [];

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayLabel = d.toLocaleDateString([], { weekday: 'short', month: 'numeric', day: 'numeric' });

      const daySpent = completedTxs
        .filter(t => t.timestamp.slice(0, 10) === dateStr)
        .reduce((sum, t) => sum + t.amount, 0);

      const dayBlocked = blockedTxs
        .filter(t => t.timestamp.slice(0, 10) === dateStr)
        .reduce((sum, t) => sum + t.amount, 0);

      const dayCount = completedTxs.filter(t => t.timestamp.slice(0, 10) === dateStr).length;

      days.push({
        dateStr,
        label: dayLabel,
        spent: daySpent,
        blocked: dayBlocked,
        count: dayCount,
      });
    }

    return days;
  }, [completedTxs, blockedTxs, timeRange]);

  const maxChartValue = Math.max(
    1,
    ...chartDays.map(d => Math.max(d.spent, d.blocked))
  );

  // Firewall Rule Violation Frequency
  const ruleViolationCounts = useMemo(() => {
    const counts = {
      'Per-Transaction Spending Limit': 0,
      'Merchant Whitelist / Blacklist': 0,
      'Duplicate Order Guard': 0,
      'Budget Ceiling Exceeded': 0,
      'TTL Freshness Expiry': 0,
    };

    filteredReqs.forEach(r => {
      if (r.guardianEvaluation && !r.guardianEvaluation.passed) {
        r.guardianEvaluation.checks.forEach(chk => {
          if (chk.status === 'FAIL') {
            if (chk.category === 'LIMIT') counts['Per-Transaction Spending Limit']++;
            else if (chk.category === 'MERCHANT') counts['Merchant Whitelist / Blacklist']++;
            else if (chk.category === 'DUPLICATE') counts['Duplicate Order Guard']++;
            else if (chk.category === 'AMOUNT') counts['Budget Ceiling Exceeded']++;
            else if (chk.category === 'EXPIRY') counts['TTL Freshness Expiry']++;
          }
        });
      }
    });

    return counts;
  }, [filteredReqs]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Title & Time Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-400">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <span>FinTech Analytics & Threat Radar</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono">
                Live Metrics
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Aggregated capital exposure, merchant concentration, and Payment Guardian firewall defense data.
            </p>
          </div>
        </div>

        {/* Time Filter Pills */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs">
          <button
            onClick={() => setTimeRange('7d')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              timeRange === '7d'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setTimeRange('30d')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              timeRange === '30d'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            30 Days
          </button>
          <button
            onClick={() => setTimeRange('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              timeRange === 'all'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {/* Firestore Alert if any */}
      {firestoreError && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>Firestore Sync Warning: {firestoreError}</span>
        </div>
      )}

      {/* 4 Financial & Risk KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#09122a] border border-slate-800/80 shadow-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Verified Spend</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight font-mono">
            {policy.currency} {totalSpent.toLocaleString()}
          </div>
          <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {completedTxs.length} verified executions
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-[#09122a] border border-slate-800/80 shadow-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Firewall Capital Deflected</span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
              <ShieldX className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-300 tracking-tight font-mono">
            {policy.currency} {totalBlocked.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400">
            Stopped before unauthorized capture
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-[#09122a] border border-slate-800/80 shadow-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Avg. Transaction Size</span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-cyan-300 tracking-tight font-mono">
            {policy.currency} {Math.round(avgTransactionSize).toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400">
            Per verified order
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-[#09122a] border border-slate-800/80 shadow-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Human Gate Integrity</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-indigo-300 tracking-tight">
            100%
          </div>
          <span className="text-[11px] text-indigo-400 font-medium">
            Zero autonomous bypasses allowed
          </span>
        </div>
      </div>

      {/* Interactive Spending & Threat Trend Chart (SVG) */}
      <div className="p-6 rounded-2xl bg-[#09122a] border border-slate-800/80 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Financial Flow & Firewall Defense Timeline</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                {timeRange.toUpperCase()}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Daily comparison of verified PayPal captures versus capital blocked by Payment Guardian.
            </p>
          </div>

          {/* Chart Legend */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-cyan-500" />
              <span className="text-slate-300 font-medium">Authorized Spend</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-rose-500/80" />
              <span className="text-slate-300 font-medium">Firewall Deflected</span>
            </div>
          </div>
        </div>

        {/* SVG Bar Chart */}
        <div className="pt-4">
          <div className="h-56 flex items-end gap-2 sm:gap-3 px-2 border-b border-slate-800 pb-2">
            {chartDays.map((day, idx) => {
              const spentHeight = (day.spent / maxChartValue) * 100;
              const blockedHeight = (day.blocked / maxChartValue) * 100;
              const isHovered = hoveredBarIndex === idx;

              return (
                <div
                  key={day.dateStr}
                  onMouseEnter={() => setHoveredBarIndex(idx)}
                  onMouseLeave={() => setHoveredBarIndex(null)}
                  className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                >
                  {/* Tooltip on hover */}
                  {isHovered && (
                    <div className="absolute -top-16 z-30 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl shadow-xl text-center whitespace-nowrap text-[11px] pointer-events-none">
                      <div className="font-bold text-white">{day.label}</div>
                      <div className="text-cyan-300 font-mono">Spent: {policy.currency} {day.spent.toLocaleString()}</div>
                      {day.blocked > 0 && (
                        <div className="text-rose-400 font-mono">Blocked: {policy.currency} {day.blocked.toLocaleString()}</div>
                      )}
                    </div>
                  )}

                  {/* Dual Bars */}
                  <div className="w-full flex items-end justify-center gap-1 h-full">
                    {/* Authorized Bar */}
                    <div
                      style={{ height: `${Math.max(spentHeight, day.spent > 0 ? 6 : 0)}%` }}
                      className={`w-1/2 rounded-t transition-all ${
                        isHovered ? 'bg-cyan-400 shadow-lg shadow-cyan-500/30' : 'bg-gradient-to-t from-blue-600 to-cyan-500'
                      }`}
                    />
                    {/* Blocked Bar */}
                    <div
                      style={{ height: `${Math.max(blockedHeight, day.blocked > 0 ? 6 : 0)}%` }}
                      className={`w-1/2 rounded-t transition-all ${
                        isHovered ? 'bg-rose-400 shadow-lg shadow-rose-500/30' : 'bg-rose-500/70'
                      }`}
                    />
                  </div>

                  {/* Day Label */}
                  <span className="text-[10px] text-slate-400 mt-2 truncate max-w-full">
                    {day.label.slice(0, 3)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Two-Column Lower Grid: Merchant Breakdown & Threat Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Merchant Breakdown */}
        <div className="p-5 rounded-2xl bg-[#09122a] border border-slate-800/80 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white">Merchant-Wise Spending Breakdown</h2>
            </div>
            <span className="text-xs font-mono text-slate-400">{merchantList.length} vendors</span>
          </div>

          {merchantList.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">No completed transactions recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {merchantList.map(([merchant, data], idx) => {
                const pct = totalSpent > 0 ? Math.round((data.spent / totalSpent) * 100) : 0;

                return (
                  <div key={idx} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between font-medium">
                      <span className="text-slate-200">{merchant}</span>
                      <span className="text-cyan-300 font-mono">
                        {policy.currency} {data.spent.toLocaleString()} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-400"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Guardian Firewall Threat Defense Frequency */}
        <div className="p-5 rounded-2xl bg-[#09122a] border border-slate-800/80 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <h2 className="text-sm font-bold text-white">Firewall Threats Deflected by Rule</h2>
            </div>
            <span className="text-xs font-mono text-rose-400 font-bold">Guardian Active</span>
          </div>

          <div className="space-y-3">
            {Object.entries(ruleViolationCounts).map(([ruleName, count], idx) => {
              const maxViolations = Math.max(1, ...Object.values(ruleViolationCounts));
              const pct = Math.round((count / maxViolations) * 100);

              return (
                <div key={idx} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between font-medium">
                    <span className="text-slate-300">{ruleName}</span>
                    <span className="text-rose-400 font-mono font-bold">
                      {count} block{count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-rose-600 to-amber-500"
                      style={{ width: `${count > 0 ? Math.max(pct, 8) : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 text-[11px] text-slate-400 flex items-start gap-2">
            <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
            <span>
              Autonomous agents can fail in loops or attempt high-risk payments. Payment Guardian intercepts them deterministically before human review.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
