import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  Filter, 
  Grid3X3, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Search,
  X,
  UserCheck
} from 'lucide-react';
import { 
  DEPARTMENTS, 
  type DepartmentName, 
  type OperatorRecord, 
  type MachineRecord,
  type OperatorSkill
} from '../../data/mockTrainingData';
import { StatusBadge } from './StatusBadge';

interface SkillsMatrixViewProps {
  operators: OperatorRecord[];
  machines: MachineRecord[];
  onBackToHome: () => void;
  onSelectOperatorForSignoff?: (operatorId: string) => void;
}

export const SkillsMatrixView: React.FC<SkillsMatrixViewProps> = ({
  operators,
  machines,
  onBackToHome,
  onSelectOperatorForSignoff,
}) => {
  // Department filter state
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentName>('CNC Machining');
  
  // Status filter quick toggle: 'ALL' | 'DUE_SOON' | 'EXPIRED'
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DUE_SOON' | 'EXPIRED'>('ALL');

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Cell inspection popover/modal state
  const [inspectedCell, setInspectedCell] = useState<{
    operator: OperatorRecord;
    machine: MachineRecord;
    skill: OperatorSkill;
  } | null>(null);

  // Filter machines by department (if not ALL)
  const filteredMachines = useMemo(() => {
    if (selectedDepartment === 'All Departments') return machines;
    return machines.filter((m) => m.department === selectedDepartment);
  }, [machines, selectedDepartment]);

  // Filter operators by department and search
  const filteredOperators = useMemo(() => {
    return operators.filter((op) => {
      const matchesDept =
        selectedDepartment === 'All Departments' || op.department === selectedDepartment;
      const matchesSearch =
        !searchQuery ||
        op.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        op.badgeNumber.includes(searchQuery);

      if (!matchesDept || !matchesSearch) return false;

      // Status quick filter
      if (statusFilter === 'DUE_SOON') {
        return Object.values(op.skills).some((s) => s.status === 'DUE_SOON');
      }
      if (statusFilter === 'EXPIRED') {
        return Object.values(op.skills).some((s) => s.status === 'EXPIRED');
      }

      return true;
    });
  }, [operators, selectedDepartment, searchQuery, statusFilter]);

  // Enterprise totals calculation
  const totalStats = useMemo(() => {
    let dueSoonCount = 0;
    let expiredCount = 0;
    let qualifiedCount = 0;

    operators.forEach((op) => {
      Object.values(op.skills).forEach((s) => {
        if (s.status === 'DUE_SOON') dueSoonCount++;
        if (s.status === 'EXPIRED') expiredCount++;
        if (s.status === 'QUALIFIED') qualifiedCount++;
      });
    });

    return { dueSoonCount, expiredCount, qualifiedCount };
  }, [operators]);

  return (
    <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 space-y-6">
      {/* Top Header / Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBackToHome}
          className="min-h-[48px] px-5 py-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border-2 border-slate-600 text-white font-semibold text-base rounded-xl flex items-center gap-2.5 transition-colors w-fit focus:outline-none focus:ring-4 focus:ring-slate-500/50"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Home</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-base font-medium">
            Task C: Supervisor & Manager Matrix View
          </span>
        </div>
      </div>

      {/* Title & Description */}
      <div className="bg-slate-900 border-2 border-purple-500/50 rounded-2xl p-6 shadow-xl space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-400 flex items-center justify-center shrink-0">
            <Grid3X3 className="w-7 h-7 text-purple-300" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Operator Skills & Qualification Matrix
            </h1>
            <p className="text-slate-300 text-base mt-0.5">
              Review qualifications across shop machines. Filter by department to spot who is expired or due soon.
            </p>
          </div>
        </div>
      </div>

      {/* QUICK ATTENTION KPI CARDS / QUICK FILTERS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Total in View */}
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`min-h-[48px] p-4 rounded-2xl border-2 text-left transition-all ${
            statusFilter === 'ALL'
              ? 'bg-slate-800 border-purple-400 shadow-md ring-2 ring-purple-400/40'
              : 'bg-slate-900 border-slate-700 hover:border-slate-500'
          }`}
        >
          <span className="block text-slate-400 text-base font-medium">
            Operators Shown
          </span>
          <span className="block text-2xl sm:text-3xl font-bold text-white mt-1">
            {filteredOperators.length}
          </span>
          <span className="text-slate-400 text-base mt-1 block">
            {selectedDepartment}
          </span>
        </button>

        {/* Fully Qualified */}
        <div className="min-h-[48px] p-4 rounded-2xl border-2 border-emerald-500/60 bg-emerald-950/40 text-left">
          <span className="flex items-center gap-1.5 text-emerald-300 text-base font-medium">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            Qualified Ratings
          </span>
          <span className="block text-2xl sm:text-3xl font-bold text-emerald-200 mt-1">
            {totalStats.qualifiedCount}
          </span>
          <span className="text-emerald-300 text-base mt-1 block">
            Current & active
          </span>
        </div>

        {/* Due Soon Filter Card (Amber Clock) */}
        <button
          onClick={() => setStatusFilter(statusFilter === 'DUE_SOON' ? 'ALL' : 'DUE_SOON')}
          className={`min-h-[48px] p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
            statusFilter === 'DUE_SOON'
              ? 'bg-amber-950 border-amber-400 shadow-lg ring-4 ring-amber-400/50'
              : 'bg-amber-950/40 border-amber-500/70 hover:border-amber-400'
          }`}
        >
          <span className="flex items-center gap-1.5 text-amber-300 text-base font-bold">
            <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
            Due Soon (&lt; 30 Days)
          </span>
          <span className="block text-2xl sm:text-3xl font-bold text-amber-300 mt-1">
            {totalStats.dueSoonCount}
          </span>
          <span className="text-amber-200 text-base mt-1 block font-medium underline">
            {statusFilter === 'DUE_SOON' ? 'Click to show all' : 'Click to filter list'}
          </span>
        </button>

        {/* Expired Filter Card (Red Alert) */}
        <button
          onClick={() => setStatusFilter(statusFilter === 'EXPIRED' ? 'ALL' : 'EXPIRED')}
          className={`min-h-[48px] p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
            statusFilter === 'EXPIRED'
              ? 'bg-rose-950 border-rose-400 shadow-lg ring-4 ring-rose-400/50'
              : 'bg-rose-950/40 border-rose-500/70 hover:border-rose-400'
          }`}
        >
          <span className="flex items-center gap-1.5 text-rose-300 text-base font-bold">
            <AlertTriangle className="w-5 h-5 text-rose-400 animate-bounce" />
            Expired / Overdue
          </span>
          <span className="block text-2xl sm:text-3xl font-bold text-rose-300 mt-1">
            {totalStats.expiredCount}
          </span>
          <span className="text-rose-200 text-base mt-1 block font-medium underline">
            {statusFilter === 'EXPIRED' ? 'Click to show all' : 'Click to filter list'}
          </span>
        </button>
      </div>

      {/* DEPARTMENT FILTER PILLS & SEARCH (Strictly >=48px Buttons, >=16px text) */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <label className="text-white text-lg font-bold flex items-center gap-2">
            <Filter className="w-5 h-5 text-purple-400" />
            <span>Filter by Department:</span>
          </label>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Operator Quick Search */}
            <div className="relative min-w-[240px]">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search operator..."
                className="w-full min-h-[48px] pl-10 pr-3.5 py-2.5 bg-slate-900 border-2 border-slate-700 focus:border-purple-400 rounded-xl text-white text-base placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400/30"
              />
            </div>

            {statusFilter !== 'ALL' && (
              <button
                onClick={() => setStatusFilter('ALL')}
                className="min-h-[48px] px-4 py-2.5 bg-slate-800 text-slate-200 border border-slate-600 rounded-xl text-base flex items-center gap-2 hover:bg-slate-700"
              >
                <span>Showing: {statusFilter === 'DUE_SOON' ? 'Due Soon Only' : 'Expired Only'}</span>
                <X className="w-5 h-5 text-rose-400" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
          {DEPARTMENTS.map((dept) => {
            const isSelected = selectedDepartment === dept;
            return (
              <button
                key={dept}
                onClick={() => setSelectedDepartment(dept)}
                className={`min-h-[48px] px-6 py-3 rounded-xl font-bold text-base whitespace-nowrap transition-all border-2 focus:outline-none focus:ring-4 focus:ring-purple-400/40 ${
                  isSelected
                    ? 'bg-purple-600 border-purple-300 text-white shadow-lg'
                    : 'bg-slate-900 border-slate-700 hover:border-slate-500 text-slate-300'
                }`}
              >
                {dept}
              </button>
            );
          })}
        </div>
      </div>

      {/* MATRIX TABLE / GRID VIEW */}
      <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-950 border-b-2 border-slate-700">
                <th className="p-4 sm:p-5 text-white text-lg font-bold sticky left-0 bg-slate-950 z-20 min-w-[220px]">
                  Operator & Role
                </th>
                {filteredMachines.map((machine) => (
                  <th
                    key={machine.id}
                    className="p-4 sm:p-5 text-slate-200 text-base font-bold border-l border-slate-800 min-w-[190px]"
                  >
                    <div className="space-y-0.5">
                      <span className="block text-white font-bold">{machine.name}</span>
                      <span className="block text-slate-400 font-mono text-base">{machine.code}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-base">
              {filteredOperators.length === 0 ? (
                <tr>
                  <td
                    colSpan={filteredMachines.length + 1}
                    className="p-8 text-center text-slate-400 text-lg"
                  >
                    No operators match the current filter.
                  </td>
                </tr>
              ) : (
                filteredOperators.map((operator) => (
                  <tr
                    key={operator.id}
                    className="hover:bg-slate-800/60 transition-colors"
                  >
                    {/* Sticky Operator Column */}
                    <td className="p-4 sm:p-5 sticky left-0 bg-slate-900 hover:bg-slate-800 z-10 border-r border-slate-800 shadow-md">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-bold text-slate-200">
                            {operator.avatarInitials}
                          </span>
                          <span className="text-white font-bold text-lg">
                            {operator.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-400 text-base">
                          <span>#{operator.badgeNumber}</span>
                          <span>&bull;</span>
                          <span>{operator.shift}</span>
                        </div>
                      </div>
                    </td>

                    {/* Machine Qualification Cells */}
                    {filteredMachines.map((machine) => {
                      const skill = operator.skills[machine.id];
                      const isExpired = skill?.status === 'EXPIRED';
                      const isDueSoon = skill?.status === 'DUE_SOON';

                      return (
                        <td
                          key={machine.id}
                          className={`p-3.5 border-l border-slate-800 align-middle ${
                            isExpired
                              ? 'bg-rose-950/30'
                              : isDueSoon
                              ? 'bg-amber-950/20'
                              : ''
                          }`}
                        >
                          <button
                            onClick={() => {
                              if (skill) {
                                setInspectedCell({
                                  operator,
                                  machine,
                                  skill,
                                });
                              }
                            }}
                            className={`w-full min-h-[48px] p-2.5 rounded-xl border text-left transition-all flex flex-col justify-center gap-1 focus:outline-none focus:ring-2 focus:ring-purple-400 ${
                              isExpired
                                ? 'border-rose-500 bg-rose-950/80 shadow-md hover:bg-rose-900'
                                : isDueSoon
                                ? 'border-amber-500 bg-amber-950/80 shadow-sm hover:bg-amber-900'
                                : skill?.level > 0
                                ? 'border-emerald-600/70 bg-emerald-950/40 hover:bg-emerald-950/70'
                                : 'border-slate-800 bg-slate-950/50 hover:bg-slate-800/40'
                            }`}
                          >
                            <StatusBadge
                              status={skill ? skill.status : 'NOT_TRAINED'}
                              customText={
                                skill
                                  ? isExpired
                                    ? 'Expired (Overdue)'
                                    : isDueSoon
                                    ? 'Due Soon'
                                    : skill.levelLabel
                                  : 'Not Trained'
                              }
                            />
                            {skill && skill.expirationDate !== '-' && (
                              <span
                                className={`text-base font-mono block pl-1 ${
                                  isExpired
                                    ? 'text-rose-300 font-bold'
                                    : isDueSoon
                                    ? 'text-amber-300 font-bold'
                                    : 'text-slate-400'
                                }`}
                              >
                                {isExpired ? 'Expired 14d' : isDueSoon ? 'Due Soon' : skill.expirationDate}
                              </span>
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
      </div>

      {/* LEGEND STRIP (Tri-Attribute: Color + Word + Icon) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
        <span className="text-white font-bold text-base block">
          Qualification & Expiration Legend:
        </span>
        <div className="flex items-center gap-4 flex-wrap text-base">
          <StatusBadge status="QUALIFIED" customText="Qualified (Level 2 or 3)" />
          <StatusBadge status="DUE_SOON" customText="Due Soon (<30 Days)" />
          <StatusBadge status="EXPIRED" customText="Expired (Overdue)" />
          <StatusBadge status="IN_TRAINING" customText="In Training (Level 1)" />
          <StatusBadge status="NOT_TRAINED" customText="Not Trained" />
        </div>
      </div>

      {/* INSPECTED CELL DETAIL MODAL */}
      {inspectedCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border-2 border-purple-500 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Certification Details
                </h2>
                <p className="text-slate-400 text-base">
                  {inspectedCell.operator.name} &bull; {inspectedCell.machine.name}
                </p>
              </div>

              <button
                onClick={() => setInspectedCell(null)}
                className="min-h-[48px] min-w-[48px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center focus:outline-none"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-3 bg-slate-950 p-5 rounded-2xl border border-slate-800 text-base">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Current Status:</span>
                <StatusBadge status={inspectedCell.skill.status} customText={inspectedCell.skill.levelLabel} />
              </div>

              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Department:</span>
                <span className="font-bold text-white">{inspectedCell.machine.department}</span>
              </div>

              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Certified By:</span>
                <span className="font-bold text-white">{inspectedCell.skill.certifiedBy}</span>
              </div>

              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Last Certified:</span>
                <span className="font-medium text-slate-200">{inspectedCell.skill.lastCertifiedDate}</span>
              </div>

              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Valid Through:</span>
                <span
                  className={`font-bold ${
                    inspectedCell.skill.status === 'EXPIRED'
                      ? 'text-rose-400'
                      : inspectedCell.skill.status === 'DUE_SOON'
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {inspectedCell.skill.expirationDate}
                </span>
              </div>

              {inspectedCell.skill.notes && (
                <div className="border-t border-slate-800 pt-3 text-slate-300 italic">
                  "{inspectedCell.skill.notes}"
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {onSelectOperatorForSignoff && (
                <button
                  onClick={() => {
                    const opId = inspectedCell.operator.id;
                    setInspectedCell(null);
                    onSelectOperatorForSignoff(opId);
                  }}
                  className="min-h-[48px] px-5 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <UserCheck className="w-5 h-5" />
                  <span>Sign Off Worker</span>
                </button>
              )}
              <button
                onClick={() => setInspectedCell(null)}
                className="min-h-[48px] px-5 py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-base rounded-xl transition-colors"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
