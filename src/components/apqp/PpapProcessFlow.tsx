import React, { useState, useEffect, useRef } from 'react';
import {
  FileDown,
  UploadCloud,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  GitBranch,
  Sparkles,
  AlertCircle,
  Database,
  X,
} from 'lucide-react';
import type { PpapSubmission, ProcessFlowItem, ProcessStepType, ControlPlanRow } from '../../types/apqpPpap';
import { updatePpapSubmission } from '../../services/apqpPpapSupabase';
import {
  downloadAiagProcessFlowControlPlanTemplate,
  importProcessFlowAndControlPlanFromExcel,
} from '../../utils/aiagExcelService';
import {
  syncProcessFlowToFmea,
  syncProcessFlowAndFmeaToControlPlan,
} from '../../utils/apqpSyncEngine';
import {
  fetchOdooBomOperations,
  fetchOdooParts,
  type OdooBomOperation,
  type OdooPartProduct,
} from '../../services/odooSupabase';
import { OdooSearchSelect } from '../common/OdooSearchSelect';
import { ActionTooltip } from '../common/ActionTooltip';

interface Props {
  submission: PpapSubmission;
  onSubmissionUpdated: (updated: PpapSubmission) => void;
  onSyncToControlPlan?: (rows: ControlPlanRow[]) => void;
}

