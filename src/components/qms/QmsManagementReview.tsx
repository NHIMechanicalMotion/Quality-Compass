import React, { useState } from 'react';
import { 
  Calendar, 
  CheckCircle2, 
  Plus, 
  ListChecks, 
  Award,
  X,
  AlertTriangle,
  TrendingUp,
  ShieldCheck,
  Printer,
  ChevronRight,
  ArrowRightCircle,
  ShieldAlert,
  Clock,
  Sparkles
} from 'lucide-react';
import type { 
  QmsManagementReview, 
  ManagementReviewAction,
  ManagementReviewInput,
  ReviewActionStatus,
  ReviewActionPriority,
  ReviewItemStatus,
  QmsAudit,
  QmsCapa,
  OdooSyncSummary,
  QmsRiskReviewItem
} from '../../types/qms';

interface Props {
  reviews: QmsManagementReview[];
  audits?: QmsAudit[];
  capas?: QmsCapa[];
  odooSummary?: OdooSyncSummary;
  onAddReview: (review: Partial<QmsManagementReview>) => Promise<void>;
  onUpdateReview?: (reviewId: string, updates: Partial<QmsManagementReview>) => Promise<void>;
  onAddAction: (action: Partial<ManagementReviewAction>) => Promise<void>;
  onUpdateActionStatus: (actionId: string, status: ReviewActionStatus) => Promise<void>;
  onUpdateAction?: (actionId: string, updates: Partial<ManagementReviewAction>) => Promise<void>;
}

export const DEFAULT_ISO_AGENDA_ITEMS: ManagementReviewInput[] = [
  { 
    id: 'clause-9-3-2-a',
    clause: '9.3.2.a', 
    topic: 'Status of actions from previous management reviews', 
    status: 'CONFORMING', 
    notes: 'Reviewed action register from prior review period; open actions carried forward.',
    allotted_time_minutes: 15,
    presenter: 'Quality Lead',
    clause_description: 'Follow-up on all open, pending, and completed action directives from preceding MRM sessions.'
  },
  { 
    id: 'clause-9-3-2-b',
    clause: '9.3.2.b', 
    topic: 'Changes in external and internal context relevant to QMS', 
    status: 'CONFORMING', 
    notes: 'Reviewed changes in regulatory requirements, manufacturing footprints, and critical supply chain dual-sourcing.',
    allotted_time_minutes: 15,
    presenter: 'VP Operations',
    clause_description: 'Assessment of market, statutory, regulatory, and organizational changes impacting QMS suitability.'
  },
  { 
    id: 'clause-9-3-2-c-1',
    clause: '9.3.2.c.1', 
    topic: 'Customer satisfaction & feedback from interested parties', 
    status: 'EXCELLENT', 
    notes: 'Customer scorecard average 97.4% YTD. Zero major customer escapes recorded.',
    allotted_time_minutes: 20,
    presenter: 'Customer Quality Mgr',
    clause_description: 'NPS, CSAT ratings, customer audit results, and formal warranty claims.'
  },
  { 
    id: 'clause-9-3-2-c-2',
    clause: '9.3.2.c.2', 
    topic: 'Extent to which quality objectives have been met', 
    status: 'CONFORMING', 
    notes: 'On-time delivery (OTD) at 98.6%; Scrap within target threshold; FAI approval rate 98.1%.',
    allotted_time_minutes: 20,
    presenter: 'QA VP',
    clause_description: 'Tracking KPI achievement against plant and corporate quality objectives.'
  },
  { 
    id: 'clause-9-3-2-c-3',
    clause: '9.3.2.c.3', 
    topic: 'Process performance & conformity of products & services', 
    status: 'CONFORMING', 
    notes: 'Live Odoo shopfloor telemetry evaluated: overall PPM, Cpk capability on critical pulley/flange dimensions, and workcenter yield.',
    allotted_time_minutes: 25,
    presenter: 'Manufacturing Mgr',
    clause_description: 'Statistical process control, in-process CMM verification, and Odoo scrap metrics.'
  },
  { 
    id: 'clause-9-3-2-c-4',
    clause: '9.3.2.c.4', 
    topic: 'Nonconformities and corrective actions (CAPA / 8D)', 
    status: 'CONFORMING', 
    notes: 'Reviewed open 8D root-cause containment cycles, MRB quarantined lots, and mean time to closure (MTTR).',
    allotted_time_minutes: 25,
    presenter: 'Sr Quality Engineer',
    clause_description: 'Status of open/closed CAPAs, recurring nonconformances, and 8D verification.'
  },
  { 
    id: 'clause-9-3-2-c-5',
    clause: '9.3.2.c.5', 
    topic: 'Monitoring and measurement results', 
    status: 'CONFORMING', 
    notes: '100% calibration compliance maintained on shopfloor gages; First Article Inspection reports verified in Quality Compass.',
    allotted_time_minutes: 15,
    presenter: 'Metrology Lead',
    clause_description: 'Calibration status, gage R&R repeatability, and inspection bubble print conformity.'
  },
  { 
    id: 'clause-9-3-2-c-6',
    clause: '9.3.2.c.6', 
    topic: 'Audit results (Internal, External Registrar, Customer, Regulatory)', 
    status: 'CONFORMING', 
    notes: 'Cross-functional review of internal audits, TUV registrar surveillance, and customer line audits.',
    allotted_time_minutes: 25,
    presenter: 'Chief Auditor',
    clause_description: 'Findings, non-conformities, and opportunities for improvement from all audit tiers.'
  },
  { 
    id: 'clause-9-3-2-c-7',
    clause: '9.3.2.c.7', 
    topic: 'Performance of external providers (Suppliers & Vendors)', 
    status: 'CONFORMING', 
    notes: 'Evaluated raw material suppliers, bar stock certs, anodizing vendor yield, and supplier RMA cost recovery.',
    allotted_time_minutes: 15,
    presenter: 'Supply Chain Director',
    clause_description: 'Supplier scorecards, incoming inspection rejection rate, and RMA tracking.'
  },
  { 
    id: 'clause-9-3-2-d',
    clause: '9.3.2.d', 
    topic: 'Adequacy of resources (Personnel, Tooling, Infrastructure)', 
    status: 'CONFORMING', 
    notes: 'Approved investment for second automated optical CMM fixture and QA technician training.',
    allotted_time_minutes: 20,
    presenter: 'COO / Plant Mgr',
    clause_description: 'Personnel, equipment, software, gages, and facility readiness.'
  },
  { 
    id: 'clause-9-3-2-e',
    clause: '9.3.2.e', 
    topic: 'Effectiveness of actions taken to address risks & opportunities', 
    status: 'CONFORMING', 
    notes: 'Clause 6.1 risk register reviewed: evaluated FMEA risk priority numbers and mitigation action status.',
    allotted_time_minutes: 20,
    presenter: 'Risk / Engineering Lead',
    clause_description: 'Risk assessment, mitigation effectiveness, and positive opportunities exploitation.'
  },
  { 
    id: 'clause-9-3-2-f',
    clause: '9.3.2.f', 
    topic: 'Opportunities for continuous improvement (Kaizen / CI)', 
    status: 'EXCELLENT', 
    notes: 'Reviewed active Kaizen proposals and projected cost savings across CNC turning and setup reduction.',
    allotted_time_minutes: 15,
    presenter: 'Continuous Improvement Lead',
    clause_description: 'Process optimization, poka-yoke error-proofing, and scrap reduction initiatives.'
  },
  { 
    id: 'clause-9-3-3',
    clause: '9.3.3', 
    topic: 'Management Review Outputs & Strategic Directives', 
    status: 'CONFORMING', 
    notes: 'Summary of top management decisions on QMS suitability, policy alignment, and assigned action directives.',
    allotted_time_minutes: 20,
    presenter: 'Executive Facilitator',
    clause_description: 'Mandatory ISO 9001:2015 outputs regarding QMS changes, resource allocations, and improvements.'
  },
];

