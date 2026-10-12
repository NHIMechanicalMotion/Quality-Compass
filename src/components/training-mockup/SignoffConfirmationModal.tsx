import React from 'react';
import { 
  CheckCircle2, 
  X, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import type { OperatorRecord, MachineRecord } from '../../data/mockTrainingData';

interface SignoffConfirmationModalProps {
  isOpen: boolean;
  operator: OperatorRecord;
  machine: MachineRecord;
  supervisorName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const SignoffConfirmationModal: React.FC<SignoffConfirmationModalProps> = ({
  isOpen,
  operator,
  machine,
  supervisorName,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-slate-900 border-2 border-emerald-500 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-modal-title"
      >
        {/* Header Icon & Title */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h2 id="confirmation-modal-title" className="text-2xl font-bold text-white">
                Confirm Sign-Off
              </h2>
              <p className="text-slate-400 text-base">
                Final Confirmation Step
              </p>
            </div>
          </div>

          <button
            onClick={onCancel}
            className="min-h-[48px] min-w-[48px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-slate-400"
            aria-label="Close dialog"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Clear Summary Box */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-5 space-y-4 text-base">
          <p className="text-slate-200 text-lg leading-relaxed">
            Are you sure you want to promote{' '}
            <strong className="text-white font-bold underline decoration-emerald-400 decoration-2">
              {operator.name}
            </strong>{' '}
            to independent operation on this machine?
          </p>

          <div className="space-y-2 border-t border-slate-800 pt-3">
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">Machine:</span>
              <span className="font-bold text-white">{machine.name}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">Department:</span>
              <span className="font-medium text-slate-200">{machine.department}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">Supervisor:</span>
              <span className="font-medium text-slate-200">{supervisorName}</span>
            </div>
          </div>

          {/* Level Transition Pill */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 flex items-center justify-center gap-3 text-base">
            <span className="px-3 py-1.5 rounded-lg bg-sky-950 border border-sky-600 text-sky-300 font-bold">
              Level 1 (Trainee)
            </span>
            <ArrowRight className="w-5 h-5 text-emerald-400" />
            <span className="px-3 py-1.5 rounded-lg bg-emerald-950 border border-emerald-500 text-emerald-300 font-bold">
              Level 2 (Qualified)
            </span>
          </div>
        </div>

        {/* Action Buttons (Strictly 48px Minimum Height) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[48px] px-5 py-3.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-950 border-2 border-slate-600 text-slate-200 font-bold text-base sm:text-lg rounded-xl flex items-center justify-center transition-colors focus:outline-none focus:ring-4 focus:ring-slate-500/50"
          >
            Cancel / Go Back
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="min-h-[48px] px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-base sm:text-lg rounded-xl flex items-center justify-center gap-2.5 transition-colors shadow-lg focus:outline-none focus:ring-4 focus:ring-emerald-400/50"
          >
            <CheckCircle2 className="w-6 h-6 shrink-0" />
            <span>Confirm & Sign Off</span>
          </button>
        </div>
      </div>
    </div>
  );
};
