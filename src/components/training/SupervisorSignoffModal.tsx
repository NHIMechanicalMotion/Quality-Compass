import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  ShieldCheck, 
  UserCheck, 
  AlertTriangle,
  Cpu,
  User,
  CheckSquare,
  Square
} from 'lucide-react';
import type { Employee, Equipment, QualificationLevel } from '../../types/training';
import { recordEquipmentSignoff } from '../../services/trainingService';

interface SupervisorSignoffModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  equipment: Equipment[];
  defaultEmployeeId?: string;
  defaultEquipmentId?: string;
  currentSupervisorName: string;
  onSignoffSaved: () => void;
}

export const SupervisorSignoffModal: React.FC<SupervisorSignoffModalProps> = ({
  isOpen,
  onClose,
  employees,
  equipment,
  defaultEmployeeId,
  defaultEquipmentId,
  currentSupervisorName,
  onSignoffSaved
}) => {
  const [employeeId, setEmployeeId] = useState<string>(defaultEmployeeId || '');
  const [equipmentId, setEquipmentId] = useState<string>(defaultEquipmentId || '');
  const [targetLevel, setTargetLevel] = useState<QualificationLevel>(2);
  const [certifiedDate, setCertifiedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  
  // Calculate default 1-year expiration date
  const [expirationDate, setExpirationDate] = useState<string>(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  });

  const [supervisorName, setSupervisorName] = useState<string>(currentSupervisorName || 'Jack Miller');
  const [evaluationNotes, setEvaluationNotes] = useState<string>('Observed independent machine setup and part verification.');
  
  // Verification Checklist State
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    safety: true,
    ppe: true,
    setup: true,
    fai: true
  });

  // Explicit confirmation step dialog
  const [isConfirmStep, setIsConfirmStep] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (defaultEmployeeId) setEmployeeId(defaultEmployeeId);
  }, [defaultEmployeeId]);

  useEffect(() => {
    if (defaultEquipmentId) setEquipmentId(defaultEquipmentId);
  }, [defaultEquipmentId]);

  if (!isOpen) return null;

  const selectedEmployee = employees.find(e => e.id === employeeId);
  const selectedEquipment = equipment.find(eq => eq.id === equipmentId);

  const getLevelLabel = (lvl: QualificationLevel) => {
    switch (lvl) {
      case 1: return 'Level 1 (Trainee)';
      case 2: return 'Level 2 (Qualified Operator)';
      case 3: return 'Level 3 (Expert / Trainer)';
      case 4: return 'Level 4 (Master Specialist)';
      default: return 'Level 0 (Unqualified)';
    }
  };

  const allChecklistPassed = Object.values(checklist).every(Boolean);

  const toggleChecklist = (key: string) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!employeeId || !equipmentId) {
      setErrorMessage('Please select both an employee and a machine.');
      return;
    }

    if (!allChecklistPassed) {
      setErrorMessage('All mandatory safety and inspection checklist items must be verified before sign-off.');
      return;
    }

    setIsConfirmStep(true);
  };

  const handleFinalSignoff = async () => {
    try {
      setIsSubmitting(true);
      await recordEquipmentSignoff({
        employee_id: employeeId,
        equipment_id: equipmentId,
        level: targetLevel,
        level_label: getLevelLabel(targetLevel),
        status: 'QUALIFIED',
        certified_date: certifiedDate,
        expiration_date: expirationDate,
        certified_by: supervisorName,
        evaluation_notes: evaluationNotes,
        checklist_answers: checklist
      }, supervisorName);

      setIsSubmitting(false);
      setIsConfirmStep(false);
      onSignoffSaved();
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err?.message || 'Failed to record sign-off.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden max-h-[92vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Supervisor Work Center Sign-Off
              </h2>
              <p className="text-base text-slate-600 dark:text-slate-400">
                Authorized Qualification Endorsement
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        {!isConfirmStep ? (
          <form onSubmit={handleProceedToConfirm} className="p-6 overflow-y-auto space-y-4">
            {errorMessage && (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-center gap-3 text-base">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Operator Selection */}
            <div>
              <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Operator / Employee:
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full min-h-[48px] pl-11 pr-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                >
                  <option value="">-- Choose Operator --</option>
                  {employees.filter(e => e.status === 'ACTIVE').map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} (#{emp.employee_number})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Machine Selection */}
            <div>
              <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Work Center / Equipment:
              </label>
              <div className="relative">
                <Cpu className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <select
                  value={equipmentId}
                  onChange={(e) => setEquipmentId(e.target.value)}
                  className="w-full min-h-[48px] pl-11 pr-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                >
                  <option value="">-- Choose Equipment --</option>
                  {equipment.filter(eq => eq.status === 'ACTIVE').map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      [{eq.code}] {eq.name} ({eq.location})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Target Qualification Level */}
            <div>
              <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-2">
                Endorse for Skill Level:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { level: 1, label: 'Level 1: Trainee' },
                  { level: 2, label: 'Level 2: Qualified' },
                  { level: 3, label: 'Level 3: Expert / Trainer' }
                ].map((item) => (
                  <button
                    key={item.level}
                    type="button"
                    onClick={() => setTargetLevel(item.level as QualificationLevel)}
                    className={`min-h-[48px] p-3 rounded-xl border text-center font-bold text-base transition-all ${
                      targetLevel === item.level
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-300 ring-2 ring-blue-500/20'
                        : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mandatory Floor Checklist */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <span className="font-bold text-base text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                Floor Observation Checklist (Mandatory):
              </span>

              <button
                type="button"
                onClick={() => toggleChecklist('safety')}
                className="w-full min-h-[48px] flex items-center gap-3 text-left p-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
              >
                {checklist.safety ? (
                  <CheckSquare className="w-6 h-6 text-emerald-600 shrink-0" />
                ) : (
                  <Square className="w-6 h-6 text-slate-400 shrink-0" />
                )}
                <span className="text-base text-slate-800 dark:text-slate-200">
                  Observed E-Stop, Light Curtain & Interlock protocols.
                </span>
              </button>

              <button
                type="button"
                onClick={() => toggleChecklist('ppe')}
                className="w-full min-h-[48px] flex items-center gap-3 text-left p-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
              >
                {checklist.ppe ? (
                  <CheckSquare className="w-6 h-6 text-emerald-600 shrink-0" />
                ) : (
                  <Square className="w-6 h-6 text-slate-400 shrink-0" />
                )}
                <span className="text-base text-slate-800 dark:text-slate-200">
                  Verified correct PPE attire (strict no-gloves near rotating spindles).
                </span>
              </button>

              <button
                type="button"
                onClick={() => toggleChecklist('setup')}
                className="w-full min-h-[48px] flex items-center gap-3 text-left p-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
              >
                {checklist.setup ? (
                  <CheckSquare className="w-6 h-6 text-emerald-600 shrink-0" />
                ) : (
                  <Square className="w-6 h-6 text-slate-400 shrink-0" />
                )}
                <span className="text-base text-slate-800 dark:text-slate-200">
                  Demonstrated workpiece fixture clamp-down & tool touch-off offset.
                </span>
              </button>

              <button
                type="button"
                onClick={() => toggleChecklist('fai')}
                className="w-full min-h-[48px] flex items-center gap-3 text-left p-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
              >
                {checklist.fai ? (
                  <CheckSquare className="w-6 h-6 text-emerald-600 shrink-0" />
                ) : (
                  <Square className="w-6 h-6 text-slate-400 shrink-0" />
                )}
                <span className="text-base text-slate-800 dark:text-slate-200">
                  Executed 5-piece first article inspection check to blueprint specs.
                </span>
              </button>
            </div>

            {/* Supervisor Name & Evaluation Notes */}
            <div>
              <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Sign-Off Supervisor / Lead Name:
              </label>
              <input
                type="text"
                value={supervisorName}
                onChange={(e) => setSupervisorName(e.target.value)}
                className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base focus:ring-2 focus:ring-blue-500 focus:outline-none mb-3"
                required
              />

              <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Supervisor Evaluation Notes:
              </label>
              <textarea
                rows={2}
                value={evaluationNotes}
                onChange={(e) => setEvaluationNotes(e.target.value)}
                className="w-full p-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Sign-Off Date:
                </label>
                <input
                  type="date"
                  value={certifiedDate}
                  onChange={(e) => setCertifiedDate(e.target.value)}
                  className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base"
                  required
                />
              </div>

              <div>
                <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Valid Through (Expiration):
                </label>
                <input
                  type="date"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base"
                  required
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full min-h-[48px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99]"
              >
                <span>Review & Sign Off</span>
              </button>
            </div>
          </form>
        ) : (
          /* Confirmation Step Dialog (Mandatory per Project Brief) */
          <div className="p-6 space-y-6">
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-2">
              <div className="flex items-center gap-2 font-black text-lg">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
                <span>Confirm Operator Qualification Sign-Off</span>
              </div>
              <p className="text-base text-amber-800 dark:text-amber-300">
                You are about to issue a formal ISO 9001:2015 competency sign-off. This action will be permanently recorded in the immutable audit log.
              </p>
            </div>

            <div className="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 text-base">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Operator:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {selectedEmployee?.first_name} {selectedEmployee?.last_name} (#{selectedEmployee?.employee_number})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Work Center:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {selectedEquipment?.name} ({selectedEquipment?.code})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Granted Level:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {getLevelLabel(targetLevel)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Valid Through:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {expirationDate} (1 Year)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Sign-Off Supervisor:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {supervisorName}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmStep(false)}
                className="min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-base text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Back to Edit
              </button>

              <button
                type="button"
                onClick={handleFinalSignoff}
                disabled={isSubmitting}
                className="min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg flex items-center justify-center gap-2 shadow-md active:scale-95"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>{isSubmitting ? 'Recording...' : 'Confirm Sign-Off'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
