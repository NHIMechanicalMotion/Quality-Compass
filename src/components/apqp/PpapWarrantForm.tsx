import React, { useState, useEffect } from 'react';
import {
  FileDown,
  Save,
  CheckCircle,
  FileCheck,
  Building,
  UserCheck,
  FileSpreadsheet,
  AlertCircle,
} from 'lucide-react';
import type { PpapSubmission, PswFormData, PpapLevel, PpapSubmissionReason } from '../../types/apqpPpap';
import { updatePpapSubmission, savePpapDocument } from '../../services/apqpPpapSupabase';
import { generatePswPdf, downloadPdf, getPdfBase64 } from '../../services/aiagPdfGenerator';
import { exportPopulatedAiagPpapWorkbook } from '../../utils/aiagExcelService';
import { ActionTooltip } from '../common/ActionTooltip';

interface Props {
  submission: PpapSubmission;
  onSubmissionUpdated: (updated: PpapSubmission) => void;
}

export const PpapWarrantForm: React.FC<Props> = ({ submission, onSubmissionUpdated }) => {
  const [formData, setFormData] = useState<PswFormData>(
    submission.psw_data || {
      part_name: submission.part_name,
      cust_part_number: submission.part_number,
      supplier_name: submission.supplier_name,
      supplier_phone: '(313) 555-0199',
      supplier_email: 'quality.assurance@qualitycompass.io',
      authorized_rep: 'John Batten',
      rep_title: 'Director of Quality Assurance',
      submission_date: new Date().toISOString().split('T')[0],
      materials_reporting: true,
      polymeric_parts_identified: true,
      meets_all_specs: true,
      process_meets_capability: true,
      customer_disposition: 'APPROVED',
      customer_reviewer: 'Sarah Jenkins (Customer STA)',
      customer_comments: 'Run at Rate and dimensional Cpk capability accepted.',
      customer_signature_date: new Date().toISOString().split('T')[0],
    }
  );

  const [level, setLevel] = useState<PpapLevel>(submission.submission_level || 3);
  const [reason, setReason] = useState<PpapSubmissionReason>(submission.submission_reason || 'INITIAL_SUBMISSION');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync state when active submission changes
  useEffect(() => {
    if (submission.psw_data) {
      setFormData(submission.psw_data);
    } else {
      const defaultSupplier = submission.supplier_name && submission.supplier_name !== 'Quality Compass Precision Technologies'
        ? submission.supplier_name
        : 'NHI Mechanical Motion LLC';

      setFormData({
        part_name: submission.part_name,
        cust_part_number: submission.part_number,
        supplier_name: defaultSupplier,
        supplier_phone: '(603) 542-6500',
        supplier_email: 'quality@nhi-mfg.com',
        authorized_rep: 'John Batten',
        rep_title: 'Director of Quality Assurance',
        submission_date: new Date().toISOString().split('T')[0],
        materials_reporting: true,
        polymeric_parts_identified: true,
        meets_all_specs: true,
        process_meets_capability: true,
        customer_disposition: 'APPROVED',
        customer_reviewer: 'Sarah Jenkins (Customer STA)',
        customer_comments: 'Run at Rate and dimensional Cpk capability accepted.',
        customer_signature_date: new Date().toISOString().split('T')[0],
      });
    }
    setLevel(submission.submission_level || 3);
    setReason(submission.submission_reason || 'INITIAL_SUBMISSION');
    setIsDirty(false);
  }, [
    submission.id,
    submission.psw_data,
    submission.submission_level,
    submission.submission_reason,
    submission.part_name,
    submission.part_number,
    submission.supplier_name,
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleUpdateForm = (updates: Partial<PswFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    setIsDirty(true);
  };

  const handleDownloadPdf = () => {
    const updatedSub: PpapSubmission = {
      ...submission,
      submission_level: level,
      submission_reason: reason,
      psw_data: formData,
    };
    const pdf = generatePswPdf(updatedSub);
    downloadPdf(pdf, `AIAG_PSW_${submission.part_number}_${submission.submission_number}.pdf`);
    showToast('AIAG PSW PDF generated and downloaded.');
  };

  const handleSaveAndAttach = async () => {
    try {
      setIsSaving(true);
      const updatedSub: PpapSubmission = {
        ...submission,
        submission_level: level,
        submission_reason: reason,
        psw_data: formData,
      };

      // 1. Update in Supabase
      const saved = await updatePpapSubmission(submission.id, {
        submission_level: level,
        submission_reason: reason,
        psw_data: formData,
        status: formData.customer_disposition === 'APPROVED' ? 'APPROVED' : 'SUBMITTED',
      });

      // 2. Generate PDF and attach to ppap_documents table
      const pdf = generatePswPdf(updatedSub);
      const base64 = getPdfBase64(pdf);

      await savePpapDocument({
        ppap_id: submission.id,
        project_id: submission.project_id,
        title: `AIAG PSW Warrant (CFG-1001) - ${submission.part_number}`,
        doc_type: 'PSW_WARRANT',
        file_data: base64,
        file_size: Math.round(base64.length * 0.75),
      });

      onSubmissionUpdated(saved);
      setIsDirty(false);
      setSavedSuccess(true);
      showToast('Part Submission Warrant saved and attached to project!');
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save warrant:', err);
      showToast('Error saving warrant to Supabase');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              AIAG Part Submission Warrant (PSW — Form CFG-1001)
            </h2>
            <p className="text-xs text-slate-400">
              Automotive Industry Action Group PPAP 4th Edition Standard Legal Submission Form
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isDirty && (
            <span className="flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg font-semibold animate-pulse">
              <AlertCircle className="w-3.5 h-3.5" />
              Unsaved Changes
            </span>
          )}

          <ActionTooltip
            title="Export AIAG Excel Workbook"
            description="Exports the complete 17-sheet AIAG PPAP 4th Edition Forms Workbook (.xlsx) with PSW and all supporting tabs."
            position="bottom"
            badge="Excel .xlsx"
          >
            <button
              onClick={async () => {
                try {
                  const currentSub: PpapSubmission = {
                    ...submission,
                    submission_level: level,
                    submission_reason: reason,
                    psw_data: formData,
                  };
                  await exportPopulatedAiagPpapWorkbook(currentSub);
                  showToast('AIAG Excel Workbook (.xlsx) exported successfully!');
                } catch (err) {
                  alert(`Export error: ${err instanceof Error ? err.message : String(err)}`);
                }
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold shadow-md transition-all active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Export AIAG Excel (.xlsx)</span>
            </button>
          </ActionTooltip>

          <ActionTooltip
            title="Generate AIAG PSW (PDF)"
            description="Generates and downloads the official AIAG Form CFG-1001 Part Submission Warrant PDF."
            position="bottom"
            badge="PDF"
          >
            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-600/20 transition-all active:scale-95"
            >
              <FileDown className="w-4 h-4" />
              <span>Download AIAG PSW (PDF)</span>
            </button>
          </ActionTooltip>

          <ActionTooltip
            title="Save Warrant & Sign-off"
            description="Persists supplier declaration and customer disposition (Approved / Interim / Rejected) to Supabase."
            position="bottom"
            badge="Save"
          >
            <button
              onClick={handleSaveAndAttach}
              disabled={isSaving}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md active:scale-95 ${
                savedSuccess
                  ? 'bg-emerald-600 text-white shadow-emerald-500/30'
                  : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              {savedSuccess ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4 text-emerald-400" />}
              <span>{savedSuccess ? 'Saved & Attached!' : isSaving ? 'Saving...' : 'Save & Attach to Project'}</span>
            </button>
          </ActionTooltip>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-emerald-500/50 text-emerald-300 text-xs px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Official AIAG Paperwork Layout Container */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 text-slate-200 text-xs">
        {/* Paperwork Header */}
        <div className="border-b border-slate-700 pb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
              AIAG Standard Form CFG-1001
            </span>
            <h1 className="text-lg font-bold text-white mt-1">PART SUBMISSION WARRANT</h1>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400">Warrant ID:</span>
            <span className="text-sm font-mono font-bold text-cyan-300 ml-2">{submission.submission_number}</span>
          </div>
        </div>

        {/* Section 1: Part Information */}
        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
          <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider border-b border-slate-800 pb-1.5">
            1. Part Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Part Name</label>
              <input
                type="text"
                value={formData.part_name}
                onChange={(e) => handleUpdateForm({ part_name: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:ring-1 focus:ring-cyan-500 outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Customer Part Number</label>
              <input
                type="text"
                value={formData.cust_part_number}
                onChange={(e) => handleUpdateForm({ cust_part_number: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:ring-1 focus:ring-cyan-500 outline-none font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Engineering Drawing Number</label>
              <input
                type="text"
                defaultValue={submission.drawing_number}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-mono outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Drawing Revision Level</label>
              <input
                type="text"
                defaultValue={submission.drawing_revision}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-mono outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Engineering Change Level</label>
              <input
                type="text"
                defaultValue={submission.engineering_change_level}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-mono outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Part Weight (kg)</label>
              <input
                type="number"
                step="0.0001"
                defaultValue={submission.weight_kg || 4.852}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-mono outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Organization & Customer Submittal Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider border-b border-slate-800 pb-1.5 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5" /> Organization (Supplier) Information
            </h3>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Organization Name</label>
              <input
                type="text"
                value={formData.supplier_name}
                onChange={(e) => handleUpdateForm({ supplier_name: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Supplier DUNS Code</label>
              <input
                type="text"
                defaultValue={submission.supplier_code}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-mono outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Manufacturing Facility Address</label>
              <input
                type="text"
                defaultValue={submission.facility_address}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 outline-none"
              />
            </div>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider border-b border-slate-800 pb-1.5">
              Customer Submittal Information
            </h3>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Customer Name</label>
              <input
                type="text"
                defaultValue={submission.customer_name}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Division / Facility</label>
              <input
                type="text"
                defaultValue={submission.customer_division}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Vehicle / Powertrain Application</label>
              <input
                type="text"
                defaultValue={submission.application}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Reason for Submission */}
        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider border-b border-slate-800 pb-1.5">
            2. Reason for Submission (Select One)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {[
              { id: 'INITIAL_SUBMISSION', label: 'Initial Submission' },
              { id: 'ENGINEERING_CHANGE', label: 'Engineering Change(s)' },
              { id: 'TOOLING_TRANSFER', label: 'Tooling: Transfer / Replacement' },
              { id: 'PROCESS_CHANGE', label: 'Change in Process / Method' },
              { id: 'CORRECTION_DISCREPANCY', label: 'Correction of Discrepancy' },
              { id: 'OTHER', label: 'Other Reason' },
            ].map((r) => (
              <label
                key={r.id}
                className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                  reason === r.id
                    ? 'bg-amber-500/10 border-amber-500/50 text-amber-300'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="submission_reason"
                  checked={reason === r.id}
                  onChange={() => {
                    setReason(r.id as PpapSubmissionReason);
                    setIsDirty(true);
                  }}
                  className="accent-amber-500"
                />
                <span className="text-xs font-medium">{r.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Section 4: Requested Submission Level */}
        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
          <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider border-b border-slate-800 pb-1.5">
            3. Requested Submission Level (AIAG Standard Levels 1 to 5)
          </h3>
          <div className="space-y-2">
            {[
              { lvl: 1, text: 'Level 1 — Warrant and Appearance Approval Report (AAR) only submitted to customer.' },
              { lvl: 2, text: 'Level 2 — Warrant with product samples and limited supporting data submitted.' },
              { lvl: 3, text: 'Level 3 — Warrant, product samples and complete supporting data submitted (Standard default).' },
              { lvl: 4, text: 'Level 4 — Warrant and other requirements as defined by customer submitted.' },
              { lvl: 5, text: 'Level 5 — Warrant, product samples and complete supporting data reviewed at supplier manufacturing facility.' },
            ].map((l) => (
              <label
                key={l.lvl}
                className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                  level === l.lvl
                    ? 'bg-purple-500/10 border-purple-500/50 text-purple-300'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="submission_level"
                  checked={level === l.lvl}
                  onChange={() => {
                    setLevel(l.lvl as PpapLevel);
                    setIsDirty(true);
                  }}
                  className="accent-purple-500"
                />
                <span className="text-xs">{l.text}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Section 5: Legal Declaration Statement */}
        <div className="bg-slate-950 p-4 rounded-xl border border-blue-900/40 space-y-3">
          <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider border-b border-slate-800 pb-1.5">
            4. Declaration & Supplier Affirmation
          </h3>
          <p className="text-[11px] text-slate-400 leading-relaxed italic bg-slate-900/80 p-3 rounded-lg border border-slate-800">
            "I hereby affirm that the samples represented by this warrant are representative of our parts which were
            made by a process that meets all Production Part Approval Process Manual 4th Edition requirements. I further
            affirm that these samples were produced at the production rate of 45 parts/hr on a significant production run.
            I also certify that documented evidence of such compliance is on file and available for customer review."
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Authorized Representative</label>
              <input
                type="text"
                value={formData.authorized_rep}
                onChange={(e) => handleUpdateForm({ authorized_rep: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Title</label>
              <input
                type="text"
                value={formData.rep_title}
                onChange={(e) => handleUpdateForm({ rep_title: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Email / Phone</label>
              <input
                type="text"
                value={formData.supplier_email}
                onChange={(e) => handleUpdateForm({ supplier_email: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Submission Date</label>
              <input
                type="date"
                value={formData.submission_date}
                onChange={(e) => handleUpdateForm({ submission_date: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 6: Customer Disposition Block */}
        <div className="bg-slate-950 p-4 rounded-xl border border-emerald-900/40 space-y-3">
          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider border-b border-slate-800 pb-1.5 flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-emerald-400" /> 5. Customer Disposition & Approval
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Disposition Status</label>
              <select
                value={formData.customer_disposition}
                onChange={(e) => handleUpdateForm({ customer_disposition: e.target.value as any })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-emerald-400 font-bold outline-none"
              >
                <option value="APPROVED">APPROVED (Full Production Clearance)</option>
                <option value="INTERIM_APPROVED">INTERIM APPROVAL (Conditional Run)</option>
                <option value="REJECTED">REJECTED (Resubmission Required)</option>
                <option value="PENDING">PENDING (Under Review)</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Customer STA / Reviewer</label>
              <input
                type="text"
                value={formData.customer_reviewer || ''}
                onChange={(e) => handleUpdateForm({ customer_reviewer: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Customer Signature Date</label>
              <input
                type="date"
                value={formData.customer_signature_date || ''}
                onChange={(e) => handleUpdateForm({ customer_signature_date: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Customer Reviewer Comments</label>
            <input
              type="text"
              value={formData.customer_comments || ''}
              onChange={(e) => handleUpdateForm({ customer_comments: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
