import React from 'react';
import { 
  ArrowLeft, 
  Printer, 
  Award, 
  ShieldCheck, 
  Cpu,
  Building
} from 'lucide-react';
import type { 
  Employee, 
  EquipmentQualification, 
  TrainingRecord 
} from '../../types/training';
import { StatusBadge } from './StatusBadge';

interface EmployeeTrainingFileViewProps {
  employee: Employee;
  qualifications: EquipmentQualification[];
  records: TrainingRecord[];
  onBack: () => void;
  onOpenSignoffModal: (empId: string, eqId?: string) => void;
}

export const EmployeeTrainingFileView: React.FC<EmployeeTrainingFileViewProps> = ({
  employee,
  qualifications,
  records,
  onBack,
  onOpenSignoffModal
}) => {
  // Qualifications for this employee
  const empQuals = qualifications.filter(q => q.employee_id === employee.id);
  // Records for this employee
  const empRecords = records.filter(r => r.employee_id === employee.id);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Action / Navigation Bar (Hidden during print) */}
      <div className="print:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <button
          onClick={onBack}
          className="min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-base flex items-center gap-2 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to List</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onOpenSignoffModal(employee.id)}
            className="min-h-[48px] px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base flex items-center gap-2 shadow-sm transition-all active:scale-95"
          >
            <ShieldCheck className="w-5 h-5" />
            <span>Sign Off Work Center</span>
          </button>

          <button
            onClick={handlePrint}
            className="min-h-[48px] px-5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-base flex items-center gap-2 shadow-sm transition-all active:scale-95"
          >
            <Printer className="w-5 h-5" />
            <span>Print Dossier (PDF)</span>
          </button>
        </div>
      </div>

      {/* PRINTABLE DOSSIER CARD */}
      <div className="bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-lg p-6 sm:p-10 space-y-8 print:p-0 print:border-none print:shadow-none">
        {/* Enterprise Document Header */}
        <div className="border-b-2 border-slate-800 pb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-slate-600">
              <Building className="w-4 h-4 text-emerald-600" />
              <span>NHI Mechanical Motion LLC &bull; Quality Management System</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
              Operator Training & Competence Record
            </h1>
            <p className="text-base text-slate-600 font-medium">
              ISO 9001:2015 Clause 7.2 Compliant Controlled Qualification Dossier
            </p>
          </div>

          <div className="text-left sm:text-right bg-slate-50 p-4 rounded-xl border border-slate-200 print:bg-transparent print:border-none">
            <div className="font-mono text-xl font-black text-blue-700">
              BADGE #{employee.employee_number}
            </div>
            <div className="text-base text-slate-600">
              Status: <strong className="text-emerald-700 uppercase">{employee.status}</strong>
            </div>
          </div>
        </div>

        {/* Employee Profile Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 bg-slate-50 rounded-xl border border-slate-200 text-base">
          <div>
            <span className="text-slate-500 font-semibold block">Full Name:</span>
            <span className="text-lg font-bold text-slate-900">
              {employee.first_name} {employee.last_name}
            </span>
          </div>

          <div>
            <span className="text-slate-500 font-semibold block">Department:</span>
            <span className="text-lg font-bold text-slate-900">
              {employee.department_name || 'Operations'}
            </span>
          </div>

          <div>
            <span className="text-slate-500 font-semibold block">Role & Shift:</span>
            <span className="text-lg font-bold text-slate-900">
              {employee.role} ({employee.shift})
            </span>
          </div>

          <div>
            <span className="text-slate-500 font-semibold block">Date of Hire:</span>
            <span className="text-lg font-bold text-slate-900">
              {employee.hire_date}
            </span>
          </div>
        </div>

        {/* Section 1: Active Machine Qualifications */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-300 pb-2">
            <Cpu className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-900">
              Work Center & Machine Authorizations
            </h2>
          </div>

          {empQuals.length === 0 ? (
            <div className="p-6 text-center text-base text-slate-500 bg-slate-50 rounded-xl">
              No machine qualifications currently recorded for this employee.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-base">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-800">
                    <th className="p-3.5 font-bold">Work Center</th>
                    <th className="p-3.5 font-bold">Qualification Level</th>
                    <th className="p-3.5 font-bold">Certified Date</th>
                    <th className="p-3.5 font-bold">Valid Through</th>
                    <th className="p-3.5 font-bold">Evaluator / Trainer</th>
                    <th className="p-3.5 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {empQuals.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50/50">
                      <td className="p-3.5 font-bold">
                        <div>{q.equipment_name}</div>
                        <div className="text-sm font-mono text-slate-500">{q.equipment_code}</div>
                      </td>
                      <td className="p-3.5 font-semibold text-blue-800">
                        {q.level_label}
                      </td>
                      <td className="p-3.5 text-slate-700">{q.certified_date}</td>
                      <td className="p-3.5 font-bold text-slate-900">{q.expiration_date}</td>
                      <td className="p-3.5 text-slate-800">{q.certified_by}</td>
                      <td className="p-3.5">
                        <StatusBadge status={q.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 2: Training Course History */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-300 pb-2">
            <Award className="w-5 h-5 text-emerald-600" />
            <h2 className="text-xl font-bold text-slate-900">
              Training Course & SOP Completion Log
            </h2>
          </div>

          {empRecords.length === 0 ? (
            <div className="p-6 text-center text-base text-slate-500 bg-slate-50 rounded-xl">
              No training course completions recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-base">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-800">
                    <th className="p-3.5 font-bold">Course / SOP</th>
                    <th className="p-3.5 font-bold">Category</th>
                    <th className="p-3.5 font-bold">Date Completed</th>
                    <th className="p-3.5 font-bold">Expires</th>
                    <th className="p-3.5 font-bold">Trainer</th>
                    <th className="p-3.5 font-bold">Score</th>
                    <th className="p-3.5 font-bold">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {empRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{r.training_title}</div>
                        <div className="text-sm font-mono text-slate-500">{r.training_code}</div>
                        {r.notes && <div className="text-sm text-slate-600 italic mt-0.5">"{r.notes}"</div>}
                      </td>
                      <td className="p-3.5 font-semibold text-slate-700">{r.category}</td>
                      <td className="p-3.5 text-slate-700">{r.completion_date}</td>
                      <td className="p-3.5 font-semibold">{r.expiration_date || 'Permanent'}</td>
                      <td className="p-3.5 text-slate-800">{r.trainer_name}</td>
                      <td className="p-3.5 font-mono">{r.score !== undefined ? `${r.score}%` : 'N/A'}</td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-md text-sm font-bold ${
                          r.result === 'PASS' 
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                            : 'bg-rose-100 text-rose-900 border border-rose-300'
                        }`}>
                          {r.result}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quality Management Attestation Signature Block (Print Layout) */}
        <div className="border-t-2 border-slate-300 pt-8 mt-12 grid grid-cols-2 gap-8 text-base">
          <div>
            <div className="h-10 border-b border-slate-400" />
            <div className="font-bold text-slate-900 mt-1">Area Supervisor / Lead Signature</div>
            <div className="text-sm text-slate-500">Date: ________________________</div>
          </div>

          <div>
            <div className="h-10 border-b border-slate-400" />
            <div className="font-bold text-slate-900 mt-1">Quality Management System Auditor</div>
            <div className="text-sm text-slate-500">Date: ________________________</div>
          </div>
        </div>
      </div>
    </div>
  );
};
