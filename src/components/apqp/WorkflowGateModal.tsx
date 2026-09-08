import React from 'react';
import { Lock, ShieldAlert, ArrowRight, Unlock, X } from 'lucide-react';
import type { ApqpTab } from '../../types/apqpPpap';
import type { TabLockEvaluation } from '../../utils/apqpWorkflowRules';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  evaluation: TabLockEvaluation | null;
  targetTabName: string;
  onNavigateToRequired: (tab: ApqpTab) => void;
  onSwitchToFlexibleMode: () => void;
}

export const WorkflowGateModal: React.FC<Props> = ({
  isOpen,
  onClose,
  evaluation,
  targetTabName,
  onNavigateToRequired,
  onSwitchToFlexibleMode,
}) => {
  if (!isOpen || !evaluation || !evaluation.isLocked) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl shadow-amber-500/10 space-y-5 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                Enforced Workflow Gatekeeper
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mt-1">
              Prerequisite Incomplete: {targetTabName}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Strict AIAG APQP / PPAP compliance prevents out-of-sequence launches.
            </p>
          </div>
        </div>

        {/* Detailed Explanation Banner */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>Why is this step locked?</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {evaluation.reason ||
              'A mandatory upstream APQP deliverable has not yet been completed. To prevent incomplete launch submissions or audit non-conformances, downstream steps are locked until the prerequisite is satisfied.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          {evaluation.requiredTab && (
            <button
              onClick={() => {
                onNavigateToRequired(evaluation.requiredTab!);
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-[0.99]"
            >
              <span>Go to Required Step: {evaluation.requiredStepTitle || 'Upstream Deliverable'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <button
              onClick={() => {
                const confirmed = window.confirm(
                  'Switch to Flexible Mode?\n\nWarning: Bypassing workflow gatekeeping allows jumping around between tabs, which may risk incomplete PPAP packages for untrained personnel. Continue?'
                );
                if (confirmed) {
                  onSwitchToFlexibleMode();
                  onClose();
                }
              }}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-400 transition-colors py-1 px-2 rounded hover:bg-slate-800"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Switch to Flexible Mode (Lead Engineer Override)</span>
            </button>

            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
