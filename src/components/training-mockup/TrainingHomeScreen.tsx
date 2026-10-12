import React from 'react';
import { 
  GraduationCap, 
  UserCheck, 
  Grid3X3, 
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

interface TrainingHomeScreenProps {
  onSelectFlow: (flow: 'OPERATOR' | 'SUPERVISOR' | 'MATRIX') => void;
  activeOperatorName: string;
}

export const TrainingHomeScreen: React.FC<TrainingHomeScreenProps> = ({
  onSelectFlow,
  activeOperatorName,
}) => {
  return (
    <div className="max-w-4xl mx-auto py-4 px-4 sm:px-6 space-y-6">
      {/* Friendly Top Welcome Banner */}
      <div className="bg-slate-900/90 border-2 border-slate-700 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-lime-500/20 border border-lime-400 text-lime-300 font-semibold text-base mb-3">
              <ShieldCheck className="w-5 h-5 text-lime-400" />
              <span>Phase 1a Interactive Mock-Up</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Shop Floor Operator Training & Skills
            </h1>
            <p className="text-slate-300 text-base sm:text-lg mt-2 leading-relaxed">
              Select what you want to do today. Every task starts right here with simple buttons designed for phones, tablets, and shop kiosks.
            </p>
          </div>
          <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-4 shrink-0 text-left sm:text-right">
            <span className="block text-slate-400 text-base">Current Signed In:</span>
            <span className="block text-white font-bold text-lg mt-0.5">{activeOperatorName}</span>
            <span className="inline-block mt-1 text-emerald-400 font-medium text-base">
              Shift 1 (Day)
            </span>
          </div>
        </div>
      </div>

      {/* Task Flow 1: Operator Flow */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-200 uppercase tracking-wider px-1">
          Start a Task Flow
        </h2>

        {/* Card A: Operator View */}
        <div className="bg-slate-900 border-2 border-sky-500/60 hover:border-sky-400 rounded-2xl p-6 shadow-lg transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-sky-500/20 border-2 border-sky-400 flex items-center justify-center shrink-0">
                <GraduationCap className="w-8 h-8 text-sky-300" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="px-3 py-1 rounded-md bg-sky-950 text-sky-300 border border-sky-700 font-bold text-base">
                    Task A: Operator
                  </span>
                  <span className="text-slate-400 text-base">For Machine Operators</span>
                </div>
                <h3 className="text-xl font-bold text-white pt-1">
                  View My Training & Qualified Machines
                </h3>
                <p className="text-slate-300 text-base leading-relaxed">
                  See what training lessons you need to do next, check which machines you are certified to run, and open a step-by-step training lesson.
                </p>
              </div>
            </div>

            <button
              onClick={() => onSelectFlow('OPERATOR')}
              className="min-h-[48px] px-6 py-3.5 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-bold text-lg rounded-xl flex items-center justify-center gap-3 transition-colors shadow-md w-full sm:w-auto shrink-0 focus:outline-none focus:ring-4 focus:ring-sky-500/50"
            >
              <span>Open Operator View</span>
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Card B: Supervisor Phone Sign-Off Flow */}
        <div className="bg-slate-900 border-2 border-emerald-500/60 hover:border-emerald-400 rounded-2xl p-6 shadow-lg transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center shrink-0">
                <UserCheck className="w-8 h-8 text-emerald-300" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="px-3 py-1 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold text-base">
                    Task B: Supervisor (Phone)
                  </span>
                  <span className="text-slate-400 text-base">Optimized for Smartphones</span>
                </div>
                <h3 className="text-xl font-bold text-white pt-1">
                  Sign Off a Worker for Level 2
                </h3>
                <p className="text-slate-300 text-base leading-relaxed">
                  Walk the shop floor, find a worker (e.g. Sarah Jenkins), pick a machine, review their checklist, and sign them off with a confirmation step.
                </p>
              </div>
            </div>

            <button
              onClick={() => onSelectFlow('SUPERVISOR')}
              className="min-h-[48px] px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-lg rounded-xl flex items-center justify-center gap-3 transition-colors shadow-md w-full sm:w-auto shrink-0 focus:outline-none focus:ring-4 focus:ring-emerald-500/50"
            >
              <span>Start Sign-Off Flow</span>
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Card C: Manager Skills Matrix Flow */}
        <div className="bg-slate-900 border-2 border-purple-500/60 hover:border-purple-400 rounded-2xl p-6 shadow-lg transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-purple-500/20 border-2 border-purple-400 flex items-center justify-center shrink-0">
                <Grid3X3 className="w-8 h-8 text-purple-300" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="px-3 py-1 rounded-md bg-purple-950 text-purple-300 border border-purple-700 font-bold text-base">
                    Task C: Manager / Matrix
                  </span>
                  <span className="text-slate-400 text-base">Shop Stand-Up & Planning</span>
                </div>
                <h3 className="text-xl font-bold text-white pt-1">
                  View Operator Skills Matrix
                </h3>
                <p className="text-slate-300 text-base leading-relaxed">
                  Open the full shop grid, filter to one department (like CNC Machining), and instantly spot who is expired or due soon.
                </p>
              </div>
            </div>

            <button
              onClick={() => onSelectFlow('MATRIX')}
              className="min-h-[48px] px-6 py-3.5 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white font-bold text-lg rounded-xl flex items-center justify-center gap-3 transition-colors shadow-md w-full sm:w-auto shrink-0 focus:outline-none focus:ring-4 focus:ring-purple-500/50"
            >
              <span>Open Skills Matrix</span>
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Usability Testing Help Card */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 text-slate-400 flex items-start gap-3">
        <AlertCircle className="w-6 h-6 text-lime-400 shrink-0 mt-0.5" />
        <div className="text-base space-y-1">
          <p className="text-slate-200 font-semibold">
            How to use this test mock-up:
          </p>
          <p>
            You can tap any task above to run that exact scenario. All buttons are at least 48px high, all text is at least 16px, and statuses show color + word + icon. To start over at any time, tap <strong>Home</strong> or <strong>Reset Demo</strong> in the top bar.
          </p>
        </div>
      </div>
    </div>
  );
};
