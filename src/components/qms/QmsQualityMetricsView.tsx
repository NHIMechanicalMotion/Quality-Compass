import React, { useState } from 'react';
import { 
  TrendingUp, 
  RefreshCw, 
  Plus, 
  AlertTriangle, 
  Search, 
  BarChart3, 
  Factory, 
  CheckCircle2, 
  ShieldAlert, 
  DollarSign, 
  X,
  Gauge,
  ExternalLink
} from 'lucide-react';
import type { 
  OdooSyncSummary, 
  OdooQualityDetailRecord 
} from '../../types/qms';
import { 
  addOdooQualityRecord, 
  updateQualityRecordStage 
} from '../../services/odooQualityService';
import { OPERATING_COMPANIES, type OperatingCompanyId } from '../../data/operatingCompanies';

interface Props {
  odooSummary: OdooSyncSummary;
  onRefreshOdoo: () => Promise<void>;
  selectedCompany?: OperatingCompanyId;
}

export const QmsQualityMetricsView: React.FC<Props> = ({
  odooSummary,
  onRefreshOdoo,
  selectedCompany = 'ALL',
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerFilter, setSelectedCustomerFilter] = useState('ALL');
  const [selectedWorkcenterFilter, setSelectedWorkcenterFilter] = useState('ALL');
  const [isAddRecordModalOpen, setIsAddRecordModalOpen] = useState(false);

  // Form state for logging a quality discrepancy
  const [newRecord, setNewRecord] = useState<Partial<OdooQualityDetailRecord>>({
    product_sku: '',
    product_name: '',
    customer_name: '',
    workcenter: '',
    lot_number: '',
    work_order: '',
    defect_type: '',
    quantity_inspected: 0,
    quantity_rejected: 0,
    scrap_cost: 0,
    date: new Date().toISOString().slice(0, 10),
    stage: 'New',
    is_quarantined_mrb: false,
    notes: '',
  });

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await onRefreshOdoo();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    await addOdooQualityRecord(newRecord);
    await onRefreshOdoo();
    setIsAddRecordModalOpen(false);
  };

  const handleToggleStage = async (rec: OdooQualityDetailRecord) => {
    const nextStage = rec.stage === 'Resolved' ? 'Confirmed' : 'Resolved';
    await updateQualityRecordStage(rec.id, nextStage, nextStage === 'Resolved' ? false : rec.is_quarantined_mrb);
    await onRefreshOdoo();
  };

  const records = odooSummary.quality_records || [];

  // Filter records
  const filteredRecords = records.filter((r) => {
    const matchesSearch = 
      r.alert_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.product_sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.defect_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.lot_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.work_order.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (selectedCustomerFilter !== 'ALL' && r.customer_name !== selectedCustomerFilter) return false;
    if (selectedWorkcenterFilter !== 'ALL' && r.workcenter !== selectedWorkcenterFilter) return false;
    return true;
  });

  const customers = Array.from(new Set(records.map(r => r.customer_name).filter(Boolean)));
  const workcenters = Array.from(new Set(records.map(r => r.workcenter).filter(Boolean)));

  const overallPpm = odooSummary.overall_ppm ?? 0;
  const targetPpm = odooSummary.target_ppm ?? 150;
  const fpy = odooSummary.fpy_percentage ?? 100.0;
  const isPpmConforming = overallPpm <= targetPpm;

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Odoo Manufacturing & Quality Link
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Live Shopfloor Telemetry
            </span>
            {selectedCompany !== 'ALL' && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {OPERATING_COMPANIES[selectedCompany]?.name || selectedCompany}
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Quality Performance, PPM Tracking & Scrap Analytics
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Synchronized with Odoo Production Work Orders, Shopfloor Scrap entries, and MRB lot dispositioning.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="text-right mr-1 hidden sm:block">
            <span className="text-[10px] text-slate-500 block uppercase font-mono">Last Synced</span>
            <span className="text-xs text-slate-300 font-medium font-mono">{odooSummary.last_synced_at}</span>
          </div>

          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-purple-400' : 'text-slate-400'}`} />
            {isSyncing ? 'Syncing...' : 'Sync Odoo Data'}
          </button>

          <button
            onClick={() => setIsAddRecordModalOpen(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-purple-500/25 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Log Quality Alert
          </button>
        </div>
      </div>

      {/* KPI Cards: MO Scrap PPM, FPY, FG Return PPM (Make vs Buy), Scrap, MRB */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* 1. In-Process MO Scrap PPM */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">In-Process MO Scrap</span>
            <span className={`w-2.5 h-2.5 rounded-full ${isPpmConforming ? 'bg-emerald-400' : 'bg-rose-500'}`} />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
              {odooSummary.mo_scrap_ppm ?? overallPpm}
            </span>
            <span className="text-xs text-slate-400 font-mono">PPM</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Produced: {(odooSummary.mo_pieces_produced || 0).toLocaleString()}</span>
            <span>Scrap: <strong className="text-amber-400">{(odooSummary.mo_scrap_qty || 0).toLocaleString()}</strong></span>
          </div>
        </div>

        {/* 2. First Pass Yield */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">First-Pass Yield</span>
            <Gauge className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">{fpy}%</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Benchmark: &gt; 99.5%</span>
            <span className="text-emerald-400 font-bold">Class A</span>
          </div>
        </div>

        {/* 3. Customer FG Return PPM (Rolling 12M) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">FG Return PPM (12M)</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-purple-300 font-mono">
              {odooSummary.fg_total_ppm ?? 0}
            </span>
            <span className="text-xs text-slate-400 font-mono">PPM</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Sold: {(odooSummary.fg_total_sold_12m || 0).toLocaleString()}</span>
            <span>Returns: <strong className="text-rose-400">{(odooSummary.fg_total_returned_12m || 0).toLocaleString()}</strong></span>
          </div>
        </div>

        {/* 4. Make vs Buy Customer Return PPM (Rolling 12M) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Make vs Buy (12M)</span>
            <Factory className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Make (Mfg):</span>
              <span className="text-emerald-400 font-bold">{odooSummary.fg_make_ppm ?? 0} PPM</span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Buy (Purch):</span>
              <span className="text-blue-400 font-bold">{odooSummary.fg_buy_ppm ?? 0} PPM</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
            <span>Make Sold: {(odooSummary.fg_make_sold_12m || 0).toLocaleString()}</span>
            <span>Buy Sold: {(odooSummary.fg_buy_sold_12m || 0).toLocaleString()}</span>
          </div>
        </div>

        {/* 5. Scrap YTD & MRB Hold */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Scrap Cost YTD</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-300 font-mono">
              ${(odooSummary.scrap_ytd || 0).toLocaleString()}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>MRB Hold: <strong className="text-rose-400">{odooSummary.mrb_quarantined_lots}</strong> Lots</span>
            <span className="text-cyan-400 font-bold">Odoo v18</span>
          </div>
        </div>
      </div>

      {/* Visual Analytics: Monthly PPM Trend & Defect Pareto */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly PPM Trend Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-400" />
                Monthly PPM Performance Trend vs Benchmark
              </h3>
              <p className="text-[11px] text-slate-400">Parts Per Million defect rate across all operating companies</p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 text-slate-400">
                <span className="w-2.5 h-2.5 rounded bg-purple-500 inline-block" /> Actual PPM
              </span>
              <span className="flex items-center gap-1 text-slate-400">
                <span className="w-2.5 h-0.5 bg-rose-400 inline-block" /> Target (150)
              </span>
            </div>
          </div>

          <div className="space-y-2.5 pt-2">
            {(odooSummary.ppm_monthly_trends || []).length === 0 ? (
              <div className="py-8 text-center text-slate-500 font-mono text-xs">
                No monthly PPM trend data synced yet. Data will populate after the hourly sync runs.
              </div>
            ) : (
              (odooSummary.ppm_monthly_trends || []).slice(-6).map((m) => {
              const maxPpm = 300;
              const barWidth = Math.min(100, Math.round((m.ppm / maxPpm) * 100));
              const targetPos = Math.round((m.target_ppm / maxPpm) * 100);
              const isPassing = m.ppm <= m.target_ppm;

              return (
                <div key={m.period} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-300 font-medium">{m.period}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 text-[11px]">Vol: {(m.total_units / 1000).toFixed(0)}k</span>
                      <span className="text-slate-400 text-[11px]">Scrap: ${m.scrap_dollars.toLocaleString()}</span>
                      <span className={`font-bold px-1.5 py-0.2 rounded text-[11px] ${
                        isPassing ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
                      }`}>
                        {m.ppm} PPM
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-950 h-3 rounded-full relative overflow-hidden border border-slate-800">
                    {/* Actual Bar */}
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        isPassing ? 'bg-gradient-to-r from-purple-600 to-emerald-500' : 'bg-gradient-to-r from-purple-600 to-rose-500'
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                    {/* Target Threshold Marker */}
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-rose-400 z-10 shadow-sm"
                      style={{ left: `${targetPos}%` }}
                      title={`Target: ${m.target_ppm} PPM`}
                    />
                  </div>
                </div>
              );
            }))}
          </div>
        </div>

        {/* Defect Pareto Analysis (80/20 Distribution) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Defect Pareto Analysis (Top Failure Modes)
              </h3>
              <p className="text-[11px] text-slate-400">Root cause categories ranking by frequency & scrap cost exposure</p>
            </div>
            <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              80/20 Quality Principle
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {(odooSummary.defect_pareto || []).length === 0 ? (
              <div className="py-8 text-center text-slate-500 font-mono text-xs">
                No defect records logged. Defect Pareto will calculate automatically from Odoo quality data.
              </div>
            ) : (
              (odooSummary.defect_pareto || []).map((p, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-200 font-medium truncate max-w-[200px]">{p.reason}</span>
                  <div className="flex items-center gap-3 font-mono text-[11px]">
                    <span className="text-slate-400">{p.count} Defects</span>
                    <span className="text-amber-300 font-bold">${p.cost_impact.toLocaleString()}</span>
                    <span className="text-purple-300 font-semibold">{p.percentage}%</span>
                    <span className="text-slate-500 text-[10px]">Cum: {p.cumulative_percentage}%</span>
                  </div>
                </div>

                <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800 flex">
                  <div 
                    className="bg-amber-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${p.percentage}%` }}
                  />
                </div>
              </div>
            )))}
          </div>
        </div>
      </div>

      {/* Work Center Quality Performance Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Factory className="w-4 h-4 text-cyan-400" />
              Work Center Quality Performance Matrix
            </h3>
            <p className="text-[11px] text-slate-400">
              Operation-level yield and PPM correlation from Odoo BOM Operations (`odoo_bom_operations`)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(odooSummary.workcenter_performance || []).length === 0 ? (
            <div className="col-span-full py-8 text-center text-slate-500 font-mono text-xs">
              No work center telemetry logged yet. Work center metrics will populate after hourly sync runs.
            </div>
          ) : (
            (odooSummary.workcenter_performance || []).map((wc, idx) => (
            <div key={idx} className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-2 hover:border-slate-700 transition-colors">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                  {wc.workcenter_name}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  wc.ppm <= 150 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'
                }`}>
                  {wc.ppm} PPM
                </span>
              </div>

              <div className="text-xs text-slate-300">
                <span className="text-slate-500 block text-[10px] uppercase font-mono">Primary Characteristic Issue</span>
                <span className="font-medium text-slate-200">{wc.primary_defect}</span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80 font-mono">
                <span>Inspected: {(wc.total_units / 1000).toFixed(0)}k</span>
                <span>Scrap: <strong className="text-amber-300">${wc.scrap_cost.toLocaleString()}</strong></span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>

      {/* Filterable Detailed Quality Discrepancy Log */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden space-y-4 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-purple-400" />
              Odoo Quality Records & Shopfloor Discrepancy Log
            </h3>
            <p className="text-[11px] text-slate-400">
              Drill down into lot-level non-conformances, quarantine states, and containment actions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedCustomerFilter}
              onChange={(e) => setSelectedCustomerFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
            >
              <option value="ALL">All Customers</option>
              {customers.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select
              value={selectedWorkcenterFilter}
              onChange={(e) => setSelectedWorkcenterFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
            >
              <option value="ALL">All Workcenters</option>
              {workcenters.map(w => <option key={w} value={w}>{w}</option>)}
            </select>

            <div className="relative w-full md:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search SKU, lot, or defect..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Alert Code / Date</th>
                <th className="py-2.5 px-3">Part SKU & Description</th>
                <th className="py-2.5 px-3">Customer / Lot #</th>
                <th className="py-2.5 px-3">Odoo ERP Links</th>
                <th className="py-2.5 px-3">Workcenter</th>
                <th className="py-2.5 px-3">Defect Reason</th>
                <th className="py-2.5 px-3 text-right">PPM & Cost</th>
                <th className="py-2.5 px-3 text-center">MRB / Stage</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-500 font-mono">
                    No quality records matching filters.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3">
                      {r.odoo_url ? (
                        <a
                          href={r.odoo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono font-bold text-purple-400 hover:text-purple-300 hover:underline inline-flex items-center gap-1 group"
                          title="Open Quality Alert in Odoo ERP"
                        >
                          {r.alert_code}
                          <ExternalLink className="w-3 h-3 opacity-70 group-hover:opacity-100" />
                        </a>
                      ) : (
                        <span className="font-mono font-bold text-purple-400 block">{r.alert_code}</span>
                      )}
                      <span className="text-[10px] text-slate-500 block">{r.date}</span>
                    </td>
                    <td className="py-3 px-3 max-w-[220px]">
                      <span className="font-mono text-[11px] font-semibold text-slate-200 block truncate">{r.product_sku}</span>
                      <span className="text-[11px] text-slate-400 truncate block">{r.product_name}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-slate-200 font-medium block">{r.customer_name}</span>
                      <span className="font-mono text-[10px] text-slate-500">{r.lot_number} ({r.work_order})</span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-col gap-1 items-start">
                        {r.odoo_url && (
                          <a
                            href={r.odoo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 border border-purple-500/30 transition-colors"
                            title="Open Quality Alert in Odoo"
                          >
                            <span>QA #{r.odoo_id || r.alert_code.replace('QA-', '')}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                        {r.linked_scrap_url && (
                          <a
                            href={r.linked_scrap_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 transition-colors"
                            title={`Open Scrap SP #${r.linked_scrap_id} in Odoo (${r.linked_scrap_qty || 0} pcs)`}
                          >
                            <span>SP #{r.linked_scrap_id}</span>
                            {r.linked_scrap_qty ? <span className="text-amber-400 font-normal">({r.linked_scrap_qty} pcs)</span> : null}
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                        {r.linked_mo_url && (
                          <a
                            href={r.linked_mo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-500/15 text-blue-300 hover:bg-blue-500/25 border border-blue-500/30 transition-colors"
                            title={`Open MO #${r.linked_mo_id} in Odoo`}
                          >
                            <span>MO #{r.linked_mo_id}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                        {!r.odoo_url && !r.linked_scrap_url && !r.linked_mo_url && (
                          <span className="text-[10px] text-slate-500 font-mono italic">Offline Log</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono text-[11px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                        {r.workcenter}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-300 max-w-[240px]">
                      <p className="font-medium text-slate-200">{r.defect_type}</p>
                      {r.notes && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{r.notes}</p>}
                    </td>
                    <td className="py-3 px-3 text-right font-mono">
                      <span className="text-amber-400 font-bold block">{r.calculated_ppm} PPM</span>
                      <span className="text-[11px] text-slate-400">${r.scrap_cost.toLocaleString()} scrap</span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {r.is_quarantined_mrb && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            MRB HOLD
                          </span>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          r.stage === 'Resolved'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {r.stage}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleToggleStage(r)}
                        className={`px-2.5 py-1 rounded text-[10px] font-bold transition-colors ${
                          r.stage === 'Resolved'
                            ? 'bg-slate-800 text-slate-400 hover:text-slate-200'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow'
                        }`}
                      >
                        {r.stage === 'Resolved' ? 'Reopen' : 'Mark Resolved'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Log Quality Discrepancy */}
      {isAddRecordModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-400" />
                Log Odoo Shopfloor Quality Discrepancy
              </h3>
              <button onClick={() => setIsAddRecordModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRecord} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Part SKU</label>
                  <input
                    type="text"
                    value={newRecord.product_sku}
                    onChange={(e) => setNewRecord({ ...newRecord, product_sku: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Customer</label>
                  <input
                    type="text"
                    value={newRecord.customer_name}
                    onChange={(e) => setNewRecord({ ...newRecord, customer_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Product Name / Description</label>
                <input
                  type="text"
                  value={newRecord.product_name}
                  onChange={(e) => setNewRecord({ ...newRecord, product_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Work Center</label>
                  <select
                    value={newRecord.workcenter}
                    onChange={(e) => setNewRecord({ ...newRecord, workcenter: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="CNC_LATHE_02">CNC_LATHE_02</option>
                    <option value="MILL_5AXIS_01">MILL_5AXIS_01</option>
                    <option value="LASERC_01">LASERC_01</option>
                    <option value="SPLTASM_07">SPLTASM_07</option>
                    <option value="ANODIZE_LINE_01">ANODIZE_LINE_01</option>
                    <option value="FINAL_QC_GATE">FINAL_QC_GATE</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Lot / Work Order</label>
                  <input
                    type="text"
                    value={newRecord.lot_number}
                    onChange={(e) => setNewRecord({ ...newRecord, lot_number: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Defect Type / Characteristic Non-Conformance</label>
                <input
                  type="text"
                  value={newRecord.defect_type}
                  onChange={(e) => setNewRecord({ ...newRecord, defect_type: e.target.value })}
                  placeholder="e.g. Bore Diameter Runout > 0.015mm"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Inspected Qty</label>
                  <input
                    type="number"
                    value={newRecord.quantity_inspected}
                    onChange={(e) => setNewRecord({ ...newRecord, quantity_inspected: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Rejected Qty</label>
                  <input
                    type="number"
                    value={newRecord.quantity_rejected}
                    onChange={(e) => setNewRecord({ ...newRecord, quantity_rejected: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Scrap Cost ($)</label>
                  <input
                    type="number"
                    value={newRecord.scrap_cost}
                    onChange={(e) => setNewRecord({ ...newRecord, scrap_cost: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="mrbCheck"
                  checked={newRecord.is_quarantined_mrb}
                  onChange={(e) => setNewRecord({ ...newRecord, is_quarantined_mrb: e.target.checked })}
                  className="rounded bg-slate-950 border-slate-700 text-purple-600 focus:ring-0"
                />
                <label htmlFor="mrbCheck" className="text-slate-300 text-xs cursor-pointer">
                  Quarantine Lot in Material Review Board (MRB) Physical Hold
                </label>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Containment Notes / Initial Finding</label>
                <textarea
                  rows={2}
                  value={newRecord.notes || ''}
                  onChange={(e) => setNewRecord({ ...newRecord, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddRecordModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 font-semibold shadow-lg shadow-purple-500/25 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> Save & Recalculate PPM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
