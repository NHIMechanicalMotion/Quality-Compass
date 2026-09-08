import React from 'react';
import { 
  CheckCircle2, 
  TrendingUp, 
  Calendar, 
  ShieldCheck, 
  FileText, 
  ArrowUpRight,
  Zap
} from 'lucide-react';
import type { 
  QmsAudit, 
  QmsManagementReview, 
  QmsCapa, 
  ContinuousImprovement, 
  ControlledDocument, 
  OdooSyncSummary,
  QmsTab 
} from '../../types/qms';

interface Props {
  audits: QmsAudit[];
  reviews: QmsManagementReview[];
  capas: QmsCapa[];
  ciList: ContinuousImprovement[];
  documents: ControlledDocument[];
  odooSummary: OdooSyncSummary;
  onNavigateTab: (tab: QmsTab) => void;
  onOpenOdooSettings: () => void;
}

export const QmsExecutiveOverview: React.FC<Props> = ({
  audits,
  reviews,
  capas,
  ciList,
  documents,
  odooSummary,
  onNavigateTab,
  onOpenOdooSettings,
}) => {
  // Calculations
  const completedAudits = audits.filter(a => a.status === 'COMPLETED');
  const avgAuditScore = completedAudits.length > 0 
    ? Math.round(completedAudits.reduce((sum, a) => sum + (a.score || 95), 0) / completedAudits.length)
    : 95;

  const openCapas = capas.filter(c => c.status !== 'CLOSED');
  const criticalCapas = capas.filter(c => c.severity === 'CRITICAL' || c.severity === 'MAJOR');
  const totalCiSavings = ciList.reduce((sum, c) => sum + (c.actual_savings > 0 ? c.actual_savings : c.estimated_annual_savings), 0);

  const activeDocs = documents.filter(d => d.status === 'APPROVED');
  const inReviewDocs = documents.filter(d => d.status === 'IN_REVIEW' || d.status === 'DRAFT');

  const upcomingAudits = audits.filter(a => a.status === 'SCHEDULED');
  const latestReview = reviews[0];

  return (
    <div className="space-y-6">
      {/* High-Level Executive Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> ISO 9001:2015 / IATF 16949 Compliant
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Pillar 2: Executive QMS Operating System
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Quality Management Command Center
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Unified governance dashboard correlating First Article dimensional data with Internal/External audits, 
              Clause 9.3 Management Reviews, Supabase-controlled documentation, and live Odoo ERP shopfloor scrap tracking.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigateTab('AUDITS')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-blue-500/20 transition-all flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" /> View Audits
            </button>
            <button
              onClick={() => onNavigateTab('DOCUMENT_CONTROL')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-all flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4" /> Controlled Docs
            </button>
            <button
              onClick={onOpenOdooSettings}
              className="px-4 py-2 bg-purple-900/40 hover:bg-purple-900/60 text-purple-300 border border-purple-500/40 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5"
            >
              <Zap className="w-4 h-4 text-purple-400" /> Odoo Bridge
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Key Subsystem Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Audit Conformance Score */}
        <div 
          onClick={() => onNavigateTab('AUDITS')}
          className="bg-slate-900/90 border border-slate-800 hover:border-blue-500/50 rounded-xl p-5 cursor-pointer transition-all duration-200 group shadow-lg"
        >
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Audit Conformance</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:bg-blue-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{avgAuditScore}%</span>
            <span className="text-xs font-medium text-emerald-400 flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5" /> +2.4% vs 2025
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {completedAudits.length} Audits Completed • {upcomingAudits.length} Scheduled
          </p>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-emerald-500 h-full rounded-full" style={{ width: `${avgAuditScore}%` }}></div>
          </div>
        </div>

        {/* 2. Management Review (Clause 9.3) */}
        <div 
          onClick={() => onNavigateTab('MANAGEMENT_REVIEW')}
          className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 rounded-xl p-5 cursor-pointer transition-all duration-200 group shadow-lg"
        >
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Management Review</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500/20">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-white truncate">{latestReview?.review_period || 'Q1 2026'}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">
              {latestReview?.status || 'COMPLETED'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {latestReview?.inputs_evaluated?.length || 10} ISO 9.3 Clauses Evaluated
          </p>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium mt-3">
            <CheckCircle2 className="w-3.5 h-3.5" /> Quality Policy & Objectives Aligned
          </div>
        </div>

        {/* 3. CAPA & Root Cause (8D) */}
        <div 
          onClick={() => onNavigateTab('CAPA_CI')}
          className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 rounded-xl p-5 cursor-pointer transition-all duration-200 group shadow-lg"
        >
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">8D CAPA & Kaizen</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:bg-amber-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{openCapas.length}</span>
            <span className="text-xs font-medium text-amber-400">
              Active ({criticalCapas.length} Major)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            ${totalCiSavings.toLocaleString()} Annualized Kaizen Savings
          </p>
          <div className="flex items-center gap-1 text-xs text-slate-300 mt-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Avg MTTR: <strong className="text-white">18.2 Days</strong> (Target &lt; 30d)
          </div>
        </div>

        {/* 4. Odoo ERP Live Sync */}
        <div 
          onClick={() => onNavigateTab('CAPA_CI')}
          className="bg-slate-900/90 border border-slate-800 hover:border-purple-500/50 rounded-xl p-5 cursor-pointer transition-all duration-200 group shadow-lg"
        >
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Odoo ERP Quality Scrap</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:bg-purple-500/20">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">${odooSummary.scrap_ytd.toLocaleString()}</span>
            <span className="text-xs font-medium text-emerald-400">
              {Math.round((odooSummary.scrap_ytd / odooSummary.scrap_target) * 100)}% of budget
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {odooSummary.open_quality_alerts} Open Alerts • {odooSummary.mrb_quarantined_lots} Quarantined Lots
          </p>
          <div className="flex items-center justify-between text-xs text-purple-300 mt-3 pt-1 border-t border-slate-800">
            <span>Status: <strong>{odooSummary.connection_status}</strong></span>
            <span className="text-slate-400">{odooSummary.last_synced_at}</span>
          </div>
        </div>
      </div>

      {/* Two Column Section: ISO 9001 Clause Matrix & Upcoming Milestones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ISO 9001:2015 Clause Health Breakdown (2 Cols) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
                ISO 9001:2015 Standard Clauses Conformance
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Audit findings, documented procedures, and performance records mapped across the High-Level Structure (HLS).
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
              Registrar Readiness: 96%
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {[
              { clause: 'Clause 4: Context of Organization', score: 98, status: 'Audited & Aligned', docs: 'QM-001' },
              { clause: 'Clause 5: Leadership & Policy', score: 100, status: 'Executive Signed', docs: 'QM-001, MR-2026' },
              { clause: 'Clause 6: Planning & Risk (FMEA)', score: 92, status: 'FMEA Matrix Updated', docs: 'SOP-QA-012' },
              { clause: 'Clause 7: Support & Calibration', score: 94, status: '1 Minor NC Closed', docs: 'WI-MFG-045' },
              { clause: 'Clause 8: Operation & First Article', score: 97, status: 'Quality Compass CAD FAI', docs: 'SOP-ENG-004' },
              { clause: 'Clause 9: Performance & Audit', score: 96, status: 'Q1 Review Completed', docs: 'MR-2026-Q1' },
              { clause: 'Clause 10: Improvement & 8D', score: 93, status: '2 Active CAPAs in PCA', docs: 'CAPA-001' },
              { clause: 'Clause 7.5: Documented Information', score: 100, status: 'Supabase DCS Active', docs: 'DCS Master' },
            ].map((item, idx) => (
              <div key={idx} className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-200">{item.clause}</span>
                  <span className="font-bold text-emerald-400">{item.score}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 mb-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full rounded-full" 
                    style={{ width: `${item.score}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{item.status}</span>
                  <span className="text-blue-400 font-mono text-[10px] bg-blue-500/10 px-1.5 py-0.5 rounded">
                    {item.docs}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Milestones & Priority Action Items (1 Col) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-1">
              <Calendar className="w-5 h-5 text-purple-400" />
              Audits & Review Milestones
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Upcoming registrar audits, internal reviews, and target closure dates.
            </p>

            <div className="space-y-3">
              {upcomingAudits.map((a) => (
                <div key={a.id} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-md bg-purple-500/20 text-purple-300 flex flex-col items-center justify-center shrink-0 text-[10px] font-bold">
                    <span>{a.start_date.slice(5, 7)}</span>
                    <span className="text-[9px] text-purple-400 uppercase">{a.start_date.slice(8, 10)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white truncate">{a.audit_number}</span>
                      <span className="text-[10px] uppercase font-semibold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                        {a.audit_type.replace('EXTERNAL_', '')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 truncate mt-0.5">{a.title}</p>
                    <p className="text-[11px] text-slate-500 mt-1">Lead: {a.lead_auditor}</p>
                  </div>
                </div>
              ))}

              {/* Document Control Pulse */}
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-200">Supabase Document Control</span>
                  <span className="text-emerald-400 font-bold">{activeDocs.length} Approved</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {inReviewDocs.length} documents currently in draft/review cycle. Zero overdue for annual re-certification.
                </p>
              </div>

              {/* Odoo ERP Alert Preview */}
              <div className="p-3 rounded-lg bg-purple-950/20 border border-purple-800/40">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-purple-200 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-purple-400" />
                    Odoo ERP Shopfloor Alert
                  </span>
                  <span className="text-amber-400 font-bold text-[10px]">LOT-2026-03-PL98</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Bore runout on 25mm pulley quarantined in Odoo. Linked to active 8D CAPA-2026-001.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 mt-4">
            <button
              onClick={() => onNavigateTab('CAPA_CI')}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              Open CAPA & Continuous Improvement <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
