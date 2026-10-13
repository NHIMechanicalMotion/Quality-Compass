import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ShieldCheck, 
  Calendar, 
  TrendingUp, 
  FileText, 
  LayoutDashboard, 
  Zap, 
  RefreshCw, 
  Database
} from 'lucide-react';
import type { 
  QmsTab, 
  QmsAudit, 
  QmsAuditFinding, 
  QmsManagementReview, 
  ManagementReviewAction,
  QmsCapa, 
  ContinuousImprovement, 
  ControlledDocument, 
  OdooSyncSummary,
  FindingStatus,
  ReviewActionStatus,
  EightDStep,
  CapaStatus,
  CiStatus,
  DocumentStatus
} from '../../types/qms';
import { 
  fetchControlledDocuments, 
  createControlledDocument, 
  addDocumentRevision, 
  updateDocumentStatus,
  fetchQmsAudits, 
  createQmsAudit, 
  createAuditFinding, 
  updateFindingStatus,
  fetchManagementReviews, 
  createManagementReview, 
  updateManagementReview,
  addReviewAction, 
  updateReviewActionStatus,
  updateReviewAction,
  fetchQmsCapas, 
  createQmsCapa, 
  updateCapaStep,
  fetchContinuousImprovements, 
  createContinuousImprovement, 
  updateCiStatus 
} from '../../services/qmsSupabase';
import { fetchOdooSummaryData } from '../../services/odooService';
import { 
  OPERATING_COMPANIES, 
  type OperatingCompanyId, 
  matchOperatingCompany 
} from '../../data/operatingCompanies';
import { 
  calculateDefectPareto, 
  calculatePpmMonthlyTrends, 
  calculateWorkCenterQuality 
} from '../../services/odooQualityService';
import { QmsExecutiveOverview } from './QmsExecutiveOverview';
import { QmsAuditsManager } from './QmsAuditsManager';
import { QmsManagementReviewComponent } from './QmsManagementReview';
import { QmsCapaCiManager } from './QmsCapaCiManager';
import { QmsQualityMetricsView } from './QmsQualityMetricsView';
import { QmsDocumentControl } from './QmsDocumentControl';

interface Props {
  onSwitchToInspection?: () => void;
  selectedCompany?: OperatingCompanyId;
}

