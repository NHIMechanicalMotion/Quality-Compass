import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Archive, 
  Edit3, 
  FileText, 
  ExternalLink, 
  X, 
  CheckCircle2, 
  UserCheck
} from 'lucide-react';
import type { Equipment, Department } from '../../types/training';
import { saveEquipment, archiveEquipment } from '../../services/trainingService';

interface EquipmentManagementViewProps {
  equipment: Equipment[];
  departments: Department[];
  currentUserName: string;
  onRefreshData: () => void;
  onOpenSignoffModal: (empId?: string, eqId?: string) => void;
}

export const EquipmentManagementView: React.FC<EquipmentManagementViewProps> = ({
  equipment,
  departments,
  currentUserName,
  onRefreshData,
  onOpenSignoffModal
}) => {
  const [selectedDeptId, setSelectedDeptId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showArchived, setShowArchived] = useState<boolean>(false);

  // Add / Edit Modal State
  const [editingEquipment, setEditingEquipment] = useState<Partial<Equipment> | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  // Archive Modal State
  const [archivingEquipment, setArchivingEquipment] = useState<Equipment | null>(null);
  const [archiveReason, setArchiveReason] = useState<string>('Decommissioned / Replaced');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Filtered Equipment
  const filteredEquipment = useMemo(() => {
    return equipment.filter(eq => {
      if (!showArchived && eq.status === 'ARCHIVED') return false;
      const matchesDept = selectedDeptId === 'ALL' || eq.department_id === selectedDeptId;
      const matchesSearch = !searchQuery ||
        eq.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        eq.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        eq.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (eq.model && eq.model.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesDept && matchesSearch;
    });
  }, [equipment, selectedDeptId, searchQuery, showArchived]);

  const handleOpenAdd = () => {
    setEditingEquipment({
      code: `MC-${Math.floor(100 + Math.random() * 900)}`,
      name: '',
      department_id: departments[0]?.id || 'dept-cnc',
      location: 'Machining Bay 1',
      model: '',
      serial_number: '',
      sop_document_url: '',
      status: 'ACTIVE'
    });
    setIsEditModalOpen(true);
  };

  const handleOpenEdit = (eq: Equipment) => {
    setEditingEquipment({ ...eq });
    setIsEditModalOpen(true);
  };

  const handleSaveEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEquipment || !editingEquipment.name || !editingEquipment.code) return;

    try {
      setIsSubmitting(true);
      await saveEquipment(editingEquipment, currentUserName);
      setIsSubmitting(false);
      setIsEditModalOpen(false);
      setEditingEquipment(null);
      setFeedback('Work center saved successfully.');
      setTimeout(() => setFeedback(null), 3000);
      onRefreshData();
    } catch (err: any) {
      setIsSubmitting(false);
      alert('Failed to save equipment: ' + err?.message);
    }
  };

  const handleConfirmArchive = async () => {
    if (!archivingEquipment || !archiveReason.trim()) return;

    try {
      setIsSubmitting(true);
      await archiveEquipment(archivingEquipment.id, archiveReason, currentUserName);
      setIsSubmitting(false);
      setArchivingEquipment(null);
      setFeedback(`Archived machine ${archivingEquipment.name}`);
      setTimeout(() => setFeedback(null), 3000);
      onRefreshData();
    } catch (err: any) {
      setIsSubmitting(false);
      alert('Failed to archive: ' + err?.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Controls Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-indigo-600 shrink-0" />
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="min-h-[48px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-base focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

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
              placeholder="Search work center..."
              className="w-full min-h-[48px] pl-11 pr-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <button
            onClick={handleOpenAdd}
            className="min-h-[48px] px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base flex items-center gap-2 shadow-sm shrink-0 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span>Add Work Center</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center gap-3 text-base font-semibold">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Equipment Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEquipment.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-base text-slate-500">
            No equipment found matching criteria.
          </div>
        ) : (
          filteredEquipment.map((eq) => {
            const isArchived = eq.status === 'ARCHIVED';
            return (
              <div
                key={eq.id}
                className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-all ${
                  isArchived ? 'opacity-70 bg-slate-50/50 dark:bg-slate-900/40' : 'hover:border-indigo-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono font-extrabold text-lg text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg">
                      {eq.code}
                    </span>
                    {isArchived ? (
                      <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 text-base font-bold">
                        Archived
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 text-base font-bold">
                        Active
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-lg text-slate-900 dark:text-white mt-2.5">
                    {eq.name}
                  </h3>

                  <div className="mt-2 space-y-1 text-base text-slate-600 dark:text-slate-400">
                    <div>Department: <strong className="text-slate-900 dark:text-slate-200">{eq.department_name}</strong></div>
                    <div>Location: {eq.location}</div>
                    {eq.model && <div>Model: {eq.model} {eq.serial_number ? `(S/N: ${eq.serial_number})` : ''}</div>}
                  </div>

                  {/* Qualified Operators & Trainees Tally */}
                  <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-around text-base">
                    <div className="text-center">
                      <div className="font-extrabold text-xl text-emerald-600 dark:text-emerald-400">
                        {eq.qualified_operator_count || 0}
                      </div>
                      <div className="text-slate-600 dark:text-slate-400 text-base">Qualified (L2+)</div>
                    </div>
                    <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
                    <div className="text-center">
                      <div className="font-extrabold text-xl text-sky-600 dark:text-sky-400">
                        {eq.trainee_count || 0}
                      </div>
                      <div className="text-slate-600 dark:text-slate-400 text-base">Trainees (L1)</div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                  {eq.sop_document_url ? (
                    <a
                      href={eq.sop_document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[44px] px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-base flex items-center gap-1.5"
                    >
                      <FileText className="w-4 h-4 text-blue-500" />
                      <span>SOP Work Guide</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                    </a>
                  ) : (
                    <span className="text-base text-slate-400 italic">No SOP linked</span>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(eq)}
                      className="min-h-[44px] min-w-[44px] rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center"
                      title="Edit Machine Details"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenSignoffModal(undefined, eq.id)}
                      className="min-h-[44px] px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base flex items-center gap-1.5 shadow-sm"
                      title="Sign off an operator for this machine"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Sign Off</span>
                    </button>

                    {!isArchived && (
                      <button
                        type="button"
                        onClick={() => setArchivingEquipment(eq)}
                        className="min-h-[44px] min-w-[44px] rounded-xl border border-rose-300 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 flex items-center justify-center"
                        title="Archive Machine"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ADD / EDIT EQUIPMENT MODAL */}
      {isEditModalOpen && editingEquipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden max-h-[92vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {editingEquipment.id ? 'Edit Work Center' : 'Add New Work Center'}
              </h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSaveEquipment} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Machine Code:
                  </label>
                  <input
                    type="text"
                    value={editingEquipment.code || ''}
                    onChange={(e) => setEditingEquipment({ ...editingEquipment, code: e.target.value })}
                    className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base"
                    required
                  />
                </div>

                <div>
                  <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Department:
                  </label>
                  <select
                    value={editingEquipment.department_id || ''}
                    onChange={(e) => setEditingEquipment({ ...editingEquipment, department_id: e.target.value })}
                    className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base"
                    required
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Machine / Asset Name:
                </label>
                <input
                  type="text"
                  value={editingEquipment.name || ''}
                  onChange={(e) => setEditingEquipment({ ...editingEquipment, name: e.target.value })}
                  placeholder="e.g. Haas VF-4 Vertical Machining Center"
                  className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base"
                  required
                />
              </div>

              <div>
                <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Physical Bay Location:
                </label>
                <input
                  type="text"
                  value={editingEquipment.location || ''}
                  onChange={(e) => setEditingEquipment({ ...editingEquipment, location: e.target.value })}
                  placeholder="e.g. Building A - Cell 2"
                  className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Model:
                  </label>
                  <input
                    type="text"
                    value={editingEquipment.model || ''}
                    onChange={(e) => setEditingEquipment({ ...editingEquipment, model: e.target.value })}
                    className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base"
                  />
                </div>

                <div>
                  <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Serial Number:
                  </label>
                  <input
                    type="text"
                    value={editingEquipment.serial_number || ''}
                    onChange={(e) => setEditingEquipment({ ...editingEquipment, serial_number: e.target.value })}
                    className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base"
                  />
                </div>
              </div>

              <div>
                <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Standard Work Instruction / SOP Link:
                </label>
                <input
                  type="text"
                  value={editingEquipment.sop_document_url || ''}
                  onChange={(e) => setEditingEquipment({ ...editingEquipment, sop_document_url: e.target.value })}
                  placeholder="https://... or /templates/sop.pdf"
                  className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full min-h-[48px] rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg flex items-center justify-center gap-2 shadow-md"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{isSubmitting ? 'Saving...' : 'Save Work Center'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ARCHIVE CONFIRMATION MODAL */}
      {archivingEquipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div className="flex items-center gap-3 text-amber-600">
              <Archive className="w-6 h-6" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Archive Work Center
              </h2>
            </div>

            <p className="text-base text-slate-700 dark:text-slate-300">
              Archiving <strong>[{archivingEquipment.code}] {archivingEquipment.name}</strong> will remove it from active skills matrix columns while preserving historical operator qualification records.
            </p>

            <div>
              <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-2">
                Reason for Archival:
              </label>
              <select
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base"
              >
                <option value="Decommissioned / Replaced">Decommissioned / Replaced</option>
                <option value="Transferred to Terre Facility">Transferred to Terre Facility</option>
                <option value="Transferred to Mantis Facility">Transferred to Mantis Facility</option>
                <option value="Temporarily Out of Service">Temporarily Out of Service</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setArchivingEquipment(null)}
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
