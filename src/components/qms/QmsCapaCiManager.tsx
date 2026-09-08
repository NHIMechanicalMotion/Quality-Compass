import React, { useState } from 'react';
import { 
  TrendingUp, 
  Plus, 
  CheckCircle2, 
  Zap, 
  Lightbulb, 
  Coins, 
  RefreshCw, 
  ShieldCheck,
  Database,
  X
} from 'lucide-react';
import type { 
  QmsCapa, 
  ContinuousImprovement, 
  OdooSyncSummary, 
  EightDStep, 
  CapaStatus, 
  CiStatus, 
  CapaSeverity, 
  CiCategory,
  OdooQualityAlert 
} from '../../types/qms';

interface Props {
  capas: QmsCapa[];
  ciList: ContinuousImprovement[];
  odooSummary: OdooSyncSummary;
  onAddCapa: (capa: Partial<QmsCapa>) => Promise<void>;
  onUpdateCapaStep: (capaId: string, step: EightDStep, status?: CapaStatus) => Promise<void>;
  onAddCi: (ci: Partial<ContinuousImprovement>) => Promise<void>;
  onUpdateCiStatus: (ciId: string, status: CiStatus) => Promise<void>;
  onRefreshOdoo: () => Promise<void>;
  onOpenOdooSettings: () => void;
}

const EIGHT_D_STEPS: { id: EightDStep; label: string; short: string }[] = [
  { id: 'D1_TEAM', label: 'D1: Establish Team', short: 'D1 Team' },
  { id: 'D2_PROBLEM', label: 'D2: Describe Problem (5W2H)', short: 'D2 Problem' },
  { id: 'D3_CONTAINMENT', label: 'D3: Containment Action', short: 'D3 Contain' },
  { id: 'D4_ROOT_CAUSE', label: 'D4: Root Cause (5-Why/Fishbone)', short: 'D4 Root Cause' },
  { id: 'D5_PCA', label: 'D5: Permanent Corrective Action', short: 'D5 PCA' },
  { id: 'D6_IMPLEMENT', label: 'D6: Implement & Validate', short: 'D6 Implement' },
  { id: 'D7_PREVENT', label: 'D7: Prevent Recurrence (SOP/FMEA)', short: 'D7 Prevent' },
  { id: 'D8_RECOGNITION', label: 'D8: Congratulate Team & Close', short: 'D8 Close' },
];