export const QmsDashboard: React.FC<Props> = ({
  onSwitchToInspection: _onSwitchToInspection,
  selectedCompany = 'ALL',
}) => {
  const [activeTab, setActiveTab] = useState<QmsTab>('OVERVIEW');
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Core QMS datasets
  const [audits, setAudits] = useState<QmsAudit[]>([]);
  const [reviews, setReviews] = useState<QmsManagementReview[]>([]);
  const [capas, setCapas] = useState<QmsCapa[]>([]);
  const [ciList, setCiList] = useState<ContinuousImprovement[]>([]);
  const [documents, setDocuments] = useState<ControlledDocument[]>([]);

  // Odoo Integration State
  const [odooSummary, setOdooSummary] = useState<OdooSyncSummary>({
    scrap_ytd: 0,
    scrap_target: 35000.00,
    open_quality_alerts: 0,
    mrb_quarantined_lots: 0,
    supplier_rma_cost: 0,
    last_synced_at: 'Hourly via GitHub Actions (Awaiting first run)',
    connection_status: 'DISCONNECTED',
    overall_ppm: 0,
    target_ppm: 150,
    fpy_percentage: 100.0,
    recent_alerts: [],
    ppm_monthly_trends: [],
    defect_pareto: [],
    workcenter_performance: [],
    quality_records: [],
  });

  // Filter Odoo Summary by selected Operating Company
  const companyFilteredOdooSummary = useMemo<OdooSyncSummary>(() => {
    if (selectedCompany === 'ALL') {
      return odooSummary;
    }

    const filteredRecords = (odooSummary.quality_records || []).filter((r) =>
      matchOperatingCompany(r.company_name, selectedCompany)
    );

    const filteredPareto = calculateDefectPareto(filteredRecords);
    const filteredTrends = calculatePpmMonthlyTrends(filteredRecords);
    const filteredWc = calculateWorkCenterQuality(filteredRecords);
    const openAlerts = filteredRecords.filter((r) => r.stage !== 'Resolved');
    const mrbLots = filteredRecords.filter((r) => r.is_quarantined_mrb);
    const scrapYtd = filteredRecords.reduce((sum, r) => sum + (r.scrap_cost || 0), 0);
    const currentTrend = filteredTrends[filteredTrends.length - 1];

    return {
      ...odooSummary,
      quality_records: filteredRecords,
      defect_pareto: filteredPareto,
      ppm_monthly_trends: filteredTrends.length > 0 ? filteredTrends : odooSummary.ppm_monthly_trends,
      workcenter_performance: filteredWc,
      open_quality_alerts: openAlerts.length,
      mrb_quarantined_lots: mrbLots.length,
      scrap_ytd: scrapYtd > 0 ? scrapYtd : odooSummary.scrap_ytd,
      overall_ppm: currentTrend?.ppm ?? odooSummary.overall_ppm,
      fpy_percentage: currentTrend?.fpy_percentage ?? odooSummary.fpy_percentage,
      recent_alerts: filteredRecords.slice(0, 10).map((r) => ({
        id: r.id,
        alert_code: r.alert_code,
        product_name: r.product_name,
        lot_number: r.lot_number,
        work_order: r.work_order,
        reason: r.defect_type,
        stage: r.stage,
        cost_impact: r.scrap_cost,
        date: r.date,
      })),
    };
  }, [odooSummary, selectedCompany]);

  // Load all initial data from Supabase & Odoo
  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [docsData, auditsData, reviewsData, capasData, ciData, odooData] = await Promise.all([
        fetchControlledDocuments(),
        fetchQmsAudits(),
        fetchManagementReviews(),
        fetchQmsCapas(),
        fetchContinuousImprovements(),
        fetchOdooSummaryData(),
      ]);

      setDocuments(docsData);
      setAudits(auditsData);
      setReviews(reviewsData);
      setCapas(capasData);
      setCiList(ciData);
      setOdooSummary(odooData);
    } catch (err) {
      console.error('Error loading QMS data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Handlers for Audits
  const handleAddAudit = async (audit: Partial<QmsAudit>) => {
    try {
      const created = await createQmsAudit(audit);
      setAudits((prev) => [created, ...prev]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddFinding = async (finding: Partial<QmsAuditFinding>) => {
    try {
      const created = await createAuditFinding(finding);
      setAudits((prev) =>
        prev.map((a) =>
          a.id === finding.audit_id
            ? { ...a, findings: [...(a.findings || []), created] }
            : a
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateFindingStatus = async (findingId: string, status: FindingStatus) => {
    try {
      await updateFindingStatus(findingId, status);
      setAudits((prev) =>
        prev.map((a) => ({
          ...a,
          findings: (a.findings || []).map((f) =>
            f.id === findingId ? { ...f, status } : f
          ),
        }))
      );
    } catch (err) {
      console.error(err);
    }
  };

  // Handlers for Management Review
  const handleAddReview = async (review: Partial<QmsManagementReview>) => {
    try {
      const created = await createManagementReview(review);
      setReviews((prev) => [created, ...prev]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddReviewAction = async (action: Partial<ManagementReviewAction>) => {
    try {
      const created = await addReviewAction(action);
      setReviews((prev) =>
        prev.map((r) =>
          r.id === action.review_id
            ? { ...r, actions: [...(r.actions || []), created] }
            : r
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateReviewActionStatus = async (actionId: string, status: ReviewActionStatus) => {
    try {
      await updateReviewActionStatus(actionId, status);
      setReviews((prev) =>
        prev.map((r) => ({
          ...r,
          actions: (r.actions || []).map((act) =>
            act.id === actionId ? { ...act, status } : act
          ),
        }))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateReview = async (reviewId: string, updates: Partial<QmsManagementReview>) => {
    try {
      await updateManagementReview(reviewId, updates);
      setReviews((prev) => prev.map((r) => r.id === reviewId ? { ...r, ...updates } : r));
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateReviewAction = async (actionId: string, updates: Partial<ManagementReviewAction>) => {
    try {
      await updateReviewAction(actionId, updates);
      setReviews((prev) =>
        prev.map((r) => ({
          ...r,
          actions: (r.actions || []).map((act) =>
            act.id === actionId ? { ...act, ...updates } : act
          ),
        }))
      );
    } catch (err) {
      console.error(err);
    }
  };


  // Handlers for CAPAs
  const handleAddCapa = async (capa: Partial<QmsCapa>) => {
    try {
      const created = await createQmsCapa(capa);
      setCapas((prev) => [created, ...prev]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateCapaStep = async (capaId: string, step: EightDStep, status?: CapaStatus) => {
    try {
      await updateCapaStep(capaId, step, status);
      setCapas((prev) =>
        prev.map((c) =>
          c.id === capaId
            ? { ...c, current_step: step, ...(status ? { status } : {}) }
            : c
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  // Handlers for Continuous Improvement
  const handleAddCi = async (ci: Partial<ContinuousImprovement>) => {
    try {
      const created = await createContinuousImprovement(ci);
      setCiList((prev) => [created, ...prev]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateCiStatus = async (ciId: string, status: CiStatus) => {
    try {
      await updateCiStatus(ciId, status);
      setCiList((prev) =>
        prev.map((c) => (c.id === ciId ? { ...c, status } : c))
      );
    } catch (err) {
      console.error(err);
    }
  };

  // Handlers for Document Control
  const handleAddDocument = async (doc: Partial<ControlledDocument>) => {
    try {
      const created = await createControlledDocument(doc);
      setDocuments((prev) => [created, ...prev]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddDocumentRevision = async (
    docId: string,
    revision: string,
    summary: string,
    author: string,
    approver?: string
  ) => {
    try {
      const newRev = await addDocumentRevision(docId, revision, summary, author, approver);
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === docId
            ? {
                ...d,
                current_revision: revision,
                status: approver ? 'APPROVED' : 'IN_REVIEW',
                revisions: [newRev, ...(d.revisions || [])],
              }
            : d
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateDocStatus = async (docId: string, status: DocumentStatus) => {
    try {
      await updateDocumentStatus(docId, status);
      setDocuments((prev) =>
        prev.map((d) => (d.id === docId ? { ...d, status } : d))
      );
    } catch (err) {
      console.error(err);
    }
  };

  // Odoo Handlers
  const handleRefreshOdoo = async () => {
    setIsSyncing(true);
    const updated = await fetchOdooSummaryData();
    setOdooSummary(updated);
    setIsSyncing(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden min-h-0 bg-slate-950 text-slate-100">
      {/* Sub-Navigation Tabs Bar - Docked directly to the header */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 shrink-0 z-20 shadow-md">
        <div className="max-w-[1700px] mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setActiveTab('OVERVIEW')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'OVERVIEW'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Executive Cockpit
            </button>

            <button
              onClick={() => setActiveTab('AUDITS')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'AUDITS'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              Audits (Int/Ext)
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
                {audits.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('MANAGEMENT_REVIEW')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'MANAGEMENT_REVIEW'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              Management Review (9.3)
            </button>

            <button
              onClick={() => setActiveTab('CAPA_CI')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'CAPA_CI'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              CAPA (8D) & CI / Odoo
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-amber-400 font-mono font-bold">
                {capas.filter(c => c.status !== 'CLOSED').length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('QUALITY_METRICS')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'QUALITY_METRICS'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
              Quality Metrics & PPM
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-purple-300 font-mono font-bold">
                {companyFilteredOdooSummary.overall_ppm ?? 0} PPM
              </span>
            </button>

            <button
              onClick={() => setActiveTab('DOCUMENT_CONTROL')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'DOCUMENT_CONTROL'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-purple-400" />
              Document Control (DCS)
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
                {documents.length}
              </span>
            </button>
          </div>

          {/* Right Status Badges: Supabase & Odoo Live Sync */}
          <div className="flex items-center gap-3">
            {selectedCompany !== 'ALL' && (
              <div className="flex items-center gap-1.5 text-xs bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                <span className="text-slate-400">Company:</span>
                <span className="font-bold text-emerald-400">{OPERATING_COMPANIES[selectedCompany]?.shortCode || selectedCompany}</span>
              </div>
            )}

            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>Supabase DB: <strong className="text-emerald-400">Live</strong></span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
              <Zap className="w-3.5 h-3.5 text-purple-400" />
              <span>Odoo: <strong className="text-purple-300">{companyFilteredOdooSummary.connection_status}</strong></span>
              <button
                onClick={handleRefreshOdoo}
                disabled={isSyncing}
                title="Sync live data from Odoo"
                className="text-slate-400 hover:text-white transition-colors ml-0.5"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-purple-400' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-[1700px] w-full mx-auto p-4 sm:p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-96 space-y-3">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-sm text-slate-400">Loading QMS Audits, Reviews, and Supabase Controlled Docs...</p>
            </div>
          ) : (
            <>
            {activeTab === 'OVERVIEW' && (
              <QmsExecutiveOverview
                audits={audits}
                reviews={reviews}
                capas={capas}
                ciList={ciList}
                documents={documents}
                odooSummary={companyFilteredOdooSummary}
                onNavigateTab={(tab) => setActiveTab(tab)}
                selectedCompany={selectedCompany}
              />
            )}

            {activeTab === 'AUDITS' && (
              <QmsAuditsManager
                audits={audits}
                onAddAudit={handleAddAudit}
                onAddFinding={handleAddFinding}
                onUpdateFindingStatus={handleUpdateFindingStatus}
              />
            )}

            {activeTab === 'MANAGEMENT_REVIEW' && (
              <QmsManagementReviewComponent
                reviews={reviews}
                audits={audits}
                capas={capas}
                odooSummary={companyFilteredOdooSummary}
                onAddReview={handleAddReview}
                onUpdateReview={handleUpdateReview}
                onAddAction={handleAddReviewAction}
                onUpdateActionStatus={handleUpdateReviewActionStatus}
                onUpdateAction={handleUpdateReviewAction}
              />
            )}

            {activeTab === 'CAPA_CI' && (
              <QmsCapaCiManager
                capas={capas}
                ciList={ciList}
                odooSummary={companyFilteredOdooSummary}
                onAddCapa={handleAddCapa}
                onUpdateCapaStep={handleUpdateCapaStep}
                onAddCi={handleAddCi}
                onUpdateCiStatus={handleUpdateCiStatus}
                onRefreshOdoo={handleRefreshOdoo}
              />
            )}

            {activeTab === 'QUALITY_METRICS' && (
              <QmsQualityMetricsView
                odooSummary={companyFilteredOdooSummary}
                onRefreshOdoo={handleRefreshOdoo}
                selectedCompany={selectedCompany}
              />
            )}

            {activeTab === 'DOCUMENT_CONTROL' && (
              <QmsDocumentControl
                documents={documents}
                onAddDocument={handleAddDocument}
                onAddRevision={handleAddDocumentRevision}
                onUpdateStatus={handleUpdateDocStatus}
              />
            )}
          </>
        )}
        </div>
      </div>
    </div>
  );
};
