import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  Calendar, 
  User, 
  BookOpen, 
  Award, 
  AlertCircle,
  Clock,
  Upload
} from 'lucide-react';
import type { Employee, TrainingModule } from '../../types/training';
import { recordTrainingCompletion, calculateExpirationDate } from '../../services/trainingService';

interface RecordTrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  trainings: TrainingModule[];
  defaultEmployeeId?: string;
  defaultTrainingId?: string;
  currentUserName: string;
  onRecordSaved: () => void;
}

export const RecordTrainingModal: React.FC<RecordTrainingModalProps> = ({
  isOpen,
  onClose,
  employees,
  trainings,
  defaultEmployeeId,
  defaultTrainingId,
  currentUserName,
  onRecordSaved
}) => {
  const [employeeId, setEmployeeId] = useState<string>(defaultEmployeeId || '');
  const [trainingId, setTrainingId] = useState<string>(defaultTrainingId || '');
  const [completionDate, setCompletionDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [trainerName, setTrainerName] = useState<string>(currentUserName || 'Jack Miller');
  const [result, setResult] = useState<'PASS' | 'FAIL'>('PASS');
  const [score, setScore] = useState<number>(100);
  const [certificateUrl, setCertificateUrl] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (defaultEmployeeId) setEmployeeId(defaultEmployeeId);
  }, [defaultEmployeeId]);

  useEffect(() => {
    if (defaultTrainingId) setTrainingId(defaultTrainingId);
  }, [defaultTrainingId]);

  if (!isOpen) return null;

  const activeEmployees = employees.filter(e => e.status === 'ACTIVE');
  const activeTrainings = trainings.filter(t => t.status === 'ACTIVE');

  // Selected training details for expiration preview
  const selectedTraining = trainings.find(t => t.id === trainingId);
  const calculatedExpiry = selectedTraining 
    ? calculateExpirationDate(completionDate, selectedTraining.frequency_type, selectedTraining.custom_frequency_months)
    : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !trainingId) {
      setFeedback({ type: 'error', message: 'Please select both an employee and a training module.' });
      return;
    }

    try {
      setIsSubmitting(true);
      await recordTrainingCompletion({
        employee_id: employeeId,
        training_id: trainingId,
        completion_date: completionDate,
        expiration_date: calculatedExpiry,
        trainer_name: trainerName,
        result,
        score,
        certificate_url: certificateUrl || undefined,
        notes: notes || undefined,
        recorded_by: currentUserName
      }, currentUserName);

      setFeedback({ type: 'success', message: 'Training completion recorded successfully in audit log!' });
      setTimeout(() => {
        setIsSubmitting(false);
        setFeedback(null);
        onRecordSaved();
        onClose();
      }, 900);
    } catch (err: any) {
      setIsSubmitting(false);
      setFeedback({ type: 'error', message: err?.message || 'Failed to save training record.' });
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
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Record Training Completion
              </h2>
              <p className="text-base text-slate-600 dark:text-slate-400">
                Append-only ISO 9001:2015 Clause 7.2 Training Dossier
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

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {feedback && (
            <div className={`p-4 rounded-xl text-base flex items-center gap-3 ${
              feedback.type === 'success' 
                ? 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200' 
                : 'bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
            }`}>
              {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Employee Picker */}
          <div>
            <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              Select Operator / Employee:
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full min-h-[48px] pl-11 pr-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              >
                <option value="">-- Choose Employee --</option>
                {activeEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} (#{emp.employee_number}) — {emp.department_name || emp.role}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Training Module Picker */}
          <div>
            <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              Training Course / SOP Module:
            </label>
            <div className="relative">
              <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              <select
                value={trainingId}
                onChange={(e) => setTrainingId(e.target.value)}
                className="w-full min-h-[48px] pl-11 pr-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              >
                <option value="">-- Choose Training Module --</option>
                {activeTrainings.map((trn) => (
                  <option key={trn.id} value={trn.id}>
                    [{trn.code}] {trn.title} ({trn.category} • {trn.frequency_type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Expiration Date Notice Card */}
          {selectedTraining && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-base">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <Clock className="w-5 h-5 text-slate-500" />
                <span>Renewal Schedule: <strong>{selectedTraining.frequency_type}</strong></span>
              </div>
              <div className="font-bold text-slate-900 dark:text-white">
                Expires: {calculatedExpiry || 'Never (One-time)'}
              </div>
            </div>
          )}

          {/* Completion Date & Trainer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Date Completed:
              </label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={completionDate}
                  onChange={(e) => setCompletionDate(e.target.value)}
                  className="w-full min-h-[48px] pl-11 pr-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Trainer / Evaluator:
              </label>
              <input
                type="text"
                value={trainerName}
                onChange={(e) => setTrainerName(e.target.value)}
                className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Result & Score */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Result:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setResult('PASS')}
                  className={`min-h-[48px] rounded-xl font-bold text-base flex items-center justify-center gap-2 border transition-all ${
                    result === 'PASS'
                      ? 'border-emerald-600 bg-emerald-500 text-white shadow-sm'
                      : 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Pass</span>
                </button>
                <button
                  type="button"
                  onClick={() => setResult('FAIL')}
                  className={`min-h-[48px] rounded-xl font-bold text-base flex items-center justify-center gap-2 border transition-all ${
                    result === 'FAIL'
                      ? 'border-rose-600 bg-rose-600 text-white shadow-sm'
                      : 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <X className="w-5 h-5" />
                  <span>Fail</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Exam / Evaluation Score (%):
              </label>
              <div className="relative">
                <Award className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={score}
                  onChange={(e) => setScore(Number(e.target.value))}
                  className="w-full min-h-[48px] pl-11 pr-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Certificate URL */}
          <div>
            <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              Certificate Document Link / Attachment:
            </label>
            <div className="relative">
              <Upload className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={certificateUrl}
                onChange={(e) => setCertificateUrl(e.target.value)}
                placeholder="https://... or certificate filename"
                className="w-full min-h-[48px] pl-11 pr-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Evaluation Notes */}
          <div>
            <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              Trainer Notes & Demonstration Feedback:
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Completed hands-on tool touch-off demonstration and 5-piece inspection."
              className="w-full p-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-bold text-lg flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99]"
            >
              <CheckCircle2 className="w-6 h-6" />
              <span>{isSubmitting ? 'Recording...' : 'Save Training Record'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
