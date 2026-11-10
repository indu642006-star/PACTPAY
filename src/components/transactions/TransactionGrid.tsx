import React, { useRef, useState, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, ColDef, ICellRendererParams } from 'ag-grid-community';
import { 
  TableProperties, 
  Search, 
  Download, 
  Filter, 
  CheckCircle2, 
  ShieldAlert, 
  Eye, 
  CreditCard,
  Hash,
  X,
  Loader2,
  AlertCircle,
  Inbox,
  FileJson,
  Copy,
  Check,
  TrendingUp,
  ShieldX,
  RotateCcw
} from 'lucide-react';
import { usePactPay } from '../../context/PactPayContext';
import { TransactionRecord } from '../../types';

// Register AG Grid Community modules
ModuleRegistry.registerModules([AllCommunityModule]);

export const TransactionGrid: React.FC = () => {
  const { transactions, isLoadingFirestore, firestoreError, paypalStatus, policy } = usePactPay();
  const gridRef = useRef<AgGridReact<TransactionRecord>>(null);
  const [quickFilterText, setQuickFilterText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'BLOCKED' | 'DECLINED' | 'PENDING'>('ALL');
  const [selectedMerchant, setSelectedMerchant] = useState<string>('ALL');
  const [selectedTx, setSelectedTx] = useState<TransactionRecord | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Status Counts
  const completedCount = transactions.filter(t => t.status === 'COMPLETED').length;
  const blockedCount = transactions.filter(t => t.status === 'BLOCKED').length;
  const pendingCount = transactions.filter(t => t.status === 'PENDING').length;

  const totalExecutedAmount = transactions
    .filter(t => t.status === 'COMPLETED')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalBlockedAmount = transactions
    .filter(t => t.status === 'BLOCKED')
    .reduce((sum, t) => sum + t.amount, 0);

  // Unique merchants for filter
  const uniqueMerchants = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(t => {
      if (t.merchant) set.add(t.merchant);
    });
    return Array.from(set).sort();
  }, [transactions]);

  // Filtered dataset passed to AG Grid
  const filteredRows = useMemo(() => {
    return transactions.filter(t => {
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (selectedMerchant !== 'ALL' && t.merchant !== selectedMerchant) return false;
      return true;
    });
  }, [transactions, statusFilter, selectedMerchant]);

  // Status Badge Renderer
  const StatusCellRenderer = (params: ICellRendererParams<TransactionRecord>) => {
    const status = params.value;
    if (status === 'COMPLETED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          PayPal Confirmed
        </span>
      );
    }
    if (status === 'BLOCKED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          Firewall Blocked
        </span>
      );
    }
    if (status === 'DECLINED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          PayPal Declined
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        Pending Execution
      </span>
    );
  };

  // Actions Cell Renderer
  const ActionsCellRenderer = (params: ICellRendererParams<TransactionRecord>) => {
    return (
      <button
        onClick={() => setSelectedTx(params.data || null)}
        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-cyan-400 border border-cyan-500/30 transition-colors"
      >
        <Eye className="w-3.5 h-3.5" />
        <span>Receipt & Audit</span>
      </button>
    );
  };

  // Column Definitions
  const colDefs = useMemo<ColDef<TransactionRecord>[]>(() => [
    {
      field: 'id',
      headerName: 'Tx ID',
      width: 140,
      pinned: 'left',
      cellRenderer: (params: ICellRendererParams<TransactionRecord>) => (
        <div className="flex items-center gap-1.5 font-mono text-cyan-300 font-bold">
          <span>{params.value}</span>
          {params.data?.isSampleData ? (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-semibold">
              SAMPLE
            </span>
          ) : (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-semibold">
              LIVE
            </span>
          )}
        </div>
      ),
    },
    {
      field: 'timestamp',
      headerName: 'Timestamp',
      width: 165,
      valueFormatter: (params) => {
        if (!params.value) return '';
        const d = new Date(params.value);
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      },
      sort: 'desc',
    },
    {
      field: 'product',
      headerName: 'Product / Service Description',
      flex: 2,
      minWidth: 220,
      cellRenderer: (params: ICellRendererParams<TransactionRecord>) => (
        <span className="font-medium text-slate-100">{params.value}</span>
      ),
    },
    {
      field: 'merchant',
      headerName: 'Merchant',
      width: 140,
      cellRenderer: (params: ICellRendererParams<TransactionRecord>) => (
        <span className="text-slate-300 font-medium">{params.value}</span>
      ),
    },
    {
      field: 'amount',
      headerName: 'Amount',
      width: 140,
      cellRenderer: (params: ICellRendererParams<TransactionRecord>) => {
        const curr = params.data?.currency || 'INR';
        const num = Number(params.value) || 0;
        return (
          <span className="font-mono font-bold text-cyan-400">
            {curr} {num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      field: 'status',
      headerName: 'Firewall & Execution Status',
      width: 190,
      cellRenderer: StatusCellRenderer,
    },
    {
      field: 'orderId',
      headerName: 'PayPal Order ID',
      width: 200,
      cellRenderer: (params: ICellRendererParams<TransactionRecord>) => (
        <span className="font-mono text-[11px] text-slate-300">{params.value}</span>
      ),
    },
    {
      field: 'approvedBy',
      headerName: 'Authorized Signer',
      width: 180,
      cellRenderer: (params: ICellRendererParams<TransactionRecord>) => (
        <span className="text-xs text-slate-400">{params.value || 'Verified Human Sign-off'}</span>
      ),
    },
    {
      headerName: 'Verification',
      width: 140,
      pinned: 'right',
      cellRenderer: ActionsCellRenderer,
      sortable: false,
      filter: false,
    },
  ], []);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    filter: true,
    resizable: true,
  }), []);

  const handleExportCsv = () => {
    if (gridRef.current?.api) {
      gridRef.current.api.exportDataAsCsv({
        fileName: `PACTPAY-Transactions-${new Date().toISOString().slice(0, 10)}.csv`,
      });
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredRows, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `PACTPAY-Transactions-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-400">
            <TableProperties className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <span>Transaction Management</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-cyan-400 border border-cyan-500/30 font-mono">
                AG Grid Community
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Deterministic ledger of PayPal Sandbox executions and Payment Guardian firewall defenses.
            </p>
          </div>
        </div>

        {/* Action Controls: Search & Exports */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={quickFilterText}
              onChange={(e) => setQuickFilterText(e.target.value)}
              placeholder="Search all records..."
              className="bg-slate-900 border border-slate-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 w-44 sm:w-60"
            />
          </div>

          <button
            onClick={handleExportCsv}
            disabled={filteredRows.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 disabled:opacity-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          <button
            onClick={handleExportJson}
            disabled={filteredRows.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 disabled:opacity-50 transition-colors"
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Gateway Configuration Notice Banner */}
      {paypalStatus && !paypalStatus.configured && (
        <div className="px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>
              <strong>PayPal Sandbox Status:</strong> Pending Credential Configuration (<code className="font-mono text-[11px] text-amber-200">PAYPAL_CLIENT_ID</code> &amp; <code className="font-mono text-[11px] text-amber-200">PAYPAL_CLIENT_SECRET</code> missing). Completed payments require credentials.
            </span>
          </div>
        </div>
      )}

      {/* Firestore Error Alert */}
      {firestoreError && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>Firestore Sync Warning: {firestoreError}</span>
        </div>
      )}

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-[#09122a] border border-slate-800/80 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400">Total In Ledger</span>
          <div className="text-xl font-bold text-white mt-0.5">{transactions.length} records</div>
          <span className="text-[11px] text-slate-500 font-mono">Showing {filteredRows.length} filtered</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#09122a] border border-slate-800/80 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-emerald-400">PayPal Completed</span>
          <div className="text-xl font-bold text-emerald-300 mt-0.5 font-mono">
            {policy.currency} {totalExecutedAmount.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400">{completedCount} verified orders</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#09122a] border border-slate-800/80 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-rose-400">Firewall Deflected</span>
          <div className="text-xl font-bold text-rose-300 mt-0.5 font-mono">
            {policy.currency} {totalBlockedAmount.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400">{blockedCount} malicious/limit blocks</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#09122a] border border-slate-800/80 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-amber-400">Pending Execution</span>
          <div className="text-xl font-bold text-amber-300 mt-0.5">{pendingCount} requests</div>
          <span className="text-[11px] text-slate-400">Awaiting credentials/gateway</span>
        </div>
      </div>

      {/* Filter Tabs & Merchant Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 rounded-xl bg-[#09122a] border border-slate-800">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto text-xs">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
              statusFilter === 'ALL'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            All ({transactions.length})
          </button>

          <button
            onClick={() => setStatusFilter('COMPLETED')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
              statusFilter === 'COMPLETED'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800/50'
            }`}
          >
            Confirmed ({completedCount})
          </button>

          <button
            onClick={() => setStatusFilter('BLOCKED')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
              statusFilter === 'BLOCKED'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'text-slate-400 hover:text-rose-400 hover:bg-slate-800/50'
            }`}
          >
            Blocked ({blockedCount})
          </button>

          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
              statusFilter === 'PENDING'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800/50'
            }`}
          >
            Pending ({pendingCount})
          </button>
        </div>

        {/* Merchant Dropdown & Reset */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedMerchant}
              onChange={(e) => setSelectedMerchant(e.target.value)}
              className="bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Merchants ({uniqueMerchants.length})</option>
              {uniqueMerchants.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {(statusFilter !== 'ALL' || selectedMerchant !== 'ALL' || quickFilterText) && (
            <button
              onClick={() => {
                setStatusFilter('ALL');
                setSelectedMerchant('ALL');
                setQuickFilterText('');
              }}
              title="Reset all filters"
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* AG Grid Container with Loading & Empty State Overlays */}
      <div className="relative ag-theme-quartz-dark rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl h-[520px] w-full">
        {/* Loading Overlay */}
        {isLoadingFirestore && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center z-20 space-y-2">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            <span className="text-xs font-semibold text-slate-200">Synchronizing with Firebase Firestore...</span>
          </div>
        )}

        {/* Empty State Overlay */}
        {!isLoadingFirestore && filteredRows.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3 bg-[#080f24]">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
              <Inbox className="w-6 h-6 text-slate-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-200">No Transactions Matching Criteria</h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                {transactions.length === 0
                  ? 'No verified PayPal executions or blocked transactions have been recorded in Firestore yet.'
                  : 'Try adjusting your status or merchant filters above.'}
              </p>
            </div>
          </div>
        ) : (
          <AgGridReact<TransactionRecord>
            ref={gridRef}
            rowData={filteredRows}
            columnDefs={colDefs}
            defaultColDef={defaultColDef}
            quickFilterText={quickFilterText}
            pagination={true}
            paginationPageSize={10}
            paginationPageSizeSelector={[10, 25, 50, 100]}
            rowSelection="single"
            animateRows={true}
          />
        )}
      </div>

      {/* Transaction Details Modal */}
      {selectedTx && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#09122a] border border-slate-800 p-6 space-y-4 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Payment Audit & Receipt</h3>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 text-[10px]">Transaction ID</span>
                  <div className="flex items-center gap-2">
                    <p className="font-mono font-bold text-cyan-400 text-sm">{selectedTx.id}</p>
                    <button
                      onClick={() => copyToClipboard(selectedTx.id, 'txId')}
                      className="text-slate-400 hover:text-cyan-300"
                      title="Copy Transaction ID"
                    >
                      {copiedField === 'txId' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-[10px]">Execution Status</span>
                  <div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedTx.status === 'COMPLETED' 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                        : selectedTx.status === 'BLOCKED'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {selectedTx.status === 'COMPLETED' ? 'PayPal Confirmed' : selectedTx.status === 'BLOCKED' ? 'Firewall Blocked' : 'Pending Configuration'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Data Origin:</span>
                  <span className={selectedTx.isSampleData ? 'text-amber-300 font-mono text-[11px] font-semibold' : 'text-emerald-400 font-mono text-[11px] font-semibold'}>
                    {selectedTx.isSampleData ? 'SAMPLE DATA (Hackathon Demo Seed)' : 'LIVE GATEWAY ATTEMPT'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Product / Item:</span>
                  <span className="text-slate-200 font-semibold text-right max-w-[260px] truncate">{selectedTx.product}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Merchant:</span>
                  <span className="text-slate-200 font-semibold">{selectedTx.merchant}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Amount:</span>
                  <span className="text-cyan-300 font-mono font-bold">
                    {selectedTx.currency} {selectedTx.amount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">PayPal Order ID:</span>
                  <span className="text-slate-300 font-mono text-[11px]">{selectedTx.orderId}</span>
                </div>
                {selectedTx.captureId && (
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">PayPal Capture ID:</span>
                    <span className="text-slate-300 font-mono text-[11px]">{selectedTx.captureId}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Authorized Signer:</span>
                  <span className="text-slate-300">{selectedTx.approvedBy || 'Verified Human Sign-off'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Guardian Risk Score:</span>
                  <span className="text-emerald-400 font-mono font-bold">{selectedTx.guardianRiskScore || 10}/100</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Timestamp:</span>
                  <span className="text-slate-300">{new Date(selectedTx.timestamp).toLocaleString()}</span>
                </div>
              </div>

              {/* Cryptographic Proof */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                    <Hash className="w-3 h-3 text-cyan-400" />
                    <span>Tamper-Evident SHA-256 Audit Proof</span>
                  </span>
                  <button
                    onClick={() => copyToClipboard(selectedTx.auditHash, 'hash')}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    {copiedField === 'hash' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedField === 'hash' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="font-mono text-[10px] text-slate-300 break-all bg-slate-900/60 p-1.5 rounded border border-slate-800">
                  {selectedTx.auditHash}
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedTx(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Close Audit Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
