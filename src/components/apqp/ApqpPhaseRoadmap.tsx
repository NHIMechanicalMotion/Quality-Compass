import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldCheck,
  Calendar,
  User,
} from 'lucide-react';
import type { ApqpProject, ApqpPhaseNumber, GateStatus } from '../../types/apqpPpap';
import { updateApqpProjectPhase } from '../../services/apqpPpapSupabase';
import { ActionTooltip } from '../common/ActionTooltip';

interface Props {
  project: ApqpProject;
  onProjectUpdated: (updated: ApqpProject) => void;
}

const PHASES_CONFIG = [
  {
    num: 1 as ApqpPhaseNumber,
    key: 'phase1',
    title: 'Phase 1: Plan & Define Program',
    subtitle: 'Voice of Customer, Quality Goals, Preliminary BOM & Process Flow',
    deliverables: [
      'Voice of the Customer (VOC) Analysis',
      'Business Plan & Marketing Strategy',
      'Product Benchmark Data & Quality Targets',
      'Preliminary Bill of Materials (BOM)',
      'Preliminary Process Flow Chart',
      'Product Assurance Plan & Quality Charter',
    ],
  },
  {
    num: 2 as ApqpPhaseNumber,
    key: 'phase2',
    title: 'Phase 2: Product Design & Development',
    subtitle: 'DFMEA, DFM/DFA, DVP&R, Engineering Drawings & Prototype Builds',
    deliverables: [
      'Design Failure Mode & Effects Analysis (DFMEA)',
      'Design for Manufacturability & Assembly (DFM/DFA)',
      'Design Verification Plan & Report (DVP&R)',
      'Engineering Drawings & Cad Models (with GD&T)',
      'Material & Performance Specifications',
      'Prototype Build & Prototype Control Plan',
    ],
  },
  {
    num: 3 as ApqpPhaseNumber,
    key: 'phase3',
    title: 'Phase 3: Process Design & Development',
    subtitle: 'Process Flow, Floor Plan, PFMEA, Pre-Launch Control Plan, MSA Plan',
    deliverables: [
      'Packaging Standards & Specifications',
      'Process Flow Chart (Operations 10 to Final)',
      'Floor Plan Layout & Material Logistics Flow',
      'Process FMEA (AIAG-VDA PFMEA Matrix)',
      'Pre-Launch Control Plan',
      'Measurement System Analysis (MSA) Plan',
    ],
  },
  {
    num: 4 as ApqpPhaseNumber,
    key: 'phase4',
    title: 'Phase 4: Product & Process Validation',
    subtitle: 'Run at Rate, Gage R&R, Cpk Capability, PPAP Approval (PSW Warrant)',
    deliverables: [
      'Significant Production Run (Run at Rate - 300 pcs)',
      'Measurement System Analysis (Gage R&R < 10%)',
      'Initial Process Capability Studies (Cpk >= 1.67)',
      'Production Part Approval Process (PPAP Submission)',
      'Production Validation Testing & Cleanliness Cert',
      'Production Control Plan Sign-Off',
    ],
  },
  {
    num: 5 as ApqpPhaseNumber,
    key: 'phase5',
    title: 'Phase 5: Feedback, Assessment & Corrective Action',
    subtitle: 'Reduced Variation, SPC, Customer Satisfaction & Lessons Learned',
    deliverables: [
      'Statistical Process Control (SPC) Monitoring',
      'Delivery & Ramp-up Performance Metrics',
      'Customer Satisfaction & Warranty Tracking',
      'Continuous Improvement (Kaizen) Actions',
      'Lessons Learned & Best Practices Database',
    ],
  },
];

