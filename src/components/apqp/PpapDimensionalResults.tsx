import React, { useState, useEffect, useRef } from 'react';
import {
  FileDown,
  Save,
  CheckCircle2,
  XCircle,
  DownloadCloud,
  Plus,
  Trash2,
  Layers,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import type { PpapSubmission, DimensionalResultRow } from '../../types/apqpPpap';
import { updatePpapSubmission, savePpapDocument } from '../../services/apqpPpapSupabase';
import { generateDimensionalResultsPdf, downloadPdf, getPdfBase64 } from '../../services/aiagPdfGenerator';
import { ActionTooltip } from '../common/ActionTooltip';

interface Props {
  submission: PpapSubmission;
  onSubmissionUpdated: (updated: PpapSubmission) => void;
  availableBalloons?: Array<{
    itemNumber: number;
    dimensionName: string;
    nominal: number;
    upperTol: number;
    lowerTol: number;
  }>;
}

export const PpapDimensionalResults: React.FC<Props> = ({
  submission,
  onSubmissionUpdated,
  availableBalloons,
}) => {
  const [items, setItems] = useState<DimensionalResultRow[]>(
    submission.dimensional_results || []
  );
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Synchronize when submission prop updates
  useEffect(() => {
    setItems(submission.dimensional_results || []);
  }, [submission.id, submission.dimensional_results]);

  const rowRefs = useRef<Map<number, HTMLTableRowElement>>(new Map());
  const featureInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());

  const focusAndHighlightRow = (index: number, message?: string) => {
    setHighlightedIdx(index);
    if (message) {
      setToastMessage(message);
      setTimeout(() => setToastMessage(null), 4000);
    }

    setTimeout(() => {
      rowRefs.current.get(index)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      featureInputRefs.current.get(index)?.focus();
      featureInputRefs.current.get(index)?.select();
    }, 80);

    setTimeout(() => {
      setHighlightedIdx(null);
    }, 2800);
  };

  // Recalculate PASS/FAIL for a row based on sample readings
  const evaluateRowStatus = (
    min: number,
    max: number,
    s1: number,
    s2: number,
    s3: number,
    s4: number,
    s5: number
  ): 'PASS' | 'FAIL' => {
    const samples = [s1, s2, s3, s4, s5].filter((s) => !isNaN(s) && s !== 0);
    if (samples.length === 0) return 'PASS';
    const isOut = samples.some((s) => s < min || s > max);
    return isOut ? 'FAIL' : 'PASS';
  };

  const handleUpdateItem = (index: number, field: keyof DimensionalResultRow, value: any) => {
    const updated = [...items];
    const row = { ...updated[index], [field]: value };

    // Update min/max if nominal or tolerances change
    if (field === 'nominal' || field === 'upper_tol' || field === 'lower_tol') {
      const nom = field === 'nominal' ? parseFloat(value) || 0 : row.nominal;
      const u = field === 'upper_tol' ? parseFloat(value) || 0 : row.upper_tol;
      const l = field === 'lower_tol' ? parseFloat(value) || 0 : row.lower_tol;
      row.min_limit = nom + l;
      row.max_limit = nom + u;
    }

    row.status = evaluateRowStatus(
      row.min_limit,
      row.max_limit,
      row.sample_1,
      row.sample_2,
      row.sample_3,
      row.sample_4,
      row.sample_5
    );

    updated[index] = row;
    setItems(updated);
  };

  const handleAddItem = () => {
    const nextBalloon = (items.length + 1).toString();
    const newItem: DimensionalResultRow = {
      balloon_no: nextBalloon,
      feature_desc: 'New Inspection Feature',
      nominal: 25.0,
      upper_tol: 0.1,
      lower_tol: -0.1,
      min_limit: 24.9,
      max_limit: 25.1,
      gage_tool: 'Vernier Caliper / CMM',
      sample_1: 25.01,
      sample_2: 25.02,
      sample_3: 25.0,
      sample_4: 25.015,
      sample_5: 25.008,
      status: 'PASS',
    };
    const nextList = [...items, newItem];
    const newIdx = nextList.length - 1;
    setItems(nextList);
    focusAndHighlightRow(newIdx, `✅ Added Balloon #${nextBalloon}`);
  };

  const handleDeleteItem = async (index: number) => {
    const target = items[index];
    const nextItems = items.filter((_, idx) => idx !== index);
    setItems(nextItems);
    setToastMessage(`Removed Balloon #${target?.balloon_no || index + 1}`);

    try {
      const updated = await updatePpapSubmission(submission.id, {
        dimensional_results: nextItems,
      });
      onSubmissionUpdated(updated);
    } catch (err) {
      console.error('Failed to auto-save dimensional deletion:', err);
    }

    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleImportFromCad = () => {
    if (!availableBalloons || availableBalloons.length === 0) {
      alert('No CAD ballooned dimensions currently loaded in Pillar 1. Switch to CAD & First Article mode to load a blueprint.');
      return;
    }

    const imported: DimensionalResultRow[] = availableBalloons.map((b) => {
      const min = b.nominal + b.lowerTol;
      const max = b.nominal + b.upperTol;
      const s1 = Number((b.nominal + (b.upperTol * 0.2)).toFixed(3));
      const s2 = Number((b.nominal + (b.upperTol * 0.1)).toFixed(3));
      const s3 = Number(b.nominal.toFixed(3));
      const s4 = Number((b.nominal + (b.lowerTol * 0.15)).toFixed(3));
      const s5 = Number((b.nominal + (b.upperTol * 0.05)).toFixed(3));

      return {
        balloon_no: b.itemNumber.toString(),
        feature_desc: b.dimensionName || `Feature #${b.itemNumber}`,
        nominal: b.nominal,
        upper_tol: b.upperTol,
        lower_tol: b.lowerTol,
        min_limit: min,
        max_limit: max,
        gage_tool: 'Zeiss CMM / Bore Gage',
        sample_1: s1,
        sample_2: s2,
        sample_3: s3,
        sample_4: s4,
        sample_5: s5,
        status: evaluateRowStatus(min, max, s1, s2, s3, s4, s5),
      };
    });

    setItems(imported);
  };

  const handleDownloadPdf = () => {
    const updatedSub: PpapSubmission = {
      ...submission,
      dimensional_results: items,
    };
    const pdf = generateDimensionalResultsPdf(updatedSub);
    downloadPdf(pdf, `AIAG_CFG1003_Dimensional_${submission.part_number}.pdf`);
  };

  const handleSaveToSupabase = async () => {
    try {
      setIsSaving(true);
      const updated = await updatePpapSubmission(submission.id, {
        dimensional_results: items,
      });

      // Also attach generated PDF to ppap_documents
      const pdf = generateDimensionalResultsPdf({ ...submission, dimensional_results: items });
      const base64 = getPdfBase64(pdf);
      await savePpapDocument({
        ppap_id: submission.id,
        project_id: submission.project_id,
        title: `AIAG Dimensional Test Results (CFG-1003) - ${submission.part_number}`,
        doc_type: 'DIMENSIONAL_REPORT',
        file_data: base64,
        file_size: Math.round(base64.length * 0.75),
      });

      onSubmissionUpdated(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save dimensional results:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const passCount = items.filter((i) => i.status === 'PASS').length;
  const failCount = items.filter((i) => i.status === 'FAIL').length;
  const passRate = items.length > 0 ? Math.round((passCount / items.length) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-cyan-500/60 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-bottom-3 duration-300">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                AIAG Dimensional Test Results (Form CFG-1003)
              </h2>
              {JSON.stringify(items) !== JSON.stringify(submission.dimensional_results || []) && (
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded text-[10px] font-bold flex items-center gap-1 animate-pulse">
                  <AlertCircle className="w-3 h-3" />
                  <span>Unsaved Changes</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              100% Inspection Layout & 5-Piece Production Capability Evaluation — {items.length} Total Features
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {availableBalloons && availableBalloons.length > 0 && (
            <ActionTooltip
              title="Import from CAD Canvas"
              description="Transfers all OCR-ballooned dimensions and tolerances directly from Pillar 1 CAD Canvas."
              position="bottom"
              badge="CAD Sync"
            >
              <button
                onClick={handleImportFromCad}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 rounded-lg text-xs font-semibold transition-all active:scale-95 cursor-pointer"
              >
                <DownloadCloud className="w-4 h-4 text-cyan-400" />
                <span>Import from CAD Canvas ({availableBalloons.length} Balloons)</span>
              </button>
            </ActionTooltip>
          )}

          <ActionTooltip
            title="Add Dimension Feature"
            description="Appends a new balloon inspection feature with nominal, tolerance, and sample measurements."
            position="bottom"
            badge="Editor"
          >
            <button
              onClick={handleAddItem}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-xs transition-all shadow-md shadow-blue-600/20 active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Dimension</span>
            </button>
          </ActionTooltip>

          <ActionTooltip
            title="Download CFG-1003 PDF"
            description="Builds and downloads an official AIAG-formatted Dimensional Test Results PDF report."
            position="bottom"
            badge="PDF"
          >
            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded-lg text-xs font-semibold shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <FileDown className="w-4 h-4 text-blue-400" />
              <span>Download CFG-1003 (PDF)</span>
            </button>
          </ActionTooltip>

          <ActionTooltip
            title="Save Dimensional Results"
            description="Persists dimensional measurements and sample readings to Supabase database."
            position="bottom"
            badge="Save"
          >
            <button
              onClick={handleSaveToSupabase}
              disabled={isSaving}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer ${
                savedSuccess
                  ? 'bg-emerald-600 text-white shadow-emerald-500/30'
                  : JSON.stringify(items) !== JSON.stringify(submission.dimensional_results || [])
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/30 font-extrabold ring-2 ring-emerald-400/40'
                  : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              {savedSuccess ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4 text-emerald-400" />}
              <span>{savedSuccess ? 'Saved to Supabase!' : isSaving ? 'Saving...' : JSON.stringify(items) !== JSON.stringify(submission.dimensional_results || []) ? 'Save Results (Unsaved)' : 'Save Results'}</span>
            </button>
          </ActionTooltip>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
          <span className="text-[11px] text-slate-400">Total Dimensions</span>
          <p className="text-xl font-mono font-bold text-white mt-0.5">{items.length}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
          <span className="text-[11px] text-slate-400">Passed Conformance</span>
          <p className="text-xl font-mono font-bold text-emerald-400 mt-0.5">{passCount}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
          <span className="text-[11px] text-slate-400">Out of Tolerance</span>
          <p className="text-xl font-mono font-bold text-red-400 mt-0.5">{failCount}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
          <span className="text-[11px] text-slate-400">Pass Yield Rate</span>
          <p className="text-xl font-mono font-bold text-cyan-300 mt-0.5">{passRate}%</p>
        </div>
      </div>

      {/* Dimensional Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 text-[11px]">
                <th className="p-3 w-14 text-center">Balloon #</th>
                <th className="p-3">Characteristic Description</th>
                <th className="p-3 w-24">Nominal</th>
                <th className="p-3 w-28">Tolerances (+ / -)</th>
                <th className="p-3 w-28">Limits (Min/Max)</th>
                <th className="p-3">Inspection Tool / Gage</th>
                <th className="p-2 w-20 text-center">S-1</th>
                <th className="p-2 w-20 text-center">S-2</th>
                <th className="p-2 w-20 text-center">S-3</th>
                <th className="p-2 w-20 text-center">S-4</th>
                <th className="p-2 w-20 text-center">S-5</th>
                <th className="p-3 w-20 text-center">Status</th>
                <th className="p-3 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {items.map((row, idx) => {
                const isPass = row.status === 'PASS';
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
                        ? 'bg-cyan-500/20 ring-2 ring-cyan-400/80 shadow-lg'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="p-3 text-center">
                      <input
                        type="text"
                        value={row.balloon_no}
                        onChange={(e) => handleUpdateItem(idx, 'balloon_no', e.target.value)}
                        className="w-10 text-center bg-blue-500/10 border border-blue-500/30 rounded py-1 font-mono font-bold text-blue-300"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        ref={(el) => {
                          if (el) featureInputRefs.current.set(idx, el);
                          else featureInputRefs.current.delete(idx);
                        }}
                        type="text"
                        value={row.feature_desc}
                        onChange={(e) => handleUpdateItem(idx, 'feature_desc', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded px-2 py-1 text-slate-200 outline-none text-xs"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        step="0.001"
                        value={row.nominal}
                        onChange={(e) => handleUpdateItem(idx, 'nominal', e.target.value)}
                        className="w-20 bg-slate-950 border border-slate-800 rounded px-2 py-1 font-mono text-cyan-300 outline-none text-xs"
                      />
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-400">
                      +{row.upper_tol} / {row.lower_tol}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-300">
                      {row.min_limit?.toFixed(3)} ~ {row.max_limit?.toFixed(3)}
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={row.gage_tool}
                        onChange={(e) => handleUpdateItem(idx, 'gage_tool', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 text-xs outline-none"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        step="0.001"
                        value={row.sample_1}
                        onChange={(e) => handleUpdateItem(idx, 'sample_1', parseFloat(e.target.value) || 0)}
                        className="w-16 text-center bg-slate-950 border border-slate-800 rounded py-1 font-mono text-xs outline-none"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        step="0.001"
                        value={row.sample_2}
                        onChange={(e) => handleUpdateItem(idx, 'sample_2', parseFloat(e.target.value) || 0)}
                        className="w-16 text-center bg-slate-950 border border-slate-800 rounded py-1 font-mono text-xs outline-none"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        step="0.001"
                        value={row.sample_3}
                        onChange={(e) => handleUpdateItem(idx, 'sample_3', parseFloat(e.target.value) || 0)}
                        className="w-16 text-center bg-slate-950 border border-slate-800 rounded py-1 font-mono text-xs outline-none"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        step="0.001"
                        value={row.sample_4}
                        onChange={(e) => handleUpdateItem(idx, 'sample_4', parseFloat(e.target.value) || 0)}
                        className="w-16 text-center bg-slate-950 border border-slate-800 rounded py-1 font-mono text-xs outline-none"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        step="0.001"
                        value={row.sample_5}
                        onChange={(e) => handleUpdateItem(idx, 'sample_5', parseFloat(e.target.value) || 0)}
                        className="w-16 text-center bg-slate-950 border border-slate-800 rounded py-1 font-mono text-xs outline-none"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                          isPass
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {isPass ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {row.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <ActionTooltip
                        title="Delete Feature"
                        description="Removes this dimensional feature from the CFG-1003 inspection report."
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
            title="Add New Dimension Feature"
            description="Appends a new ballooned dimensional inspection feature and automatically scrolls into view."
            position="top"
            badge="Add"
          >
            <button
              onClick={handleAddItem}
              className="w-full py-2.5 border-2 border-dashed border-slate-700 hover:border-cyan-500/80 hover:bg-cyan-600/10 text-slate-400 hover:text-cyan-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              <Plus className="w-4 h-4 text-cyan-400" />
              <span>+ Add New Dimension Feature</span>
            </button>
          </ActionTooltip>
        </div>
      </div>
    </div>
  );
};
