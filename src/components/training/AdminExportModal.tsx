import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Archive, 
  FileSpreadsheet, 
  CheckCircle2 
} from 'lucide-react';
import { exportEverythingToZip } from '../../services/trainingService';

interface AdminExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserName?: string;
}

export const AdminExportModal: React.FC<AdminExportModalProps> = ({
  isOpen,
  onClose,
  currentUserName = 'Admin'
}) => {
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setFeedback(null);
      await exportEverythingToZip();
      setIsExporting(false);
      setFeedback('All training tables zipped and downloaded successfully!');
      setTimeout(() => {
        setFeedback(null);
        onClose();
      }, 1500);
    } catch (err: any) {
      setIsExporting(false);
      alert('Export failed: ' + err?.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 flex items-center justify-center">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Admin: Export Everything
              </h2>
              <p className="text-base text-slate-600 dark:text-slate-400">
                Full ISO 9001:2015 System Backup &bull; {currentUserName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <p className="text-base text-slate-700 dark:text-slate-300">
            Generate and download a single compressed <strong>.ZIP archive</strong> containing all system tables exported as clean, standard CSV files:
          </p>

          <div className="space-y-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-base">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span><strong>employees.csv</strong> — Active & archived workforce</span>
            </div>
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span><strong>equipment.csv</strong> — Work centers & locations</span>
            </div>
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span><strong>trainings_catalog.csv</strong> — All courses & frequencies</span>
            </div>
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span><strong>training_completion_records.csv</strong> — Historical records</span>
            </div>
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span><strong>equipment_qualifications.csv</strong> — Skills matrix levels</span>
            </div>
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <FileSpreadsheet className="w-4 h-4 text-purple-600" />
              <span><strong>system_audit_log.csv</strong> — Complete chronological audit trail</span>
            </div>
          </div>

          {feedback && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center gap-3 text-base font-bold">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="w-full min-h-[48px] rounded-xl bg-purple-600 hover:bg-purple-700 disabled:bg-slate-400 text-white font-bold text-lg flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99]"
            >
              <Download className="w-5 h-5" />
              <span>{isExporting ? 'Generating ZIP...' : 'Download Enterprise ZIP Backup'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
