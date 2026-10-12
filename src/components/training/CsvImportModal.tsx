import React, { useState } from 'react';
import { 
  X, 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  ArrowRight
} from 'lucide-react';
import { 
  validateEmployeesCsv, 
  validateEquipmentCsv, 
  validateTrainingRecordsCsv,
  saveEmployee,
  saveEquipment,
  recordTrainingCompletion,
  type CsvParseResult
} from '../../services/trainingService';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserName: string;
  onImportSuccess: () => void;
}

type ImportType = 'EMPLOYEES' | 'EQUIPMENT' | 'RECORDS';

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  currentUserName,
  onImportSuccess
}) => {
  const [importType, setImportType] = useState<ImportType>('EMPLOYEES');
  const [csvText, setCsvText] = useState<string>('');
  const [step, setStep] = useState<'INPUT' | 'PREVIEW'>('INPUT');
  const [parseResult, setParseResult] = useState<CsvParseResult<any> | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  if (!isOpen) return null;

  // Sample templates for easy copy-paste
  const SAMPLES: Record<ImportType, string> = {
    EMPLOYEES: `badge_number,first_name,last_name,department,role,shift,hire_date
1101,Robert,Hayes,CNC,OPERATOR,Shift 1 (Day),2023-01-15
1102,Maria,Santos,STAMP,LEAD,Shift 2 (Night),2022-05-10
1103,Ethan,Hunt,ROBOT,OPERATOR,Shift 1 (Day),2024-03-01`,
    EQUIPMENT: `equipment_code,name,department,location,model,serial_number
MC-110,Doosan Puma GT2600 Lathe,CNC,Cell 4 - Turning,GT2600,DSN-2024-119
PR-205,Komatsu 150-Ton Stamping Press,STAMP,Press Line 2,OBS-150,KMT-2020-551
RB-305,ABB IRB 2600 Robotics Cell,ROBOT,Automation Cell B,IRB-2600,ABB-2023-09`,
    RECORDS: `badge_number,training_code,completion_date,trainer,result,score
1015,SOP-SAF-001,2026-02-01,Jack Miller,PASS,100
1022,SOP-SAF-002,2026-02-15,Jack Miller,PASS,95
1034,SOP-QUA-010,2026-03-01,Lisa Ray,PASS,90`
  };

  const handleLoadSample = () => {
    setCsvText(SAMPLES[importType]);
    setErrorMessage(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      setCsvText(content || '');
      setErrorMessage(null);
    };
    reader.readAsText(file);
  };

  // Stage 1 -> Validate and preview
  const handleValidate = async () => {
    if (!csvText.trim()) {
      setErrorMessage('Please paste or upload CSV data first.');
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMessage(null);
      let res: CsvParseResult<any>;

      if (importType === 'EMPLOYEES') {
        res = await validateEmployeesCsv(csvText);
      } else if (importType === 'EQUIPMENT') {
        res = await validateEquipmentCsv(csvText);
      } else {
        res = await validateTrainingRecordsCsv(csvText);
      }

      setParseResult(res);
      setStep('PREVIEW');
      setIsProcessing(false);
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err?.message || 'CSV validation failed.');
    }
  };

  // Stage 2 -> Confirm and commit valid rows
  const handleCommit = async () => {
    if (!parseResult || parseResult.validRows.length === 0) return;

    try {
      setIsProcessing(true);

      if (importType === 'EMPLOYEES') {
        for (const emp of parseResult.validRows) {
          await saveEmployee(emp, currentUserName);
        }
      } else if (importType === 'EQUIPMENT') {
        for (const eq of parseResult.validRows) {
          await saveEquipment(eq, currentUserName);
        }
      } else {
        for (const rec of parseResult.validRows) {
          await recordTrainingCompletion(rec, currentUserName);
        }
      }

      setSuccessCount(parseResult.validRows.length);
      setIsProcessing(false);
      setTimeout(() => {
        onImportSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err?.message || 'Failed to import records.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden max-h-[92vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 flex items-center justify-center">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Two-Stage CSV Import
              </h2>
              <p className="text-base text-slate-600 dark:text-slate-400">
                {step === 'INPUT' ? 'Stage 1: Choose Dataset & Upload' : 'Stage 2: Validation & Review'}
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
        <div className="p-6 overflow-y-auto space-y-5">
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-center gap-3 text-base">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successCount !== null && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center gap-3 text-base font-bold">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <span>Successfully imported {successCount} records!</span>
            </div>
          )}

          {step === 'INPUT' ? (
            <>
              {/* Entity Type Picker */}
              <div>
                <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Select Import Target:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { type: 'EMPLOYEES', label: 'Operators & Staff' },
                    { type: 'EQUIPMENT', label: 'Work Centers' },
                    { type: 'RECORDS', label: 'Training Records' }
                  ].map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => {
                        setImportType(item.type as ImportType);
                        setCsvText('');
                      }}
                      className={`min-h-[48px] p-3 rounded-xl border text-center font-bold text-base transition-all ${
                        importType === item.type
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                          : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* File Input & Sample Template */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <label className="min-h-[48px] px-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-base flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-100 transition-colors">
                  <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                  <span>Choose .csv File</span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="min-h-[48px] px-4 rounded-xl border border-dashed border-indigo-400 text-indigo-700 dark:text-indigo-400 font-bold text-base flex items-center justify-center gap-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                >
                  <Download className="w-5 h-5" />
                  <span>Load Sample Template</span>
                </button>
              </div>

              {/* CSV Raw Text Area */}
              <div>
                <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  CSV Data (comma-separated):
                </label>
                <textarea
                  rows={6}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="Paste comma-delimited data here with column headers..."
                  className="w-full p-4 font-mono text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleValidate}
                  disabled={isProcessing}
                  className="w-full min-h-[48px] rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99]"
                >
                  <span>{isProcessing ? 'Validating...' : 'Validate & Preview CSV'}</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </>
          ) : (
            /* STAGE 2: PREVIEW & CONFIRM */
            parseResult && (
              <div className="space-y-4">
                {/* Summary Metrics */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border text-center">
                    <div className="text-base text-slate-500 font-semibold">Total Rows</div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">
                      {parseResult.summary.total}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 text-center">
                    <div className="text-base text-emerald-700 dark:text-emerald-400 font-semibold">Valid Rows</div>
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      {parseResult.summary.valid}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 text-center">
                    <div className="text-base text-rose-700 dark:text-rose-400 font-semibold">Invalid Rows</div>
                    <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                      {parseResult.summary.invalid}
                    </div>
                  </div>
                </div>

                {/* Validation Errors List */}
                {parseResult.errorRows.length > 0 && (
                  <div className="space-y-2">
                    <div className="font-bold text-base text-rose-700 dark:text-rose-400 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      <span>Errors to Fix (These rows will be skipped):</span>
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1.5 p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-base">
                      {parseResult.errorRows.map((err, i) => (
                        <div key={i} className="text-rose-900 dark:text-rose-200">
                          <strong>Line {err.rowNumber}:</strong> {err.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Valid Rows Preview Table */}
                <div className="space-y-2">
                  <div className="font-bold text-base text-slate-800 dark:text-slate-200">
                    Preview Ready Rows ({parseResult.validRows.length}):
                  </div>
                  <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                    <table className="w-full text-left text-base divide-y divide-slate-200 dark:divide-slate-800">
                      <thead className="bg-slate-100 dark:bg-slate-800">
                        <tr>
                          <th className="p-2.5 font-bold">#</th>
                          <th className="p-2.5 font-bold">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {parseResult.validRows.slice(0, 10).map((row: any, idx: number) => (
                          <tr key={idx}>
                            <td className="p-2.5 font-mono text-slate-500">{idx + 1}</td>
                            <td className="p-2.5 font-mono text-slate-800 dark:text-slate-200">
                              {row.employee_number ? `#${row.employee_number} - ${row.first_name} ${row.last_name}` : ''}
                              {row.code ? `[${row.code}] ${row.name}` : ''}
                              {row.training_id ? `Employee: ${row.employee_id} -> ${row.result}` : ''}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Confirm Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep('INPUT')}
                    className="min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-base text-slate-700 dark:text-slate-300"
                  >
                    Back to Edit
                  </button>

                  <button
                    type="button"
                    onClick={handleCommit}
                    disabled={isProcessing || parseResult.validRows.length === 0}
                    className="min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-lg flex items-center justify-center gap-2 shadow-md active:scale-95"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>{isProcessing ? 'Importing...' : `Import ${parseResult.validRows.length} Rows`}</span>
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
