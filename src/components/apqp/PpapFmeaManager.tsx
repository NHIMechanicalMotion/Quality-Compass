import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  CornerDownRight,
  FolderMinus,
} from 'lucide-react';
import type { PpapSubmission, FmeaRow } from '../../types/apqpPpap';
import { updatePpapSubmission } from '../../services/apqpPpapSupabase';
import { syncProcessFlowToFmea } from '../../utils/apqpSyncEngine';
import { ActionTooltip } from '../common/ActionTooltip';

interface Props {
  submission: PpapSubmission;
  onSubmissionUpdated: (updated: PpapSubmission) => void;
}

export const PpapFmeaManager: React.FC<Props> = ({ submission, onSubmissionUpdated }) => {
  const [fmeaRows, setFmeaRows] = useState<FmeaRow[]>(submission.fmea_items || []);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Synchronize when submission prop updates
  useEffect(() => {
    setFmeaRows(submission.fmea_items || []);
  }, [submission.id, submission.fmea_items]);

  // Dynamic refs for smooth scrolling and autofocus
  const rowRefs = useRef<Map<number, HTMLTableRowElement>>(new Map());
  const failureInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());

  const focusAndHighlightRow = (index: number, message?: string) => {
    setHighlightedIdx(index);
    if (message) {
      setToastMessage(message);
      setTimeout(() => setToastMessage(null), 4000);
    }

    setTimeout(() => {
      const rowElem = rowRefs.current.get(index);
      if (rowElem) {
        rowElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      const inputElem = failureInputRefs.current.get(index);
      if (inputElem) {
        inputElem.focus();
        inputElem.select();
      }
    }, 80);

    setTimeout(() => {
      setHighlightedIdx(null);
    }, 2800);
  };

  // Compute Action Priority according to AIAG-VDA logic
  const calculateActionPriority = (s: number, o: number, d: number): 'HIGH' | 'MEDIUM' | 'LOW' => {
    if (s >= 8 && (o >= 4 || d >= 4)) return 'HIGH';
    if (s >= 5 && o >= 5 && d >= 4) return 'HIGH';
    if (s >= 7 || (o >= 4 && d >= 4)) return 'MEDIUM';
    return 'LOW';
  };

  const handleUpdateRow = (index: number, field: keyof FmeaRow, value: any) => {
    const updated = [...fmeaRows];
    const item = { ...updated[index], [field]: value };

    const s = field === 'severity' ? parseInt(value) || 1 : item.severity;
    const o = field === 'occurrence' ? parseInt(value) || 1 : item.occurrence;
    const d = field === 'detection' ? parseInt(value) || 1 : item.detection;

    item.rpn = s * o * d;
    item.action_priority = calculateActionPriority(s, o, d);

    updated[index] = item;
    setFmeaRows(updated);
  };

  const handleAddRow = () => {
    const newRow: FmeaRow = {
      process_step: 'New Machining / Assembly Operation',
      failure_mode: 'Dimensional out of tolerance or surface scratch',
      failure_effect: 'Loss of seal integrity or gear mesh interference',
      severity: 7,
      cause: 'Tool insert chipped or fixture clamping debris',
      occurrence: 2,
      prev_controls: 'Automated tool wear detection sensor',
      det_controls: '100% in-line vision inspection',
      detection: 2,
      rpn: 28,
      action_priority: 'LOW',
      actions_taken: 'Installed air blow-off nozzle on datum fixture.',
    };
    const nextList = [...fmeaRows, newRow];
    const newIdx = nextList.length - 1;
    setFmeaRows(nextList);
    focusAndHighlightRow(newIdx, `✅ Added new failure mode row #${newIdx + 1}`);
  };

  const handleAddFailureModeForStep = (parentIndex: number) => {
    const parent = fmeaRows[parentIndex];
    const opName = parent?.process_step || 'Process Operation';

    const branchRow: FmeaRow = {
      process_step: opName,
      failure_mode: 'Secondary failure mode (e.g. burrs, porosity, improper torque)',
      failure_effect: 'Assembly fit interference or functional leakage',
      severity: 6,
      cause: 'Process parameter drift or material hardness variation',
      occurrence: 2,
      prev_controls: 'Standard machine preventive maintenance',
      det_controls: 'Periodic manual inspection / gage check',
      detection: 3,
      rpn: 36,
      action_priority: 'LOW',
      actions_taken: 'Define poka-yoke sensor or tighter tooling threshold.',
    };

    const nextList = [...fmeaRows];
    const insertIdx = parentIndex + 1;
    nextList.splice(insertIdx, 0, branchRow);
    setFmeaRows(nextList);
    focusAndHighlightRow(insertIdx, `✅ Added failure mode branch for "${opName}"`);
  };

  const handleDeleteRow = async (index: number) => {
    const target = fmeaRows[index];
    const nextRows = fmeaRows.filter((_, idx) => idx !== index);
    setFmeaRows(nextRows);
    setToastMessage(`Removed failure mode "${target?.failure_mode?.slice(0, 24) || 'item'}..."`);

    try {
      const updated = await updatePpapSubmission(submission.id, {
        fmea_items: nextRows,
      });
      onSubmissionUpdated(updated);
    } catch (err) {
      console.error('Failed to auto-save PFMEA row deletion:', err);
    }

    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleDeleteEntireStep = async (stepName: string) => {
    const matchingRows = fmeaRows.filter((r) => r.process_step === stepName);
    if (matchingRows.length === 0) return;

    const confirmMsg = matchingRows.length > 1
      ? `Remove entire Process Step "${stepName}" and all ${matchingRows.length} associated failure modes from the PFMEA?`
      : `Remove Process Step "${stepName}" from the PFMEA?`;

    if (!window.confirm(confirmMsg)) return;

    const nextRows = fmeaRows.filter((r) => r.process_step !== stepName);
    setFmeaRows(nextRows);
    setToastMessage(`Removed entire process step "${stepName}" (${matchingRows.length} failure modes deleted)`);

    try {
      const updated = await updatePpapSubmission(submission.id, {
        fmea_items: nextRows,
      });
      onSubmissionUpdated(updated);
    } catch (err) {
      console.error('Failed to auto-save PFMEA step deletion:', err);
    }

    setTimeout(() => setToastMessage(null), 3500);
  };

  const flowItemsCount = submission.process_flow_data?.length || 0;

  const handleSyncFromProcessFlow = async () => {
    if (!submission.process_flow_data || submission.process_flow_data.length === 0) {
      alert('Process Flow Diagram is empty. Define operations in Process Flow first.');
      return;
    }

    try {
      setIsSaving(true);
      const synced = syncProcessFlowToFmea(submission.process_flow_data, fmeaRows);
      setFmeaRows(synced);
      const updated = await updatePpapSubmission(submission.id, {
        fmea_items: synced,
      });
      onSubmissionUpdated(updated);
      setSavedSuccess(true);
      setToastMessage(`⚡ Successfully synced ${synced.length} failure mode rows from Process Flow!`);
      setTimeout(() => {
        setSavedSuccess(false);
        setToastMessage(null);
      }, 4000);
    } catch (err) {
      console.error('Failed to sync FMEA from Process Flow:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const updated = await updatePpapSubmission(submission.id, {
        fmea_items: fmeaRows,
      });
      onSubmissionUpdated(updated);
      setSavedSuccess(true);
      setToastMessage('✅ PFMEA Matrix successfully saved to Supabase!');
      setTimeout(() => {
        setSavedSuccess(false);
        setToastMessage(null);
      }, 3500);
    } catch (err) {
      console.error('Failed to save PFMEA:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const isDirty = JSON.stringify(fmeaRows) !== JSON.stringify(submission.fmea_items || []);

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-blue-500/60 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-bottom-3 duration-300">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-500/20 text-red-400 rounded-lg border border-red-500/30">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                AIAG-VDA Process FMEA (Failure Mode & Effects Analysis)
              </h2>
              {isDirty && (
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded text-[10px] font-bold flex items-center gap-1 animate-pulse">
                  <AlertCircle className="w-3 h-3" />
                  <span>Unsaved Changes</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Severity, Occurrence, Detection & Action Priority (AP) Risk Assessment — {fmeaRows.length} Total Rows
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {flowItemsCount > 0 && (
            <ActionTooltip
              title="Sync from Process Flow"
              description="Inherits operations and process steps from PFD to initialize baseline failure modes."
              position="bottom"
              badge="Cascade"
            >
              <button
                onClick={handleSyncFromProcessFlow}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded-lg text-xs font-semibold transition-all active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Sync from Process Flow ({flowItemsCount} Ops)</span>
              </button>
            </ActionTooltip>
          )}

          <ActionTooltip
            title="Add Failure Mode Row"
            description="Inserts a new failure mode row at the bottom of the table and automatically scrolls and focuses the input."
            position="bottom"
            badge="Editor"
          >
            <button
              onClick={handleAddRow}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-xs transition-all shadow-md shadow-blue-600/20 active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Failure Mode</span>
            </button>
          </ActionTooltip>

          <ActionTooltip
            title="Save PFMEA Matrix"
            description="Persists failure modes, RPN scores, and mitigation actions to Supabase database."
            position="bottom"
            badge="Save"
          >
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer ${
                savedSuccess
                  ? 'bg-emerald-600 text-white shadow-emerald-500/30'
                  : isDirty
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/30 font-extrabold ring-2 ring-emerald-400/40'
                  : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              {savedSuccess ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4 text-emerald-400" />}
              <span>{savedSuccess ? 'Saved to Supabase!' : isSaving ? 'Saving...' : isDirty ? 'Save PFMEA (Unsaved)' : 'Save PFMEA'}</span>
            </button>
          </ActionTooltip>
        </div>
      </div>

      {/* Auto-Sync Prompt Banner when empty */}
      {fmeaRows.length === 0 && flowItemsCount > 0 && (
        <div className="bg-blue-950/40 border border-blue-800/80 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs animate-in fade-in">
          <div className="flex items-center gap-2 text-blue-200">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              Process Flow Diagram has <strong>{flowItemsCount} operations</strong> defined. Click Sync to automatically inherit operations and baseline failure modes with zero duplicate data entry.
            </span>
          </div>
          <ActionTooltip
            title="Auto-Populate PFMEA"
            description="Imports all operations directly from the Process Flow Diagram."
            position="left"
            badge="Quick Start"
          >
            <button
              onClick={handleSyncFromProcessFlow}
              disabled={isSaving}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shrink-0 shadow-sm transition-colors active:scale-95 cursor-pointer"
            >
              Sync Operations Now
            </button>
          </ActionTooltip>
        </div>
      )}

      {/* FMEA Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 text-[11px]">
                <th className="p-3 min-w-[200px]">Process Step / Operation</th>
                <th className="p-3 min-w-[220px]">Potential Failure Mode</th>
                <th className="p-3 min-w-[200px]">Failure Effect</th>
                <th className="p-2 w-14 text-center">Sev (S)</th>
                <th className="p-3 min-w-[180px]">Potential Cause</th>
                <th className="p-2 w-14 text-center">Occ (O)</th>
                <th className="p-3 min-w-[180px]">Current Prevention Controls</th>
                <th className="p-3 min-w-[180px]">Current Detection Controls</th>
                <th className="p-2 w-14 text-center">Det (D)</th>
                <th className="p-2 w-16 text-center">RPN</th>
                <th className="p-3 w-20 text-center">AP</th>
                <th className="p-3 min-w-[200px]">Recommended Actions / Mitigations</th>
                <th className="p-3 w-24 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {fmeaRows.map((row, idx) => {
                const rpn = (row.rpn || row.severity * row.occurrence * row.detection);
                const isHighlighted = highlightedIdx === idx;

                return (
                  <tr
                    key={idx}
                    ref={(el) => {
                      if (el) rowRefs.current.set(idx, el);
                      else rowRefs.current.delete(idx);
                    }}
                    className={`transition-all duration-300 ${
                      isHighlighted
                        ? 'bg-amber-500/20 ring-2 ring-amber-400/80 shadow-lg'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Process Step */}
                    <td className="p-3">
                      <div className="space-y-1">
                        <input
                          type="text"
                          value={row.process_step}
                          onChange={(e) => handleUpdateRow(idx, 'process_step', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded px-2 py-1 text-slate-200 outline-none text-xs"
                        />
                        <div className="flex items-center gap-1">
                          <ActionTooltip
                            title="Add Failure Mode for this Op"
                            description={`Branches another potential failure mode and cause under "${row.process_step}".`}
                            position="top"
                            badge="Branch"
                          >
                            <button
                              type="button"
                              onClick={() => handleAddFailureModeForStep(idx)}
                              className="text-[10px] text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 font-medium pt-0.5 cursor-pointer"
                            >
                              <CornerDownRight className="w-2.5 h-2.5" />
                              <span>+ Failure Mode for Op</span>
                            </button>
                          </ActionTooltip>
                        </div>
                      </div>
                    </td>

                    {/* Failure Mode */}
                    <td className="p-3">
                      <input
                        ref={(el) => {
                          if (el) failureInputRefs.current.set(idx, el);
                          else failureInputRefs.current.delete(idx);
                        }}
                        type="text"
                        value={row.failure_mode}
                        onChange={(e) => handleUpdateRow(idx, 'failure_mode', e.target.value)}
                        placeholder="Enter failure mode..."
                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded px-2 py-1 text-slate-200 outline-none text-xs"
                      />
                    </td>

                    {/* Failure Effect */}
                    <td className="p-3">
                      <input
                        type="text"
                        value={row.failure_effect}
                        onChange={(e) => handleUpdateRow(idx, 'failure_effect', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded px-2 py-1 text-slate-300 outline-none text-xs"
                      />
                    </td>

                    {/* Severity */}
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={row.severity}
                        onChange={(e) => handleUpdateRow(idx, 'severity', e.target.value)}
                        className="w-12 text-center bg-slate-950 border border-slate-800 rounded py-1 font-mono font-bold text-amber-400 outline-none text-xs"
                      />
                    </td>

                    {/* Cause */}
                    <td className="p-3">
                      <input
                        type="text"
                        value={row.cause}
                        onChange={(e) => handleUpdateRow(idx, 'cause', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded px-2 py-1 text-slate-300 outline-none text-xs"
                      />
                    </td>

                    {/* Occurrence */}
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={row.occurrence}
                        onChange={(e) => handleUpdateRow(idx, 'occurrence', e.target.value)}
                        className="w-12 text-center bg-slate-950 border border-slate-800 rounded py-1 font-mono font-bold text-amber-400 outline-none text-xs"
                      />
                    </td>

                    {/* Prevention Controls */}
                    <td className="p-3">
                      <input
                        type="text"
                        value={row.prev_controls}
                        onChange={(e) => handleUpdateRow(idx, 'prev_controls', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded px-2 py-1 text-slate-300 outline-none text-xs"
                      />
                    </td>

                    {/* Detection Controls */}
                    <td className="p-3">
                      <input
                        type="text"
                        value={row.det_controls}
                        onChange={(e) => handleUpdateRow(idx, 'det_controls', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded px-2 py-1 text-slate-300 outline-none text-xs"
                      />
                    </td>

                    {/* Detection */}
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={row.detection}
                        onChange={(e) => handleUpdateRow(idx, 'detection', e.target.value)}
                        className="w-12 text-center bg-slate-950 border border-slate-800 rounded py-1 font-mono font-bold text-amber-400 outline-none text-xs"
                      />
                    </td>

                    {/* RPN */}
                    <td className="p-2 text-center font-mono font-bold text-cyan-300">
                      {rpn}
                    </td>

                    {/* Action Priority (AP) */}
                    <td className="p-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.action_priority === 'HIGH'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : row.action_priority === 'MEDIUM'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {row.action_priority}
                      </span>
                    </td>

                    {/* Actions Taken */}
                    <td className="p-3">
                      <input
                        type="text"
                        value={row.actions_taken}
                        onChange={(e) => handleUpdateRow(idx, 'actions_taken', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded px-2 py-1 text-slate-200 outline-none text-xs"
                      />
                    </td>

                    {/* Actions Col */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <ActionTooltip
                          title="Branch Failure Mode"
                          description="Adds another failure mode for this same operation directly below this row."
                          position="left"
                          badge="Branch"
                        >
                          <button
                            type="button"
                            onClick={() => handleAddFailureModeForStep(idx)}
                            className="p-1 rounded hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </ActionTooltip>

                        <ActionTooltip
                          title="Delete Failure Mode"
                          description="Removes only this failure mode row from the PFMEA matrix."
                          position="left"
                          badge="Delete Row"
                        >
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(idx)}
                            className="p-1 rounded hover:bg-red-600/20 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </ActionTooltip>

                        <ActionTooltip
                          title="Remove Entire Step"
                          description={`Removes "${row.process_step}" and ALL its linked failure modes from the PFMEA.`}
                          position="left"
                          badge="Remove Step"
                        >
                          <button
                            type="button"
                            onClick={() => handleDeleteEntireStep(row.process_step)}
                            className="p-1 rounded hover:bg-red-600/20 text-amber-500/70 hover:text-red-400 transition-colors cursor-pointer"
                          >
                            <FolderMinus className="w-3.5 h-3.5" />
                          </button>
                        </ActionTooltip>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Bottom Full-Width Action Button */}
        <div className="p-3 bg-slate-950/80 border-t border-slate-800">
          <ActionTooltip
            title="Add New Failure Mode Row"
            description="Appends a new failure mode row at the bottom of the table and automatically scrolls into view."
            position="top"
            badge="Add"
          >
            <button
              onClick={handleAddRow}
              className="w-full py-2.5 border-2 border-dashed border-slate-700 hover:border-blue-500/80 hover:bg-blue-600/10 text-slate-400 hover:text-blue-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              <Plus className="w-4 h-4 text-blue-400" />
              <span>+ Add New Failure Mode Row</span>
            </button>
          </ActionTooltip>
        </div>
      </div>
    </div>
  );
};