export const ApqpPhaseRoadmap: React.FC<Props> = ({ project, onProjectUpdated }) => {
  const [selectedPhase, setSelectedPhase] = useState<ApqpPhaseNumber>(project.current_phase || 1);
  const [isUpdating, setIsUpdating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Synchronize selected phase when active project changes
  useEffect(() => {
    setSelectedPhase(project.current_phase || 1);
  }, [project.id, project.current_phase]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const currentPhaseConfig = PHASES_CONFIG.find((p) => p.num === selectedPhase) || PHASES_CONFIG[0];
  const phaseGate = project.phase_gates?.[currentPhaseConfig.key] || {
    name: currentPhaseConfig.title,
    status: 'NOT_STARTED' as GateStatus,
    completion_pct: 0,
    sign_off_date: null,
    approved_by: '',
  };

  const handleGateStatusChange = async (newStatus: GateStatus, completion: number) => {
    try {
      setIsUpdating(true);
      const updatedGates = {
        ...project.phase_gates,
        [currentPhaseConfig.key]: {
          ...phaseGate,
          status: newStatus,
          completion_pct: completion,
          sign_off_date: newStatus === 'APPROVED' ? new Date().toISOString().split('T')[0] : phaseGate.sign_off_date,
          approved_by: newStatus === 'APPROVED' ? project.lead_engineer : phaseGate.approved_by,
        },
      };

      let newCurrentPhase = project.current_phase;
      if (newStatus === 'APPROVED' && selectedPhase < 5) {
        newCurrentPhase = (selectedPhase + 1) as ApqpPhaseNumber;
      }

      await updateApqpProjectPhase(project.id, newCurrentPhase, updatedGates);
      onProjectUpdated({
        ...project,
        current_phase: newCurrentPhase,
        phase_gates: updatedGates,
      });

      if (newStatus === 'APPROVED') {
        showToast(`Phase ${selectedPhase} Gate Approved! Program advanced to Phase ${newCurrentPhase}.`);
      } else {
        showToast(`Phase ${selectedPhase} Gate marked In Progress.`);
      }
    } catch (err) {
      console.error('Failed to update phase gate:', err);
      showToast('Error updating phase gate in Supabase.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Program Summary Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-lg shadow-inner">
            P{project.current_phase}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                {project.project_code}
              </span>
              <h2 className="text-lg font-bold text-white">{project.project_name}</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Customer: <strong className="text-slate-200">{project.customer_name}</strong> | Part: <strong className="text-cyan-300 font-mono">{project.part_number} ({project.part_revision})</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Target PPAP:</span>
            <span className="text-amber-400 font-bold font-mono">{project.target_ppap_date || '2026-09-30'}</span>
          </div>
          <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">SOP Launch:</span>
            <span className="text-emerald-400 font-bold font-mono">{project.target_sop_date || '2026-11-15'}</span>
          </div>
          <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Lead:</span>
            <span className="text-slate-200 font-medium">{project.lead_engineer}</span>
          </div>
        </div>
      </div>

      {/* 5-Phase Horizontal Timeline Stepper */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {PHASES_CONFIG.map((phase) => {
          const gate = project.phase_gates?.[phase.key];
          const isApproved = gate?.status === 'APPROVED';
          const isInProgress = gate?.status === 'IN_PROGRESS';
          const isSelected = selectedPhase === phase.num;
          const isCurrentActive = project.current_phase === phase.num;

          return (
            <button
              key={phase.num}
              onClick={() => setSelectedPhase(phase.num)}
              className={`text-left p-3.5 rounded-xl border transition-all relative overflow-hidden flex flex-col justify-between min-h-[110px] ${
                isSelected
                  ? 'bg-gradient-to-b from-blue-900/40 to-slate-900 border-blue-500/80 shadow-lg shadow-blue-500/10'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              {isCurrentActive && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 to-blue-500" />
              )}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-mono font-bold text-slate-400">
                    PHASE {phase.num}
                  </span>
                  {isApproved ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : isInProgress ? (
                    <Clock className="w-4 h-4 text-cyan-400 animate-pulse" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-slate-600" />
                  )}
                </div>
                <h3 className="text-xs font-bold text-slate-200 line-clamp-2 leading-snug">
                  {phase.title.replace(`Phase ${phase.num}: `, '')}
                </h3>
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                  <span>Gate Progress</span>
                  <span className="font-mono font-bold text-slate-200">{gate?.completion_pct || 0}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className={`h-full transition-all duration-500 ${
                      isApproved ? 'bg-emerald-500' : isInProgress ? 'bg-cyan-500' : 'bg-slate-700'
                    }`}
                    style={{ width: `${gate?.completion_pct || 0}%` }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Phase Gate Deep Dive Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                APQP Phase Gate Review
              </span>
              <h3 className="text-base font-bold text-white">{currentPhaseConfig.title}</h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">{currentPhaseConfig.subtitle}</p>
          </div>

          {/* Gate Review Actions */}
          <div className="flex items-center gap-2">
            <ActionTooltip
              title="Mark Phase In Progress"
              description={`Sets ${currentPhaseConfig.title} to In Progress (50% completion) while engineering deliverables are actively underway.`}
              position="top"
              badge="Status"
            >
              <button
                onClick={() => handleGateStatusChange('IN_PROGRESS', 50)}
                disabled={isUpdating}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              >
                Mark In Progress
              </button>
            </ActionTooltip>

            <ActionTooltip
              title="Approve Phase Gate Sign-off"
              description={`Signs off ${currentPhaseConfig.title}, records lead engineer sign-off, and advances program to the next APQP phase.`}
              position="top"
              badge="Phase Gate"
            >
              <button
                onClick={() => handleGateStatusChange('APPROVED', 100)}
                disabled={isUpdating}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all active:scale-95"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Approve Phase Gate</span>
              </button>
            </ActionTooltip>
          </div>
        </div>

        {/* Deliverables Checklist Grid */}
        <div>
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
            Mandatory AIAG APQP Phase Deliverables & Gate Verification
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {currentPhaseConfig.deliverables.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 rounded-lg bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-colors"
              >
                <div className="mt-0.5 w-5 h-5 rounded flex items-center justify-center bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-slate-200">{item}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 inline" /> Compliant with AIAG APQP Manual 3rd Edition
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Phase Sign-off Info */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400">
          <div>
            Gate Status:{' '}
            <span
              className={`font-bold uppercase ${
                phaseGate.status === 'APPROVED'
                  ? 'text-emerald-400'
                  : phaseGate.status === 'IN_PROGRESS'
                  ? 'text-cyan-400'
                  : 'text-slate-400'
              }`}
            >
              {phaseGate.status}
            </span>{' '}
            | Approved By:{' '}
            <strong className="text-slate-200">{phaseGate.approved_by || 'Pending Gate Sign-off'}</strong>
          </div>
          <div>
            Sign-Off Date:{' '}
            <span className="font-mono text-slate-300">{phaseGate.sign_off_date || 'Not Yet Signed'}</span>
          </div>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-emerald-500/50 text-emerald-300 text-xs px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
