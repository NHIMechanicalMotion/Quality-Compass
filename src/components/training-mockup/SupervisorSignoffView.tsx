import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Search, 
  UserCheck, 
  CheckCircle2, 
  ChevronRight, 
  ShieldCheck, 
  CheckSquare, 
  Square
} from 'lucide-react';
import type { OperatorRecord, MachineRecord } from '../../data/mockTrainingData';
import { StatusBadge } from './StatusBadge';
import { SignoffConfirmationModal } from './SignoffConfirmationModal';

interface SupervisorSignoffViewProps {
  operators: OperatorRecord[];
  machines: MachineRecord[];
  onSignoffConfirm: (operatorId: string, machineId: string, supervisorName: string) => void;
  onBackToHome: () => void;
}

export const SupervisorSignoffView: React.FC<SupervisorSignoffViewProps> = ({
  operators,
  machines,
  onSignoffConfirm,
  onBackToHome,
}) => {
  // Navigation / Wizard step: 'SELECT_OPERATOR' | 'SELECT_MACHINE' | 'EVALUATION' | 'SUCCESS'
  const [currentStep, setCurrentStep] = useState<'SELECT_OPERATOR' | 'SELECT_MACHINE' | 'EVALUATION' | 'SUCCESS'>('SELECT_OPERATOR');
  
  // Search query
  const [searchQuery, setSearchQuery] = useState('');

  // Selected entities
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>('op-sarah-jenkins');
  const [selectedMachineId, setSelectedMachineId] = useState<string>('haas-vf4');
  const supervisorName = 'Jack Miller (Shift Supervisor)';

  // Verification Checklist
  const [checklist, setChecklist] = useState({
    safetyLoto: true,
    setupTooling: true,
    firstPieceCheck: true,
  });

  // Modal open
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const selectedOperator = operators.find((op) => op.id === selectedOperatorId) || operators[0];
  const selectedMachine = machines.find((m) => m.id === selectedMachineId) || machines[0];

  // Filtered operator list
  const filteredOperators = operators.filter((op) => {
    const q = searchQuery.toLowerCase();
    return (
      op.name.toLowerCase().includes(q) ||
      op.badgeNumber.includes(q) ||
      op.department.toLowerCase().includes(q)
    );
  });

  const toggleChecklist = (key: keyof typeof checklist) => {
    setChecklist((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const allChecksPassed = checklist.safetyLoto && checklist.setupTooling && checklist.firstPieceCheck;

  const handleExecuteSignoff = () => {
    setIsConfirmModalOpen(false);
    onSignoffConfirm(selectedOperator.id, selectedMachine.id, supervisorName);
    setCurrentStep('SUCCESS');
  };

  return (
    <div className="max-w-xl mx-auto py-4 px-4 sm:px-6 space-y-6">
      {/* Top Header / Back Button */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => {
            if (currentStep === 'EVALUATION') setCurrentStep('SELECT_MACHINE');
            else if (currentStep === 'SELECT_MACHINE') setCurrentStep('SELECT_OPERATOR');
            else onBackToHome();
          }}
          className="min-h-[48px] px-5 py-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border-2 border-slate-600 text-white font-semibold text-base rounded-xl flex items-center gap-2.5 transition-colors focus:outline-none focus:ring-4 focus:ring-slate-500/50"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>
            {currentStep === 'SELECT_OPERATOR' ? 'Back to Home' : 'Back'}
          </span>
        </button>

        <span className="text-slate-400 text-base font-medium">
          Task B: Phone Sign-Off
        </span>
      </div>

      {/* STEP 1: SELECT OPERATOR */}
      {currentStep === 'SELECT_OPERATOR' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-base mb-1">
              <span>Step 1 of 3</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Find an Operator
            </h1>
            <p className="text-slate-300 text-base mt-1">
              Tap an operator below to review their machine qualifications.
            </p>
          </div>

          {/* Search Input (Strictly >=48px height, >=16px text) */}
          <div className="relative">
            <Search className="w-6 h-6 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by worker name or badge..."
              className="w-full min-h-[48px] pl-13 pr-4 py-3.5 bg-slate-900 border-2 border-slate-700 focus:border-emerald-400 rounded-xl text-white text-base placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/30 transition-all"
            />
          </div>

          {/* Operator Cards List */}
          <div className="space-y-3">
            {filteredOperators.map((operator) => {
              const hasLevel1 = Object.values(operator.skills).some((s) => s.level === 1);
              return (
                <button
                  key={operator.id}
                  onClick={() => {
                    setSelectedOperatorId(operator.id);
                    setCurrentStep('SELECT_MACHINE');
                  }}
                  className={`w-full min-h-[48px] p-4.5 rounded-2xl border-2 text-left transition-all flex items-center justify-between gap-4 focus:outline-none focus:ring-4 focus:ring-emerald-500/40 ${
                    operator.id === selectedOperatorId
                      ? 'bg-emerald-950/40 border-emerald-500 shadow-md'
                      : 'bg-slate-900 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-slate-800 border border-slate-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
                      {operator.avatarInitials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xl font-bold text-white">
                          {operator.name}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 text-base font-semibold border border-slate-700">
                          #{operator.badgeNumber}
                        </span>
                      </div>
                      <p className="text-slate-300 text-base mt-0.5">
                        {operator.department} &bull; {operator.shift}
                      </p>
                      {hasLevel1 && (
                        <span className="inline-block mt-1 text-sky-400 font-semibold text-base">
                          &bull; Has Level 1 eligible for Level 2 sign-off
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="w-6 h-6 text-slate-400 shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 2: CHOOSE A MACHINE */}
      {currentStep === 'SELECT_MACHINE' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-base mb-1">
              <span>Step 2 of 3</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Choose Machine for {selectedOperator.name}
            </h1>
            <p className="text-slate-300 text-base mt-1">
              Select the machine where you want to evaluate and sign off.
            </p>
          </div>

          <div className="space-y-3">
            {machines.map((machine) => {
              const skill = selectedOperator.skills[machine.id];
              const isEligible = skill && skill.level === 1;

              return (
                <button
                  key={machine.id}
                  onClick={() => {
                    setSelectedMachineId(machine.id);
                    setCurrentStep('EVALUATION');
                  }}
                  className={`w-full min-h-[48px] p-5 rounded-2xl border-2 text-left transition-all flex items-center justify-between gap-4 focus:outline-none focus:ring-4 focus:ring-emerald-500/40 ${
                    isEligible
                      ? 'bg-sky-950/40 border-sky-400 shadow-md ring-1 ring-sky-400'
                      : 'bg-slate-900 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-xl font-bold text-white">
                        {machine.name}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 text-base border border-slate-700">
                        {machine.code}
                      </span>
                    </div>

                    <p className="text-slate-300 text-base">
                      {machine.location}
                    </p>

                    <div className="pt-1 flex items-center gap-2 flex-wrap">
                      <StatusBadge
                        status={skill ? skill.status : 'NOT_TRAINED'}
                        customText={skill ? skill.levelLabel : 'Not Trained'}
                      />
                      {isEligible && (
                        <span className="px-3 py-1 rounded-lg bg-emerald-950 border border-emerald-500 text-emerald-300 font-bold text-base">
                          Eligible for Level 2
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="w-7 h-7 text-slate-400 shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 3: EVALUATION & SIGN-OFF CHECKLIST */}
      {currentStep === 'EVALUATION' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-base mb-1">
              <span>Step 3 of 3 &bull; Final Sign-Off</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Evaluate for Level 2 Sign-Off
            </h1>
            <p className="text-slate-300 text-base mt-1">
              Verify competencies before signing off independent operation.
            </p>
          </div>

          {/* Promotion Card Header */}
          <div className="bg-slate-900 border-2 border-emerald-500 rounded-2xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-base">Operator:</span>
              <span className="text-white font-bold text-lg">{selectedOperator.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-base">Machine:</span>
              <span className="text-white font-bold text-lg">{selectedMachine.name}</span>
            </div>
            <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
              <span className="text-slate-400 text-base">Promotion:</span>
              <div className="flex items-center gap-2 font-bold text-base">
                <span className="text-sky-300">Level 1 (Trainee)</span>
                <span>&rarr;</span>
                <span className="text-emerald-400">Level 2 (Qualified)</span>
              </div>
            </div>
          </div>

          {/* Verification Criteria Checklist */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              <span>Supervisor Observation Checklist</span>
            </h2>

            <div
              onClick={() => toggleChecklist('safetyLoto')}
              className={`cursor-pointer min-h-[48px] p-4 rounded-xl border-2 flex items-start gap-3.5 select-none transition-all ${
                checklist.safetyLoto
                  ? 'bg-emerald-950/30 border-emerald-500'
                  : 'bg-slate-900 border-slate-700'
              }`}
            >
              <button
                type="button"
                className="w-7 h-7 flex items-center justify-center shrink-0 mt-0.5 focus:outline-none"
              >
                {checklist.safetyLoto ? (
                  <CheckSquare className="w-7 h-7 text-emerald-400" />
                ) : (
                  <Square className="w-7 h-7 text-slate-400" />
                )}
              </button>
              <div className="text-base">
                <p className="font-bold text-white">
                  1. Safety & Lockout Rules Demonstrated
                </p>
                <p className="text-slate-300 mt-0.5">
                  Operator wears correct PPE (no gloves near spindle) and verifies E-stop and interlocks before starting.
                </p>
              </div>
            </div>

            <div
              onClick={() => toggleChecklist('setupTooling')}
              className={`cursor-pointer min-h-[48px] p-4 rounded-xl border-2 flex items-start gap-3.5 select-none transition-all ${
                checklist.setupTooling
                  ? 'bg-emerald-950/30 border-emerald-500'
                  : 'bg-slate-900 border-slate-700'
              }`}
            >
              <button
                type="button"
                className="w-7 h-7 flex items-center justify-center shrink-0 mt-0.5 focus:outline-none"
              >
                {checklist.setupTooling ? (
                  <CheckSquare className="w-7 h-7 text-emerald-400" />
                ) : (
                  <Square className="w-7 h-7 text-slate-400" />
                )}
              </button>
              <div className="text-base">
                <p className="font-bold text-white">
                  2. Tool Setup & Part Clamping
                </p>
                <p className="text-slate-300 mt-0.5">
                  Operator sets chuck pressure (25 bar), verifies jaw alignment, and touches off tools using optical setter.
                </p>
              </div>
            </div>

            <div
              onClick={() => toggleChecklist('firstPieceCheck')}
              className={`cursor-pointer min-h-[48px] p-4 rounded-xl border-2 flex items-start gap-3.5 select-none transition-all ${
                checklist.firstPieceCheck
                  ? 'bg-emerald-950/30 border-emerald-500'
                  : 'bg-slate-900 border-slate-700'
              }`}
            >
              <button
                type="button"
                className="w-7 h-7 flex items-center justify-center shrink-0 mt-0.5 focus:outline-none"
              >
                {checklist.firstPieceCheck ? (
                  <CheckSquare className="w-7 h-7 text-emerald-400" />
                ) : (
                  <Square className="w-7 h-7 text-slate-400" />
                )}
              </button>
              <div className="text-base">
                <p className="font-bold text-white">
                  3. Five-Piece Quality Verification
                </p>
                <p className="text-slate-300 mt-0.5">
                  Operator measured 5 consecutive pieces with micrometers; all dimensions met print tolerances.
                </p>
              </div>
            </div>
          </div>

          {/* Supervisor Identity Info */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-base space-y-1">
            <span className="text-slate-400 block">Authorizing Supervisor:</span>
            <span className="font-bold text-white text-lg block">{supervisorName}</span>
            <span className="text-slate-400 text-base">Date: Today (Oct 12, 2026)</span>
          </div>

          {/* Primary Action Button (Strictly >=48px height) */}
          <button
            onClick={() => setIsConfirmModalOpen(true)}
            disabled={!allChecksPassed}
            className={`w-full min-h-[48px] px-6 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-lg focus:outline-none focus:ring-4 focus:ring-emerald-400/50 ${
              allChecksPassed
                ? 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            <UserCheck className="w-6 h-6" />
            <span>Sign Off for Level 2 (Qualified Operator)</span>
          </button>
        </div>
      )}

      {/* STEP 4: SUCCESS VIEW */}
      {currentStep === 'SUCCESS' && (
        <div className="bg-slate-900 border-2 border-emerald-500 rounded-3xl p-6 sm:p-8 text-center space-y-6 animate-in zoom-in-95 duration-200">
          <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-400" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-950 border border-emerald-500 text-emerald-300 text-base font-bold">
              Sign-Off Recorded
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Promotion Confirmed!
            </h1>
            <p className="text-slate-200 text-lg leading-relaxed max-w-md mx-auto">
              <strong className="text-white">{selectedOperator.name}</strong> is now certified as a{' '}
              <strong className="text-emerald-400">Level 2 (Qualified Operator)</strong> on{' '}
              <strong className="text-white">{selectedMachine.name}</strong>.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 text-left text-base space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">New Status:</span>
              <StatusBadge status="QUALIFIED" customText="Level 2 (Qualified Operator)" />
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Signed Off By:</span>
              <span className="font-semibold text-white">{supervisorName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Next Recertification:</span>
              <span className="font-semibold text-white">Oct 12, 2027 (1 Year)</span>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={() => {
                setCurrentStep('SELECT_OPERATOR');
              }}
              className="w-full min-h-[48px] px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-lg rounded-xl transition-colors shadow-md focus:outline-none focus:ring-4 focus:ring-emerald-400/50"
            >
              Sign Off Another Operator
            </button>

            <button
              onClick={onBackToHome}
              className="w-full min-h-[48px] px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-lg rounded-xl transition-colors border border-slate-700"
            >
              Back to Home
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Step Modal */}
      <SignoffConfirmationModal
        isOpen={isConfirmModalOpen}
        operator={selectedOperator}
        machine={selectedMachine}
        supervisorName={supervisorName}
        onConfirm={handleExecuteSignoff}
        onCancel={() => setIsConfirmModalOpen(false)}
      />
    </div>
  );
};
