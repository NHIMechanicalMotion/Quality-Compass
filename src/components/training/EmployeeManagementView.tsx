import React, { useState, useMemo } from 'react';
import { 
  UserPlus, 
  Search, 
  Filter, 
  Archive, 
  RotateCcw, 
  Edit3, 
  FileText, 
  X, 
  CheckCircle2, 
  Mail,
  FileSpreadsheet
} from 'lucide-react';
import type { Employee, Department, EmployeeRole } from '../../types/training';
import { saveEmployee, archiveEmployee, restoreEmployee } from '../../services/trainingService';

interface EmployeeManagementViewProps {
  employees: Employee[];
  departments: Department[];
  currentUserName: string;
  onRefreshData: () => void;
  onSelectEmployeeFile: (emp: Employee) => void;
  onOpenRosterImport?: () => void;
}

export const EmployeeManagementView: React.FC<EmployeeManagementViewProps> = ({
  employees,
  departments,
  currentUserName,
  onRefreshData,
  onSelectEmployeeFile,
  onOpenRosterImport
}) => {
  const [selectedDeptId, setSelectedDeptId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showArchived, setShowArchived] = useState<boolean>(false);

  // Add / Edit Modal State
  const [editingEmployee, setEditingEmployee] = useState<Partial<Employee> | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  // Archive Reason Modal State
  const [archivingEmployee, setArchivingEmployee] = useState<Employee | null>(null);
  const [archiveReason, setArchiveReason] = useState<string>('Separation / Resignation');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      if (!showArchived && emp.status === 'ARCHIVED') return false;
      const matchesDept = selectedDeptId === 'ALL' || emp.department_id === selectedDeptId;
      const matchesSearch = !searchQuery || 
        `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employee_number.includes(searchQuery) ||
        (emp.email && emp.email.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesDept && matchesSearch;
    });
  }, [employees, selectedDeptId, searchQuery, showArchived]);

  // Open Edit or Add Modal
  const handleOpenAdd = () => {
    setEditingEmployee({
      employee_number: `${Math.floor(1000 + Math.random() * 9000)}`,
      first_name: '',
      last_name: '',
      email: '',
      department_id: departments[0]?.id || 'dept-cnc',
      role: 'OPERATOR',
      shift: 'Shift 1 (Day)',
      hire_date: new Date().toISOString().slice(0, 10),
      status: 'ACTIVE'
    });
    setIsEditModalOpen(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee({ ...emp });
    setIsEditModalOpen(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee || !editingEmployee.first_name || !editingEmployee.last_name) return;

    try {
      setIsSubmitting(true);
      await saveEmployee(editingEmployee, currentUserName);
      setIsSubmitting(false);
      setIsEditModalOpen(false);
      setEditingEmployee(null);
      setFeedback('Employee profile saved successfully.');
      setTimeout(() => setFeedback(null), 3000);
      onRefreshData();
    } catch (err: any) {
      setIsSubmitting(false);
      alert('Failed to save employee: ' + err?.message);
    }
  };

  // Archive flow
  const handleConfirmArchive = async () => {
    if (!archivingEmployee || !archiveReason.trim()) return;

    try {
      setIsSubmitting(true);
      await archiveEmployee(archivingEmployee.id, archiveReason, currentUserName);
      setIsSubmitting(false);
      setArchivingEmployee(null);
      setFeedback(`Archived ${archivingEmployee.first_name} ${archivingEmployee.last_name}`);
      setTimeout(() => setFeedback(null), 3000);
      onRefreshData();
    } catch (err: any) {
      setIsSubmitting(false);
      alert('Failed to archive: ' + err?.message);
    }
  };

  // Restore flow
  const handleRestore = async (emp: Employee) => {
    try {
      await restoreEmployee(emp.id, currentUserName);
      setFeedback(`Restored ${emp.first_name} ${emp.last_name} to active roster.`);
      setTimeout(() => setFeedback(null), 3000);
      onRefreshData();
    } catch (err: any) {
      alert('Failed to restore: ' + err?.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Controls Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-600 shrink-0" />
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="min-h-[48px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-base focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Show Archived Toggle */}
          <button
            type="button"
            onClick={() => setShowArchived(prev => !prev)}
            className={`min-h-[48px] px-4 rounded-xl border font-bold text-base flex items-center gap-2 transition-all ${
              showArchived
                ? 'bg-amber-100 border-amber-400 text-amber-900 dark:bg-amber-950 dark:text-amber-200'
                : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            <Archive className="w-5 h-5 text-amber-600" />
            <span>{showArchived ? 'Showing Archived' : 'Show Archived'}</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, badge..."
              className="w-full min-h-[48px] pl-11 pr-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {onOpenRosterImport && (
            <button
              type="button"
              onClick={onOpenRosterImport}
              className="min-h-[48px] px-4 rounded-xl border border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-300 font-bold text-base flex items-center gap-2 shadow-sm shrink-0 active:scale-95 cursor-pointer transition-colors"
            >
              <FileSpreadsheet className="w-5 h-5 text-amber-500" />
              <span>Import Roster CSV</span>
            </button>
          )}

          <button
            onClick={handleOpenAdd}
            className="min-h-[48px] px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base flex items-center gap-2 shadow-sm shrink-0 active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-5 h-5" />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center gap-3 text-base font-semibold">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Employees Table / Cards */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                <th className="p-4 font-bold text-base">Badge #</th>
                <th className="p-4 font-bold text-base">Full Name</th>
                <th className="p-4 font-bold text-base">Department</th>
                <th className="p-4 font-bold text-base">Role & Shift</th>
                <th className="p-4 font-bold text-base">Status</th>
                <th className="p-4 font-bold text-base text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-base text-slate-500">
                    No employees found matching the filters.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const isArchived = emp.status === 'ARCHIVED';
                  return (
                    <tr 
                      key={emp.id} 
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        isArchived ? 'opacity-70 bg-slate-50/50 dark:bg-slate-900/40' : ''
                      }`}
                    >
                      <td className="p-4 font-mono font-bold text-base text-blue-600 dark:text-blue-400">
                        #{emp.employee_number}
                      </td>

                      <td className="p-4">
                        <button
                          type="button"
                          onClick={() => onSelectEmployeeFile(emp)}
                          className="font-bold text-base text-slate-900 dark:text-white hover:text-blue-600 transition-colors flex items-center gap-1.5"
                        >
                          <span>{emp.first_name} {emp.last_name}</span>
                          <FileText className="w-4 h-4 text-slate-400" />
                        </button>
                        {emp.email && (
                          <div className="text-base text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                            <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[200px]">{emp.email}</span>
                          </div>
                        )}
                      </td>

                      <td className="p-4 text-base text-slate-800 dark:text-slate-200">
                        {emp.department_name || 'General Operations'}
                      </td>

                      <td className="p-4 text-base text-slate-800 dark:text-slate-200">
                        <div className="font-semibold">{emp.role}</div>
                        <div className="text-base text-slate-500">{emp.shift}</div>
                      </td>

                      <td className="p-4 text-base">
                        {isArchived ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-800">
                            <Archive className="w-4 h-4 text-amber-600" />
                            <span>Archived</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Active</span>
                          </span>
                        )}
                        {isArchived && emp.archive_reason && (
                          <div className="text-base text-slate-500 italic mt-1 max-w-[200px] truncate" title={emp.archive_reason}>
                            "{emp.archive_reason}"
                          </div>
                        )}
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => onSelectEmployeeFile(emp)}
                            className="min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-base flex items-center gap-1"
                            title="Open Single-Page Training File"
                          >
                            <FileText className="w-4 h-4 text-blue-500" />
                            <span className="hidden sm:inline">File</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(emp)}
                            className="min-h-[44px] min-w-[44px] rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center"
                            title="Edit Employee"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {isArchived ? (
                            <button
                              type="button"
                              onClick={() => handleRestore(emp)}
                              className="min-h-[44px] px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base flex items-center gap-1"
                              title="Restore Employee to Active"
                            >
                              <RotateCcw className="w-4 h-4" />
                              <span className="hidden sm:inline">Restore</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setArchivingEmployee(emp)}
                              className="min-h-[44px] min-w-[44px] rounded-lg border border-rose-300 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 flex items-center justify-center"
                              title="Archive Employee (Soft Delete)"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT EMPLOYEE MODAL */}
      {isEditModalOpen && editingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden max-h-[92vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {editingEmployee.id ? 'Edit Employee Profile' : 'Add New Operator'}
              </h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    First Name:
                  </label>
                  <input
                    type="text"
                    value={editingEmployee.first_name || ''}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, first_name: e.target.value })}
                    className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base"
                    required
                  />
                </div>

                <div>
                  <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Last Name:
                  </label>
                  <input
                    type="text"
                    value={editingEmployee.last_name || ''}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, last_name: e.target.value })}
                    className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Badge Number:
                  </label>
                  <input
                    type="text"
                    value={editingEmployee.employee_number || ''}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, employee_number: e.target.value })}
                    className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base"
                    required
                  />
                </div>

                <div>
                  <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Hire Date:
                  </label>
                  <input
                    type="date"
                    value={editingEmployee.hire_date || ''}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, hire_date: e.target.value })}
                    className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Department:
                </label>
                <select
                  value={editingEmployee.department_id || ''}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, department_id: e.target.value })}
                  className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base"
                  required
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Role:
                  </label>
                  <select
                    value={editingEmployee.role || 'OPERATOR'}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, role: e.target.value as EmployeeRole })}
                    className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base"
                  >
                    <option value="OPERATOR">OPERATOR</option>
                    <option value="LEAD">LEAD</option>
                    <option value="SUPERVISOR">SUPERVISOR</option>
                    <option value="QUALITY_TECH">QUALITY_TECH</option>
                    <option value="MANAGER">MANAGER</option>
                  </select>
                </div>

                <div>
                  <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Shift:
                  </label>
                  <select
                    value={editingEmployee.shift || 'Shift 1 (Day)'}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, shift: e.target.value })}
                    className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base"
                  >
                    <option value="Shift 1 (Day)">Shift 1 (Day)</option>
                    <option value="Shift 2 (Night)">Shift 2 (Night)</option>
                    <option value="Shift 3 (Weekend)">Shift 3 (Weekend)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Email Address:
                </label>
                <input
                  type="email"
                  value={editingEmployee.email || ''}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, email: e.target.value })}
                  placeholder="operator@nhimm.com"
                  className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full min-h-[48px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg flex items-center justify-center gap-2 shadow-md"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{isSubmitting ? 'Saving...' : 'Save Employee Profile'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ARCHIVE REASON MODAL (MANDATORY per brief) */}
      {archivingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div className="flex items-center gap-3 text-amber-600">
              <Archive className="w-6 h-6" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Archive Operator Record
              </h2>
            </div>

            <p className="text-base text-slate-700 dark:text-slate-300">
              Archiving <strong>{archivingEmployee.first_name} {archivingEmployee.last_name} (#{archivingEmployee.employee_number})</strong> will hide them from active skills matrices while preserving all historical training records for ISO 9001 compliance.
            </p>

            <div>
              <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-2">
                Mandatory Reason for Archival:
              </label>
              <select
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base"
              >
                <option value="Separation / Resignation">Separation / Resignation</option>
                <option value="Transferred to Terre Products">Transferred to Terre Products</option>
                <option value="Transferred to Mantis Conveyors">Transferred to Mantis Conveyors</option>
                <option value="Transferred to Makers Automation">Transferred to Makers Automation</option>
                <option value="Extended Leave of Absence">Extended Leave of Absence</option>
                <option value="Role Reassignment (Non-Machining)">Role Reassignment (Non-Machining)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setArchivingEmployee(null)}
                className="min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-base text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmArchive}
                disabled={isSubmitting}
                className="min-h-[48px] rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-base flex items-center justify-center gap-2 shadow-sm"
              >
                <Archive className="w-5 h-5" />
                <span>{isSubmitting ? 'Archiving...' : 'Confirm Archival'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
