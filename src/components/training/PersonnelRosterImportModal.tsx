// ============================================================================
// Quality Compass // Enterprise Personnel Roster CSV Import Modal
// Path: src/components/training/PersonnelRosterImportModal.tsx
//
// Supports CSV upload/paste, pre-validation diff engine, duplicate detection,
// temporary PIN generation, batch provisioning, and printable onboarding handouts.
// ============================================================================

import React, { useState, useRef } from 'react';
import { 
  X, 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  ArrowRight, 
  RefreshCw, 
  UserPlus, 
  Printer, 
  Eye, 
  EyeOff, 
  HardHat, 
  KeyRound
} from 'lucide-react';
import { 
  validateRosterCsv, 
  executeRosterImport, 
  generateRosterTemplateCsv, 
  exportHandoutCsv 
} from '../../services/rosterImportService';
import type { 
  RosterValidationSummary, 
  RosterImportExecutionResult, 
  ParsedRosterRow 
} from '../../types/rosterImport';

interface PersonnelRosterImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

type ModalStep = 'UPLOAD' | 'PREVIEW' | 'COMPLETE';
type TableFilter = 'ALL' | 'NEW' | 'UPDATE' | 'ERROR';

export const PersonnelRosterImportModal: React.FC<PersonnelRosterImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const [step, setStep] = useState<ModalStep>('UPLOAD');
  const [csvText, setCsvText] = useState<string>('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [validationSummary, setValidationSummary] = useState<RosterValidationSummary | null>(null);
  const [filter, setFilter] = useState<TableFilter>('ALL');
  const [resetExistingPins, setResetExistingPins] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<RosterImportExecutionResult | null>(null);
  const [showPins, setShowPins] = useState<boolean>(false);
  const [printMode, setPrintMode] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      setCsvText(content || '');
    };
    reader.readAsText(file);
  };

  // Download CSV template
  const handleDownloadTemplate = () => {
    const csv = generateRosterTemplateCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quality-compass-roster-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Load sample data
  const handleLoadSample = () => {
    const sample = generateRosterTemplateCsv();
    setCsvText(sample);
    setFileName('sample_roster.csv');
  };

  // Validate CSV and move to preview
  const handleAnalyze = async () => {
    if (!csvText.trim()) return;

    setIsValidating(true);
    try {
      const summary = await validateRosterCsv(csvText);
      setValidationSummary(summary);
      setStep('PREVIEW');
    } catch (err: any) {
      alert(`Validation error: ${err.message || 'Failed to parse CSV'}`);
    } finally {
      setIsValidating(false);
    }
  };

  // Execute Import
  const handleExecuteImport = async () => {
    if (!validationSummary) return;

    setIsExecuting(true);
    try {
      const res = await executeRosterImport(validationSummary.rows, {
        resetExistingPins,
      });
      setExecutionResult(res);
      setStep('COMPLETE');
      if (onImportComplete) {
        onImportComplete();
      }
    } catch (err: any) {
      alert(`Import failed: ${err.message || 'Unknown error during provisioning'}`);
    } finally {
      setIsExecuting(false);
    }
  };

  // Download Handout CSV
  const handleDownloadHandouts = () => {
    if (!executionResult) return;
    const csv = exportHandoutCsv(executionResult.handoutRecords);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `onboarding-handouts-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter rows for preview table
  const displayedRows: ParsedRosterRow[] = React.useMemo(() => {
    if (!validationSummary) return [];
    if (filter === 'NEW') return validationSummary.rows.filter((r) => r.action === 'CREATE');
    if (filter === 'UPDATE') return validationSummary.rows.filter((r) => r.action === 'UPDATE');
    if (filter === 'ERROR') return validationSummary.rows.filter((r) => r.action === 'INVALID');
    return validationSummary.rows;
  }, [validationSummary, filter]);

  // Company Brand Color helper
  const getCompanyBadgeClass = (company: string) => {
    switch (company) {
      case 'TERRE':
        return 'bg-[#5c6f5a]/20 text-[#8fa78c] border-[#5c6f5a]/40';
      case 'MANTIS':
        return 'bg-[#81C341]/20 text-[#81C341] border-[#81C341]/40';
      case 'MAKERS':
        return 'bg-[#ea580c]/20 text-[#ea580c] border-[#ea580c]/40';
      default:
        return 'bg-[#70c128]/20 text-[#70c128] border-[#70c128]/40';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Personnel Roster CSV Import & Provisioning
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                  Step 2A.c
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Bulk onboarding, duplicate detection, automatic 4-digit temporary PINs &amp; handout generation.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ================================================================ */}
          {/* STEP 1: UPLOAD & PASTE */}
          {/* ================================================================ */}
          {step === 'UPLOAD' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Actions Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-800/40 border border-slate-800">
                <div>
                  <div className="text-sm font-semibold text-slate-200">1. Select or Paste Personnel CSV</div>
                  <div className="text-xs text-slate-400">
                    Supports columns: <code>badge, first_name, last_name, company, department, shift, job_title, email</code>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    Download CSV Template
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadSample}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/30 transition-colors cursor-pointer"
                  >
                    Load Sample Roster
                  </button>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-amber-500/60 rounded-xl p-8 flex flex-col items-center justify-center gap-3 bg-slate-950/40 hover:bg-slate-800/30 transition-all cursor-pointer group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="p-3 rounded-full bg-slate-800 group-hover:bg-amber-500/20 text-slate-400 group-hover:text-amber-400 transition-colors">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <div className="text-center">
                  <span className="text-sm font-semibold text-slate-200 group-hover:text-amber-300 transition-colors">
                    {fileName ? `Loaded: ${fileName}` : 'Click to select CSV file from your computer'}
                  </span>
                  <p className="text-xs text-slate-500 mt-1">or drag and drop your exported HR/Payroll CSV here</p>
                </div>
              </div>

              {/* Direct Paste Area */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Or Paste Raw CSV Data Directly:
                </label>
                <textarea
                  rows={6}
                  value={csvText}
                  onChange={(e) => {
                    setCsvText(e.target.value);
                    if (fileName) setFileName(null);
                  }}
                  placeholder="employee_number,first_name,last_name,email,job_title,operating_company,department,shift,hire_date&#10;1016,Sarah,Connor,sconnor@nhimm.com,Assembly Tech L1,NHI,Assembly,Shift 1 (Day),2026-10-14"
                  className="w-full font-mono text-xs p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/60 transition-colors resize-none"
                />
              </div>

              {/* Submit to Preview Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  disabled={!csvText.trim() || isValidating}
                  onClick={handleAnalyze}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
                >
                  {isValidating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Analyzing Roster &amp; Checking Personnel...
                    </>
                  ) : (
                    <>
                      <span>Analyze &amp; Preview Import Diff</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* STEP 2: PRE-VALIDATION & DIFF PREVIEW */}
          {/* ================================================================ */}
          {step === 'PREVIEW' && validationSummary && (
            <div className="space-y-5 animate-in fade-in duration-150">
              
              {/* Summary Stats Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div 
                  onClick={() => setFilter('ALL')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    filter === 'ALL' 
                      ? 'bg-slate-800 border-slate-600 shadow-md' 
                      : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="text-[11px] uppercase font-bold text-slate-400">Total Rows</div>
                  <div className="text-xl font-extrabold text-white mt-0.5">{validationSummary.totalRows}</div>
                </div>

                <div 
                  onClick={() => setFilter('NEW')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    filter === 'NEW' 
                      ? 'bg-emerald-950/40 border-emerald-500/60 shadow-md' 
                      : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="text-[11px] uppercase font-bold text-emerald-400 flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5" />
                    New Hires
                  </div>
                  <div className="text-xl font-extrabold text-emerald-300 mt-0.5">{validationSummary.newHireCount}</div>
                </div>

                <div 
                  onClick={() => setFilter('UPDATE')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    filter === 'UPDATE' 
                      ? 'bg-amber-950/40 border-amber-500/60 shadow-md' 
                      : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="text-[11px] uppercase font-bold text-amber-400 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5" />
                    Updates to Existing
                  </div>
                  <div className="text-xl font-extrabold text-amber-300 mt-0.5">{validationSummary.updateCount}</div>
                </div>

                <div 
                  onClick={() => setFilter('ERROR')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    filter === 'ERROR' 
                      ? 'bg-rose-950/40 border-rose-500/60 shadow-md' 
                      : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="text-[11px] uppercase font-bold text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Errors / Skipped
                  </div>
                  <div className="text-xl font-extrabold text-rose-300 mt-0.5">{validationSummary.errorCount}</div>
                </div>
              </div>

              {/* Options & Visibility Controls */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
                <label className="flex items-center gap-2.5 text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={resetExistingPins}
                    onChange={(e) => setResetExistingPins(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-amber-500/40"
                  />
                  <span>
                    <strong className="text-white">Reset PIN for existing personnel:</strong> Force new temporary PINs for employees already in the directory.
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => setShowPins(!showPins)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold cursor-pointer transition-colors"
                >
                  {showPins ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5 text-amber-400" />}
                  {showPins ? 'Hide Temporary PINs' : 'Reveal Temporary PINs'}
                </button>
              </div>

              {/* Roster Diff Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                <div className="max-h-[360px] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-950 sticky top-0 z-10 text-[11px] uppercase font-bold text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-3 w-12 text-center">Row</th>
                        <th className="p-3">Badge #</th>
                        <th className="p-3">Employee Name</th>
                        <th className="p-3">Company</th>
                        <th className="p-3">Dept &amp; Shift</th>
                        <th className="p-3">Action</th>
                        <th className="p-3">Temporary PIN</th>
                        <th className="p-3">Validation Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-sans">
                      {displayedRows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-500">
                            No records match the current filter.
                          </td>
                        </tr>
                      ) : (
                        displayedRows.map((r) => (
                          <tr 
                            key={r.rowNumber}
                            className={`hover:bg-slate-800/30 transition-colors ${
                              r.status === 'ERROR' ? 'bg-rose-950/10' : ''
                            }`}
                          >
                            <td className="p-3 text-center text-slate-500 font-mono text-[11px]">
                              {r.rowNumber}
                            </td>
                            <td className="p-3 font-mono font-bold text-white">
                              #{r.employeeNumber || '—'}
                            </td>
                            <td className="p-3">
                              <div className="font-semibold text-slate-200">
                                {r.firstName} {r.lastName}
                              </div>
                              <div className="text-[11px] text-slate-500">{r.jobTitle}</div>
                            </td>
                            <td className="p-3">
                              <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border ${getCompanyBadgeClass(r.operatingCompany)}`}>
                                {r.operatingCompany}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="text-slate-300">{r.department}</div>
                              <div className="text-[11px] text-slate-500">{r.shift}</div>
                            </td>
                            <td className="p-3">
                              {r.action === 'CREATE' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">
                                  + NEW HIRE
                                </span>
                              ) : r.action === 'UPDATE' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px] border border-amber-500/30">
                                  ↻ UPDATE
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold text-[10px] border border-rose-500/30">
                                  ✕ INVALID
                                </span>
                              )}
                            </td>
                            <td className="p-3 font-mono">
                              {r.action === 'CREATE' || resetExistingPins ? (
                                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-400 font-bold">
                                  {showPins ? r.tempPin : '••••'}
                                </span>
                              ) : (
                                <span className="text-slate-500 text-[11px] italic">Existing Kept</span>
                              )}
                            </td>
                            <td className="p-3 text-[11px]">
                              {r.validationErrors.length > 0 ? (
                                <span className="text-rose-400 font-medium">
                                  {r.validationErrors.join(' ')}
                                </span>
                              ) : r.action === 'UPDATE' ? (
                                <span className="text-amber-400/80">
                                  Matches existing employee #{r.employeeNumber}. Profile will be updated.
                                </span>
                              ) : (
                                <span className="text-emerald-400/80">
                                  Ready to provision account &amp; assign training role.
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modal Step 2 Actions */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep('UPLOAD')}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer transition-colors"
                >
                  ← Back to CSV Upload
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={validationSummary.validCount === 0 || isExecuting}
                    onClick={handleExecuteImport}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
                  >
                    {isExecuting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Provisioning Personnel Accounts in Supabase...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Execute Batch Import ({validationSummary.validCount} Personnel)
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* STEP 3: RESULTS & ONBOARDING HANDOUT SLIPS */}
          {/* ================================================================ */}
          {step === 'COMPLETE' && executionResult && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* Success Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/50 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Personnel Batch Provisioning Complete!
                    </h3>
                    <p className="text-xs text-emerald-300/80 mt-0.5">
                      Successfully processed {executionResult.totalProcessed} records ({executionResult.createdCount} newly provisioned, {executionResult.updatedCount} updated, {executionResult.failedCount} failed).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadHandouts}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    Download Handout CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintMode(!printMode)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/40 transition-colors cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    {printMode ? 'View Summary Table' : 'Print Onboarding Slips'}
                  </button>
                </div>
              </div>

              {/* Handout Slips View (Printable Badge Cards) */}
              {printMode ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
                    <span>Printable Employee Handout Badges (Distribute to Operators on Shop Floor):</span>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold cursor-pointer"
                    >
                      Print Now
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[440px] overflow-y-auto p-1">
                    {executionResult.handoutRecords
                      .filter((h) => h.action !== 'FAILED' && h.tempPin)
                      .map((h) => (
                        <div
                          key={h.employeeNumber}
                          className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between gap-3 shadow-lg"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 flex items-center gap-1">
                                <HardHat className="w-3.5 h-3.5" />
                                Quality Compass // Initial Login
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getCompanyBadgeClass(h.operatingCompany)}`}>
                                {h.operatingCompany}
                              </span>
                            </div>

                            <div className="text-base font-bold text-white">
                              {h.firstName} {h.lastName}
                            </div>
                            <div className="text-xs text-slate-400">
                              {h.jobTitle} • {h.department}
                            </div>
                          </div>

                          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                            <div>
                              <div className="text-[10px] text-slate-400 uppercase font-bold">Badge Number</div>
                              <div className="font-mono text-base font-bold text-white">#{h.employeeNumber}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] text-amber-400 uppercase font-bold flex items-center gap-1 justify-end">
                                <KeyRound className="w-3 h-3" />
                                Temporary PIN
                              </div>
                              <div className="font-mono text-lg font-extrabold text-amber-300 tracking-wider">
                                {h.tempPin}
                              </div>
                            </div>
                          </div>

                          <div className="text-[10px] text-slate-500 leading-tight">
                            * Go to any Shop-Floor Kiosk, enter Badge #{h.employeeNumber} &amp; PIN above. You will be prompted to create your personal 4-digit PIN on initial login.
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                /* Standard Summary Table */
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                  <div className="max-h-[380px] overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-950 sticky top-0 z-10 text-[11px] uppercase font-bold text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="p-3">Badge #</th>
                          <th className="p-3">Employee Name</th>
                          <th className="p-3">Company &amp; Dept</th>
                          <th className="p-3">Action</th>
                          <th className="p-3">Temporary PIN</th>
                          <th className="p-3">Status Note</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-sans">
                        {executionResult.handoutRecords.map((h) => (
                          <tr key={h.employeeNumber} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-3 font-mono font-bold text-white">#{h.employeeNumber}</td>
                            <td className="p-3">
                              <div className="font-semibold text-slate-200">{h.firstName} {h.lastName}</div>
                              <div className="text-[11px] text-slate-500">{h.jobTitle}</div>
                            </td>
                            <td className="p-3">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border mr-2 ${getCompanyBadgeClass(h.operatingCompany)}`}>
                                {h.operatingCompany}
                              </span>
                              <span className="text-slate-400">{h.department}</span>
                            </td>
                            <td className="p-3">
                              {h.action === 'INSERTED' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                                  Provisioned
                                </span>
                              ) : h.action === 'UPDATED' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                                  Updated
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold text-[10px]">
                                  Failed
                                </span>
                              )}
                            </td>
                            <td className="p-3 font-mono font-bold text-amber-400">
                              {h.tempPin ? h.tempPin : <span className="text-slate-500 text-xs italic font-normal">Unchanged</span>}
                            </td>
                            <td className="p-3 text-[11px] text-slate-400">
                              {h.errorMessage ? (
                                <span className="text-rose-400">{h.errorMessage}</span>
                              ) : h.tempPin ? (
                                'Forced PIN change required on 1st login'
                              ) : (
                                'Account verified and active'
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Close Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer transition-colors"
                >
                  Done &amp; Close Importer
                </button>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
