import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
  Save,
  Download,
  Filter,
  CheckSquare,
  Search,
  AlertCircle,
} from 'lucide-react';
import type {
  ApqpProject,
  ApqpChecklistItem,
  ChecklistStatus,
  ApqpTab,
} from '../../types/apqpPpap';
import { updateApqpProjectChecklist } from '../../services/apqpPpapSupabase';
import { DEFAULT_APQP_CHECKLIST } from '../../utils/defaultApqpChecklist';
import { ActionTooltip } from '../common/ActionTooltip';

interface Props {
  project: ApqpProject;
  onProjectUpdated: (updated: ApqpProject) => void;
  onNavigateToTab: (tab: ApqpTab) => void;
}

export const ApqpMasterChecklist: React.FC<Props> = ({
  project,
  onProjectUpdated,
  onNavigateToTab,
}) => {
  const [items, setItems] = useState<ApqpChecklistItem[]>(
    project.checklist_data && project.checklist_data.length > 0
      ? project.checklist_data
      : DEFAULT_APQP_CHECKLIST
  );
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<number | 'ALL'>('ALL');
  const [onlyGatePrereqs, setOnlyGatePrereqs] = useState(false);
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Synchronize items when active project changes
  useEffect(() => {
    if (project.checklist_data && project.checklist_data.length > 0) {
      setItems(project.checklist_data);
    } else {
      setItems(DEFAULT_APQP_CHECKLIST);
    }
    setIsDirty(false);
  }, [project.id, project.checklist_data]);

  // Status counters
  const totalCount = items.length;
  const completedCount = items.filter((i) => i.status === 'COMPLETED' || i.status === 'NOT_APPLICABLE').length;
  const inProgressCount = items.filter((i) => i.status === 'IN_PROGRESS').length;
  const blockedCount = items.filter((i) => i.status === 'BLOCKED').length;
  const overallPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Gate prerequisite counters
  const gateItems = items.filter((i) => i.is_gate_prerequisite);
  const gateCompletedCount = gateItems.filter((i) => i.status === 'COMPLETED').length;
  const gatePct = gateItems.length > 0 ? Math.round((gateCompletedCount / gateItems.length) * 100) : 0;

  // Filtering
  const filteredItems = items.filter((item) => {
    if (selectedPhaseFilter !== 'ALL' && item.phase !== selectedPhaseFilter) return false;
    if (onlyGatePrereqs && !item.is_gate_prerequisite) return false;
    if (onlyIncomplete && (item.status === 'COMPLETED' || item.status === 'NOT_APPLICABLE')) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.item_no.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.aiag_ref.toLowerCase().includes(q) ||
        item.assigned_to.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleUpdateItem = (id: string, updates: Partial<ApqpChecklistItem>) => {
    const updated = items.map((it) => {
      if (it.id === id) {
        const next = { ...it, ...updates };
        if (updates.status === 'COMPLETED' && !next.completion_date) {
          next.completion_date = new Date().toISOString().split('T')[0];
          if (!next.verified_by) next.verified_by = project.lead_engineer || 'Quality Lead';
        } else if (updates.status && updates.status !== 'COMPLETED') {
          next.completion_date = null;
        }
        return next;
      }
      return it;
    });
    setItems(updated);
    setIsDirty(true);
  };

  const handleSaveToSupabase = async () => {
    try {
      setIsSaving(true);
      await updateApqpProjectChecklist(project.id, items);
      onProjectUpdated({
        ...project,
        checklist_data: items,
      });
      setIsDirty(false);
      setSaveSuccessMessage(true);
      setTimeout(() => setSaveSuccessMessage(false), 3000);
    } catch (err) {
      console.error('Failed to save checklist:', err);
      alert('Error saving checklist to Supabase');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'Item No',
      'Phase',
      'Deliverable Title',
      'AIAG Standard Reference',
      'Gate Prerequisite',
      'Status',
      'Assigned Owner',
      'Target Date',
      'Completion Date',
      'Verified By',
      'Notes',
    ];

    const rows = items.map((it) => [
      `"${it.item_no}"`,
      `"Phase ${it.phase}"`,
      `"${it.title.replace(/"/g, '""')}"`,
      `"${it.aiag_ref.replace(/"/g, '""')}"`,
      `"${it.is_gate_prerequisite ? 'YES' : 'NO'}"`,
      `"${it.status}"`,
      `"${it.assigned_to.replace(/"/g, '""')}"`,
      `"${it.target_date || ''}"`,
      `"${it.completion_date || ''}"`,
      `"${it.verified_by || ''}"`,
      `"${(it.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${project.project_code}_APQP_Master_Checklist.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Gauges */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                AIAG APQP 3rd Edition
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                PPAP 4th Edition
              </span>
            </div>
            <h2 className="text-lg font-bold text-white mt-1">
              Overall APQP Program Launch Checklist — {project.project_name}
            </h2>
            <p className="text-xs text-slate-400">
              Customer: <strong className="text-slate-200">{project.customer_name}</strong> | Part: <strong className="text-cyan-300 font-mono">{project.part_number} ({project.part_revision})</strong> | Current Phase: <strong className="text-blue-400 font-bold">Phase {project.current_phase}</strong>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {isDirty && (
              <span className="flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg font-semibold animate-pulse">
                <AlertCircle className="w-3.5 h-3.5" />
                Unsaved Changes
              </span>
            )}

            <ActionTooltip
              title="Export Full APQP Checklist"
              description="Downloads a CSV spreadsheet containing all 36 AIAG deliverables, owners, dates, and completion statuses."
              position="bottom"
              badge="Export"
            >
              <button
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                aria-label="Export Full APQP Checklist to CSV"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Export CSV</span>
              </button>
            </ActionTooltip>

            <ActionTooltip
              title="Save APQP Deliverables"
              description="Persists all deliverable assignments, target dates, and gate status changes to Supabase cloud database."
              position="bottom"
              badge="Save"
            >
              <button
                onClick={handleSaveToSupabase}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20 transition-all active:scale-95"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save Checklist'}</span>
              </button>
            </ActionTooltip>
          </div>
        </div>

        {saveSuccessMessage && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Checklist updates saved successfully to Supabase!</span>
          </div>
        )}

        {/* 4 Summary Scorecards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {/* Card 1: Overall Readiness */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Overall Readiness</span>
              <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono text-white">{overallPct}%</span>
              <span className="text-[11px] text-slate-400">({completedCount}/{totalCount} tasks)</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${overallPct}%` }} />
            </div>
          </div>

          {/* Card 2: Gate Prerequisites */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Gate Milestones</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono text-emerald-400">{gatePct}%</span>
              <span className="text-[11px] text-slate-400">({gateCompletedCount}/{gateItems.length} gates)</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${gatePct}%` }} />
            </div>
          </div>

          {/* Card 3: In Progress Tasks */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Active in Progress</span>
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono text-cyan-400">{inProgressCount}</span>
              <span className="text-[11px] text-slate-400">deliverables</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">Active engineering work</p>
          </div>

          {/* Card 4: Blocked / At Risk */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Blocked / Action Needed</span>
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-xl font-bold font-mono ${blockedCount > 0 ? 'text-red-400' : 'text-slate-200'}`}>
                {blockedCount}
              </span>
              <span className="text-[11px] text-slate-400">issues</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">Critical path bottlenecks</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
        {/* Phase filter pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-slate-400 font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-500" /> Phase:
          </span>
          {(['ALL', 1, 2, 3, 4, 5] as const).map((ph) => (
            <button
              key={ph}
              onClick={() => setSelectedPhaseFilter(ph)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                selectedPhaseFilter === ph
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {ph === 'ALL' ? 'All Phases (36)' : `P${ph}`}
            </button>
          ))}
        </div>

        {/* Checkbox filters & Search */}
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyGatePrereqs}
              onChange={(e) => setOnlyGatePrereqs(e.target.checked)}
              className="rounded bg-slate-950 border-slate-700 text-blue-500 focus:ring-0 focus:ring-offset-0"
            />
            <span>Gate Prerequisites Only</span>
          </label>

          <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyIncomplete}
              onChange={(e) => setOnlyIncomplete(e.target.checked)}
              className="rounded bg-slate-950 border-slate-700 text-blue-500 focus:ring-0 focus:ring-offset-0"
            />
            <span>Incomplete Only</span>
          </label>

          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search deliverables..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-48"
            />
          </div>
        </div>
      </div>

      {/* Granular Checklist Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3 w-16 text-center">Item</th>
                <th className="py-3 px-2 w-14 text-center">Phase</th>
                <th className="py-3 px-3 min-w-[240px]">Deliverable & Standard</th>
                <th className="py-3 px-3 w-36">Status</th>
                <th className="py-3 px-3 w-40">Assigned Lead</th>
                <th className="py-3 px-3 w-32">Target Due</th>
                <th className="py-3 px-3 w-32 text-center">In-App Tool</th>
                <th className="py-3 px-3 min-w-[200px]">Verification / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredItems.map((item) => {
                const isCompleted = item.status === 'COMPLETED';
                const isInProgress = item.status === 'IN_PROGRESS';
                const isBlocked = item.status === 'BLOCKED';

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      isCompleted ? 'bg-slate-900/30' : isBlocked ? 'bg-red-950/10' : ''
                    }`}
                  >
                    {/* Item No */}
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-400">
                      {item.item_no}
                    </td>

                    {/* Phase Badge */}
                    <td className="py-2.5 px-2 text-center">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        P{item.phase}
                      </span>
                    </td>

                    {/* Deliverable Title & AIAG Standard */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-start gap-2">
                        {item.is_gate_prerequisite && (
                          <span
                            title="Mandatory Gate Milestone Prerequisite"
                            className="shrink-0 mt-0.5"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                          </span>
                        )}
                        <div>
                          <p className="font-semibold text-slate-200 leading-snug">{item.title}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{item.aiag_ref}</p>
                        </div>
                      </div>
                    </td>

                    {/* Status Dropdown */}
                    <td className="py-2.5 px-3">
                      <select
                        value={item.status}
                        onChange={(e) =>
                          handleUpdateItem(item.id, { status: e.target.value as ChecklistStatus })
                        }
                        className={`w-full py-1 px-2 rounded-lg text-xs font-bold border focus:outline-none transition-colors ${
                          isCompleted
                            ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60'
                            : isInProgress
                            ? 'bg-cyan-950/40 text-cyan-400 border-cyan-800/60'
                            : isBlocked
                            ? 'bg-red-950/40 text-red-400 border-red-800/60'
                            : item.status === 'NOT_APPLICABLE'
                            ? 'bg-slate-800 text-slate-400 border-slate-700'
                            : 'bg-slate-950 text-slate-400 border-slate-800'
                        }`}
                      >
                        <option value="NOT_STARTED">Not Started</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="BLOCKED">Blocked</option>
                        <option value="NOT_APPLICABLE">N/A</option>
                      </select>
                    </td>

                    {/* Assigned Owner */}
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={item.assigned_to}
                        onChange={(e) => handleUpdateItem(item.id, { assigned_to: e.target.value })}
                        placeholder="Assign lead..."
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 text-xs focus:outline-none focus:border-blue-500 truncate"
                      />
                    </td>

                    {/* Target Date */}
                    <td className="py-2.5 px-3">
                      <input
                        type="date"
                        value={item.target_date}
                        onChange={(e) => handleUpdateItem(item.id, { target_date: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-slate-300 font-mono text-[11px] focus:outline-none focus:border-blue-500"
                      />
                    </td>

                    {/* In-App Tool Jump Button */}
                    <td className="py-2.5 px-3 text-center">
                      {item.linked_tab ? (
                        <ActionTooltip
                          title={`Open ${item.linked_tab.replace('_', ' ')}`}
                          description="Jumps directly to this workspace module to work on or review this deliverable."
                          position="left"
                          badge="Module"
                        >
                          <button
                            onClick={() => onNavigateToTab(item.linked_tab!)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[11px] font-semibold transition-colors"
                          >
                            <span>Open</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </ActionTooltip>
                      ) : (
                        <span className="text-slate-600 text-[11px] font-mono">—</span>
                      )}
                    </td>

                    {/* Notes / Verification */}
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={item.notes}
                        onChange={(e) => handleUpdateItem(item.id, { notes: e.target.value })}
                        placeholder="Add sign-off notes or audit cert info..."
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-400 text-xs focus:outline-none focus:border-blue-500 truncate"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