const STEP_TYPE_CONFIG: Record<ProcessStepType, { label: string; symbol: string; badgeClass: string }> = {
  OPERATION: {
    label: 'Operation (加工)',
    symbol: '⭕',
    badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  },
  INSPECTION: {
    label: 'Inspection (检验)',
    symbol: '⏹',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  TRANSPORT: {
    label: 'Transport (转运)',
    symbol: '➡️',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  STORAGE: {
    label: 'Storage (存储)',
    symbol: '🔺',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  },
  DELAY: {
    label: 'Delay (等待)',
    symbol: '⏳',
    badgeClass: 'bg-slate-700 text-slate-300 border-slate-600',
  },
};

export const PpapProcessFlow: React.FC<Props> = ({
  submission,
  onSubmissionUpdated,
  onSyncToControlPlan,
}) => {
  const [flowItems, setFlowItems] = useState<ProcessFlowItem[]>(
    submission.process_flow_data || []
  );

  useEffect(() => {
    setFlowItems(submission.process_flow_data || []);
  }, [submission.id, submission.process_flow_data]);

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [highlightedIdx, setHighlightedIdx] = useState<number | null>(null);

  // Odoo BOM Operations Import State
  const [isOdooBomModalOpen, setIsOdooBomModalOpen] = useState(false);
  const [odooBomSkuQuery, setOdooBomSkuQuery] = useState(submission.part_number || '');
  const [odooBomOperationsPreview, setOdooBomOperationsPreview] = useState<OdooBomOperation[]>([]);
  const [isLoadingBom, setIsLoadingBom] = useState(false);
  const [bomImportMode, setBomImportMode] = useState<'REPLACE' | 'APPEND'>('REPLACE');
  const [allOdooParts, setAllOdooParts] = useState<OdooPartProduct[]>([]);

  // Load BOM operations for a SKU
  const loadBomForSku = async (sku: string) => {
    if (!sku.trim()) return;
    try {
      setIsLoadingBom(true);
      const ops = await fetchOdooBomOperations(sku);
      setOdooBomOperationsPreview(ops);
    } catch (err) {
      console.error('Failed to fetch Odoo BOM operations:', err);
    } finally {
      setIsLoadingBom(false);
    }
  };

  const handleOpenOdooBomModal = async () => {
    const sku = submission.part_number || '';
    setOdooBomSkuQuery(sku);
    setIsOdooBomModalOpen(true);
    loadBomForSku(sku);
    try {
      const parts = await fetchOdooParts();
      setAllOdooParts(parts);
    } catch (e) {
      console.error('Failed to load Odoo parts for BOM picker:', e);
    }
  };

  const handleConfirmOdooBomImport = async () => {
    if (odooBomOperationsPreview.length === 0) {
      alert('No BOM operations selected to import.');
      return;
    }

    try {
      setIsSaving(true);
      const newItems: ProcessFlowItem[] = odooBomOperationsPreview.map((op, idx) => {
        const opLower = (op.operationName || '').toLowerCase();
        let step_type: ProcessStepType = 'OPERATION';
        if (/inspect|test|check|gage|gauge|measure|audit|verify/i.test(opLower)) {
          step_type = 'INSPECTION';
        } else if (/pack|storage|warehouse|box|skid|pallet/i.test(opLower)) {
          step_type = 'STORAGE';
        } else if (/transport|ship|move|forklift|transfer/i.test(opLower)) {
          step_type = 'TRANSPORT';
        } else if (/dry|cure|wash|quench|heat/i.test(opLower)) {
          step_type = 'OPERATION';
        }

        return {
          op_no: op.sequence || (idx + 1) * 10,
          operation_name: op.operationName,
          step_type,
          work_center: op.workcenterName || 'MANTIS Machining Center',
          key_product_char: 'Print Specification & Tolerance',
          key_process_char: op.timeCycleMinutes > 0 ? `Cycle Time: ${op.timeCycleMinutes} min` : 'Machine Operating Parameters',
          control_method: 'Standard In-Process Verification / Work Instruction',
        };
      });

      const finalItems = bomImportMode === 'APPEND' ? [...flowItems, ...newItems] : newItems;
      setFlowItems(finalItems);

      const updated = await updatePpapSubmission(submission.id, {
        process_flow_data: finalItems,
      });

      onSubmissionUpdated(updated);
      setIsOdooBomModalOpen(false);
      setImportNotice(
        `⚡ Successfully imported ${newItems.length} operations from Odoo BOM for part "${odooBomSkuQuery}"!`
      );
      setTimeout(() => setImportNotice(null), 5000);
    } catch (err) {
      console.error('Failed to import Odoo BOM operations:', err);
      alert('Error saving imported BOM operations.');
    } finally {
      setIsSaving(false);
    }
  };

  // Synchronize when submission prop updates
  useEffect(() => {
    if (submission.process_flow_data) {
      setFlowItems(submission.process_flow_data);
    }
  }, [submission.id, submission.process_flow_data]);

  const rowRefs = useRef<Map<number, HTMLTableRowElement>>(new Map());
  const opNameInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());

  const focusAndHighlightRow = (index: number, message?: string) => {
    setHighlightedIdx(index);
    if (message) {
      setImportNotice(message);
      setTimeout(() => setImportNotice(null), 4000);
    }

    setTimeout(() => {
      rowRefs.current.get(index)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      opNameInputRefs.current.get(index)?.focus();
      opNameInputRefs.current.get(index)?.select();
    }, 80);

    setTimeout(() => {
      setHighlightedIdx(null);
    }, 2800);
  };

  const handleUpdateItem = (index: number, field: keyof ProcessFlowItem, value: any) => {
    const updated = [...flowItems];
    updated[index] = { ...updated[index], [field]: value };
    setFlowItems(updated);
  };

  const handleAddItem = () => {
    const nextOp = (flowItems.length + 1) * 10;
    const newItem: ProcessFlowItem = {
      op_no: nextOp,
      operation_name: 'New Manufacturing Process Step',
      step_type: 'OPERATION',
      work_center: 'Work Center Line 1',
      key_product_char: 'Dimension / Surface Integrity',
      key_process_char: 'Speed, Feed, Temperature',
      control_method: 'Standard In-Process Verification',
    };
    const nextList = [...flowItems, newItem];
    const newIdx = nextList.length - 1;
    setFlowItems(nextList);
    focusAndHighlightRow(newIdx, `✅ Added Operation ${nextOp}`);
  };

  const handleDeleteItem = async (index: number) => {
    const target = flowItems[index];
    if (!target) return;

    const targetOp = target.op_no;
    const cpMatches = (submission.control_plan_data || []).filter((r) => r.op_no === targetOp);
    const fmeaMatches = (submission.fmea_items || []).filter(
      (r) =>
        r.process_step.toLowerCase().includes(`op ${targetOp}`.toLowerCase()) ||
        r.process_step.toLowerCase().includes(target.operation_name.toLowerCase())
    );

    const hasDownstream = cpMatches.length > 0 || fmeaMatches.length > 0;
    let cascadeDelete = false;

    if (hasDownstream) {
      const confirmMsg =
        `Operation ${targetOp} ("${target.operation_name}") has:\n` +
        `• ${cpMatches.length} characteristic row(s) in Control Plan\n` +
        `• ${fmeaMatches.length} failure mode row(s) in PFMEA\n\n` +
        `Would you like to CASCADE DELETE and also remove Op ${targetOp} from Control Plan and PFMEA?\n\n` +
        `Click [OK] to Cascade Delete from ALL (Process Flow, PFMEA, Control Plan)\n` +
        `Click [Cancel] to remove from Process Flow ONLY`;

      cascadeDelete = window.confirm(confirmMsg);
    }

    const nextFlow = flowItems.filter((_, idx) => idx !== index);
    setFlowItems(nextFlow);

    let nextCp = submission.control_plan_data || [];
    let nextFmea = submission.fmea_items || [];

    if (cascadeDelete) {
      nextCp = nextCp.filter((r) => r.op_no !== targetOp);
      nextFmea = nextFmea.filter(
        (r) =>
          !r.process_step.toLowerCase().includes(`op ${targetOp}`.toLowerCase()) &&
          !r.process_step.toLowerCase().includes(target.operation_name.toLowerCase())
      );
      if (onSyncToControlPlan) {
        onSyncToControlPlan(nextCp);
      }
    }

    setImportNotice(
      cascadeDelete
        ? `Cascaded deletion of Op ${targetOp} across Process Flow, PFMEA (${fmeaMatches.length} removed), and Control Plan (${cpMatches.length} removed).`
        : `Removed Operation ${targetOp} from Process Flow.`
    );

    try {
      const updated = await updatePpapSubmission(submission.id, {
        process_flow_data: nextFlow,
        ...(cascadeDelete ? { control_plan_data: nextCp, fmea_items: nextFmea } : {}),
      });
      onSubmissionUpdated(updated);
    } catch (err) {
      console.error('Failed to auto-save Process Flow deletion:', err);
    }

    setTimeout(() => setImportNotice(null), 4500);
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

      let importedCount = 0;
      if (parsed.processFlow && parsed.processFlow.length > 0) {
        setFlowItems(parsed.processFlow);
        importedCount = parsed.processFlow.length;
      }

      // Also if control plan rows were in the same sheet, update submission
      let updatedSubmission = { ...submission, process_flow_data: parsed.processFlow.length > 0 ? parsed.processFlow : flowItems };
      if (parsed.controlPlan && parsed.controlPlan.length > 0) {
        updatedSubmission.control_plan_data = parsed.controlPlan;
        if (onSyncToControlPlan) {
          onSyncToControlPlan(parsed.controlPlan);
        }
      }

      const saved = await updatePpapSubmission(submission.id, {
        process_flow_data: updatedSubmission.process_flow_data,
        control_plan_data: updatedSubmission.control_plan_data,
      });

      onSubmissionUpdated(saved);
      setImportNotice(`Successfully imported ${importedCount} Process Flow steps & ${parsed.controlPlan.length} Control Plan rows from Excel!`);
      setTimeout(() => setImportNotice(null), 5000);
    } catch (err) {
      console.error('Failed to parse Excel file:', err);
      alert('Error reading Excel spreadsheet. Please ensure it follows standard AIAG columns or download the template.');
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  const handleSaveToSupabase = async () => {
    try {
      setIsSaving(true);
      const updated = await updatePpapSubmission(submission.id, {
        process_flow_data: flowItems,
      });
      onSubmissionUpdated(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save process flow:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncToFmeaAndControlPlan = async () => {
    if (flowItems.length === 0) {
      alert('Please add at least one process flow operation first.');
      return;
    }

    try {
      setIsSaving(true);
      const syncedFmea = syncProcessFlowToFmea(flowItems, submission.fmea_items || []);
      const syncedCp = syncProcessFlowAndFmeaToControlPlan(
        flowItems,
        syncedFmea,
        submission.control_plan_data || []
      );

      const updated = await updatePpapSubmission(submission.id, {
        process_flow_data: flowItems,
        fmea_items: syncedFmea,
        control_plan_data: syncedCp,
      });

      if (onSyncToControlPlan) {
        onSyncToControlPlan(syncedCp);
      }

      onSubmissionUpdated(updated);
      setImportNotice(
        `⚡ 3-Way Auto-Sync Complete: ${flowItems.length} operations pushed into both PFMEA and Control Plan with zero redundant typing!`
      );
      setTimeout(() => setImportNotice(null), 5000);
    } catch (err) {
      console.error('Failed to 3-way auto-sync:', err);
      alert('Error during 3-way auto-synchronization.');
    } finally {
      setIsSaving(false);
    }
  };

  const opCount = flowItems.filter((f) => f.step_type === 'OPERATION').length;
  const inspCount = flowItems.filter((f) => f.step_type === 'INSPECTION').length;
  const transCount = flowItems.filter((f) => f.step_type === 'TRANSPORT').length;
  const storeCount = flowItems.filter((f) => f.step_type === 'STORAGE').length;

  return (
    <div className="space-y-6">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#07172C] border border-[#132E58] p-4 rounded-xl shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#132E58] text-[#81C341] rounded-lg border border-[#81C341]/40">
            <GitBranch className="w-5 h-5 text-[#81C341]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#81C341]/15 text-[#81C341] border border-[#81C341]/40 font-bold">
                AIAG PPAP Element 5
              </span>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Process Flow Diagram (PFD)
              </h2>
              {JSON.stringify(flowItems) !== JSON.stringify(submission.process_flow_data || []) && (
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded text-[10px] font-bold flex items-center gap-1 animate-pulse">
                  <AlertCircle className="w-3 h-3" />
                  <span>Unsaved Changes</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Sequence of Operations, Standard Process Symbols, Work Centers & Characteristic Mapping — {flowItems.length} Total Steps
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Import from Odoo BOM */}
          <ActionTooltip
            title="Import from Odoo BOM"
            description="Directly sync operations and work centers from live Odoo Manufacturing BOM (odoo_bom_operations)."
            position="bottom"
            badge="Odoo ERP"
          >
            <button
              onClick={handleOpenOdooBomModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#81C341] hover:bg-[#72B233] text-slate-950 rounded-lg text-xs font-extrabold shadow-md shadow-[#81C341]/20 transition-all active:scale-95 cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-slate-950" />
              <span>⚡ Import from Odoo BOM</span>
            </button>
          </ActionTooltip>

          {/* 3-Way Auto-Sync (PFD -> PFMEA -> Control Plan) */}
          <ActionTooltip
            title="3-Way Auto-Sync Engine"
            description="Automatically pushes all operations into both PFMEA and Control Plan, eliminating redundant data entry."
            position="bottom"
            badge="AIAG Sync"
          >
            <button
              onClick={handleSyncToFmeaAndControlPlan}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-[#132E58] to-[#1C4482] hover:from-[#1C4482] hover:to-[#23569c] text-[#81C341] border border-[#81C341]/40 rounded-lg text-xs font-bold shadow-md shadow-indigo-500/20 transition-all active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#81C341]" />
              <span>Auto-Sync PFMEA & Control Plan</span>
            </button>
          </ActionTooltip>

          {/* Download Template Excel */}
          <ActionTooltip
            title="Download Excel Template"
            description="Downloads blank pre-formatted Excel template for offline Process Flow and Control Plan entry."
            position="bottom"
            badge="Template"
          >
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0B2545] hover:bg-[#132E58] text-slate-200 border border-[#132E58] rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5 text-[#81C341]" />
              <span>Excel Template</span>
            </button>
          </ActionTooltip>

          {/* Import Excel */}
          <ActionTooltip
            title="Import Process Flow from Excel"
            description="Uploads an Excel (.xlsx) file to automatically import operations, symbols, and steps."
            position="bottom"
            badge="Import"
          >
            <label
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0B2545] hover:bg-[#132E58] text-cyan-300 border border-[#132E58] rounded-lg text-xs font-semibold cursor-pointer transition-all active:scale-95"
            >
              <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isImporting ? 'Importing...' : 'Import from Excel (.xlsx)'}</span>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleExcelFileUpload}
                className="hidden"
              />
            </label>
          </ActionTooltip>

          {/* Add Step */}
          <ActionTooltip
            title="Add Process Step"
            description="Inserts a new operation, inspection, transport, or storage step and automatically scrolls into view."
            position="bottom"
            badge="Editor"
          >
            <button
              onClick={handleAddItem}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#132E58] hover:bg-[#1C4482] text-white border border-[#81C341]/40 font-semibold rounded-lg text-xs transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#81C341]" />
              <span>Add Step</span>
            </button>
          </ActionTooltip>

          {/* Save to Supabase */}
          <ActionTooltip
            title="Save Process Flow"
            description="Persists all operations, symbols, and characteristics to the Supabase database."
            position="bottom"
            badge="Save"
          >
            <button
              onClick={handleSaveToSupabase}
              disabled={isSaving}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer ${
                savedSuccess
                  ? 'bg-emerald-600 text-white shadow-emerald-500/30'
                  : JSON.stringify(flowItems) !== JSON.stringify(submission.process_flow_data || [])
                  ? 'bg-[#81C341] hover:bg-[#72B233] text-slate-950 shadow-[#81C341]/30 font-extrabold ring-2 ring-[#81C341]/50'
                  : 'bg-[#132E58] hover:bg-[#1C4482] text-[#81C341] border border-[#81C341]/40'
              }`}
            >
              {savedSuccess ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4 text-[#81C341]" />}
              <span>{savedSuccess ? 'Saved to Supabase!' : isSaving ? 'Saving...' : JSON.stringify(flowItems) !== JSON.stringify(submission.process_flow_data || []) ? 'Save Flow (Unsaved)' : 'Save Flow'}</span>
            </button>
          </ActionTooltip>
        </div>
      </div>

      {/* Import Notification Banner */}
      {importNotice && (
        <div className="bg-blue-950/60 border border-blue-800 text-blue-200 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{importNotice}</span>
        </div>
      )}

      {/* Process Symbols Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400">Total Steps</span>
            <p className="text-xl font-mono font-bold text-white mt-0.5">{flowItems.length}</p>
          </div>
          <span className="text-xl">📊</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] text-blue-400">Operations</span>
            <p className="text-xl font-mono font-bold text-blue-300 mt-0.5">{opCount}</p>
          </div>
          <span className="text-xl">⭕</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] text-emerald-400">Inspections</span>
            <p className="text-xl font-mono font-bold text-emerald-300 mt-0.5">{inspCount}</p>
          </div>
          <span className="text-xl">⏹</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] text-amber-400">Transports</span>
            <p className="text-xl font-mono font-bold text-amber-300 mt-0.5">{transCount}</p>
          </div>
          <span className="text-xl">➡️</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] text-purple-400">Storages</span>
            <p className="text-xl font-mono font-bold text-purple-300 mt-0.5">{storeCount}</p>
          </div>
          <span className="text-xl">🔺</span>
        </div>
      </div>

      {/* Process Flow Interactive Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 text-[11px]">
                <th className="p-3 w-16 text-center">Op #</th>
                <th className="p-3">Process Operation / Step Description</th>
                <th className="p-3 w-40 text-center">AIAG Symbol / Type</th>
                <th className="p-3">Work Center / Machine / Line</th>
                <th className="p-3">Key Product Characteristic</th>
                <th className="p-3">Key Process Characteristic</th>
                <th className="p-3">Control Method / Tool</th>
                <th className="p-3 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {flowItems.map((item, idx) => {
                const typeCfg = STEP_TYPE_CONFIG[item.step_type] || STEP_TYPE_CONFIG.OPERATION;
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
                    <td className="p-3 text-center">
                      <input
                        type="number"
                        value={item.op_no}
                        onChange={(e) => handleUpdateItem(idx, 'op_no', parseInt(e.target.value) || 10)}
                        className="w-12 text-center bg-blue-500/10 border border-blue-500/30 rounded py-1 font-mono font-bold text-blue-300"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        ref={(el) => {
                          if (el) opNameInputRefs.current.set(idx, el);
                          else opNameInputRefs.current.delete(idx);
                        }}
                        type="text"
                        value={item.operation_name}
                        onChange={(e) => handleUpdateItem(idx, 'operation_name', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded px-2 py-1 text-slate-200 outline-none text-xs"
                        placeholder="Operation name..."
                      />
                    </td>
                    <td className="p-3 text-center">
                      <select
                        value={item.step_type}
                        onChange={(e) => handleUpdateItem(idx, 'step_type', e.target.value as ProcessStepType)}
                        className={`w-full text-center rounded py-1 text-[11px] font-bold border ${typeCfg.badgeClass}`}
                      >
                        <option value="OPERATION">⭕ Operation (加工)</option>
                        <option value="INSPECTION">⏹ Inspection (检验)</option>
                        <option value="TRANSPORT">➡️ Transport (转运)</option>
                        <option value="STORAGE">🔺 Storage (存储)</option>
                        <option value="DELAY">⏳ Delay (等待)</option>
                      </select>
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={item.work_center}
                        onChange={(e) => handleUpdateItem(idx, 'work_center', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300"
                        placeholder="Machine or station..."
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={item.key_product_char}
                        onChange={(e) => handleUpdateItem(idx, 'key_product_char', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-cyan-300 font-mono text-[11px]"
                        placeholder="Product dimensions/spec..."
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={item.key_process_char}
                        onChange={(e) => handleUpdateItem(idx, 'key_process_char', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300"
                        placeholder="Feed, speed, temp, pressure..."
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={item.control_method}
                        onChange={(e) => handleUpdateItem(idx, 'control_method', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300"
                        placeholder="Gage, sensor, visual, SPC..."
                      />
                    </td>
                    <td className="p-3 text-center">
                      <ActionTooltip
                        title="Delete Step"
                        description="Removes this operation step from the Process Flow Diagram."
                        position="left"
                        badge="Delete"
                      >
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(idx)}
                          className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-red-600/20 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </ActionTooltip>
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
            title="Add New Process Step"
            description="Appends a new operation step at the bottom of the sequence and scrolls into view."
            position="top"
            badge="Add"
          >
            <button
              onClick={handleAddItem}
              className="w-full py-2.5 border-2 border-dashed border-slate-700 hover:border-blue-500/80 hover:bg-blue-600/10 text-slate-400 hover:text-blue-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              <Plus className="w-4 h-4 text-blue-400" />
              <span>+ Add New Process Step (Operation)</span>
            </button>
          </ActionTooltip>
        </div>
      </div>

      {/* Odoo BOM Operations Import Modal */}
      {isOdooBomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-[#07172C] border border-[#132E58] rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#132E58] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#81C341]/15 text-[#81C341] border border-[#81C341]/30">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Import Operations from Odoo BOM</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#81C341]/20 text-[#81C341] border border-[#81C341]/40">
                      Live Odoo Sync
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Query manufacturing routing & work centers from <code>odoo_bom_operations</code>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOdooBomModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Sku Selector */}
              <div>
                <label className="text-slate-300 font-medium block mb-1">
                  Target Product SKU in Odoo
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <OdooSearchSelect<OdooPartProduct>
                      placeholder="Search or enter SKU (e.g. C5-R-24, C4-TE-48)..."
                      value={odooBomSkuQuery}
                      onChange={(sku) => {
                        setOdooBomSkuQuery(sku);
                        loadBomForSku(sku);
                      }}
                      options={allOdooParts}
                      getOptionLabel={(p) => `${p.sku} — ${p.name}`}
                      getOptionValue={(p) => p.sku}
                      getOptionSubLabel={(p) => p.description || p.partnerName}
                      badge="BOM Parts"
                      inputClassName="font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => loadBomForSku(odooBomSkuQuery)}
                    className="px-3 py-2 bg-[#132E58] hover:bg-[#1C4482] text-[#81C341] font-bold rounded-lg text-xs border border-[#81C341]/40 shrink-0 cursor-pointer"
                  >
                    Search BOM
                  </button>
                </div>
              </div>

              {/* Operations Preview */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-300 font-medium">
                    Found Operations in Odoo ({odooBomOperationsPreview.length})
                  </label>
                  <div className="flex items-center gap-3 text-[11px]">
                    <label className="flex items-center gap-1 cursor-pointer text-slate-300">
                      <input
                        type="radio"
                        name="importMode"
                        value="REPLACE"
                        checked={bomImportMode === 'REPLACE'}
                        onChange={() => setBomImportMode('REPLACE')}
                        className="text-[#81C341] focus:ring-[#81C341]"
                      />
                      <span>Replace current ({flowItems.length})</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer text-slate-300">
                      <input
                        type="radio"
                        name="importMode"
                        value="APPEND"
                        checked={bomImportMode === 'APPEND'}
                        onChange={() => setBomImportMode('APPEND')}
                        className="text-[#81C341] focus:ring-[#81C341]"
                      />
                      <span>Append</span>
                    </label>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-2 max-h-56 overflow-y-auto divide-y divide-slate-800/60">
                  {isLoadingBom ? (
                    <div className="py-8 text-center text-slate-400">
                      <span>Querying Odoo BOM operations...</span>
                    </div>
                  ) : odooBomOperationsPreview.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 space-y-1">
                      <p className="text-slate-300">No BOM operations found for &quot;{odooBomSkuQuery}&quot;</p>
                      <p className="text-[11px] text-slate-500">
                        Try selecting a part with defined routing (e.g. <code>C5-R-24</code>, <code>C4-TE-48</code>, <code>C4-20TE-36</code>)
                      </p>
                    </div>
                  ) : (
                    odooBomOperationsPreview.map((op, i) => (
                      <div key={op.id || i} className="py-2 px-2 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-6 h-6 rounded-md bg-[#132E58] text-[#81C341] flex items-center justify-center font-mono text-[10px] font-bold shrink-0">
                            {op.sequence || (i + 1) * 10}
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-white truncate">{op.operationName}</p>
                            <p className="text-[11px] text-slate-400 truncate">{op.workcenterName}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {op.timeCycleMinutes > 0 && (
                            <span className="text-[11px] font-mono text-[#81C341] bg-[#81C341]/10 px-1.5 py-0.5 rounded border border-[#81C341]/20">
                              {op.timeCycleMinutes} min
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-[#132E58]">
                <button
                  type="button"
                  onClick={() => setIsOdooBomModalOpen(false)}
                  className="px-4 py-2 bg-[#0B2545] hover:bg-[#132E58] text-slate-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={odooBomOperationsPreview.length === 0 || isSaving}
                  onClick={handleConfirmOdooBomImport}
                  className="px-4 py-2 bg-[#81C341] hover:bg-[#72B233] disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold rounded-lg text-xs shadow-md shadow-[#81C341]/20 transition-all active:scale-95 cursor-pointer"
                >
                  Import {odooBomOperationsPreview.length} Operations into PFD
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