// Initial empty state for Clause 6.1 risk evaluations
export const INITIAL_RISK_REVIEWS: QmsRiskReviewItem[] = [];

export const QmsManagementReviewComponent: React.FC<Props> = ({
  reviews,
  audits = [],
  capas = [],
  odooSummary,
  onAddReview,
  onUpdateReview,
  onAddAction,
  onUpdateActionStatus,
  onUpdateAction,
}) => {
  const [selectedReviewId, setSelectedReviewId] = useState<string>(reviews[0]?.id || '');
  const [isAddReviewModalOpen, setIsAddReviewModalOpen] = useState(false);
  const [isAddActionModalOpen, setIsAddActionModalOpen] = useState(false);
  const [isCloseActionModalOpen, setIsCloseActionModalOpen] = useState(false);
  const [selectedActionToClose, setSelectedActionToClose] = useState<ManagementReviewAction | null>(null);
  const [closureEvidence, setClosureEvidence] = useState('');
  const [closureVerifier, setClosureVerifier] = useState('Sarah Jenkins (QA VP)');

  // Drilldown modal states for tie-ins
  const [isAuditTieInModalOpen, setIsAuditTieInModalOpen] = useState(false);
  const [isCapaTieInModalOpen, setIsCapaTieInModalOpen] = useState(false);
  const [isMinutesExportModalOpen, setIsMinutesExportModalOpen] = useState(false);

  // Risk review state
  const [risks, setRisks] = useState<QmsRiskReviewItem[]>(INITIAL_RISK_REVIEWS);
  const [isAddRiskModalOpen, setIsAddRiskModalOpen] = useState(false);
  const [newRisk, setNewRisk] = useState<Partial<QmsRiskReviewItem>>({
    risk_description: '',
    category: 'OPERATIONAL',
    severity: 3,
    likelihood: 3,
    mitigation_plan: '',
    status: 'OPEN',
    owner: 'David Chen',
    clause_target: '6.1',
  });

  const selectedReview = reviews.find(r => r.id === selectedReviewId) || reviews[0];

  // Agenda builder state inside Meeting Setup modal
  const [setupAgendaItems, setSetupAgendaItems] = useState<ManagementReviewInput[]>(DEFAULT_ISO_AGENDA_ITEMS);
  const [customTopicTitle, setCustomTopicTitle] = useState('');
  const [customTopicClause, setCustomTopicClause] = useState('Custom');
  const [customTopicPresenter, setCustomTopicPresenter] = useState('Quality Lead');
  const [customTopicMinutes, setCustomTopicMinutes] = useState(15);
  const [showAddCustomTopicRow, setShowAddCustomTopicRow] = useState(false);

  // New Review Form State
  const [newReview, setNewReview] = useState<Partial<QmsManagementReview>>(() => ({
    review_code: `MR-2026-Q${Math.min(4, Math.floor(reviews.length + 1))}`,
    title: `2026 Q${Math.min(4, Math.floor(reviews.length + 1))} Executive Quality Management Review`,
    review_period: `Q${Math.min(4, Math.floor(reviews.length + 1))} 2026`,
    meeting_date: new Date().toISOString().slice(0, 10),
    facilitator: 'Sarah Jenkins (QA VP)',
    attendees: ['John Doe (COO)', 'Sarah Jenkins (QA VP)', 'Marcus Vance (VP Eng)', 'Elena Rostova (Plant Mgr)', 'David Chen (Sr QE)'],
    status: 'CONDUCTED',
    summary_notes: 'Reviewed QMS suitability, resource adequacy, and First Article inspection yield. Approved next-generation CMM fixture acquisition.',
  }));

  // New Action Form State
  const [newAction, setNewAction] = useState<Partial<ManagementReviewAction>>(() => ({
    action_description: '',
    owner: 'David Chen',
    department: 'Quality Assurance',
    due_date: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10),
    priority: 'MEDIUM',
    status: 'OPEN',
    source_clause: '9.3.2.c.4',
    resource_required: 'Engineering hours & calibration verification',
  }));

  // Handlers for Agenda Builder in modal
  const handleAddCustomTopicToAgenda = () => {
    if (!customTopicTitle.trim()) return;
    const newItem: ManagementReviewInput = {
      id: `custom-${Date.now()}`,
      clause: customTopicClause.trim() || 'Custom',
      topic: customTopicTitle.trim(),
      status: 'PLANNED',
      notes: 'Custom business review topic added during meeting agenda construction.',
      allotted_time_minutes: customTopicMinutes,
      presenter: customTopicPresenter,
      is_custom: true,
      clause_description: 'Custom plant-specific or operational topic beyond ISO 9001 baseline.',
    };
    setSetupAgendaItems(prev => [...prev, newItem]);
    setCustomTopicTitle('');
    setShowAddCustomTopicRow(false);
  };

  const handleRemoveAgendaItem = (index: number) => {
    setSetupAgendaItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleResetToStandardIsoAgenda = () => {
    setSetupAgendaItems(DEFAULT_ISO_AGENDA_ITEMS);
  };

  // Create review
  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReview.title || !newReview.facilitator) return;
    await onAddReview({
      ...newReview,
      inputs_evaluated: setupAgendaItems,
    });
    setIsAddReviewModalOpen(false);
  };

  // Add Action
  const handleCreateAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAction.action_description || !newAction.owner || !selectedReview) return;
    await onAddAction({ ...newAction, review_id: selectedReview.id });
    setIsAddActionModalOpen(false);
    setNewAction({
      action_description: '',
      owner: 'David Chen',
      department: 'Quality Assurance',
      due_date: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10),
      priority: 'MEDIUM',
      status: 'OPEN',
      source_clause: '9.3.2.c.4',
      resource_required: '',
    });
  };

  // Action status and closure verification
  const handleOpenCloseModal = (act: ManagementReviewAction) => {
    setSelectedActionToClose(act);
    setClosureEvidence(act.completion_notes || '');
    setClosureVerifier('Sarah Jenkins (QA VP)');
    setIsCloseActionModalOpen(true);
  };

  const handleConfirmCloseAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActionToClose) return;

    if (onUpdateAction) {
      await onUpdateAction(selectedActionToClose.id, {
        status: 'VERIFIED_CLOSED',
        completion_notes: closureEvidence,
        verified_by: closureVerifier,
        verified_at: new Date().toISOString(),
      });
    } else {
      await onUpdateActionStatus(selectedActionToClose.id, 'COMPLETED');
    }
    setIsCloseActionModalOpen(false);
    setSelectedActionToClose(null);
  };

  // Prior review rollover (Clause 9.3.2.a)
  const handleRolloverPriorActions = async () => {
    if (!selectedReview) return;
    const priorReviews = reviews.filter(r => r.id !== selectedReview.id);
    if (priorReviews.length === 0) {
      alert('No previous reviews found to rollover from.');
      return;
    }
    const lastRev = priorReviews[0];
    const unclosed = (lastRev.actions || []).filter(a => a.status !== 'COMPLETED' && a.status !== 'VERIFIED_CLOSED');
    
    if (unclosed.length === 0) {
      alert(`All actions from prior review ${lastRev.review_code} are already verified closed.`);
      return;
    }

    for (const act of unclosed) {
      await onAddAction({
        review_id: selectedReview.id,
        action_description: `[Rolled Over from ${lastRev.review_code}] ${act.action_description}`,
        owner: act.owner,
        due_date: act.due_date,
        priority: act.priority,
        status: 'IN_PROGRESS',
        source_clause: '9.3.2.a',
      });
    }
    alert(`Successfully rolled over ${unclosed.length} open action(s) from ${lastRev.review_code} into Clause 9.3.2.a!`);
  };

  // Inline topic status update
  const handleToggleInputStatus = async (clauseCode: string, newStatus: ReviewItemStatus) => {
    if (!selectedReview || !onUpdateReview) return;
    const updatedInputs = selectedReview.inputs_evaluated.map(item => 
      item.clause === clauseCode ? { ...item, status: newStatus } : item
    );
    await onUpdateReview(selectedReview.id, { inputs_evaluated: updatedInputs });
  };

  // Add risk item
  const handleAddRisk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRisk.risk_description) return;
    const item: QmsRiskReviewItem = {
      id: `risk-${Date.now()}`,
      risk_description: newRisk.risk_description || '',
      category: newRisk.category || 'OPERATIONAL',
      severity: Number(newRisk.severity) || 3,
      likelihood: Number(newRisk.likelihood) || 3,
      risk_score: (Number(newRisk.severity) || 3) * (Number(newRisk.likelihood) || 3),
      mitigation_plan: newRisk.mitigation_plan || '',
      status: (newRisk.status as any) || 'OPEN',
      owner: newRisk.owner || 'Marcus Vance',
      clause_target: '6.1',
      updated_at: new Date().toISOString().slice(0, 10),
    };
    setRisks(prev => [item, ...prev]);
    setIsAddRiskModalOpen(false);
    setNewRisk({
      risk_description: '',
      category: 'OPERATIONAL',
      severity: 3,
      likelihood: 3,
      mitigation_plan: '',
      status: 'OPEN',
      owner: 'David Chen',
      clause_target: '6.1',
    });
  };

  const actions = selectedReview?.actions || [];
  const completedActions = actions.filter(a => a.status === 'COMPLETED' || a.status === 'VERIFIED_CLOSED');

  // Automatic tie-in summary metrics
  const totalAuditFindings = audits.reduce((sum, a) => sum + (a.findings?.length || 0), 0);
  const openAuditFindings = audits.reduce((sum, a) => sum + (a.findings?.filter(f => f.status !== 'CLOSED' && f.status !== 'VERIFIED').length || 0), 0);
  const openCapasCount = capas.filter(c => c.status !== 'CLOSED').length;
  const criticalCapasCount = capas.filter(c => (c.severity === 'CRITICAL' || c.severity === 'MAJOR') && c.status !== 'CLOSED').length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> ISO 9001:2015 Clause 9.3
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Executive Management Review Meeting (MRM)
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Executive Quality Management Review Cockpit
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Structured governance ensuring QMS suitability, adequacy, effectiveness, and strategic alignment with live data tie-ins.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsMinutesExportModalOpen(true)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Printer className="w-3.5 h-3.5 text-slate-300" /> Export Formal Minutes
          </button>

          <button
            onClick={() => {
              setSetupAgendaItems(DEFAULT_ISO_AGENDA_ITEMS);
              setIsAddReviewModalOpen(true);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Setup Review & Build Agenda
          </button>
        </div>
      </div>

      {/* Review Carousel & Selector */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        {reviews.map((rev) => {
          const isSelected = rev.id === selectedReview?.id;
          return (
            <div
              key={rev.id}
              onClick={() => setSelectedReviewId(rev.id)}
              className={`p-4 rounded-xl cursor-pointer border min-w-[280px] transition-all ${
                isSelected
                  ? 'bg-slate-800/90 border-emerald-500/60 shadow-lg shadow-emerald-500/10'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                  {rev.review_code}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  rev.status === 'COMPLETED'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                }`}>
                  {rev.status}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white truncate">{rev.title}</h4>
              <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
                <span>{rev.meeting_date}</span>
                <span className="font-mono text-slate-300 font-medium">{rev.actions?.length || 0} Actions</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Tie-Ins Summary Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Audits Tie-In */}
        <div 
          onClick={() => setIsAuditTieInModalOpen(true)}
          className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-sm hover:border-blue-500/50 cursor-pointer transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono text-slate-400 block">Clause 9.3.2.c.6 Audits</span>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white font-mono">{audits.length} Audits</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                  openAuditFindings > 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                }`}>
                  {openAuditFindings} Open / {totalAuditFindings} Total
                </span>
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </div>

        {/* CAPA & 8D Tie-In */}
        <div 
          onClick={() => setIsCapaTieInModalOpen(true)}
          className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-sm hover:border-amber-500/50 cursor-pointer transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono text-slate-400 block">Clause 9.3.2.c.4 CAPA</span>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white font-mono">{capas.length} CAPAs</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono font-bold">
                  {openCapasCount} Active ({criticalCapasCount} Major)
                </span>
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </div>

        {/* Odoo Quality Data & PPM */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono text-slate-400 block">Clause 9.3.2.c.3 PPM & Scrap</span>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-base font-bold text-white">{odooSummary?.overall_ppm || 128} PPM</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded font-bold">
                  {odooSummary?.fpy_percentage || 99.87}% FPY
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Review Tie-In */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono text-slate-400 block">Clause 9.3.2.e Risk Review</span>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-base font-bold text-white">{risks.length} Risks</span>
                <span className="text-[10px] text-cyan-300 bg-cyan-500/10 px-1.5 py-0.2 rounded font-bold">
                  {risks.filter(r => r.status === 'MITIGATED').length} Mitigated
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedReview ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Agenda & Inputs Evaluation Matrix */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <ListChecks className="w-5 h-5 text-emerald-400" />
                    Review Agenda & Mandatory Clause Evaluation
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Formal evaluation across ISO 9001:2015 Clause 9.3 inputs with inline status controls.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRolloverPriorActions}
                    title="Rollover unclosed actions from previous MRM (Clause 9.3.2.a)"
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors flex items-center gap-1"
                  >
                    <ArrowRightCircle className="w-3.5 h-3.5 text-blue-400" />
                    Rollover Prior Actions
                  </button>
                  <span className="text-xs px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono font-medium">
                    {selectedReview.inputs_evaluated.length} Items Built
                  </span>
                </div>
              </div>

              {/* Agenda Items List */}
              <div className="space-y-3">
                {selectedReview.inputs_evaluated.map((input, idx) => {
                  const isAuditClause = input.clause === '9.3.2.c.6';
                  const isCapaClause = input.clause === '9.3.2.c.4';
                  const isOdooClause = input.clause === '9.3.2.c.3';
                  const isRiskClause = input.clause === '9.3.2.e';

                  return (
                    <div
                      key={input.id || idx}
                      className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-2.5 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              {input.clause}
                            </span>
                            <span className="text-xs font-bold text-white">{input.topic}</span>
                            {input.is_custom && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300">
                                Custom Item
                              </span>
                            )}
                          </div>
                          {input.clause_description && (
                            <p className="text-[11px] text-slate-400 italic pl-1">{input.clause_description}</p>
                          )}
                        </div>

                        {/* Status Toggle Selector */}
                        <div className="flex items-center gap-1 shrink-0 self-start">
                          {(['CONFORMING', 'EXCELLENT', 'ACTION_REQUIRED'] as ReviewItemStatus[]).map((st) => (
                            <button
                              key={st}
                              onClick={() => handleToggleInputStatus(input.clause, st)}
                              className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded transition-all ${
                                input.status === st
                                  ? st === 'EXCELLENT'
                                    ? 'bg-cyan-500 text-slate-950 font-extrabold shadow'
                                    : st === 'CONFORMING'
                                    ? 'bg-emerald-500 text-slate-950 font-extrabold shadow'
                                    : 'bg-amber-500 text-slate-950 font-extrabold shadow'
                                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                              }`}
                            >
                              {st === 'ACTION_REQUIRED' ? 'Action Req' : st}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Notes / Minutes Text */}
                      <p className="text-xs text-slate-300 pl-1 leading-relaxed bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                        {input.notes}
                      </p>

                      {/* Automatic Live Context Badges */}
                      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                        <div className="flex items-center gap-3">
                          {input.presenter && (
                            <span>Presenter: <strong className="text-slate-300">{input.presenter}</strong></span>
                          )}
                          {input.allotted_time_minutes && (
                            <span className="flex items-center gap-1 text-slate-400">
                              <Clock className="w-3 h-3 text-slate-500" /> {input.allotted_time_minutes} min
                            </span>
                          )}
                        </div>

                        {/* Live Drilldown Triggers */}
                        {isAuditClause && (
                          <button
                            onClick={() => setIsAuditTieInModalOpen(true)}
                            className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 text-[11px] transition-colors"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" /> View {audits.length} Linked Audits & Findings
                          </button>
                        )}
                        {isCapaClause && (
                          <button
                            onClick={() => setIsCapaTieInModalOpen(true)}
                            className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 text-[11px] transition-colors"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" /> View {capas.length} Linked 8D CAPAs
                          </button>
                        )}
                        {isOdooClause && odooSummary && (
                          <span className="text-purple-300 font-mono font-medium flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5" /> Live: {odooSummary.overall_ppm} PPM | ${odooSummary.scrap_ytd.toLocaleString()} Scrap YTD
                          </span>
                        )}
                        {isRiskClause && (
                          <span className="text-cyan-300 font-mono font-medium flex items-center gap-1">
                            <ShieldAlert className="w-3.5 h-3.5" /> {risks.length} Risks Logged in Clause 6.1 Register
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Clause 6.1 Risk Review Widget */}
              <div className="mt-6 pt-5 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-cyan-400" />
                      Clause 6.1 / 9.3.2.e Risk & Opportunity Review
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Top management evaluation of actions taken to address risks & opportunities.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsAddRiskModalOpen(true)}
                    className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Log Risk Review
                  </button>
                </div>

                <div className="space-y-2">
                  {risks.length === 0 ? (
                    <p className="text-center py-4 text-slate-500 font-mono text-xs">
                      No operational risks currently registered. Click "Log Risk Review" to record Clause 6.1 risk evaluations.
                    </p>
                  ) : (
                    risks.map((rk) => (
                    <div key={rk.id} className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg space-y-1 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-slate-200 font-medium">{rk.risk_description}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                            Score: {rk.risk_score} (S{rk.severity}×L{rk.likelihood})
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            rk.status === 'MITIGATED'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {rk.status}
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400"><strong className="text-slate-300">Mitigation:</strong> {rk.mitigation_plan}</p>
                      <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1">
                        <span>Owner: {rk.owner}</span>
                        <span>Clause Ref: {rk.clause_target}</span>
                      </div>
                    </div>
                  )))}
                </div>
              </div>

              {selectedReview.summary_notes && (
                <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1">
                  <strong className="text-white block font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    Executive Summary & Top Management Directives:
                  </strong>
                  <p className="leading-relaxed">{selectedReview.summary_notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right 1 Col: Clause 9.3.3 Output Action Registry */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-blue-400" />
                    Clause 9.3.3 Output Action Items
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Assigned decisions, procedural revisions, and resource commitments.
                  </p>
                </div>
                <button
                  onClick={() => setIsAddActionModalOpen(true)}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Directive
                </button>
              </div>

              {/* Progress metric */}
              <div className="text-xs text-slate-400 flex items-center justify-between bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
                <span>Action Progress: <strong className="text-white">{completedActions.length}/{actions.length} Closed</strong></span>
                <span className="text-emerald-400 font-bold font-mono">
                  {actions.length > 0 ? Math.round((completedActions.length / actions.length) * 100) : 100}%
                </span>
              </div>

              {/* Action Cards List */}
              <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                {actions.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500 bg-slate-950/40 rounded-lg border border-dashed border-slate-800">
                    No open action items recorded for this review session.
                  </div>
                ) : (
                  actions.map((act) => {
                    const isClosed = act.status === 'COMPLETED' || act.status === 'VERIFIED_CLOSED';

                    return (
                      <div
                        key={act.id}
                        className={`p-3.5 bg-slate-950/80 border rounded-xl space-y-2.5 transition-colors ${
                          isClosed ? 'border-emerald-500/30' : 'border-slate-800'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs text-slate-200 font-medium leading-snug">
                            {act.action_description}
                          </p>
                          <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded shrink-0 ${
                            act.priority === 'HIGH'
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-blue-500/20 text-blue-300'
                          }`}>
                            {act.priority}
                          </span>
                        </div>

                        {/* Traceability: Origin Clause Badge */}
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="text-slate-500 font-mono">Origin:</span>
                          <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded">
                            {act.source_clause || 'Clause 9.3.3 Output'}
                          </span>
                          {act.resource_required && (
                            <span className="text-slate-400 truncate max-w-[140px]" title={act.resource_required}>
                              Res: {act.resource_required}
                            </span>
                          )}
                        </div>

                        {/* Closure Evidence if Closed */}
                        {isClosed && act.completion_notes && (
                          <div className="p-2 bg-emerald-950/30 border border-emerald-500/20 rounded text-[11px] text-emerald-300 space-y-0.5">
                            <strong className="block text-[10px] text-emerald-400 uppercase font-mono">Verification Evidence:</strong>
                            <p>{act.completion_notes}</p>
                            {act.verified_by && (
                              <span className="block text-[10px] text-slate-400 pt-0.5">
                                Verified by: <strong className="text-slate-300">{act.verified_by}</strong>
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                          <span>Owner: <strong className="text-slate-300">{act.owner}</strong></span>
                          <span>Due: {act.due_date}</span>
                        </div>

                        <div className="flex justify-end pt-1">
                          {isClosed ? (
                            <button
                              onClick={() => onUpdateActionStatus(act.id, 'IN_PROGRESS')}
                              className="px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Verified Closed
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenCloseModal(act)}
                              className="px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              Verify & Close Action
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 text-xs text-slate-400 space-y-1">
              <div>Facilitator: <strong className="text-slate-200">{selectedReview.facilitator}</strong></div>
              <div>Attendees: <strong className="text-slate-300">{selectedReview.attendees?.join(', ') || 'Leadership Team'}</strong></div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-slate-500">No Management Review sessions logged yet.</div>
      )}

      {/* Modal: Setup Review Meeting & Build Agenda */}
      {isAddReviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-400" />
                  Setup Management Review Meeting & Build Agenda
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Defaults to ISO 9001:2015 Clause 9.3 standard topics with options to add custom agenda topics.
                </p>
              </div>
              <button onClick={() => setIsAddReviewModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReview} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Review Code</label>
                  <input
                    type="text"
                    value={newReview.review_code}
                    onChange={(e) => setNewReview({ ...newReview, review_code: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Review Period</label>
                  <input
                    type="text"
                    value={newReview.review_period}
                    onChange={(e) => setNewReview({ ...newReview, review_period: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Meeting Date</label>
                  <input
                    type="date"
                    value={newReview.meeting_date}
                    onChange={(e) => setNewReview({ ...newReview, meeting_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Facilitator</label>
                  <input
                    type="text"
                    value={newReview.facilitator}
                    onChange={(e) => setNewReview({ ...newReview, facilitator: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Meeting Title</label>
                <input
                  type="text"
                  value={newReview.title}
                  onChange={(e) => setNewReview({ ...newReview, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>

              {/* Agenda Builder Section */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <ListChecks className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-white text-xs">Agenda Topics ({setupAgendaItems.length} Items)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleResetToStandardIsoAgenda}
                      className="text-[11px] text-slate-400 hover:text-white transition-colors"
                    >
                      Reset to Standard ISO 9001
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddCustomTopicRow(true)}
                      className="px-2 py-0.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-[10px] font-bold flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Add Custom Topic
                    </button>
                  </div>
                </div>

                {/* Custom topic form if triggered */}
                {showAddCustomTopicRow && (
                  <div className="p-3 bg-purple-950/30 border border-purple-800/50 rounded-lg space-y-2">
                    <span className="font-bold text-purple-300 text-[11px] block">New Agenda Topic</span>
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                      <input
                        type="text"
                        placeholder="Clause (e.g. 9.4 / Plant)"
                        value={customTopicClause}
                        onChange={(e) => setCustomTopicClause(e.target.value)}
                        className="bg-slate-950 border border-purple-700 rounded px-2 py-1 text-white text-xs font-mono"
                      />
                      <input
                        type="text"
                        placeholder="Topic Title (e.g. Plant Expansion)"
                        value={customTopicTitle}
                        onChange={(e) => setCustomTopicTitle(e.target.value)}
                        className="sm:col-span-2 bg-slate-950 border border-purple-700 rounded px-2 py-1 text-white text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Presenter"
                        value={customTopicPresenter}
                        onChange={(e) => setCustomTopicPresenter(e.target.value)}
                        className="bg-slate-950 border border-purple-700 rounded px-2 py-1 text-white text-xs"
                      />
                      <input
                        type="number"
                        placeholder="Minutes"
                        value={customTopicMinutes}
                        onChange={(e) => setCustomTopicMinutes(Number(e.target.value))}
                        className="bg-slate-950 border border-purple-700 rounded px-2 py-1 text-white text-xs"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAddCustomTopicRow(false)}
                        className="text-[10px] text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleAddCustomTopicToAgenda}
                        className="px-2.5 py-0.5 bg-purple-600 text-white rounded text-[10px] font-bold"
                      >
                        Add to Agenda
                      </button>
                    </div>
                  </div>
                )}

                {/* Built Agenda Preview Table */}
                <div className="max-h-56 overflow-y-auto divide-y divide-slate-800/60 pr-1">
                  {setupAgendaItems.map((item, idx) => (
                    <div key={idx} className="py-2 flex items-center justify-between text-xs gap-3">
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-mono text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded shrink-0">
                          {item.clause}
                        </span>
                        <span className="text-slate-200 truncate">{item.topic}</span>
                        {item.is_custom && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold shrink-0">
                            Custom
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[10px] text-slate-400">{item.presenter} ({item.allotted_time_minutes}m)</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAgendaItem(idx)}
                          className="text-slate-500 hover:text-rose-400 text-[11px]"
                          title="Remove item"
                        >
                          &times;
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Executive Summary & Strategic Decisions</label>
                <textarea
                  rows={2}
                  value={newReview.summary_notes || ''}
                  onChange={(e) => setNewReview({ ...newReview, summary_notes: e.target.value })}
                  placeholder="Summary of quality objectives, policy confirmation, and resource allocations..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddReviewModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 font-semibold shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> Save MRM Session & Agenda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Review Action with Clause Traceability */}
      {isAddActionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                Add Traceable Management Review Action Item
              </h3>
              <button onClick={() => setIsAddActionModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAction} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 block mb-1 font-medium">Source Clause / Agenda Origin</label>
                <select
                  value={newAction.source_clause}
                  onChange={(e) => setNewAction({ ...newAction, source_clause: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                >
                  {(selectedReview?.inputs_evaluated || DEFAULT_ISO_AGENDA_ITEMS).map((item) => (
                    <option key={item.clause} value={item.clause}>
                      {item.clause} - {item.topic}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Action Directive Description</label>
                <textarea
                  rows={3}
                  placeholder="Specify improvement action, procedural change, or containment requirement..."
                  value={newAction.action_description}
                  onChange={(e) => setNewAction({ ...newAction, action_description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Assigned Owner</label>
                  <input
                    type="text"
                    value={newAction.owner}
                    onChange={(e) => setNewAction({ ...newAction, owner: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Priority</label>
                  <select
                    value={newAction.priority}
                    onChange={(e) => setNewAction({ ...newAction, priority: e.target.value as ReviewActionPriority })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="HIGH">High Priority</option>
                    <option value="MEDIUM">Medium Priority</option>
                    <option value="LOW">Low Priority</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Target Due Date</label>
                  <input
                    type="date"
                    value={newAction.due_date}
                    onChange={(e) => setNewAction({ ...newAction, due_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Resource Required</label>
                  <input
                    type="text"
                    placeholder="e.g. $1,200 budget / tooling"
                    value={newAction.resource_required || ''}
                    onChange={(e) => setNewAction({ ...newAction, resource_required: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddActionModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 font-semibold shadow-lg shadow-emerald-500/20"
                >
                  Add Directive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Verify & Close Action Item */}
      {isCloseActionModalOpen && selectedActionToClose && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Action Closure & Verification Sign-Off
              </h3>
              <button onClick={() => setIsCloseActionModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmCloseAction} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Action Description</span>
                <p className="text-xs text-white font-medium">{selectedActionToClose.action_description}</p>
                <span className="text-[10px] text-slate-400 block pt-1">
                  Owner: {selectedActionToClose.owner} | Clause: {selectedActionToClose.source_clause || '9.3.3'}
                </span>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Verification & Closure Evidence (Required for ISO 9001 Audit Trail)</label>
                <textarea
                  rows={3}
                  value={closureEvidence}
                  onChange={(e) => setClosureEvidence(e.target.value)}
                  placeholder="Detail objective evidence: e.g. SOP updated to Rev C, 1,500 parts inspected with zero non-conformances, calibration re-certified..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Verification Authority</label>
                <input
                  type="text"
                  value={closureVerifier}
                  onChange={(e) => setClosureVerifier(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCloseActionModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 font-semibold shadow-lg shadow-emerald-500/20"
                >
                  Confirm & Mark Verified Closed
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drilldown Modal: Linked Audits (Clause 9.3.2.c.6) */}
      {isAuditTieInModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-400" />
                  Clause 9.3.2.c.6 Linked Audit Results & Findings
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Internal, External Registrar, Customer, and Regulatory findings reviewed in top management session.
                </p>
              </div>
              <button onClick={() => setIsAuditTieInModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {audits.map((a) => (
                <div key={a.id} className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-blue-400">{a.audit_number}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                      {a.audit_type}
                    </span>
                  </div>
                  <h4 className="font-bold text-white">{a.title}</h4>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Lead: {a.lead_auditor} ({a.department})</span>
                    <span>Date: {a.start_date} | Score: <strong className="text-emerald-400">{a.score || 95}%</strong></span>
                  </div>

                  {a.findings && a.findings.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-800 space-y-1.5">
                      <span className="text-[10px] font-mono uppercase text-slate-500 block">Specific Findings:</span>
                      {a.findings.map(f => (
                        <div key={f.id} className="p-2 bg-slate-900 rounded border border-slate-800 flex items-start justify-between gap-2">
                          <div>
                            <span className="font-mono text-[10px] text-amber-400 font-bold block">{f.finding_number} ({f.standard_clause})</span>
                            <p className="text-[11px] text-slate-300">{f.description}</p>
                          </div>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                            f.status === 'CLOSED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {f.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Drilldown Modal: Linked CAPAs (Clause 9.3.2.c.4) */}
      {isCapaTieInModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  Clause 9.3.2.c.4 Linked Corrective Actions (8D CAPAs)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Root-cause containment status, scrap exposure, and permanent corrective actions (PCA).
                </p>
              </div>
              <button onClick={() => setIsCapaTieInModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {capas.map((c) => (
                <div key={c.id} className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-amber-400">{c.capa_number}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      c.status === 'CLOSED' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {c.status} ({c.current_step})
                    </span>
                  </div>
                  <h4 className="font-bold text-white">{c.title}</h4>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Owner: {c.owner} | Source: {c.source}</span>
                    <span>Cost Impact: <strong className="text-amber-300">${c.odoo_cost_impact.toLocaleString()}</strong></span>
                  </div>
                  {c.eight_d_data?.d4_root_cause && (
                    <div className="p-2 bg-slate-900 rounded border border-slate-800 text-[11px] text-slate-300">
                      <strong className="text-slate-400 block text-[10px]">Verified Root Cause (D4):</strong>
                      {c.eight_d_data.d4_root_cause}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Log Risk Review (Clause 6.1) */}
      {isAddRiskModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-cyan-400" />
                Log Risk & Opportunity Review (Clause 6.1)
              </h3>
              <button onClick={() => setIsAddRiskModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddRisk} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 block mb-1 font-medium">Risk / Opportunity Description</label>
                <textarea
                  rows={2}
                  value={newRisk.risk_description}
                  onChange={(e) => setNewRisk({ ...newRisk, risk_description: e.target.value })}
                  placeholder="Describe operational, supplier, or technical risk..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Category</label>
                  <select
                    value={newRisk.category}
                    onChange={(e) => setNewRisk({ ...newRisk, category: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="OPERATIONAL">Operational</option>
                    <option value="SUPPLY_CHAIN">Supply Chain</option>
                    <option value="QUALITY_COMPLIANCE">Quality Compliance</option>
                    <option value="TOOLING_EQUIPMENT">Tooling / Equipment</option>
                    <option value="CUSTOMER_REQUIREMENT">Customer Requirement</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Status</label>
                  <select
                    value={newRisk.status}
                    onChange={(e) => setNewRisk({ ...newRisk, status: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="OPEN">Open</option>
                    <option value="MONITORING">Monitoring</option>
                    <option value="MITIGATED">Mitigated</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Severity (1 to 5)</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={newRisk.severity}
                    onChange={(e) => setNewRisk({ ...newRisk, severity: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Likelihood (1 to 5)</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={newRisk.likelihood}
                    onChange={(e) => setNewRisk({ ...newRisk, likelihood: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Mitigation Plan & Controls</label>
                <textarea
                  rows={2}
                  value={newRisk.mitigation_plan}
                  onChange={(e) => setNewRisk({ ...newRisk, mitigation_plan: e.target.value })}
                  placeholder="Preventive actions, secondary qualification, or poka-yoke..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Owner</label>
                <input
                  type="text"
                  value={newRisk.owner}
                  onChange={(e) => setNewRisk({ ...newRisk, owner: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddRiskModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 font-semibold shadow-lg shadow-cyan-500/20"
                >
                  Log Risk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Export Formal Minutes */}
      {isMinutesExportModalOpen && selectedReview && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Printer className="w-5 h-5 text-emerald-400" />
                  ISO 9001:2015 Management Review Official Minutes
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Print-ready controlled quality record for external registrar and surveillance audits.
                </p>
              </div>
              <button onClick={() => setIsMinutesExportModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 bg-slate-950 rounded-xl border border-slate-800 text-slate-200 text-xs space-y-4">
              <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
                <div>
                  <h2 className="text-base font-bold text-white">{selectedReview.title}</h2>
                  <span className="font-mono text-emerald-400 text-xs">Record ID: {selectedReview.review_code}</span>
                </div>
                <div className="text-right text-xs text-slate-400 font-mono">
                  <div>Date: {selectedReview.meeting_date}</div>
                  <div>Period: {selectedReview.review_period}</div>
                </div>
              </div>

              <div>
                <strong className="text-white block mb-1">Executive Attendees & Quorum:</strong>
                <p className="text-slate-300">{selectedReview.attendees?.join(' • ') || 'Executive Leadership'}</p>
              </div>

              <div>
                <strong className="text-white block mb-1">Clause 9.3 Evaluation Matrix:</strong>
                <div className="space-y-1.5 mt-2">
                  {selectedReview.inputs_evaluated.map(inp => (
                    <div key={inp.clause} className="p-2 bg-slate-900 rounded flex justify-between items-start gap-2">
                      <div>
                        <span className="font-mono text-[10px] text-emerald-400 font-bold block">{inp.clause} - {inp.topic}</span>
                        <p className="text-[11px] text-slate-300">{inp.notes}</p>
                      </div>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase font-mono bg-slate-800 text-slate-200">
                        {inp.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <strong className="text-white block mb-1">Clause 9.3.3 Output Action Item Register:</strong>
                <div className="space-y-1 mt-2">
                  {selectedReview.actions && selectedReview.actions.length > 0 ? (
                    selectedReview.actions.map(a => (
                      <div key={a.id} className="p-2 bg-slate-900 rounded flex justify-between items-center text-[11px]">
                        <span>{a.action_description} (Clause: {a.source_clause || '9.3.3'})</span>
                        <span className="font-mono text-slate-400">Owner: {a.owner} | Due: {a.due_date} | {a.status}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 italic">No output action items assigned.</p>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between">
                <span>Facilitated By: {selectedReview.facilitator}</span>
                <span>Document Status: Controlled Quality Record</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Print / Save as PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
