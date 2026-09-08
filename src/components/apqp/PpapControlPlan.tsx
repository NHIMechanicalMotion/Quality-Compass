import React, { useState, useEffect, useRef } from 'react';
import {
  FileDown,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  FileSpreadsheet,
  UploadCloud,
  Sparkles,
  AlertCircle,
  CornerDownRight,
  FolderMinus,
} from 'lucide-react';
import type { PpapSubmission, ControlPlanRow } from '../../types/apqpPpap';
import { updatePpapSubmission, savePpapDocument } from '../../services/apqpPpapSupabase';
import { generateControlPlanPdf, downloadPdf, getPdfBase64 } from '../../services/aiagPdfGenerator';
import {
  downloadAiagProcessFlowControlPlanTemplate,
  importProcessFlowAndControlPlanFromExcel,
} from '../../utils/aiagExcelService';
import { syncProcessFlowAndFmeaToControlPlan } from '../../utils/apqpSyncEngine';
import { ActionTooltip } from '../common/ActionTooltip';

interface Props {
  submission: PpapSubmission;
  onSubmissionUpdated: (updated: PpapSubmission) => void;
}

export const PpapControlPlan: React.FC<Props> = ({ submission, onSubmissionUpdated }) => {
  const [rows, setRows] = useState<ControlPlanRow[]>(submission.control_plan_data || []);
  const [planType, setPlanType] = useState<'PROTOTYPE' | 'PRE_LAUNCH' | 'PRODUCTION'>('PRODUCTION');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [highlightedIdx, setHighlightedIdx] = useState<number | null>(null);

  useEffect(() => {
    setRows(submission.control_plan_data || []);
  }, [submission.id, submission.control_plan_data]);

  const rowRefs = useRef<Map<number, HTMLTableRowElement>>(new Map());
  const charInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());

  const focusAndHighlightRow = (index: number, message?: string) => {
    setHighlightedIdx(index);
    if (message) {
      setImportNotice(message);
      setTimeout(() => setImportNotice(null), 4000);
    }

    setTimeout(() => {
      rowRefs.current.get(index)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      charInputRefs.current.get(index)?.focus();
      charInputRefs.current.get(index)?.select();
    }, 80);

    setTimeout(() => {
      setHighlightedIdx(null);
    }, 2800);
  };

  const handleDownloadTemplate = async () => {
    await downloadAiagProcessFlowControlPlanTemplate(submission.part_number, submission.part_name);
  };

  const handleExcelFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const parsed = await importProcessFlowAndControlPlanFromExcel(file);

      if (parsed.controlPlan && parsed.controlPlan.length > 0) {
        setRows(parsed.controlPlan);
        const saved = await updatePpapSubmission(submission.id, {
          control_plan_data: parsed.controlPlan,
          ...(parsed.processFlow.length > 0 ? { process_flow_data: parsed.processFlow } : {}),
        });
        onSubmissionUpdated(saved);
        setImportNotice(`Successfully imported ${parsed.controlPlan.length} Control Plan operations from Excel!`);
      } else {
        alert('No Control Plan rows found in uploaded spreadsheet. Please check the sheet headers or download the template.');
      }
      setTimeout(() => setImportNotice(null), 5000);
    } catch (err) {
      console.error('Failed to import Excel:', err);
      alert('Error parsing Excel spreadsheet. Please ensure standard AIAG columns.');
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  const handleUpdateRow = (index: number, field: keyof ControlPlanRow, value: any) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value };
    setRows(updated);
  };

  const handleAddRow = () => {
    const nextOp = (rows.length + 1) * 10;
    const newRow: ControlPlanRow = {
      op_no: nextOp,
      process_step: 'New Manufacturing Operation',
      machine: 'CNC Machining Center',
      char_desc: 'Critical Dimension / Surface Finish',
      class_symbol: 'CRITICAL',
      spec: '± 0.050 mm',
      eval_technique: 'Air Gage / Micrometer',
      sample_size: '5 pcs',
      sample_freq: '1 / Hour',
      control_method: 'X-Bar R Chart',
      reaction_plan: 'Adjust Tool Offset & Inspect Prev 5',
    };
    const nextList = [...rows, newRow];
    const newIdx = nextList.length - 1;
    setRows(nextList);
    focusAndHighlightRow(newIdx, `✅ Added Control Plan Operation ${nextOp}`);
  };

  const handleAddCharForOp = (parentIndex: number) => {
    const parent = rows[parentIndex];
    const branchRow: ControlPlanRow = {
      op_no: parent?.op_no || 10,
      process_step: parent?.process_step || 'Process Operation',
      machine: parent?.machine || 'Work Station',
      char_desc: 'Secondary Characteristic (Diameter / Runout / Torque)',
      class_symbol: 'NONE',
      spec: '± 0.025 mm',
      eval_technique: 'Dial Indicator / Optical Comparator',
      sample_size: '5 pcs',
      sample_freq: '1 / Shift',
      control_method: 'Statistical Process Control (X-Bar R)',
      reaction_plan: 'Contain nonconforming product & adjust tool offset.',
    };

    const nextList = [...rows];
    const insertIdx = parentIndex + 1;
    nextList.splice(insertIdx, 0, branchRow);
    setRows(nextList);
    focusAndHighlightRow(insertIdx, `✅ Added characteristic check under Op ${parent?.op_no}`);
  };

  const handleDeleteRow = async (index: number) => {
    const target = rows[index];
    const nextRows = rows.filter((_, idx) => idx !== index);
    setRows(nextRows);
    setImportNotice(`Removed characteristic for Op ${target?.op_no || index + 1}`);

    try {
      const updated = await updatePpapSubmission(submission.id, {
        control_plan_data: nextRows,
      });
      onSubmissionUpdated(updated);
    } catch (err) {
      console.error('Failed to auto-save Control Plan row deletion:', err);
    }

    setTimeout(() => setImportNotice(null), 3500);
  };

  const handleDeleteEntireStep = async (opNo: number) => {
    const matchingRows = rows.filter((r) => r.op_no === opNo);
    if (matchingRows.length === 0) return;

    const opName = matchingRows[0]?.process_step || `Operation ${opNo}`;
    const confirmMsg = matchingRows.length > 1
      ? `Remove entire Operation ${opNo} ("${opName}") and all ${matchingRows.length} characteristics from the Control Plan?`
      : `Remove Operation ${opNo} ("${opName}") from the Control Plan?`;

    if (!window.confirm(confirmMsg)) return;

    const nextRows = rows.filter((r) => r.op_no !== opNo);
    setRows(nextRows);
    setImportNotice(`Removed entire Operation ${opNo} (${matchingRows.length} characteristic rows deleted)`);

    try {
      const updated = await updatePpapSubmission(submission.id, {
        control_plan_data: nextRows,
      });
      onSubmissionUpdated(updated);
    } catch (err) {
      console.error('Failed to auto-save Control Plan step deletion:', err);
    }

    setTimeout(() => setImportNotice(null), 3500);
  };

  const handleDownloadPdf = () => {
    const updatedSub: PpapSubmission = {
      ...submission,
      control_plan_data: rows,
    };
    const pdf = generateControlPlanPdf(updatedSub);
    downloadPdf(pdf, `AIAG_Control_Plan_${submission.part_number}.pdf`);
  };

  const flowItemsCount = submission.process_flow_data?.length || 0;

  const handleSyncFromPfdAndFmea = async () => {
    if (!submission.process_flow_data || submission.process_flow_data.length === 0) {
      alert('Process Flow Diagram is empty. Define operations in Process Flow first.');
      return;
    }

    try {
      setIsSaving(true);
      const synced = syncProcessFlowAndFmeaToControlPlan(
        submission.process_flow_data,
        submission.fmea_items || [],
        rows
      );
      setRows(synced);
      const updated = await updatePpapSubmission(submission.id, {
        control_plan_data: synced,
      });
      onSubmissionUpdated(updated);
      setSavedSuccess(true);
      setImportNotice(`⚡ Synced ${synced.length} operations from Process Flow & PFMEA into Control Plan!`);
      setTimeout(() => {
        setSavedSuccess(false);
        setImportNotice(null);
      }, 4000);
    } catch (err) {
      console.error('Failed to sync Control Plan:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveToSupabase = async () => {
    try {
      setIsSaving(true);
      const updated = await updatePpapSubmission(submission.id, {
        control_plan_data: rows,
      });

      const pdf = generateControlPlanPdf({ ...submission, control_plan_data: rows });
      const base64 = getPdfBase64(pdf);
      await savePpapDocument({
        ppap_id: submission.id,
        project_id: submission.project_id,
        title: `AIAG Control Plan (${planType}) - ${submission.part_number}`,
        doc_type: 'CONTROL_PLAN',
        file_data: base64,
        file_size: Math.round(base64.length * 0.75),
      });

      onSubmissionUpdated(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save control plan:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg border border-purple-500/30">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                AIAG APQP Control Plan Form
              </h2>
              {JSON.stringify(rows) !== JSON.stringify(submission.control_plan_data || []) && (
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded text-[10px] font-bold flex items-center gap-1 animate-pulse">
                  <AlertCircle className="w-3 h-3" />
                  <span>Unsaved Changes</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Process Parameters, Special Characteristics, Measurement & Reaction Plans — {rows.length} Total Rows
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Plan Phase Selector */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            {(['PROTOTYPE', 'PRE_LAUNCH', 'PRODUCTION'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setPlanType(type)}
                className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  planType === type
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {type.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Sync from Process Flow & PFMEA (Zero Redundancy) */}
          {flowItemsCount > 0 && (
            <ActionTooltip
              title="Cascading Sync Engine"
              description="Pulls process operations from PFD and controls/classification symbols from PFMEA without duplicate typing."
              position="bottom"
              badge="AIAG Sync"
            >
              <button
                onClick={handleSyncFromPfdAndFmea}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 rounded-lg text-xs font-semibold transition-all active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Sync from PFD & PFMEA ({flowItemsCount} Ops)</span>
              </button>
            </ActionTooltip>
          )}

          {/* Download Template */}
          <ActionTooltip
            title="Download Control Plan Template"
            description="Downloads blank pre-formatted Excel template for offline Control Plan editing."
            position="bottom"
            badge="Template"
          >
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5 text-purple-400" />
              <span>Excel Template</span>
            </button>
          </ActionTooltip>

          {/* Import Excel */}
          <ActionTooltip
            title="Import Control Plan from Excel"
            description="Bulk-imports control plan operations, parameters, and reaction plans from Excel."
            position="bottom"
            badge="Import"
          >
            <label
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 rounded-lg text-xs font-semibold cursor-pointer transition-all active:scale-95"
            >
              <UploadCloud className="w-3.5 h-3.5 text-purple-400" />
              <span>{isImporting ? 'Importing...' : 'Import from Excel'}</span>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleExcelFileUpload}
                className="hidden"
              />
            </label>
          </ActionTooltip>

          <ActionTooltip
            title="Add Control Plan Operation"
            description="Inserts a new operation row at the bottom of the table and automatically scrolls and focuses the input."
            position="bottom"
            badge="Editor"
          >
            <button
              onClick={handleAddRow}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg text-xs transition-all shadow-md shadow-purple-600/20 active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Operation</span>
            </button>
          </ActionTooltip>

          <ActionTooltip
            title="Download Control Plan PDF"
            description="Builds and downloads an official AIAG-formatted Control Plan PDF report."
            position="bottom"
            badge="PDF"
          >
            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-600/20 transition-all active:scale-95 cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              <span>Download Control Plan (PDF)</span>
            </button>
          </ActionTooltip>

          <ActionTooltip
            title="Save Control Plan"
            description="Persists control plan rows to Supabase and saves an archived PDF document."
            position="bottom"
            badge="Save"
          >
            <button
              onClick={handleSaveToSupabase}
              disabled={isSaving}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer ${
                savedSuccess
                  ? 'bg-emerald-600 text-white shadow-emerald-500/30'
                  : JSON.stringify(rows) !== JSON.stringify(submission.control_plan_data || [])
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/30 font-extrabold ring-2 ring-emerald-400/40'
                  : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              {savedSuccess ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4 text-emerald-400" />}
              <span>{savedSuccess ? 'Saved to Supabase!' : isSaving ? 'Saving...' : JSON.stringify(rows) !== JSON.stringify(submission.control_plan_data || []) ? 'Save Plan (Unsaved)' : 'Save Plan'}</span>
            </button>
          </ActionTooltip>
        </div>
      </div>

      {/* Auto-Sync Prompt Banner when empty */}
      {rows.length === 0 && flowItemsCount > 0 && (
        <div className="bg-purple-950/40 border border-purple-800/80 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs animate-in fade-in">
          <div className="flex items-center gap-2 text-purple-200">
            <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
            <span>
              Process Flow has <strong>{flowItemsCount} operations</strong> defined. Click Sync to automatically inherit operations, machines, and detection controls without retyping.
            </span>
          </div>
          <button
            onClick={handleSyncFromPfdAndFmea}
            disabled={isSaving}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold shrink-0 shadow-sm transition-colors active:scale-95"
          >
            Sync to Control Plan
          </button>
        </div>
      )}

      {/* Import Notification Banner */}
      {importNotice && (
        <div className="bg-purple-950/60 border border-purple-800 text-purple-200 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
          <span>{importNotice}</span>
        </div>
      )}

      {/* Control Plan Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 text-[11px]">
                <th className="p-3 w-14 text-center">Op #</th>
                <th className="p-3">Process Operation / Step</th>
                <th className="p-3">Machine / Tooling</th>
                <th className="p-3">Characteristic Description</th>
                <th className="p-3 w-28 text-center">Special Class</th>
                <th className="p-3">Specification / Tol</th>
                <th className="p-3">Evaluation Method</th>
                <th className="p-3 w-24">Sample</th>
                <th className="p-3">Control Method</th>
                <th className="p-3">Reaction Plan</th>
                <th className="p-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {rows.map((row, idx) => {
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
                        ? 'bg-purple-500/20 ring-2 ring-purple-400/80 shadow-lg'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="p-3 text-center">
                      <input
                        type="number"
                        value={row.op_no}
                        onChange={(e) => handleUpdateRow(idx, 'op_no', parseInt(e.target.value) || 10)}
                        className="w-12 text-center bg-purple-500/10 border border-purple-500/30 rounded py-1 font-mono font-bold text-purple-300"
                      />
                    </td>
                    <td className="p-3">
                      <div className="space-y-1">
                        <input
                          type="text"
                          value={row.process_step}
                          onChange={(e) => handleUpdateRow(idx, 'process_step', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded px-2 py-1 text-slate-200 outline-none text-xs"
                        />
                        <div className="flex items-center gap-1">
                          <ActionTooltip
                            title="Add Characteristic for Op"
                            description={`Adds another inspection characteristic under Op ${row.op_no}.`}
                            position="top"
                            badge="Branch"
                          >
                            <button
                              type="button"
                              onClick={() => handleAddCharForOp(idx)}
                              className="text-[10px] text-purple-400 hover:text-purple-300 hover:underline flex items-center gap-1 font-medium pt-0.5 cursor-pointer"
                            >
                              <CornerDownRight className="w-2.5 h-2.5" />
                              <span>+ Characteristic</span>
                            </button>
                          </ActionTooltip>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={row.machine}
                        onChange={(e) => handleUpdateRow(idx, 'machine', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 outline-none text-xs"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        ref={(el) => {
                          if (el) charInputRefs.current.set(idx, el);
                          else charInputRefs.current.delete(idx);
                        }}
                        type="text"
                        value={row.char_desc}
                        onChange={(e) => handleUpdateRow(idx, 'char_desc', e.target.value)}
                        placeholder="Characteristic description..."
                        className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded px-2 py-1 text-slate-200 outline-none text-xs"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <select
                        value={row.class_symbol}
                        onChange={(e) => handleUpdateRow(idx, 'class_symbol', e.target.value)}
                        className={`w-full text-center rounded py-1 text-[11px] font-bold border ${
                          row.class_symbol === 'CRITICAL'
                            ? 'bg-red-500/20 text-red-400 border-red-500/40'
                            : row.class_symbol === 'DIAMOND'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-slate-950 text-slate-400 border-slate-800'
                        }`}
                      >
                        <option value="CRITICAL">∇ Critical</option>
                        <option value="DIAMOND">◇ Significant</option>
                        <option value="NONE">Standard</option>
                      </select>
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={row.spec}
                        onChange={(e) => handleUpdateRow(idx, 'spec', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-cyan-300 font-mono text-[11px]"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={row.eval_technique}
                        onChange={(e) => handleUpdateRow(idx, 'eval_technique', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={`${row.sample_size} / ${row.sample_freq}`}
                        onChange={(e) => {
                          const parts = e.target.value.split('/');
                          handleUpdateRow(idx, 'sample_size', parts[0]?.trim() || '5 pcs');
                          handleUpdateRow(idx, 'sample_freq', parts[1]?.trim() || 'Per Shift');
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 text-[11px]"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={row.control_method}
                        onChange={(e) => handleUpdateRow(idx, 'control_method', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={row.reaction_plan}
                        onChange={(e) => handleUpdateRow(idx, 'reaction_plan', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <ActionTooltip
                          title="Add Characteristic"
                          description="Adds another characteristic check under this operation."
                          position="left"
                          badge="Branch"
                        >
                          <button
                            type="button"
                            onClick={() => handleAddCharForOp(idx)}
                            className="text-purple-400 hover:text-purple-300 p-1 rounded hover:bg-purple-600/20 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </ActionTooltip>

                        <ActionTooltip
                          title="Delete Characteristic"
                          description="Removes only this characteristic row from the Control Plan."
                          position="left"
                          badge="Delete Row"
                        >
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(idx)}
                            className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-red-600/20 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </ActionTooltip>

                        <ActionTooltip
                          title={`Remove Entire Op ${row.op_no}`}
                          description={`Removes Operation ${row.op_no} and ALL its nested characteristics from the Control Plan.`}
                          position="left"
                          badge="Remove Step"
                        >
                          <button
                            type="button"
                            onClick={() => handleDeleteEntireStep(row.op_no)}
                            className="text-amber-500/70 hover:text-red-400 p-1 rounded hover:bg-red-600/20 transition-colors cursor-pointer"
                          >
                            <FolderMinus className="w-4 h-4" />
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
            title="Add New Control Plan Operation"
            description="Appends a new operation row at the bottom of the table and automatically scrolls into view."
            position="top"
            badge="Add"
          >
            <button
              onClick={handleAddRow}
              className="w-full py-2.5 border-2 border-dashed border-slate-700 hover:border-purple-500/80 hover:bg-purple-600/10 text-slate-400 hover:text-purple-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              <Plus className="w-4 h-4 text-purple-400" />
              <span>+ Add New Control Plan Operation</span>
            </button>
          </ActionTooltip>
        </div>
      </div>
    </div>
  );
};
