import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Download,
  FileCheck,
  FolderOpen,
  Sparkles,
  RefreshCw,
  Clock,
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
} from 'lucide-react';
import type { PpapSubmission, PpapDocumentAttachment } from '../../types/apqpPpap';
import { fetchPpapDocuments, savePpapDocument } from '../../services/apqpPpapSupabase';
import { generateFullPpapPackagePdf, downloadPdf, getPdfBase64 } from '../../services/aiagPdfGenerator';
import { exportPopulatedAiagPpapWorkbook } from '../../utils/aiagExcelService';
import { ActionTooltip } from '../common/ActionTooltip';
import { saveAs } from 'file-saver';

interface Props {
  submission: PpapSubmission;
}

export const PpapDocumentsModal: React.FC<Props> = ({ submission }) => {
  const [documents, setDocuments] = useState<PpapDocumentAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [excelSuccess, setExcelSuccess] = useState<string | null>(null);
  const customFileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      const docs = await fetchPpapDocuments(submission.id);
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to load PPAP documents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [submission.id]);

  const handleDownloadAttachment = (doc: PpapDocumentAttachment) => {
    if (doc.file_data) {
      // Decode datauri or base64
      const byteCharacters = atob(doc.file_data.split(',')[1] || doc.file_data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      saveAs(blob, `${doc.title.replace(/[/\\?%*:|"<>]/g, '_')}.pdf`);
    } else {
      alert('Document data not available for local download.');
    }
  };

  const handleGenerateFullDossier = async () => {
    try {
      setIsGenerating(true);
      const pdf = generateFullPpapPackagePdf(submission);
      const base64 = getPdfBase64(pdf);

      await savePpapDocument({
        ppap_id: submission.id,
        project_id: submission.project_id,
        title: `AIAG Full PPAP Package Dossier (Level ${submission.submission_level}) - ${submission.part_number}`,
        doc_type: 'FULL_PACKAGE_PDF',
        file_data: base64,
        file_size: Math.round(base64.length * 0.75),
      });

      downloadPdf(pdf, `AIAG_PPAP_Dossier_${submission.part_number}.pdf`);
      await loadDocuments();
    } catch (err) {
      console.error('Failed to generate full dossier:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportOfficialExcel = async () => {
    try {
      setIsExportingExcel(true);
      setExcelSuccess(null);
      await exportPopulatedAiagPpapWorkbook(submission);
      setExcelSuccess('Official AIAG PPAP Forms Workbook downloaded successfully!');
      setTimeout(() => setExcelSuccess(null), 4000);
    } catch (err) {
      console.error('Failed to export mapped PPAP Excel:', err);
      alert(`Error exporting mapped PPAP Excel: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleCustomTemplateFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsExportingExcel(true);
      setExcelSuccess(null);
      const buffer = await file.arrayBuffer();
      await exportPopulatedAiagPpapWorkbook(submission, buffer);
      setExcelSuccess(`Custom template "${file.name}" populated and downloaded!`);
      setTimeout(() => setExcelSuccess(null), 4000);
    } catch (err) {
      console.error('Failed to map custom PPAP template:', err);
      alert(`Error mapping custom PPAP template: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsExportingExcel(false);
      if (customFileInputRef.current) customFileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30">
            <FolderOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Project Attachments & Customer Artifact Vault
            </h2>
            <p className="text-xs text-slate-400">
              Persistent AIAG PDF Records, Signed Warrants, and Dossier Deliverables Stored in Supabase
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ActionTooltip
            title="Refresh Artifact Vault"
            description="Re-fetches all persistent AIAG PDF documents, signed warrants, and attached customer deliverables from Supabase."
            position="bottom"
            badge="Sync"
          >
            <button
              onClick={loadDocuments}
              disabled={isLoading}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
              aria-label="Refresh documents list"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
            </button>
          </ActionTooltip>

          <ActionTooltip
            title="Generate Full AIAG PPAP Dossier (PDF)"
            description="Compiles all 18 AIAG elements, signed PSW warrant, process flow, and capability into a unified multi-page PDF binder."
            position="bottom"
            badge="Dossier"
          >
            <button
              onClick={handleGenerateFullDossier}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-600/20 transition-all active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-cyan-300" />
              <span>{isGenerating ? 'Building Dossier...' : 'Generate Full AIAG PPAP Dossier (PDF)'}</span>
            </button>
          </ActionTooltip>
        </div>
      </div>

      {/* Official AIAG Excel PPAP Forms Workbook Section */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30 shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                  AIAG PPAP Forms Workbook (4th Edition) Pre-mapped
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  17 Fully Formatted Sheets
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mt-1">
                Automated Excel Spreadsheet Output Mapping
              </h3>
              <p className="text-xs text-slate-300 max-w-2xl mt-0.5 leading-relaxed">
                Injects all live submission data into official AIAG formatted sheets on download:
                <strong className="text-emerald-300"> Cover</strong>,
                <strong className="text-emerald-300"> THE-1001 PSW</strong>,
                <strong className="text-emerald-300"> Process Flow (PFD)</strong>,
                <strong className="text-emerald-300"> Control Plan</strong>,
                <strong className="text-emerald-300"> Dimensional CFG-1003</strong>, and
                <strong className="text-emerald-300"> PFMEA</strong>, preserving all original fonts, cell borders, and formulas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <ActionTooltip
              title="Export Official AIAG PPAP (.xlsx)"
              description="Populates and downloads the complete 17-sheet AIAG PPAP 4th Edition workbook with live part, PFD, FMEA, and Control Plan data."
              position="top"
              badge="AIAG .xlsx"
            >
              <button
                onClick={handleExportOfficialExcel}
                disabled={isExportingExcel}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>{isExportingExcel ? 'Mapping & Generating...' : 'Export Official AIAG PPAP (.xlsx)'}</span>
              </button>
            </ActionTooltip>

            <ActionTooltip
              title="Map Custom OEM Template"
              description="Upload an OEM or customer-specific PPAP Excel file (.xltm/.xlsx) to map live submission data into it."
              position="top"
              badge="Custom Excel"
            >
              <button
                onClick={() => customFileInputRef.current?.click()}
                disabled={isExportingExcel}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
                aria-label="Upload an OEM-specific or customized PPAP Excel file to map live data into"
              >
                <UploadCloud className="w-4 h-4 text-cyan-400" />
                <span>Map Custom Template (.xltm/.xlsx)</span>
              </button>
            </ActionTooltip>
            <input
              type="file"
              ref={customFileInputRef}
              onChange={handleCustomTemplateFile}
              accept=".xlsx,.xltm,.xlsm,.xls"
              className="hidden"
            />
          </div>
        </div>

        {excelSuccess && (
          <div className="mt-3.5 flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-3 py-1.5 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{excelSuccess}</span>
          </div>
        )}
      </div>

      {/* Documents List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl p-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
            <p className="text-xs">Fetching attached project artifacts from Supabase...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-3">
            <FileText className="w-12 h-12 text-slate-600 stroke-[1.5]" />
            <p className="text-sm font-medium text-slate-300">No project attachments generated yet</p>
            <p className="text-xs text-slate-500 max-w-md text-center">
              Generate an official AIAG Part Submission Warrant, Dimensional Results sheet, or Control Plan to automatically save the PDF artifact here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-start justify-between gap-4 hover:border-slate-700 transition-colors shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 mt-0.5">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white line-clamp-1">{doc.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                        {doc.doc_type}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {Math.round(doc.file_size / 1024)} KB
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {new Date(doc.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                <ActionTooltip
                  title="Download Document PDF"
                  description="Downloads this persistent AIAG artifact PDF file to your local device."
                  position="left"
                  badge="PDF"
                >
                  <button
                    onClick={() => handleDownloadAttachment(doc)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors shadow-sm"
                    aria-label="Download PDF attachment"
                  >
                    <Download className="w-4 h-4 text-cyan-400" />
                  </button>
                </ActionTooltip>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
