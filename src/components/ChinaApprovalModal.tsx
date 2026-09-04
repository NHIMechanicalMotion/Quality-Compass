import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Building2, 
  UserCheck, 
  Calendar, 
  Stamp,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { ChinaApprovalRecord } from '../types/inspection';

interface ChinaApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  approvalRecord: ChinaApprovalRecord;
  onSaveApproval: (record: ChinaApprovalRecord) => void;
  language: 'bilingual' | 'en' | 'zh';
}

export const ChinaApprovalModal: React.FC<ChinaApprovalModalProps> = ({
  isOpen,
  onClose,
  approvalRecord,
  onSaveApproval,
}) => {
  const [formData, setFormData] = useState<ChinaApprovalRecord>({ ...approvalRecord });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveApproval(formData);

    if (formData.decision === 'APPROVED') {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
              <Stamp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                China QC Team Approval & Sign-Off
              </h3>
              <p className="text-xs text-slate-400">
                中国制造基地质检审批与签核确认 (Control Plan Approval)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Inspection Approval Decision / 检验审批结论:
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, decision: 'APPROVED' })}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                  formData.decision === 'APPROVED'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold shadow-lg shadow-emerald-950/50'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="text-xs">APPROVED (批准)</span>
                <span className="text-[10px] text-slate-400">In Full Spec</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, decision: 'CONCESSION' })}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                  formData.decision === 'CONCESSION'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-lg shadow-amber-950/50'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <span className="text-xs">CONCESSION (特采)</span>
                <span className="text-[10px] text-slate-400">Deviation Waiver</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, decision: 'REJECTED' })}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                  formData.decision === 'REJECTED'
                    ? 'bg-red-500/20 border-red-500 text-red-300 font-bold shadow-lg shadow-red-950/50'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <XCircle className="w-5 h-5 text-red-400" />
                <span className="text-xs">REJECTED (拒收)</span>
                <span className="text-[10px] text-slate-400">Rework / Scrap</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Manufacturing Facility / 生产工厂基地:
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={formData.facilityLocation}
                onChange={(e) => setFormData({ ...formData, facilityLocation: e.target.value })}
                placeholder="e.g. Suzhou Precision Facility / 苏州精密生产线"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                QC Inspector Name / 质检员:
              </label>
              <div className="relative">
                <UserCheck className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={formData.inspectorName}
                  onChange={(e) => setFormData({ ...formData, inspectorName: e.target.value })}
                  placeholder="e.g. Zhang Wei (张伟)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Inspection Date / 检验日期:
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="date"
                  value={formData.inspectionDate}
                  onChange={(e) => setFormData({ ...formData, inspectionDate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                QA Lead / Quality Manager / 质量主管:
              </label>
              <input
                type="text"
                value={formData.qaManagerName}
                onChange={(e) => setFormData({ ...formData, qaManagerName: e.target.value })}
                placeholder="e.g. Li Ming (李明)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Approval Date / 审批日期:
              </label>
              <input
                type="date"
                value={formData.approvalDate}
                onChange={(e) => setFormData({ ...formData, approvalDate: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Concession / Inspection Notes / 特采说明与现场备注:
            </label>
            <textarea
              rows={3}
              value={formData.decisionNotes}
              onChange={(e) => setFormData({ ...formData, decisionNotes: e.target.value })}
              placeholder="Record any deviation concessions, tooling notes, or engineering changes..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-900/30 transition-all active:scale-95"
            >
              <Stamp className="w-4 h-4" />
              <span>Confirm Sign-Off & Save (签核确认)</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
