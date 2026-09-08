import React, { useState, useEffect, useMemo } from 'react';
import {
  Compass,
  Layers,
  ShieldCheck,
  Clock,
  FileCheck,
  FileSpreadsheet,
  ShieldAlert,
  FolderOpen,
  Plus,
  RefreshCw,
  Sparkles,
  GitBranch,
  X,
  Gauge,
  ListTodo,
  Lock,
  Unlock,
  ArrowRight,
} from 'lucide-react';
import type { ApqpProject, PpapSubmission, ElementDisposition, ApqpTab, WorkflowMode } from '../../types/apqpPpap';
import {
  fetchApqpProjects,
  createApqpProject,
  fetchPpapSubmissions,
  createPpapSubmission,
  updatePpapSubmission,
  updateApqpProjectWorkflowMode,
  DEFAULT_AIAG_18_ELEMENTS,
} from '../../services/apqpPpapSupabase';
import {
  fetchOdooCustomers,
  fetchOdooParts,
  type OdooCustomer,
  type OdooPartProduct,
} from '../../services/odooSupabase';
import { OdooSearchSelect } from '../common/OdooSearchSelect';
import { CompanyBrandLogo } from '../common/CompanyBrandLogo';
import { ApqpPhaseRoadmap } from './ApqpPhaseRoadmap';
import { ApqpMasterChecklist } from './ApqpMasterChecklist';
import { PpapProcessFlow } from './PpapProcessFlow';
import { PpapWarrantForm } from './PpapWarrantForm';
import { PpapDimensionalResults } from './PpapDimensionalResults';
import { PpapControlPlan } from './PpapControlPlan';
import { PpapFmeaManager } from './PpapFmeaManager';
import { PpapCapacityAnalysis } from './PpapCapacityAnalysis';
import { PpapDocumentsModal } from './PpapDocumentsModal';
import { WorkflowGateModal } from './WorkflowGateModal';
import { exportPopulatedAiagPpapWorkbook } from '../../utils/aiagExcelService';
import {
  evaluateTabLock,
  getNextRecommendedWorkflowStep,
  PPAP_WORKFLOW_STEPS,
  type TabLockEvaluation,
} from '../../utils/apqpWorkflowRules';
import { ActionTooltip } from '../common/ActionTooltip';

import { OPERATING_COMPANIES, type OperatingCompanyId } from '../../data/operatingCompanies';

interface Props {
  onSwitchToInspection?: () => void;
  selectedCompany?: OperatingCompanyId;
  availableBalloons?: Array<{
    itemNumber: number;
    dimensionName: string;
    nominal: number;
    upperTol: number;
    lowerTol: number;
  }>;
}