export const QmsCapaCiManager: React.FC<Props> = ({
  capas,
  ciList,
  odooSummary,
  onAddCapa,
  onUpdateCapaStep,
  onAddCi,
  onUpdateCiStatus,
  onRefreshOdoo,
  onOpenOdooSettings,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'8D_CAPA' | 'KAIZEN_CI' | 'ODOO_BRIDGE'>('8D_CAPA');
  const [selectedCapaId, setSelectedCapaId] = useState<string>(capas[0]?.id || '');
  const [isSyncing, setIsSyncing] = useState(false);
  const [showArchEvaluation, setShowArchEvaluation] = useState(true);

  // Modals
  const [isAddCapaModalOpen, setIsAddCapaModalOpen] = useState(false);
  const [isAddCiModalOpen, setIsAddCiModalOpen] = useState(false);

  // New CAPA Form State
  const [newCapa, setNewCapa] = useState<Partial<QmsCapa>>(() => ({
    capa_number: `CAPA-2026-${Math.floor(100 + Math.random() * 900)}`,
    title: '',
    source: 'INTERNAL_AUDIT',
    severity: 'MAJOR',
    status: 'IN_PROGRESS',
    current_step: 'D2_PROBLEM',
    owner: '',
    target_close_date: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10),
    eight_d_data: {
      d1_team: ['Quality Lead', 'Production Supv', 'Design Engineer'],
      d2_problem: '',
      d3_containment: '',
      d4_root_cause: '',
    },
    odoo_cost_impact: 0,
  }));

  // New CI Form State
  const [newCi, setNewCi] = useState<Partial<ContinuousImprovement>>(() => ({
    ci_number: `CI-2026-${Math.floor(100 + Math.random() * 900)}`,
    title: '',
    submitted_by: '',
    department: 'Manufacturing',
    category: 'CYCLE_TIME_REDUCTION',
    status: 'SUBMITTED',
    estimated_annual_savings: 5000,
    description: '',
  }));

  const selectedCapa = capas.find((c) => c.id === selectedCapaId) || capas[0];

  const handleRefreshOdoo = async () => {
    setIsSyncing(true);
    await onRefreshOdoo();
    setIsSyncing(false);
  };

  const handleCreateCapa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCapa.title || !newCapa.owner) return;
    await onAddCapa(newCapa);
    setIsAddCapaModalOpen(false);
  };

  const handleCreateCi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCi.title || !newCi.submitted_by) return;
    await onAddCi(newCi);
    setIsAddCiModalOpen(false);
  };

  const handleImportOdooAlertToCapa = (alert: OdooQualityAlert) => {
    setNewCapa({
      capa_number: `CAPA-2026-${Math.floor(100 + Math.random() * 900)}`,
      title: `Containment: ${alert.product_name} (${alert.reason})`,
      source: 'ODOO_ERP_SCRAP',
      severity: 'MAJOR',
      status: 'IN_PROGRESS',
      current_step: 'D3_CONTAINMENT',
      owner: 'David Chen',
      target_close_date: new Date(Date.now() + 86400000 * 20).toISOString().slice(0, 10),
      eight_d_data: {
        d1_team: ['David Chen (QA)', 'Zhang Wei (QC)', 'Elena Rostova (MFG)'],
        d2_problem: `Odoo ${alert.alert_code} on ${alert.work_order}. Lot ${alert.lot_number}: ${alert.reason}`,
        d3_containment: `Quarantined lot in Odoo MRB location. Financial scrap exposure: $${alert.cost_impact.toLocaleString()}`,
        d4_root_cause: '',
      },
      odoo_cost_impact: alert.cost_impact,
      odoo_alert_id: alert.alert_code,
    });
    setIsAddCapaModalOpen(true);
  };

  const currentStepIdx = EIGHT_D_STEPS.findIndex((s) => s.id === selectedCapa?.current_step);

  return (
    <div className="space-y-6">
      {/* Top Header & Sub-Nav */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-amber-400" />
            Corrective Actions (CAPA 8D) & Continuous Improvement (CI)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            ISO 9001 Clause 10.2 Nonconformity & Corrective Action paired with Kaizen innovation and live Odoo ERP scrap sync.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeSubTab === '8D_CAPA' && (
            <button
              onClick={() => setIsAddCapaModalOpen(true)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Create 8D CAPA
            </button>
          )}

          {activeSubTab === 'KAIZEN_CI' && (
            <button
              onClick={() => setIsAddCiModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5"
            >
              <Lightbulb className="w-4 h-4" /> Submit Kaizen Proposal
            </button>
          )}

          {activeSubTab === 'ODOO_BRIDGE' && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefreshOdoo}
                disabled={isSyncing}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-purple-400 ${isSyncing ? 'animate-spin' : ''}`} />
                Sync Odoo
              </button>
              <button
                onClick={onOpenOdooSettings}
                className="px-3 py-2 bg-purple-900/40 hover:bg-purple-900/60 text-purple-300 border border-purple-500/40 text-xs font-semibold rounded-lg transition-colors"
              >
                Configure Odoo
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Architectural Evaluation Banner (Collapsible) */}
      {showArchEvaluation && (
        <div className="bg-slate-900/90 border border-amber-500/40 rounded-xl p-5 relative shadow-xl overflow-hidden">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 mt-0.5">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">
                    Architectural Strategy: Why Supabase (QMS Engine) + Odoo (ERP Scrap Sync) is the Ideal Model
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Recommended Architecture
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  <strong>The Evaluation:</strong> While Odoo ERP excels at physical inventory scrap, work order tracking, and financial cost-of-quality bookings, 
                  its native quality module lacks deep ISO 9001:2015 / IATF 16949 <strong>8D root-cause rigor</strong> (5-Whys, Ishikawa fishbones, 30/60/90-day verification of effectiveness), 
                  and charges prohibitive monthly per-seat ERP licensing. 
                  <br />
                  <strong>The Solution:</strong> Quality Compass uses <strong>Supabase</strong> as the unrestricted QMS engine for root-cause investigations, 
                  while connecting to <strong>Odoo</strong> via automated sync to pull shopfloor scrap costs and MRB quarantine data directly into your dashboard.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowArchEvaluation(false)}
              className="text-slate-400 hover:text-slate-200 text-xs shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Sub-Tabs Nav */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('8D_CAPA')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === '8D_CAPA'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            8D Corrective Actions ({capas.length})
          </button>

          <button
            onClick={() => setActiveSubTab('KAIZEN_CI')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'KAIZEN_CI'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
            }`}
          >
            <Lightbulb className="w-4 h-4" />
            Continuous Improvement / Kaizen ({ciList.length})
          </button>

          <button
            onClick={() => setActiveSubTab('ODOO_BRIDGE')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'ODOO_BRIDGE'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
            }`}
          >
            <Zap className="w-4 h-4 text-purple-300" />
            Odoo ERP Quality Sync
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400">
          <span>Odoo Status: <strong className="text-purple-400">{odooSummary.connection_status}</strong></span>
          <span>•</span>
          <span>Scrap YTD: <strong className="text-emerald-400">${odooSummary.scrap_ytd.toLocaleString()}</strong></span>
        </div>
      </div>

      {/* VIEW 1: 8D CAPA WORKFLOW */}
      {activeSubTab === '8D_CAPA' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: CAPA List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Corrective Action Requests
            </h3>

            {capas.map((c) => {
              const isSelected = c.id === selectedCapa?.id;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCapaId(c.id)}
                  className={`p-4 rounded-xl cursor-pointer border transition-all ${
                    isSelected
                      ? 'bg-slate-800/90 border-amber-500/60 shadow-lg shadow-amber-500/10'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                      {c.capa_number}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      c.severity === 'CRITICAL' || c.severity === 'MAJOR'
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-blue-500/20 text-blue-300'
                    }`}>
                      {c.severity}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white line-clamp-2">{c.title}</h4>

                  <div className="flex items-center justify-between text-xs text-slate-400 mt-2.5 pt-2 border-t border-slate-800">
                    <span>Owner: <strong className="text-slate-300">{c.owner}</strong></span>
                    <span className="font-mono text-[11px] text-amber-400 font-semibold">{c.current_step}</span>
                  </div>

                  {c.odoo_cost_impact > 0 && (
                    <div className="mt-2 text-[11px] text-purple-300 flex items-center justify-between bg-purple-950/30 px-2 py-1 rounded border border-purple-900/40">
                      <span>Odoo Scrap Exposure:</span>
                      <strong className="text-white">${c.odoo_cost_impact.toLocaleString()}</strong>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right 2 Cols: 8D Lifecycle Inspector */}
          {selectedCapa ? (
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                      {selectedCapa.capa_number}
                    </span>
                    <span className="text-xs text-slate-400">Target Closure: <strong className="text-slate-200">{selectedCapa.target_close_date}</strong></span>
                  </div>
                  <h3 className="text-lg font-bold text-white">{selectedCapa.title}</h3>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <select
                    value={selectedCapa.status}
                    onChange={(e) => onUpdateCapaStep(selectedCapa.id, selectedCapa.current_step, e.target.value as CapaStatus)}
                    className="bg-slate-950 text-xs text-white border border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="PENDING_VERIFICATION">PENDING 30-DAY VOE</option>
                    <option value="CLOSED">CLOSED & VERIFIED</option>
                  </select>
                </div>
              </div>

              {/* 8D Horizontal Stepper Bar */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>8D Stage Progression</span>
                  <span className="text-amber-400">Step {currentStepIdx + 1} of 8</span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                  {EIGHT_D_STEPS.map((step, idx) => {
                    const isPassed = idx < currentStepIdx;
                    const isCurrent = idx === currentStepIdx;

                    return (
                      <button
                        key={step.id}
                        onClick={() => onUpdateCapaStep(selectedCapa.id, step.id)}
                        className={`p-2 rounded-lg text-center transition-all border ${
                          isCurrent
                            ? 'bg-amber-600/30 border-amber-500 text-amber-300 font-bold shadow-md shadow-amber-500/20'
                            : isPassed
                            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400 font-medium'
                            : 'bg-slate-950/60 border-slate-800 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <div className="text-[10px] font-mono">{step.short.split(' ')[0]}</div>
                        <div className="text-[9px] truncate mt-0.5">{step.short.split(' ').slice(1).join(' ')}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step Details & Investigation Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* D2 Problem */}
                <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="font-bold text-slate-200 flex items-center gap-1.5">
                    <span className="font-mono text-amber-400">D2:</span> Problem Statement (5W2H)
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    {selectedCapa.eight_d_data?.d2_problem || 'No formal 5W2H problem statement recorded.'}
                  </p>
                </div>

                {/* D3 Containment */}
                <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="font-bold text-slate-200 flex items-center gap-1.5">
                    <span className="font-mono text-amber-400">D3:</span> Immediate Containment
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    {selectedCapa.eight_d_data?.d3_containment || '100% quarantine and sorting in effect.'}
                  </p>
                </div>

                {/* D4 Root Cause */}
                <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="font-bold text-slate-200 flex items-center gap-1.5">
                    <span className="font-mono text-amber-400">D4:</span> 5-Why & Fishbone Root Cause
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    {selectedCapa.eight_d_data?.d4_root_cause || 'Root cause investigation in progress with machining team.'}
                  </p>
                </div>

                {/* D5 PCA */}
                <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="font-bold text-slate-200 flex items-center gap-1.5">
                    <span className="font-mono text-amber-400">D5:</span> Permanent Corrective Action (PCA)
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    {selectedCapa.eight_d_data?.d5_pca || 'Engineering tooling change and FMEA revision scheduled.'}
                  </p>
                </div>
              </div>

              {/* Team and Odoo ERP Link Info */}
              <div className="p-4 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-slate-400">D1 Core 8D Team: </span>
                  <span className="text-slate-200 font-medium">
                    {selectedCapa.eight_d_data?.d1_team?.join(', ') || selectedCapa.owner}
                  </span>
                </div>

                {selectedCapa.odoo_alert_id && (
                  <div className="flex items-center gap-1.5 text-purple-400 font-mono text-[11px] bg-purple-950/40 px-2.5 py-1 rounded border border-purple-800/50">
                    <Zap className="w-3.5 h-3.5" />
                    Linked Odoo: {selectedCapa.odoo_alert_id}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="lg:col-span-2 text-center py-12 text-slate-500">No CAPA selected.</div>
          )}
        </div>
      )}

      {/* VIEW 2: CONTINUOUS IMPROVEMENT (KAIZEN) */}
      {activeSubTab === 'KAIZEN_CI' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3 shadow">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-400 font-medium">Realized Savings YTD</div>
                <div className="text-xl font-bold text-emerald-400">
                  ${ciList.reduce((acc, i) => acc + i.actual_savings, 0).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3 shadow">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
                <Lightbulb className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-400 font-medium">Kaizen Ideas Submitted</div>
                <div className="text-xl font-bold text-white">{ciList.length} Initiatives</div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3 shadow">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-400 font-medium">Fully Implemented</div>
                <div className="text-xl font-bold text-purple-300">
                  {ciList.filter(c => c.status === 'IMPLEMENTED').length} Projects
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ciList.map((ci) => (
              <div
                key={ci.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 shadow-lg flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                      {ci.ci_number}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      ci.status === 'IMPLEMENTED'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : ci.status === 'APPROVED_TRIAL'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {ci.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white">{ci.title}</h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{ci.description}</p>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-800 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Category: <strong className="text-slate-200">{ci.category.replace(/_/g, ' ')}</strong></span>
                    <span>By: <strong className="text-slate-200">{ci.submitted_by}</strong></span>
                  </div>

                  <div className="flex items-center justify-between bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                    <span className="text-slate-400">Annualized Savings:</span>
                    <span className="font-bold text-emerald-400">
                      ${(ci.actual_savings > 0 ? ci.actual_savings : ci.estimated_annual_savings).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-end gap-1.5">
                    <select
                      value={ci.status}
                      onChange={(e) => onUpdateCiStatus(ci.id, e.target.value as CiStatus)}
                      className="bg-slate-950 text-xs text-slate-300 border border-slate-700 rounded px-2 py-1 focus:outline-none"
                    >
                      <option value="SUBMITTED">SUBMITTED</option>
                      <option value="UNDER_REVIEW">UNDER REVIEW</option>
                      <option value="APPROVED_TRIAL">APPROVED TRIAL</option>
                      <option value="IMPLEMENTED">IMPLEMENTED</option>
                      <option value="CLOSED">CLOSED</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 3: ODOO ERP QUALITY BRIDGE */}
      {activeSubTab === 'ODOO_BRIDGE' && (
        <div className="space-y-6">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
              <div className="text-xs text-slate-400 font-medium">Total Shopfloor Scrap (YTD)</div>
              <div className="text-2xl font-bold text-white mt-1">${odooSummary.scrap_ytd.toLocaleString()}</div>
              <div className="text-xs text-emerald-400 mt-1">Budget: ${odooSummary.scrap_target.toLocaleString()}</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
              <div className="text-xs text-slate-400 font-medium">Open Odoo Quality Alerts</div>
              <div className="text-2xl font-bold text-amber-400 mt-1">{odooSummary.open_quality_alerts}</div>
              <div className="text-xs text-slate-400 mt-1">Shopfloor line inspections</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
              <div className="text-xs text-slate-400 font-medium">MRB Quarantined Lots</div>
              <div className="text-2xl font-bold text-purple-400 mt-1">{odooSummary.mrb_quarantined_lots} Lots</div>
              <div className="text-xs text-slate-400 mt-1">Held in warehouse stock</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
              <div className="text-xs text-slate-400 font-medium">Supplier RMA Debits</div>
              <div className="text-2xl font-bold text-cyan-400 mt-1">${odooSummary.supplier_rma_cost.toLocaleString()}</div>
              <div className="text-xs text-slate-400 mt-1">Raw material non-conformances</div>
            </div>
          </div>

          {/* Odoo Quality Alert Queue Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-purple-400" />
                  Live Odoo ERP Quality Alerts & Shopfloor Scrap Stream
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real-time transactional defects pushed from Odoo manufacturing work centers. Import any alert into a formal 8D CAPA.
                </p>
              </div>

              <span className="text-xs px-2.5 py-1 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-medium">
                Last Synced: {odooSummary.last_synced_at}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">Alert Code</th>
                    <th className="p-3">Product / Drawing</th>
                    <th className="p-3">Lot & MO #</th>
                    <th className="p-3">Defect Reason</th>
                    <th className="p-3">Cost Impact</th>
                    <th className="p-3">Odoo Stage</th>
                    <th className="p-3 text-right">Escalate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {odooSummary.recent_alerts.map((alert) => (
                    <tr key={alert.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-mono font-bold text-purple-300">{alert.alert_code}</td>
                      <td className="p-3 font-medium text-white">{alert.product_name}</td>
                      <td className="p-3 text-slate-400 font-mono text-[11px]">
                        {alert.lot_number}<br />
                        <span className="text-slate-500">{alert.work_order}</span>
                      </td>
                      <td className="p-3 text-slate-300 max-w-xs">{alert.reason}</td>
                      <td className="p-3 font-bold text-amber-400">${alert.cost_impact.toLocaleString()}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          {alert.stage}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleImportOdooAlertToCapa(alert)}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded text-[11px] transition-colors shadow"
                        >
                          Convert to 8D CAPA
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create 8D CAPA */}
      {isAddCapaModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                Initiate New 8D Corrective Action Request (CAPA)
              </h3>
              <button onClick={() => setIsAddCapaModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCapa} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">CAPA Number</label>
                  <input
                    type="text"
                    value={newCapa.capa_number}
                    onChange={(e) => setNewCapa({ ...newCapa, capa_number: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Severity</label>
                  <select
                    value={newCapa.severity}
                    onChange={(e) => setNewCapa({ ...newCapa, severity: e.target.value as CapaSeverity })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="CRITICAL">Critical (Line Stop / Safety)</option>
                    <option value="MAJOR">Major Non-Conformance</option>
                    <option value="MODERATE">Moderate</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">CAPA Title</label>
                <input
                  type="text"
                  placeholder="e.g. Flange Bolt Pattern Centerline Deviation"
                  value={newCapa.title}
                  onChange={(e) => setNewCapa({ ...newCapa, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Assigned Lead Owner</label>
                  <input
                    type="text"
                    placeholder="e.g. David Chen"
                    value={newCapa.owner}
                    onChange={(e) => setNewCapa({ ...newCapa, owner: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Target Closure Date</label>
                  <input
                    type="date"
                    value={newCapa.target_close_date}
                    onChange={(e) => setNewCapa({ ...newCapa, target_close_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">D2: Problem Description (5W2H)</label>
                <textarea
                  rows={2}
                  placeholder="What is the defect, where observed, how many parts affected..."
                  value={newCapa.eight_d_data?.d2_problem || ''}
                  onChange={(e) => setNewCapa({
                    ...newCapa,
                    eight_d_data: { ...newCapa.eight_d_data, d2_problem: e.target.value }
                  })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">D3: Containment & Quarantine Action</label>
                <textarea
                  rows={2}
                  placeholder="Quarantine lot in Odoo MRB location, 100% sort, notify customer..."
                  value={newCapa.eight_d_data?.d3_containment || ''}
                  onChange={(e) => setNewCapa({
                    ...newCapa,
                    eight_d_data: { ...newCapa.eight_d_data, d3_containment: e.target.value }
                  })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddCapaModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-500 font-semibold shadow-lg shadow-amber-500/20"
                >
                  Save to Supabase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Submit Kaizen CI */}
      {isAddCiModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-emerald-400" />
                Submit Continuous Improvement (Kaizen) Proposal
              </h3>
              <button onClick={() => setIsAddCiModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCi} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 block mb-1 font-medium">Initiative Title</label>
                <input
                  type="text"
                  placeholder="e.g. Quick-Change Collet Chuck for CNC Mill #4"
                  value={newCi.title}
                  onChange={(e) => setNewCi({ ...newCi, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Submitted By</label>
                  <input
                    type="text"
                    placeholder="Your Name"
                    value={newCi.submitted_by}
                    onChange={(e) => setNewCi({ ...newCi, submitted_by: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Department</label>
                  <input
                    type="text"
                    value={newCi.department}
                    onChange={(e) => setNewCi({ ...newCi, department: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Category</label>
                  <select
                    value={newCi.category}
                    onChange={(e) => setNewCi({ ...newCi, category: e.target.value as CiCategory })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="CYCLE_TIME_REDUCTION">Cycle Time Reduction</option>
                    <option value="SCRAP_REDUCTION">Scrap / Waste Reduction</option>
                    <option value="ERGONOMICS">Ergonomics & Safety</option>
                    <option value="DIGITAL_POKAYOKE">Digital Poka-Yoke / Error Proofing</option>
                    <option value="TOOLING">Tooling Optimization</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Est. Annual Savings ($)</label>
                  <input
                    type="number"
                    value={newCi.estimated_annual_savings}
                    onChange={(e) => setNewCi({ ...newCi, estimated_annual_savings: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Proposal Summary</label>
                <textarea
                  rows={3}
                  placeholder="Explain the proposed improvement, baseline problem, and expected outcome..."
                  value={newCi.description}
                  onChange={(e) => setNewCi({ ...newCi, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddCiModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 font-semibold shadow-lg shadow-emerald-500/20"
                >
                  Submit Proposal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
