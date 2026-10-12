import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Users, 
  Cpu, 
  ShieldAlert, 
  Filter, 
  RefreshCw, 
  Plus
} from 'lucide-react';
import type { 
  Employee, 
  Equipment, 
  EquipmentQualification, 
  Department,
  MissingRequirementItem
} from '../../types/training';
import { StatusBadge } from './StatusBadge';

interface TrainingDashboardViewProps {
  employees: Employee[];
  equipment: Equipment[];
  qualifications: EquipmentQualification[];
  departments: Department[];
  missingRequirements: MissingRequirementItem[];
  onOpenRecordModal: (empId?: string, trnId?: string) => void;
  onOpenSignoffModal: (empId?: string, eqId?: string) => void;
  onSelectEmployeeFile: (emp: Employee) => void;
}

export const TrainingDashboardView: React.FC<TrainingDashboardViewProps> = ({
  employees,
  equipment,
  qualifications,
  departments,
  missingRequirements,
  onOpenRecordModal,
  onOpenSignoffModal,
  onSelectEmployeeFile
}) => {
  const [selectedDeptId, setSelectedDeptId] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'EXPIRED' | 'DUE_SOON' | 'MISSING_GAPS'>('EXPIRED');

  // Filtered dataset by department
  const filteredEmployees = useMemo(() => {
    if (selectedDeptId === 'ALL') return employees;
    return employees.filter(e => e.department_id === selectedDeptId);
  }, [employees, selectedDeptId]);

  const filteredEmpIds = useMemo(() => new Set(filteredEmployees.map(e => e.id)), [filteredEmployees]);

  // Expired Qualifications & Records
  const expiredQuals = useMemo(() => {
    return qualifications.filter(q => filteredEmpIds.has(q.employee_id) && q.status === 'EXPIRED');
  }, [qualifications, filteredEmpIds]);

  // Due Soon Qualifications & Records
  const dueSoonQuals = useMemo(() => {
    return qualifications.filter(q => filteredEmpIds.has(q.employee_id) && q.status === 'DUE_SOON');
  }, [qualifications, filteredEmpIds]);

  // Missing Training Gaps in selected department
  const deptMissing = useMemo(() => {
    if (selectedDeptId === 'ALL') return missingRequirements;
    return missingRequirements.filter(m => m.employee.department_id === selectedDeptId);
  }, [missingRequirements, selectedDeptId]);

  const totalActiveWorkers = employees.filter(e => e.status === 'ACTIVE').length;
  const totalWorkCenters = equipment.filter(eq => eq.status === 'ACTIVE').length;

  return (
    <div className="space-y-6">
      {/* Department Filter & Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <Filter className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="font-bold text-base text-slate-800 dark:text-slate-200">
            Department Scope:
          </span>
          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            className="min-h-[48px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-base focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="ALL">All Departments (Enterprise)</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenRecordModal()}
            className="min-h-[48px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base flex items-center gap-2 shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span>Record Training</span>
          </button>
        </div>
      </div>

      {/* High-Visibility KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total Active Operators */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-base font-semibold">Active Workers</span>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
            {totalActiveWorkers}
          </div>
          <div className="text-base text-slate-500 mt-1">Across 4 Companies</div>
        </div>

        {/* Active Machines */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-base font-semibold">Work Centers</span>
            <Cpu className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
            {totalWorkCenters}
          </div>
          <div className="text-base text-slate-500 mt-1">Active Assets</div>
        </div>

        {/* Expired Alert Card */}
        <button
          type="button"
          onClick={() => setActiveTab('EXPIRED')}
          className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all ${
            activeTab === 'EXPIRED'
              ? 'border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 ring-2 ring-rose-500/20'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between text-rose-700 dark:text-rose-400">
            <span className="text-base font-bold">Expired</span>
            <AlertTriangle className="w-5 h-5 text-rose-600" />
          </div>
          <div className="mt-2 text-3xl font-black text-rose-600 dark:text-rose-400">
            {expiredQuals.length}
          </div>
          <div className="text-base text-rose-700/80 dark:text-rose-400/80 mt-1">
            Immediate Action
          </div>
        </button>

        {/* Due in 30 Days Card */}
        <button
          type="button"
          onClick={() => setActiveTab('DUE_SOON')}
          className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all ${
            activeTab === 'DUE_SOON'
              ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/40 ring-2 ring-amber-500/20'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400">
            <span className="text-base font-bold">Due Soon (30d)</span>
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div className="mt-2 text-3xl font-black text-amber-600 dark:text-amber-400">
            {dueSoonQuals.length}
          </div>
          <div className="text-base text-amber-700/80 dark:text-amber-400/80 mt-1">
            Renewal Window
          </div>
        </button>

        {/* Missing Required Training Card */}
        <button
          type="button"
          onClick={() => setActiveTab('MISSING_GAPS')}
          className={`p-4 rounded-2xl border text-left flex flex-col justify-between col-span-2 lg:col-span-1 transition-all ${
            activeTab === 'MISSING_GAPS'
              ? 'border-purple-500 bg-purple-50/80 dark:bg-purple-950/40 ring-2 ring-purple-500/20'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-purple-300'
          }`}
        >
          <div className="flex items-center justify-between text-purple-700 dark:text-purple-400">
            <span className="text-base font-bold">Missing Reqs</span>
            <ShieldAlert className="w-5 h-5 text-purple-600" />
          </div>
          <div className="mt-2 text-3xl font-black text-purple-600 dark:text-purple-400">
            {deptMissing.length}
          </div>
          <div className="text-base text-purple-700/80 dark:text-purple-400/80 mt-1">
            Compliance Gap
          </div>
        </button>
      </div>

      {/* Priority Action Panels */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Tab Headers */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 px-2 pt-2">
          <button
            onClick={() => setActiveTab('EXPIRED')}
            className={`min-h-[48px] px-5 font-bold text-base rounded-t-xl transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'EXPIRED'
                ? 'border-rose-600 bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 shadow-sm'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <span>Expired Qualifications ({expiredQuals.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('DUE_SOON')}
            className={`min-h-[48px] px-5 font-bold text-base rounded-t-xl transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'DUE_SOON'
                ? 'border-amber-600 bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-sm'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            <Clock className="w-5 h-5 text-amber-600" />
            <span>Due Soon ({dueSoonQuals.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('MISSING_GAPS')}
            className={`min-h-[48px] px-5 font-bold text-base rounded-t-xl transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'MISSING_GAPS'
                ? 'border-purple-600 bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-400 shadow-sm'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            <ShieldAlert className="w-5 h-5 text-purple-600" />
            <span>Missing Required Training ({deptMissing.length})</span>
          </button>
        </div>

        {/* Tab 1: Expired Qualifications */}
        {activeTab === 'EXPIRED' && (
          <div className="p-6">
            {expiredQuals.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Zero Expired Qualifications!
                </h3>
                <p className="text-base text-slate-600 dark:text-slate-400 mt-1">
                  All active operators in this department have current certifications.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {expiredQuals.map((qual) => {
                  const emp = employees.find(e => e.id === qual.employee_id);
                  return (
                    <div
                      key={qual.id}
                      className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <StatusBadge status="EXPIRED" />
                          <button
                            onClick={() => emp && onSelectEmployeeFile(emp)}
                            className="font-bold text-lg text-slate-900 dark:text-white hover:text-blue-600 underline"
                          >
                            {qual.employee_name} (#{qual.employee_number})
                          </button>
                        </div>
                        <div className="text-base text-slate-700 dark:text-slate-300">
                          Work Center: <strong>{qual.equipment_name}</strong> ({qual.equipment_code}) • {qual.level_label}
                        </div>
                        <div className="text-base text-rose-700 dark:text-rose-400 font-semibold">
                          Expired on: {qual.expiration_date} (Last certified: {qual.certified_date} by {qual.certified_by})
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center">
                        <button
                          onClick={() => onOpenSignoffModal(qual.employee_id, qual.equipment_id)}
                          className="min-h-[48px] px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-base flex items-center gap-2 shadow-sm transition-transform active:scale-95"
                        >
                          <RefreshCw className="w-5 h-5" />
                          <span>Recertify Work Center</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Due in 30 Days */}
        {activeTab === 'DUE_SOON' && (
          <div className="p-6">
            {dueSoonQuals.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  No Qualifications Due in the Next 30 Days!
                </h3>
                <p className="text-base text-slate-600 dark:text-slate-400 mt-1">
                  Operator qualifications are up-to-date and compliant.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {dueSoonQuals.map((qual) => {
                  const emp = employees.find(e => e.id === qual.employee_id);
                  return (
                    <div
                      key={qual.id}
                      className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <StatusBadge status="DUE_SOON" />
                          <button
                            onClick={() => emp && onSelectEmployeeFile(emp)}
                            className="font-bold text-lg text-slate-900 dark:text-white hover:text-blue-600 underline"
                          >
                            {qual.employee_name} (#{qual.employee_number})
                          </button>
                        </div>
                        <div className="text-base text-slate-700 dark:text-slate-300">
                          Work Center: <strong>{qual.equipment_name}</strong> ({qual.equipment_code}) • {qual.level_label}
                        </div>
                        <div className="text-base text-amber-800 dark:text-amber-400 font-semibold">
                          Renewal Target: <strong>{qual.expiration_date}</strong> (Certified by {qual.certified_by})
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center">
                        <button
                          onClick={() => onOpenSignoffModal(qual.employee_id, qual.equipment_id)}
                          className="min-h-[48px] px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-base flex items-center gap-2 shadow-sm transition-transform active:scale-95"
                        >
                          <RefreshCw className="w-5 h-5" />
                          <span>Renew Certification</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Missing Required Training (Compliance Gap Matrix) */}
        {activeTab === 'MISSING_GAPS' && (
          <div className="p-6">
            {deptMissing.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Zero Missing Requirements!
                </h3>
                <p className="text-base text-slate-600 dark:text-slate-400 mt-1">
                  All operators meet 100% of their mandatory role and machine safety prerequisites.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {deptMissing.map((item, idx) => (
                  <div
                    key={`${item.employee.id}-${item.training.id}-${idx}`}
                    className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 rounded-lg bg-purple-100 text-purple-900 dark:bg-purple-900/60 dark:text-purple-300 font-bold text-base">
                          Required Prerequisite
                        </span>
                        <button
                          onClick={() => onSelectEmployeeFile(item.employee)}
                          className="font-bold text-lg text-slate-900 dark:text-white hover:text-blue-600 underline"
                        >
                          {item.employee.first_name} {item.employee.last_name} (#{item.employee.employee_number})
                        </button>
                      </div>
                      <div className="text-base text-slate-800 dark:text-slate-200">
                        Missing Course: <strong>[{item.training.code}] {item.training.title}</strong>
                      </div>
                      <div className="text-base text-purple-800 dark:text-purple-300 font-semibold">
                        {item.reason} {item.daysOverdue > 0 && `(Overdue by ${item.daysOverdue} days)`}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      <button
                        onClick={() => onOpenRecordModal(item.employee.id, item.training.id)}
                        className="min-h-[48px] px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-base flex items-center gap-2 shadow-sm transition-transform active:scale-95"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Record Completion</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