export const ApqpPpapDashboard: React.FC<Props> = ({
  selectedCompany = 'ALL',
  availableBalloons,
}) => {
  const [activeTab, setActiveTab] = useState<ApqpTab>('ROADMAP');
  const [projects, setProjects] = useState<ApqpProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [submissions, setSubmissions] = useState<PpapSubmission[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isNewSubmissionModalOpen, setIsNewSubmissionModalOpen] = useState(false);

  // Odoo Synchronized Data Cache
  const [odooCustomers, setOdooCustomers] = useState<OdooCustomer[]>([]);
  const [odooParts, setOdooParts] = useState<OdooPartProduct[]>([]);
  const [filteredCustomerParts, setFilteredCustomerParts] = useState<OdooPartProduct[]>([]);

  // New Project Form State
  const [newProjCompany, setNewProjCompany] = useState<OperatingCompanyId>('NHI');
  const [newProjCode, setNewProjCode] = useState('');
  const [newProjName, setNewProjName] = useState('');
  const [newProjCustomer, setNewProjCustomer] = useState('');
  const [newProjPartNo, setNewProjPartNo] = useState('');
  const [newProjPartRev, setNewProjPartRev] = useState('Rev 01');

  // New PPAP Form State
  const [newSubNumber, setNewSubNumber] = useState('');
  const [newSubPartName, setNewSubPartName] = useState('');
  const [newSubPartNumber, setNewSubPartNumber] = useState('');
  const [newSubDrawingNumber, setNewSubDrawingNumber] = useState('');

  // Initial Data Load
  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const projList = await fetchApqpProjects();
      setProjects(projList);

      if (projList.length > 0) {
        const activeProj = projList[0];
        setSelectedProjectId(activeProj.id);
        const subList = await fetchPpapSubmissions(activeProj.id);
        setSubmissions(subList);
        if (subList.length > 0) {
          setSelectedSubmissionId(subList[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load APQP/PPAP data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load Odoo Production Customers & Parts
  const loadOdooData = async () => {
    try {
      const [customers, parts] = await Promise.all([
        fetchOdooCustomers(),
        fetchOdooParts(),
      ]);
      setOdooCustomers(customers);
      setOdooParts(parts);
      setFilteredCustomerParts(parts);
    } catch (err) {
      console.error('Failed to load Odoo data:', err);
    }
  };

  useEffect(() => {
    loadInitialData();
    loadOdooData();
  }, []);

  // Handle Odoo Customer Selection in New Project Modal
  const handleOdooCustomerSelect = async (customerName: string, _rawCustomer?: OdooCustomer) => {
    setNewProjCustomer(customerName);
    if (!customerName || !customerName.trim()) {
      setFilteredCustomerParts(odooParts);
      return;
    }

    try {
      const matchingParts = await fetchOdooParts(customerName);
      if (matchingParts.length > 0) {
        setFilteredCustomerParts(matchingParts);
      } else {
        // Fallback to local filter if remote didn't return any
        const filtered = odooParts.filter((p) =>
          p.partnerName?.toLowerCase().includes(customerName.toLowerCase())
        );
        setFilteredCustomerParts(filtered.length > 0 ? filtered : odooParts);
      }
    } catch (e) {
      console.error('Error filtering parts for customer:', e);
    }
  };

  // Handle Odoo Part Selection in New Project Modal
  const handleOdooPartSelect = (partSku: string, rawPart?: OdooPartProduct) => {
    setNewProjPartNo(partSku);
    if (rawPart) {
      if (!newProjName || newProjName === 'New Automotive APQP Program' || newProjName.endsWith('Launch')) {
        setNewProjName(`${rawPart.name || rawPart.sku} Launch Program`);
      }
      if (!newProjCode || newProjCode.startsWith('APQP-')) {
        setNewProjCode(`APQP-${rawPart.sku}`);
      }
      if (!newProjCustomer && rawPart.partnerName) {
        setNewProjCustomer(rawPart.partnerName);
      }
    }
  };

  // Handle Odoo Part Selection in New PPAP Submission Modal
  const handleOdooSubPartSelect = (partSku: string, rawPart?: OdooPartProduct) => {
    setNewSubPartNumber(partSku);
    if (rawPart) {
      setNewSubPartName(rawPart.name || partSku);
      setNewSubDrawingNumber(`DWG-${partSku}`);
      if (!newSubNumber || newSubNumber.startsWith('PPAP-')) {
        setNewSubNumber(`PPAP-${partSku}-01`);
      }
    }
  };

  // When project changes, load its submissions
  const handleSelectProject = async (projId: string) => {
    setSelectedProjectId(projId);
    try {
      const subs = await fetchPpapSubmissions(projId);
      setSubmissions(subs);
      if (subs.length > 0) {
        setSelectedSubmissionId(subs[0].id);
      } else {
        setSelectedSubmissionId('');
      }
    } catch (err) {
      console.error('Failed to fetch submissions for project:', err);
    }
  };

  // Filter projects by active Operating Company scope (ALL shows all, otherwise filters by project.operating_company)
  const filteredProjects = useMemo(() => {
    if (selectedCompany === 'ALL') {
      return projects;
    }
    return projects.filter((p) => (p.operating_company || 'NHI') === selectedCompany);
  }, [projects, selectedCompany]);

  // Synchronize selectedProjectId when filteredProjects or selectedCompany changes
  useEffect(() => {
    if (filteredProjects.length > 0) {
      const exists = filteredProjects.some((p) => p.id === selectedProjectId);
      if (!exists) {
        const nextProj = filteredProjects[0];
        setSelectedProjectId(nextProj.id);
        fetchPpapSubmissions(nextProj.id).then((subs) => {
          setSubmissions(subs);
          if (subs.length > 0) {
            setSelectedSubmissionId(subs[0].id);
          } else {
            setSelectedSubmissionId('');
          }
        });
      }
    } else {
      setSelectedProjectId('');
      setSubmissions([]);
      setSelectedSubmissionId('');
    }
  }, [filteredProjects, selectedCompany]);

  const currentProject = filteredProjects.find((p) => p.id === selectedProjectId) || filteredProjects[0] || null;
  const currentSubmission = submissions.find((s) => s.id === selectedSubmissionId) || submissions[0] || null;

  // Workflow Gatekeeper State
  const [isGateModalOpen, setIsGateModalOpen] = useState(false);
  const [gateEvaluation, setGateEvaluation] = useState<TabLockEvaluation | null>(null);
  const [gateTargetName, setGateTargetName] = useState('');

  const getTabDisplayName = (tab: ApqpTab): string => {
    switch (tab) {
      case 'ROADMAP': return 'APQP Roadmap';
      case 'CHECKLIST': return 'Overall APQP Checklist';
      case 'PROCESS_FLOW': return 'Process Flow Diagram (PFD)';
      case 'PFMEA': return 'AIAG-VDA Process FMEA';
      case 'CONTROL_PLAN': return 'AIAG Control Plan';
      case 'DIMENSIONAL': return 'Dimensional Layout (CFG-1003)';
      case 'CAPACITY_ANALYSIS': return 'Capacity Analysis & Run @ Rate';
      case 'ELEMENTS_18': return '18 PPAP Elements Dossier';
      case 'PSW_WARRANT': return 'Part Submission Warrant (CFG-1001)';
      case 'DOCUMENTS': return 'Customer Artifacts Vault';
      default: return tab;
    }
  };

  const handleAttemptTabSwitch = (targetTab: ApqpTab) => {
    const evalResult = evaluateTabLock(currentProject, currentSubmission, targetTab);
    if (evalResult.isLocked) {
      setGateEvaluation(evalResult);
      setGateTargetName(getTabDisplayName(targetTab));
      setIsGateModalOpen(true);
      return;
    }
    setActiveTab(targetTab);
  };

  const handleToggleWorkflowMode = async () => {
    if (!currentProject) return;
    const currentMode = currentProject.workflow_mode || 'ENFORCED';
    const newMode: WorkflowMode = currentMode === 'ENFORCED' ? 'FLEXIBLE' : 'ENFORCED';
    try {
      await updateApqpProjectWorkflowMode(currentProject.id, newMode);
      const updated: ApqpProject = { ...currentProject, workflow_mode: newMode };
      setProjects(projects.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err) {
      console.error('Failed to toggle workflow mode:', err);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const targetCompany = newProjCompany || (selectedCompany !== 'ALL' ? selectedCompany : 'NHI');
      const created = await createApqpProject({
        project_code: newProjCode || `APQP-${targetCompany}-${Date.now().toString().slice(-4)}`,
        project_name: newProjName || 'New Automotive APQP Program',
        customer_name: newProjCustomer || 'Tier-1 Customer',
        part_number: newProjPartNo || 'PART-001',
        part_revision: newProjPartRev || 'Rev 01',
        lead_engineer: 'Quality Engineering Lead',
        current_phase: 1,
        operating_company: targetCompany,
      });
      setProjects([created, ...projects]);
      setSelectedProjectId(created.id);
      setIsNewProjectModalOpen(false);
      setNewProjCode('');
      setNewProjName('');
    } catch (err) {
      console.error('Error creating project:', err);
    }
  };

  const handleCreateSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject) return;
    try {
      const projCompany = currentProject.operating_company || (selectedCompany !== 'ALL' ? selectedCompany : 'NHI');
      const supplierName = OPERATING_COMPANIES[projCompany]?.name || 'NHI Mechanical Motion LLC';

      const created = await createPpapSubmission({
        project_id: currentProject.id,
        submission_number: newSubNumber || `PPAP-${Date.now().toString().slice(-4)}`,
        part_name: newSubPartName || currentProject.project_name,
        part_number: newSubPartNumber || currentProject.part_number,
        drawing_number: newSubDrawingNumber || `DWG-${currentProject.part_number}`,
        drawing_revision: currentProject.part_revision,
        customer_name: currentProject.customer_name,
        supplier_name: supplierName,
        operating_company: projCompany,
        submission_level: 3,
        status: 'DRAFT',
      });
      setSubmissions([created, ...submissions]);
      setSelectedSubmissionId(created.id);
      setIsNewSubmissionModalOpen(false);
    } catch (err) {
      console.error('Error creating submission:', err);
    }
  };

  const handleUpdateElementStatus = async (key: string, newStatus: ElementDisposition, comments?: string) => {
    if (!currentSubmission) return;
    const currentElements = { ...(currentSubmission.elements_status || DEFAULT_AIAG_18_ELEMENTS) };
    currentElements[key] = {
      ...currentElements[key],
      status: newStatus,
      comments: comments !== undefined ? comments : currentElements[key]?.comments || '',
    };

    const updated = await updatePpapSubmission(currentSubmission.id, {
      elements_status: currentElements,
    });
    setSubmissions(submissions.map((s) => (s.id === updated.id ? updated : s)));
  };

  // Calculate 18 Elements Completion
  const elements = currentSubmission?.elements_status || DEFAULT_AIAG_18_ELEMENTS;
  const elementKeys = Object.keys(elements);
  const completedCount = elementKeys.filter((k) => elements[k]?.status === 'INCLUDED' || elements[k]?.status === 'NOT_APPLICABLE').length;
  const elementsPct = elementKeys.length > 0 ? Math.round((completedCount / elementKeys.length) * 100) : 0;

  const isEnforced = (currentProject?.workflow_mode || 'ENFORCED') === 'ENFORCED';
  const nextWorkflowStep = getNextRecommendedWorkflowStep(currentProject, currentSubmission);

  const getTabButtonClass = (tab: ApqpTab, isLocked: boolean = false) => {
    if (activeTab === tab) {
      return 'bg-[#132E58] text-[#81C341] border border-[#81C341]/60 shadow-md shadow-[#81C341]/20 font-bold';
    }
    if (isLocked) {
      return 'text-slate-500 hover:bg-[#07172C]/50';
    }
    return 'text-slate-400 hover:text-slate-200 hover:bg-[#0B2545]';
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden min-h-0 bg-[#07172C] text-slate-100">
      {/* Sub-Navigation Tabs Bar - Docked directly underneath Header */}
      <div className="bg-[#07172C] border-b border-[#132E58] px-4 py-2 shrink-0 z-20 shadow-md">
        <div className="max-w-[1750px] mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Left: Program & Submission Quick Selectors + Workflow Mode Toggle */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Project Selector */}
            <div className="flex items-center gap-1.5 bg-[#0B2545] px-2.5 py-1 rounded-lg border border-[#132E58] text-xs">
              <span className="text-slate-400 font-medium">APQP Program:</span>
              <select
                value={selectedProjectId}
                onChange={(e) => handleSelectProject(e.target.value)}
                className="bg-transparent text-white font-bold focus:outline-none max-w-[240px] truncate"
              >
                {filteredProjects.length === 0 ? (
                  <option value="" disabled className="bg-[#07172C] text-slate-400">
                    No programs for {selectedCompany}
                  </option>
                ) : (
                  filteredProjects.map((p) => {
                    const pComp = p.operating_company || 'NHI';
                    return (
                      <option key={p.id} value={p.id} className="bg-[#07172C] text-slate-200">
                        [{pComp}] {p.project_code} — {p.part_number}
                      </option>
                    );
                  })
                )}
              </select>
              <ActionTooltip
                title="Launch New APQP Program"
                description="Initialize a new 5-phase APQP project with part number, customer, and gate targets."
                position="bottom"
                badge="Program"
              >
                <button
                  onClick={() => {
                    const defaultComp = selectedCompany !== 'ALL' ? selectedCompany : 'NHI';
                    setNewProjCompany(defaultComp);
                    setNewProjCode(`APQP-${defaultComp}-${Date.now().toString().slice(-4)}`);
                    setIsNewProjectModalOpen(true);
                  }}
                  className="p-1 hover:bg-[#132E58] text-[#81C341] rounded transition-colors"
                  aria-label="Launch New APQP Program"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </ActionTooltip>
            </div>

            {/* Permanent Company Badge for the CURRENT PROJECT */}
            {currentProject && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0B2545] border border-[#132E58] text-xs font-mono font-bold">
                <span className="text-slate-400 font-medium">Company:</span>
                <span className="text-[#81C341]">
                  {OPERATING_COMPANIES[currentProject.operating_company || 'NHI']?.name || currentProject.operating_company || 'NHI'}
                </span>
              </span>
            )}

            {/* PPAP Submission Selector */}
            {submissions.length > 0 && (
              <div className="flex items-center gap-1.5 bg-[#0B2545] px-2.5 py-1 rounded-lg border border-[#132E58] text-xs">
                <span className="text-slate-400 font-medium">PPAP Part:</span>
                <select
                  value={selectedSubmissionId}
                  onChange={(e) => setSelectedSubmissionId(e.target.value)}
                  className="bg-transparent text-[#81C341] font-bold focus:outline-none max-w-[190px] truncate"
                >
                  {submissions.map((s) => (
                    <option key={s.id} value={s.id} className="bg-[#07172C] text-slate-200">
                      {s.submission_number} (Lvl {s.submission_level})
                    </option>
                  ))}
                </select>
                <ActionTooltip
                  title="Launch New PPAP Submission"
                  description="Create a new Part Submission Package (Levels 1–5) and initialize the 18 AIAG elements."
                  position="bottom"
                  badge="PPAP"
                >
                  <button
                    onClick={() => setIsNewSubmissionModalOpen(true)}
                    className="p-1 hover:bg-[#132E58] text-[#81C341] rounded transition-colors"
                    aria-label="Launch New PPAP Submission"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </ActionTooltip>
              </div>
            )}

            {/* Workflow Mode Toggle */}
            <ActionTooltip
              title={isEnforced ? "Enforced AIAG Workflow Mode" : "Flexible Free-Jump Mode"}
              description={
                isEnforced
                  ? "Downstream tabs are locked until upstream prerequisites (PFD ➔ PFMEA ➔ Control Plan) are met."
                  : "Prerequisite gates relaxed: Senior quality engineers can navigate freely across all modules."
              }
              position="bottom"
              badge="Workflow"
            >
              <button
                onClick={handleToggleWorkflowMode}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                  isEnforced
                    ? 'bg-[#132E58] text-[#81C341] border-[#81C341]/50 hover:bg-[#1C4482] shadow-sm'
                    : 'bg-[#0B2545] text-slate-400 border-[#132E58] hover:bg-[#132E58] hover:text-slate-200'
                }`}
              >
                {isEnforced ? (
                  <Lock className="w-3.5 h-3.5 text-[#81C341]" />
                ) : (
                  <Unlock className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>{isEnforced ? 'Enforced Workflow' : 'Flexible Mode'}</span>
              </button>
            </ActionTooltip>
          </div>

          {/* Center/Right: Subsystem Module Tabs in Chronological APQP Order */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {/* 1. APQP Roadmap */}
            <ActionTooltip
              title="APQP 5-Phase Roadmap"
              description="Monitor high-level program timing, phase milestones, and advance project gates."
              position="bottom"
              badge="Phases 1-5"
            >
              <button
                onClick={() => handleAttemptTabSwitch('ROADMAP')}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 ${getTabButtonClass('ROADMAP')}`}
              >
                <Clock className="w-3.5 h-3.5 text-[#81C341]" />
                <span>APQP Roadmap</span>
              </button>
            </ActionTooltip>

            {/* 2. Overall APQP Checklist */}
            <ActionTooltip
              title="Overall APQP Launch Checklist"
              description="36 standard AIAG deliverables with gate verification, owners, and due dates."
              position="bottom"
              badge="Checklist"
            >
              <button
                onClick={() => handleAttemptTabSwitch('CHECKLIST')}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 ${getTabButtonClass('CHECKLIST')}`}
              >
                <ListTodo className="w-3.5 h-3.5 text-[#81C341]" />
                <span>APQP Checklist</span>
              </button>
            </ActionTooltip>

            {/* 3. Process Flow (PFD) */}
            {(() => {
              const lock = evaluateTabLock(currentProject, currentSubmission, 'PROCESS_FLOW');
              return (
                <ActionTooltip
                  title={lock.isLocked ? "Process Flow (Gate Locked)" : "Process Flow Diagram (PFD)"}
                  description={lock.isLocked ? lock.reason : "Define sequential operations, symbols, and classification."}
                  position="bottom"
                  badge={lock.isLocked ? "Locked" : "AIAG PFD"}
                >
                  <button
                    onClick={() => handleAttemptTabSwitch('PROCESS_FLOW')}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 ${getTabButtonClass('PROCESS_FLOW', lock.isLocked)}`}
                  >
                    {lock.isLocked ? (
                      <Lock className="w-3.5 h-3.5 text-slate-600" />
                    ) : (
                      <GitBranch className="w-3.5 h-3.5 text-[#81C341]" />
                    )}
                    <span>Process Flow</span>
                  </button>
                </ActionTooltip>
              );
            })()}

            {/* 4. PFMEA Matrix */}
            {(() => {
              const lock = evaluateTabLock(currentProject, currentSubmission, 'PFMEA');
              return (
                <ActionTooltip
                  title={lock.isLocked ? "PFMEA Matrix (Gate Locked)" : "AIAG-VDA Process FMEA"}
                  description={lock.isLocked ? lock.reason : "Risk assessment matrix with S/O/D ratings, AP action priority, and multi-failure modes."}
                  position="bottom"
                  badge={lock.isLocked ? "Locked" : "PFMEA"}
                >
                  <button
                    onClick={() => handleAttemptTabSwitch('PFMEA')}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 ${getTabButtonClass('PFMEA', lock.isLocked)}`}
                  >
                    {lock.isLocked ? (
                      <Lock className="w-3.5 h-3.5 text-slate-600" />
                    ) : (
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                    )}
                    <span>PFMEA Matrix</span>
                  </button>
                </ActionTooltip>
              );
            })()}

            {/* 5. Control Plan */}
            {(() => {
              const lock = evaluateTabLock(currentProject, currentSubmission, 'CONTROL_PLAN');
              return (
                <ActionTooltip
                  title={lock.isLocked ? "Control Plan (Gate Locked)" : "AIAG Control Plan"}
                  description={lock.isLocked ? lock.reason : "Specify process controls, gauges, sample sizes, and reaction plans."}
                  position="bottom"
                  badge={lock.isLocked ? "Locked" : "Control Plan"}
                >
                  <button
                    onClick={() => handleAttemptTabSwitch('CONTROL_PLAN')}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 ${getTabButtonClass('CONTROL_PLAN', lock.isLocked)}`}
                  >
                    {lock.isLocked ? (
                      <Lock className="w-3.5 h-3.5 text-slate-600" />
                    ) : (
                      <FileSpreadsheet className="w-3.5 h-3.5 text-[#81C341]" />
                    )}
                    <span>Control Plan</span>
                  </button>
                </ActionTooltip>
              );
            })()}

            {/* 6. Dimensional (CFG-1003) */}
            {(() => {
              const lock = evaluateTabLock(currentProject, currentSubmission, 'DIMENSIONAL');
              return (
                <ActionTooltip
                  title={lock.isLocked ? "Dimensional (Gate Locked)" : "Dimensional Layout (CFG-1003)"}
                  description={lock.isLocked ? lock.reason : "Record drawing feature measurements, specifications, and pass/fail disposition."}
                  position="bottom"
                  badge={lock.isLocked ? "Locked" : "CFG-1003"}
                >
                  <button
                    onClick={() => handleAttemptTabSwitch('DIMENSIONAL')}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 ${getTabButtonClass('DIMENSIONAL', lock.isLocked)}`}
                  >
                    {lock.isLocked ? (
                      <Lock className="w-3.5 h-3.5 text-slate-600" />
                    ) : (
                      <Layers className="w-3.5 h-3.5 text-cyan-300" />
                    )}
                    <span>Dimensional</span>
                  </button>
                </ActionTooltip>
              );
            })()}

            {/* 7. Capacity Analysis & Run @ Rate */}
            {(() => {
              const lock = evaluateTabLock(currentProject, currentSubmission, 'CAPACITY_ANALYSIS');
              return (
                <ActionTooltip
                  title={lock.isLocked ? "Capacity & R@R (Gate Locked)" : "Capacity Analysis & Run @ Rate"}
                  description={lock.isLocked ? lock.reason : "5-day daily run at rate, gross vs net run rates, and cycle time capacity."}
                  position="bottom"
                  badge={lock.isLocked ? "Locked" : "Run @ Rate"}
                >
                  <button
                    onClick={() => handleAttemptTabSwitch('CAPACITY_ANALYSIS')}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 ${getTabButtonClass('CAPACITY_ANALYSIS', lock.isLocked)}`}
                  >
                    {lock.isLocked ? (
                      <Lock className="w-3.5 h-3.5 text-slate-600" />
                    ) : (
                      <Gauge className="w-3.5 h-3.5 text-[#81C341]" />
                    )}
                    <span>Capacity & R@R</span>
                  </button>
                </ActionTooltip>
              );
            })()}

            {/* 8. 18 PPAP Elements Dossier */}
            {(() => {
              const lock = evaluateTabLock(currentProject, currentSubmission, 'ELEMENTS_18');
              return (
                <ActionTooltip
                  title={lock.isLocked ? "18 Elements (Gate Locked)" : "18 PPAP Elements Dossier"}
                  description={lock.isLocked ? lock.reason : "AIAG PPAP 4th Edition elements status checklist and document attachments."}
                  position="bottom"
                  badge={lock.isLocked ? "Locked" : "18 Elements"}
                >
                  <button
                    onClick={() => handleAttemptTabSwitch('ELEMENTS_18')}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 ${getTabButtonClass('ELEMENTS_18', lock.isLocked)}`}
                  >
                    {lock.isLocked ? (
                      <Lock className="w-3.5 h-3.5 text-slate-600" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5 text-[#81C341]" />
                    )}
                    <span>18 Elements</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#0B2545] text-[#81C341] font-mono border border-[#81C341]/30">
                      {elementsPct}%
                    </span>
                  </button>
                </ActionTooltip>
              );
            })()}

            {/* 9. Warrant (CFG-1001) */}
            {(() => {
              const lock = evaluateTabLock(currentProject, currentSubmission, 'PSW_WARRANT');
              return (
                <ActionTooltip
                  title={lock.isLocked ? "PSW Warrant (Gate Locked)" : "Part Submission Warrant (CFG-1001)"}
                  description={lock.isLocked ? lock.reason : "Legal AIAG Form CFG-1001 Part Submission Warrant."}
                  position="bottom"
                  badge={lock.isLocked ? "Locked" : "CFG-1001"}
                >
                  <button
                    onClick={() => handleAttemptTabSwitch('PSW_WARRANT')}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 ${getTabButtonClass('PSW_WARRANT', lock.isLocked)}`}
                  >
                    {lock.isLocked ? (
                      <Lock className="w-3.5 h-3.5 text-slate-600" />
                    ) : (
                      <FileCheck className="w-3.5 h-3.5 text-[#81C341]" />
                    )}
                    <span>Warrant</span>
                  </button>
                </ActionTooltip>
              );
            })()}

            {/* 10. Customer Artifacts */}
            <ActionTooltip
              title="Customer Artifacts Vault"
              description="Access and download generated AIAG PDFs, signed warrants, and mapped Excel workbooks."
              position="bottom"
              badge="Vault"
            >
              <button
                onClick={() => handleAttemptTabSwitch('DOCUMENTS')}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 ${getTabButtonClass('DOCUMENTS')}`}
              >
                <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>Artifacts</span>
              </button>
            </ActionTooltip>
          </div>
        </div>
      </div>

      {/* Guided Sequential Launch Stepper Bar (Enforces Process Workflow) */}
      <div className="bg-slate-900/80 border-b border-slate-800/80 px-4 py-1.5 shrink-0">
        <div className="max-w-[1750px] mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Stepper pills */}
          <div className="flex items-center gap-1 overflow-x-auto py-0.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mr-2 shrink-0">
              Launch Workflow:
            </span>
            {PPAP_WORKFLOW_STEPS.map((st) => {
              const stepLock = evaluateTabLock(currentProject, currentSubmission, st.tab);
              const isActive = activeTab === st.tab;
              return (
                <ActionTooltip
                  key={st.stepIndex}
                  title={`Step ${st.stepIndex}: ${st.title}`}
                  description={stepLock.isLocked ? stepLock.reason : st.description}
                  position="bottom"
                  badge={stepLock.isLocked ? "Gate Locked" : `Step ${st.stepIndex}`}
                >
                  <button
                    onClick={() => handleAttemptTabSwitch(st.tab)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1.5 transition-colors shrink-0 ${
                      isActive
                        ? 'bg-[#132E58] text-[#81C341] font-bold border border-[#81C341]/60 shadow'
                        : stepLock.isLocked
                        ? 'bg-[#07172C]/60 text-slate-600 border border-[#132E58]/40'
                        : 'bg-[#0B2545] text-slate-300 hover:bg-[#132E58] border border-[#132E58]'
                    }`}
                  >
                    {stepLock.isLocked ? (
                      <Lock className="w-2.5 h-2.5 text-slate-600" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full bg-[#81C341]/20 text-[#81C341] flex items-center justify-center font-mono text-[9px] font-bold">
                        {st.stepIndex}
                      </span>
                    )}
                    <span>{st.shortName}</span>
                  </button>
                </ActionTooltip>
              );
            })}
          </div>

          {/* Next Recommended Step Action Callout */}
          {nextWorkflowStep && !nextWorkflowStep.isAllCompleted && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-slate-400 text-[11px]">
                Current Step: <strong className="text-[#81C341]">{nextWorkflowStep.currentStep.title}</strong>
              </span>
              <ActionTooltip
                title={`Continue: ${nextWorkflowStep.currentStep.title}`}
                description={`Advances directly to step ${nextWorkflowStep.currentStep.stepIndex}: ${nextWorkflowStep.currentStep.description}`}
                position="bottom"
                badge={`Step ${nextWorkflowStep.currentStep.stepIndex}`}
              >
                <button
                  onClick={() => handleAttemptTabSwitch(nextWorkflowStep.currentStep.tab)}
                  className="flex items-center gap-1 px-2.5 py-0.5 bg-[#81C341]/20 hover:bg-[#81C341]/30 text-[#81C341] border border-[#81C341]/40 rounded-lg text-[11px] font-bold transition-all active:scale-95"
                >
                  <span>Continue Step</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </ActionTooltip>
            </div>
          )}
        </div>
      </div>

      {/* Main Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-[1750px] w-full mx-auto p-4 sm:p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-96 space-y-3">
              <RefreshCw className="w-8 h-8 text-[#81C341] animate-spin" />
              <p className="text-sm text-slate-400">Loading AIAG APQP Programs & PPAP Submissions...</p>
            </div>
          ) : !currentProject ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
              {selectedCompany !== 'ALL' ? (
                <div className="flex flex-col items-center space-y-3 max-w-md text-center">
                  <div className="p-3 bg-[#0B2545] rounded-2xl border border-[#132E58] shadow-lg">
                    <CompanyBrandLogo companyId={selectedCompany} size="lg" showText={true} />
                  </div>
                  <h3 className="text-base font-bold text-slate-100">
                    No APQP Programs for {OPERATING_COMPANIES[selectedCompany]?.name || selectedCompany}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Filter is currently scoped to <strong className="text-white">{OPERATING_COMPANIES[selectedCompany]?.name}</strong>. Switch to "All Companies" in the top bar or launch a new launch package.
                  </p>
                  <ActionTooltip
                    title={`Launch New APQP Program for ${selectedCompany}`}
                    description={`Initialize a new APQP program under ${OPERATING_COMPANIES[selectedCompany]?.name}.`}
                    position="top"
                    badge={selectedCompany}
                  >
                    <button
                      onClick={() => {
                        setNewProjCompany(selectedCompany);
                        setNewProjCode(`APQP-${selectedCompany}-${Date.now().toString().slice(-4)}`);
                        setIsNewProjectModalOpen(true);
                      }}
                      className="px-4 py-2 bg-[#81C341] hover:bg-[#72b233] text-slate-950 text-xs font-bold rounded-lg shadow-md shadow-[#81C341]/20 transition-all active:scale-95 flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Launch New APQP Program for {OPERATING_COMPANIES[selectedCompany]?.shortCode || selectedCompany}</span>
                    </button>
                  </ActionTooltip>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-3 max-w-md text-center">
                  <Compass className="w-16 h-16 text-slate-600" />
                  <h3 className="text-base font-bold text-slate-200">No APQP Programs Found</h3>
                  <p className="text-xs text-slate-500">Create your first APQP program to begin managing new automotive/aerospace launches.</p>
                  <ActionTooltip
                    title="Launch New APQP Program"
                    description="Initialize your first 5-phase APQP program with part numbers, gates, and milestones."
                    position="top"
                    badge="Program"
                  >
                    <button
                      onClick={() => {
                        setNewProjCompany('NHI');
                        setNewProjCode(`APQP-NHI-${Date.now().toString().slice(-4)}`);
                        setIsNewProjectModalOpen(true);
                      }}
                      className="px-4 py-2 bg-[#81C341] hover:bg-[#72b233] text-slate-950 text-xs font-bold rounded-lg shadow-md shadow-[#81C341]/20 transition-colors flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Launch New APQP Program</span>
                    </button>
                  </ActionTooltip>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* TAB 1: APQP 5-PHASE ROADMAP */}
              {activeTab === 'ROADMAP' && (
                <ApqpPhaseRoadmap
                  project={currentProject}
                  onProjectUpdated={(upd) => {
                    setProjects(projects.map((p) => (p.id === upd.id ? upd : p)));
                  }}
                />
              )}

              {/* TAB 2: OVERALL MASTER APQP CHECKLIST */}
              {activeTab === 'CHECKLIST' && currentProject && (
                <ApqpMasterChecklist
                  project={currentProject}
                  onProjectUpdated={(upd) => {
                    setProjects(projects.map((p) => (p.id === upd.id ? upd : p)));
                  }}
                  onNavigateToTab={handleAttemptTabSwitch}
                />
              )}

              {/* TAB 2: AIAG 18-ELEMENT PPAP CHECKLIST */}
              {activeTab === 'ELEMENTS_18' && currentSubmission && (
                <div className="space-y-6">
                  {/* Summary Card */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-mono font-bold text-emerald-400 uppercase bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        AIAG PPAP 4th Edition (Level {currentSubmission.submission_level})
                      </span>
                      <h2 className="text-lg font-bold text-white mt-1">
                        18-Element Submission Dossier Matrix — {currentSubmission.part_name}
                      </h2>
                      <p className="text-xs text-slate-400">
                        Part Number: <strong className="text-cyan-300 font-mono">{currentSubmission.part_number} ({currentSubmission.drawing_revision})</strong> | Customer: <strong className="text-slate-200">{currentSubmission.customer_name}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="text-right">
                        <span className="text-xs text-slate-400">Dossier Readiness</span>
                        <p className="text-xl font-mono font-bold text-emerald-400">{elementsPct}%</p>
                      </div>
                      <div className="w-28 h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${elementsPct}%` }} />
                      </div>

                      <ActionTooltip
                        title="Export AIAG PPAP Workbook"
                        description="Generates and downloads the complete 17-sheet AIAG PPAP 4th Edition Forms Workbook (.xlsx) with all mapped project data."
                        position="left"
                        badge="Excel .xlsx"
                      >
                        <button
                          onClick={async () => {
                            try {
                              await exportPopulatedAiagPpapWorkbook(currentSubmission);
                            } catch (err) {
                              alert(`Export error: ${err instanceof Error ? err.message : String(err)}`);
                            }
                          }}
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95 ml-2"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                          <span>Export AIAG PPAP (.xlsx)</span>
                        </button>
                      </ActionTooltip>
                    </div>
                  </div>

                  {/* Elements Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {elementKeys.map((key, idx) => {
                      const el = elements[key];
                      const isInc = el.status === 'INCLUDED';
                      const isNA = el.status === 'NOT_APPLICABLE';
                      const isRet = el.status === 'RETAINED_AT_SUPPLIER';

                      return (
                        <div
                          key={key}
                          className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2.5">
                              <span className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-mono font-bold text-xs mt-0.5">
                                {idx + 1}
                              </span>
                              <div>
                                <h3 className="text-xs font-bold text-slate-200">{el.name}</h3>
                                <input
                                  type="text"
                                  value={el.comments || ''}
                                  onChange={(e) => handleUpdateElementStatus(key, el.status, e.target.value)}
                                  placeholder="Notes / File reference..."
                                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-400 mt-1.5 focus:border-slate-700 outline-none"
                                />
                                {key === 'elem_5_process_flow' && (
                                  <button
                                    onClick={() => setActiveTab('PROCESS_FLOW')}
                                    className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[10px] font-bold border border-blue-500/30 transition-colors"
                                  >
                                    <GitBranch className="w-3 h-3" />
                                    <span>Open Process Flow Editor & Excel Importer →</span>
                                  </button>
                                )}
                                {key === 'elem_7_control_plan' && (
                                  <button
                                    onClick={() => setActiveTab('CONTROL_PLAN')}
                                    className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-[10px] font-bold border border-purple-500/30 transition-colors"
                                  >
                                    <FileSpreadsheet className="w-3 h-3" />
                                    <span>Open Control Plan Editor & Excel Importer →</span>
                                  </button>
                                )}
                                {key === 'elem_9_dimensional' && (
                                  <button
                                    onClick={() => setActiveTab('DIMENSIONAL')}
                                    className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-[10px] font-bold border border-cyan-500/30 transition-colors"
                                  >
                                    <Layers className="w-3 h-3" />
                                    <span>Open Dimensional Results (CAD Import) →</span>
                                  </button>
                                )}
                                {key === 'elem_6_pfmea' && (
                                  <button
                                    onClick={() => setActiveTab('PFMEA')}
                                    className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-bold border border-red-500/30 transition-colors"
                                  >
                                    <ShieldAlert className="w-3 h-3" />
                                    <span>Open PFMEA Matrix →</span>
                                  </button>
                                )}
                                {key === 'elem_11_initial_process_studies' && (
                                  <button
                                    onClick={() => setActiveTab('CAPACITY_ANALYSIS')}
                                    className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30 transition-colors"
                                  >
                                    <Gauge className="w-3 h-3 text-amber-400" />
                                    <span>Open Capacity & Run @ Rate Study →</span>
                                  </button>
                                )}
                                {key === 'elem_14_sample_parts' && (
                                  <button
                                    onClick={() => setActiveTab('CAPACITY_ANALYSIS')}
                                    className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30 transition-colors"
                                  >
                                    <Gauge className="w-3 h-3 text-amber-400" />
                                    <span>Open Production Run @ Rate Log →</span>
                                  </button>
                                )}
                                {key === 'elem_18_psw' && (
                                  <button
                                    onClick={() => setActiveTab('PSW_WARRANT')}
                                    className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 transition-colors"
                                  >
                                    <FileCheck className="w-3 h-3" />
                                    <span>Open Part Submission Warrant (CFG-1001) →</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            <select
                              value={el.status}
                              onChange={(e) => handleUpdateElementStatus(key, e.target.value as ElementDisposition)}
                              className={`text-[11px] font-bold rounded-lg px-2.5 py-1 border transition-colors outline-none ${
                                isInc
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                  : isNA
                                  ? 'bg-slate-800 text-slate-400 border-slate-700'
                                  : isRet
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : 'bg-red-500/20 text-red-400 border-red-500/40'
                              }`}
                            >
                              <option value="INCLUDED">Included in Dossier</option>
                              <option value="NOT_APPLICABLE">Not Applicable (N/A)</option>
                              <option value="RETAINED_AT_SUPPLIER">Retained at Supplier</option>
                              <option value="PENDING">Pending Action</option>
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: PART SUBMISSION WARRANT (PSW - CFG-1001) */}
              {activeTab === 'PSW_WARRANT' && currentSubmission && (
                <PpapWarrantForm
                  submission={currentSubmission}
                  onSubmissionUpdated={(upd) => {
                    setSubmissions(submissions.map((s) => (s.id === upd.id ? upd : s)));
                  }}
                />
              )}

              {/* TAB 4: DIMENSIONAL TEST RESULTS (CFG-1003) */}
              {activeTab === 'DIMENSIONAL' && currentSubmission && (
                <PpapDimensionalResults
                  submission={currentSubmission}
                  onSubmissionUpdated={(upd) => {
                    setSubmissions(submissions.map((s) => (s.id === upd.id ? upd : s)));
                  }}
                  availableBalloons={availableBalloons}
                />
              )}

              {/* TAB: PROCESS FLOW DIAGRAM (PFD) */}
              {activeTab === 'PROCESS_FLOW' && currentSubmission && (
                <PpapProcessFlow
                  submission={currentSubmission}
                  onSubmissionUpdated={(upd) => {
                    setSubmissions(submissions.map((s) => (s.id === upd.id ? upd : s)));
                  }}
                  onSyncToControlPlan={(syncedRows) => {
                    const updated = { ...currentSubmission, control_plan_data: syncedRows };
                    setSubmissions(submissions.map((s) => (s.id === updated.id ? updated : s)));
                  }}
                />
              )}

              {/* TAB 5: AIAG CONTROL PLAN */}
              {activeTab === 'CONTROL_PLAN' && currentSubmission && (
                <PpapControlPlan
                  submission={currentSubmission}
                  onSubmissionUpdated={(upd) => {
                    setSubmissions(submissions.map((s) => (s.id === upd.id ? upd : s)));
                  }}
                />
              )}

              {/* TAB 6: PROCESS FMEA MATRIX */}
              {activeTab === 'PFMEA' && currentSubmission && (
                <PpapFmeaManager
                  submission={currentSubmission}
                  onSubmissionUpdated={(upd) => {
                    setSubmissions(submissions.map((s) => (s.id === upd.id ? upd : s)));
                  }}
                />
              )}

              {/* TAB 7: AIAG CAPACITY ANALYSIS & RUN @ RATE */}
              {activeTab === 'CAPACITY_ANALYSIS' && currentSubmission && (
                <PpapCapacityAnalysis
                  submission={currentSubmission}
                  onSubmissionUpdated={(upd) => {
                    setSubmissions(submissions.map((s) => (s.id === upd.id ? upd : s)));
                  }}
                />
              )}

              {/* TAB 8: PROJECT ATTACHMENTS & CUSTOMER ARTIFACT VAULT */}
              {activeTab === 'DOCUMENTS' && currentSubmission && (
                <PpapDocumentsModal submission={currentSubmission} />
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal: New APQP Project */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#07172C] border border-[#132E58] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#132E58] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#81C341]/10 text-[#81C341] border border-[#81C341]/30">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Launch New AIAG APQP Program</h3>
                  <p className="text-[11px] text-slate-400">Odoo ERP Integrated Launch Package</p>
                </div>
              </div>
              <button onClick={() => setIsNewProjectModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-3.5 text-xs">
              {/* Operating Company Selection */}
              <div>
                <label className="text-slate-300 font-medium block mb-1.5">
                  Operating Company <span className="text-[#81C341]">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['NHI', 'TERRE', 'MANTIS', 'MAKERS'] as OperatingCompanyId[]).map((cId) => {
                    const cInfo = OPERATING_COMPANIES[cId];
                    const isSelected = newProjCompany === cId;
                    return (
                      <button
                        type="button"
                        key={cId}
                        onClick={() => {
                          setNewProjCompany(cId);
                          if (!newProjCode || newProjCode.startsWith('APQP-')) {
                            setNewProjCode(`APQP-${cId}-${Date.now().toString().slice(-4)}`);
                          }
                        }}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#132E58] border-[#81C341] ring-2 ring-[#81C341]/50 shadow-md'
                            : 'bg-[#0B2545] border-[#132E58] hover:border-slate-500 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <div className="h-5 flex items-center justify-center">
                          <CompanyBrandLogo companyId={cId} size="xs" showText={false} />
                        </div>
                        <span className={`text-[11px] font-bold mt-1 ${isSelected ? 'text-[#81C341]' : 'text-slate-300'}`}>
                          {cInfo.shortCode}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Customer OEM Name (Odoo Synced) */}
              <OdooSearchSelect<OdooCustomer>
                label="Customer OEM Name"
                placeholder="Search or type customer (e.g. Caterpillar, John Deere)..."
                value={newProjCustomer}
                onChange={handleOdooCustomerSelect}
                options={odooCustomers}
                getOptionLabel={(c) => c.name}
                getOptionValue={(c) => c.name}
                getOptionSubLabel={(c) => (c.orderCount ? `${c.orderCount} active orders • ${c.partCount || 0} parts in Odoo` : undefined)}
                badge="Odoo B2B"
                required={true}
                helperText="Select from live Odoo customers or type a custom customer name"
              />

              <div className="grid grid-cols-2 gap-3">
                {/* Part Number (Odoo Synced) */}
                <OdooSearchSelect<OdooPartProduct>
                  label="Part Number / SKU"
                  placeholder="Select or enter SKU..."
                  value={newProjPartNo}
                  onChange={handleOdooPartSelect}
                  options={filteredCustomerParts.length > 0 ? filteredCustomerParts : odooParts}
                  getOptionLabel={(p) => `${p.sku} — ${p.name}`}
                  getOptionValue={(p) => p.sku}
                  getOptionSubLabel={(p) => p.description || p.partnerName}
                  badge="Odoo SKU"
                  required={true}
                  inputClassName="font-mono"
                />

                <div>
                  <label className="text-slate-300 font-medium block mb-1">Part Revision</label>
                  <input
                    type="text"
                    required
                    placeholder="Rev 01"
                    value={newProjPartRev}
                    onChange={(e) => setNewProjPartRev(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 hover:border-slate-600 focus:border-[#81C341] rounded-lg p-2 text-white font-mono outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Program / Project Name</label>
                <input
                  type="text"
                  required
                  placeholder="High-Voltage Inverter Housing Launch"
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 hover:border-slate-600 focus:border-[#81C341] rounded-lg p-2 text-white outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Project Code (e.g. APQP-2026-002)</label>
                <input
                  type="text"
                  required
                  placeholder="APQP-2026-002"
                  value={newProjCode}
                  onChange={(e) => setNewProjCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 hover:border-slate-600 focus:border-[#81C341] rounded-lg p-2 text-white font-mono outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#132E58]">
                <button
                  type="button"
                  onClick={() => setIsNewProjectModalOpen(false)}
                  className="px-4 py-2 bg-[#0B2545] hover:bg-[#132E58] text-slate-300 rounded-lg text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#81C341] hover:bg-[#72b233] text-slate-950 font-extrabold rounded-lg text-xs shadow-md shadow-[#81C341]/20 transition-all active:scale-95"
                >
                  Create APQP Program
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New PPAP Submission */}
      {isNewSubmissionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#07172C] border border-[#132E58] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#132E58] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#81C341]/10 text-[#81C341] border border-[#81C341]/30">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Launch New AIAG PPAP Submission</h3>
                  <p className="text-[11px] text-slate-400">Part Submission Warrant & AIAG Dossier</p>
                </div>
              </div>
              <button onClick={() => setIsNewSubmissionModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmission} className="space-y-3.5 text-xs">
              {/* Inherited Operating Company Display */}
              {currentProject && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0B2545] border border-[#132E58]">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-xs">Company:</span>
                    <span className="text-white font-bold text-xs">
                      {OPERATING_COMPANIES[currentProject.operating_company || 'NHI']?.name || currentProject.operating_company || 'NHI'}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#81C341]/15 text-[#81C341] border border-[#81C341]/30 font-mono">
                      {currentProject.project_code}
                    </span>
                  </div>
                  <CompanyBrandLogo companyId={currentProject.operating_company || 'NHI'} size="xs" showText={false} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {/* Part Number (Odoo Synced) */}
                <OdooSearchSelect<OdooPartProduct>
                  label="Part Number"
                  placeholder="Search Odoo SKU..."
                  value={newSubPartNumber}
                  onChange={handleOdooSubPartSelect}
                  options={odooParts}
                  getOptionLabel={(p) => `${p.sku} — ${p.name}`}
                  getOptionValue={(p) => p.sku}
                  getOptionSubLabel={(p) => p.description || p.partnerName}
                  badge="Odoo SKU"
                  required={true}
                  inputClassName="font-mono"
                />

                <div>
                  <label className="text-slate-300 font-medium block mb-1">Drawing Number</label>
                  <input
                    type="text"
                    required
                    placeholder="DWG-GM-9021-A"
                    value={newSubDrawingNumber}
                    onChange={(e) => setNewSubDrawingNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 hover:border-slate-600 focus:border-[#81C341] rounded-lg p-2 text-white font-mono outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Part Name</label>
                <input
                  type="text"
                  required
                  placeholder="Inverter Housing Machined"
                  value={newSubPartName}
                  onChange={(e) => setNewSubPartName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 hover:border-slate-600 focus:border-[#81C341] rounded-lg p-2 text-white outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Submission Reference (e.g. PPAP-9021-01)</label>
                <input
                  type="text"
                  required
                  placeholder="PPAP-9021-01"
                  value={newSubNumber}
                  onChange={(e) => setNewSubNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 hover:border-slate-600 focus:border-[#81C341] rounded-lg p-2 text-white outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#132E58]">
                <button
                  type="button"
                  onClick={() => setIsNewSubmissionModalOpen(false)}
                  className="px-4 py-2 bg-[#0B2545] hover:bg-[#132E58] text-slate-300 rounded-lg text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#81C341] hover:bg-[#72b233] text-slate-950 font-extrabold rounded-lg text-xs shadow-md shadow-[#81C341]/20 transition-all active:scale-95"
                >
                  Create PPAP Submission
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Workflow Gatekeeper Prerequisite Modal */}
      <WorkflowGateModal
        isOpen={isGateModalOpen}
        onClose={() => setIsGateModalOpen(false)}
        evaluation={gateEvaluation}
        targetTabName={gateTargetName}
        onNavigateToRequired={handleAttemptTabSwitch}
        onSwitchToFlexibleMode={handleToggleWorkflowMode}
      />
    </div>
  );
};
