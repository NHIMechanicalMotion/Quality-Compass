import React, { useState, useMemo } from 'react';
import { 
  Filter, 
  Search, 
  UserCheck, 
  AlertTriangle, 
  Clock, 
  X, 
  FileText
} from 'lucide-react';
import type { 
  Employee, 
  Equipment, 
  EquipmentQualification, 
  Department 
} from '../../types/training';
import { StatusBadge } from './StatusBadge';

interface SkillsMatrixViewProps {
  employees: Employee[];
  equipment: Equipment[];
  qualifications: EquipmentQualification[];
  departments: Department[];
  onOpenSignoffModal: (empId?: string, eqId?: string) => void;
  onSelectEmployeeFile: (emp: Employee) => void;
}

export const SkillsMatrixView: React.FC<SkillsMatrixViewProps> = ({
  employees,
  equipment,
  qualifications,
  departments,
  onOpenSignoffModal,
  onSelectEmployeeFile
}) => {
  const [selectedDeptId, setSelectedDeptId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DUE_SOON' | 'EXPIRED'>('ALL');

  // Cell inspection popover/modal state
  const [inspectedCell, setInspectedCell] = useState<{
    employee: Employee;
    equipment: Equipment;
    qual: EquipmentQualification | null;
  } | null>(null);

  // Active employees only by default
  const activeEmployees = useMemo(() => employees.filter(e => e.status === 'ACTIVE'), [employees]);
  const activeEquipment = useMemo(() => equipment.filter(eq => eq.status === 'ACTIVE'), [equipment]);

  // Filter machines by department
  const filteredEquipment = useMemo(() => {
    if (selectedDeptId === 'ALL') return activeEquipment;
    return activeEquipment.filter(eq => eq.department_id === selectedDeptId);
  }, [activeEquipment, selectedDeptId]);

  // Fast map for qualifications: `${employeeId}_${equipmentId}` -> EquipmentQualification
  const qualMap = useMemo(() => {
    const map = new Map<string, EquipmentQualification>();
    qualifications.forEach(q => {
      const key = `${q.employee_id}_${q.equipment_id}`;
      // Keep the most recent or highest level
      const existing = map.get(key);
      if (!existing || new Date(q.created_at || '').getTime() > new Date(existing.created_at || '').getTime()) {
        map.set(key, q);
      }
    });
    return map;
  }, [qualifications]);

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return activeEmployees.filter(emp => {
      const matchesDept = selectedDeptId === 'ALL' || emp.department_id === selectedDeptId;
      const matchesSearch = !searchQuery || 
        `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employee_number.includes(searchQuery);

      if (!matchesDept || !matchesSearch) return false;

      // Status quick filter
      if (statusFilter === 'DUE_SOON') {
        return filteredEquipment.some(eq => {
          const q = qualMap.get(`${emp.id}_${eq.id}`);
          return q && q.status === 'DUE_SOON';
        });
      }
      if (statusFilter === 'EXPIRED') {
        return filteredEquipment.some(eq => {
          const q = qualMap.get(`${emp.id}_${eq.id}`);
          return q && q.status === 'EXPIRED';
        });
      }

      return true;
    });
  }, [activeEmployees, selectedDeptId, searchQuery, statusFilter, filteredEquipment, qualMap]);

  return (
    <div className="space-y-6">
      {/* Filter and Search Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-600" />
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

          {/* Quick status filters */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`min-h-[48px] px-3.5 rounded-xl text-base font-bold transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('DUE_SOON')}
              className={`min-h-[48px] px-3.5 rounded-xl text-base font-bold transition-colors flex items-center gap-1.5 ${
                statusFilter === 'DUE_SOON'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Due Soon</span>
            </button>
            <button
              onClick={() => setStatusFilter('EXPIRED')}
              className={`min-h-[48px] px-3.5 rounded-xl text-base font-bold transition-colors flex items-center gap-1.5 ${
                statusFilter === 'EXPIRED'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 hover:bg-rose-100'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Expired</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search operator..."
              className="w-full min-h-[48px] pl-11 pr-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <button
            onClick={() => onOpenSignoffModal()}
            className="min-h-[48px] px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base flex items-center gap-2 shadow-sm shrink-0 active:scale-95"
          >
            <UserCheck className="w-5 h-5" />
            <span>Sign Off Worker</span>
          </button>
        </div>
      </div>

      {/* Skills Matrix Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                <th className="p-4 font-bold text-base sticky left-0 bg-slate-100 dark:bg-slate-800 z-10 min-w-[200px]">
                  Operator / Employee
                </th>
                {filteredEquipment.map((eq) => (
                  <th key={eq.id} className="p-4 font-bold text-base text-center border-l border-slate-200 dark:border-slate-700 min-w-[160px]">
                    <div className="font-extrabold text-blue-600 dark:text-blue-400">{eq.code}</div>
                    <div className="text-base text-slate-700 dark:text-slate-300 font-medium truncate max-w-[150px] mx-auto" title={eq.name}>
                      {eq.name}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={filteredEquipment.length + 1} className="p-8 text-center text-base text-slate-500">
                    No operators found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Sticky Employee Name Column */}
                    <td className="p-4 sticky left-0 bg-white dark:bg-slate-900 z-10 shadow-sm border-r border-slate-200 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => onSelectEmployeeFile(emp)}
                        className="text-left group"
                      >
                        <div className="font-bold text-base text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                          <span>{emp.first_name} {emp.last_name}</span>
                          <FileText className="w-4 h-4 opacity-0 group-hover:opacity-100 text-blue-500 transition-opacity" />
                        </div>
                        <div className="text-base text-slate-500 dark:text-slate-400">
                          #{emp.employee_number} • {emp.role}
                        </div>
                      </button>
                    </td>

                    {/* Machine Qualification Cells */}
                    {filteredEquipment.map((eq) => {
                      const qual = qualMap.get(`${emp.id}_${eq.id}`);
                      return (
                        <td
                          key={eq.id}
                          className="p-3 text-center border-l border-slate-200 dark:border-slate-800"
                        >
                          <button
                            type="button"
                            onClick={() => setInspectedCell({ employee: emp, equipment: eq, qual: qual || null })}
                            className="min-h-[48px] w-full rounded-xl p-2 flex items-center justify-center transition-all hover:scale-105 active:scale-95 focus:outline-none"
                            title={qual ? `${qual.level_label} (${qual.status}) - Tap for details` : 'Not trained - Tap to sign off'}
                          >
                            {qual ? (
                              <StatusBadge level={qual.level} status={qual.status} />
                            ) : (
                              <StatusBadge level={0} status="NOT_TRAINED" />
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-3 text-base">
          <div className="font-bold text-slate-700 dark:text-slate-300">
            Skills Legend:
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge level={1} />
            <StatusBadge level={2} />
            <StatusBadge level={3} />
            <StatusBadge status="DUE_SOON" />
            <StatusBadge status="EXPIRED" />
          </div>
        </div>
      </div>

      {/* INSPECTED CELL DETAIL MODAL */}
      {inspectedCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Qualification Dossier
                </h2>
                <p className="text-slate-600 dark:text-slate-400 text-base">
                  {inspectedCell.employee.first_name} {inspectedCell.employee.last_name} (#{inspectedCell.employee.employee_number})
                </p>
              </div>

              <button
                onClick={() => setInspectedCell(null)}
                className="min-h-[48px] min-w-[48px] rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 text-base">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Work Center:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  [{inspectedCell.equipment.code}] {inspectedCell.equipment.name}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Current Status:</span>
                {inspectedCell.qual ? (
                  <StatusBadge level={inspectedCell.qual.level} status={inspectedCell.qual.status} />
                ) : (
                  <StatusBadge level={0} status="NOT_TRAINED" />
                )}
              </div>

              {inspectedCell.qual && (
                <>
                  <div className="flex justify-between text-slate-700 dark:text-slate-300">
                    <span className="text-slate-600 dark:text-slate-400">Certified By:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{inspectedCell.qual.certified_by}</span>
                  </div>

                  <div className="flex justify-between text-slate-700 dark:text-slate-300">
                    <span className="text-slate-600 dark:text-slate-400">Certified Date:</span>
                    <span className="font-medium">{inspectedCell.qual.certified_date}</span>
                  </div>

                  <div className="flex justify-between text-slate-700 dark:text-slate-300">
                    <span className="text-slate-600 dark:text-slate-400">Valid Through:</span>
                    <span className={`font-bold ${
                      inspectedCell.qual.status === 'EXPIRED' ? 'text-rose-600' :
                      inspectedCell.qual.status === 'DUE_SOON' ? 'text-amber-600' : 'text-emerald-600'
                    }`}>
                      {inspectedCell.qual.expiration_date}
                    </span>
                  </div>

                  {inspectedCell.qual.evaluation_notes && (
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-3 text-slate-600 dark:text-slate-300 italic">
                      "{inspectedCell.qual.evaluation_notes}"
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  const empId = inspectedCell.employee.id;
                  const eqId = inspectedCell.equipment.id;
                  setInspectedCell(null);
                  onOpenSignoffModal(empId, eqId);
                }}
                className="min-h-[48px] px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <UserCheck className="w-5 h-5" />
                <span>{inspectedCell.qual ? 'Promote / Sign Off' : 'Endorse Operator'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const emp = inspectedCell.employee;
                  setInspectedCell(null);
                  onSelectEmployeeFile(emp);
                }}
                className="min-h-[48px] px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold text-base rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <FileText className="w-5 h-5" />
                <span>View Full File</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
