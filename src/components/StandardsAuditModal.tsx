import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ShieldCheck, 
  ArrowRight,
  Lock,
  Unlock
} from 'lucide-react';
import type { AuditReport, TitleBlockMetadata } from '../types/cad';
import { STANDARDS_DATABASE } from '../standards/standardsLibrary';

interface StandardsAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditReport: AuditReport | null;
  onProceedToBallooning: () => void;
  isUnlocked: boolean;
  onToggleUnlock: () => void;
  language: 'bilingual' | 'en' | 'zh';
  metadata?: TitleBlockMetadata;
  onUpdateMetadata?: (updates: Partial<TitleBlockMetadata>) => void;
}

export const StandardsAuditModal: React.FC<StandardsAuditModalProps> = ({
  isOpen,
  onClose,
  auditReport,
  onProceedToBallooning,
  isUnlocked,
  onToggleUnlock,
  metadata,
  onUpdateMetadata,
}) => {
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'pass'>('all');

  if (!isOpen || !auditReport) return null;

  const standardDef = STANDARDS_DATABASE[auditReport.standardApplied];

  const filteredFindings = auditReport.findings.filter(f => {
    if (filter === 'all') return true;
    return f.status === filter;
  });

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400 border-emerald-500';
    if (score >= 70) return 'text-amber-400 border-amber-500';
    return 'text-red-400 border-red-500';
  };

  const isPassed = auditReport.overallStatus === 'PASSED';
  const hasWarnings = auditReport.overallStatus === 'PASSED_WITH_WARNINGS';
  const isBlocked = auditReport.overallStatus === 'FAILED_CRITICAL' && !isUnlocked;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  CAD Engineering Standards Audit
                </h2>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700">
                  {auditReport.standardApplied}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {standardDef ? standardDef.name : auditReport.standardName}
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Top Scorecard & Status Banner */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Score Wheel */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-center">
              <div className={`w-20 h-20 rounded-full border-4 flex flex-col items-center justify-center mb-2 ${getScoreColor(auditReport.complianceScore)}`}>
                <span className="text-2xl font-black font-mono leading-none">
                  {auditReport.complianceScore}%
                </span>
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 mt-1">
                  SCORE
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-300">
                Drawing Compliance
              </span>
            </div>

            {/* Verdict Box */}
            <div className="md:col-span-3 bg-slate-950/60 p-5 rounded-xl border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {isPassed ? (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      PASSED DRAFTING AUDIT / 审核通过
                    </span>
                  ) : hasWarnings ? (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      PASSED WITH WARNINGS / 附带警告通过
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/40">
                      <XCircle className="w-4 h-4 text-red-400" />
                      FAILED CRITICAL STANDARDS / 严重不合规拦截
                    </span>
                  )}
                  {isUnlocked && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      WAIVER APPLIED (特采放行)
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {isPassed
                    ? 'Drawing meets all mandatory requirements for title block, general tolerancing, projection symbol, and revision tracking. Cleared for inspection control plan generation.'
                    : hasWarnings
                    ? 'Drawing is acceptable for inspection, but contains minor non-conformances (e.g. unassigned revision index or missing engineer signoff) that should be reviewed before final production.'
                    : 'Drawing has critical missing engineering data (such as undefined projection angle, missing material spec, or missing general tolerances) that may cause overseas manufacturing defects.'}
                </p>
              </div>

              {/* Counters */}
              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-800 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-slate-400">Passed:</span>
                  <span className="font-bold text-white">{auditReport.passedCount}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-slate-400">Warnings:</span>
                  <span className="font-bold text-white">{auditReport.warningCount}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span className="text-slate-400">Critical:</span>
                  <span className="font-bold text-white">{auditReport.criticalCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Editable Title Block & Material Card */}
          {metadata && onUpdateMetadata && (
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-200">Drawing Title Block & Material Specification</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono">
                    Live Audit Sync
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Update material or title block fields to re-evaluate drawing compliance instantly.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {/* Material */}
                <div className="flex flex-col gap-1 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-slate-300">Raw Material (材质规格):</label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onUpdateMetadata({ material: 'SPHC' })}
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-950 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300"
                        title="Set to SPHC (Hot-Rolled Commercial Steel Plate)"
                      >
                        SPHC
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateMetadata({ material: 'STEEL / SPEC' })}
                        className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300"
                      >
                        Steel
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateMetadata({ material: 'ALUMINUM 6061-T6' })}
                        className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300"
                      >
                        Al 6061
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={metadata.material || ''}
                    onChange={(e) => onUpdateMetadata({ material: e.target.value })}
                    placeholder="e.g. SPHC, AISI 1018, ALUMINUM 6061-T6"
                    className="bg-slate-900 border border-slate-700 focus:border-blue-500 rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none"
                  />
                </div>

                {/* Drawing Number */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-slate-300">Drawing Number (图号):</label>
                  <input
                    type="text"
                    value={metadata.drawingNumber || ''}
                    onChange={(e) => onUpdateMetadata({ drawingNumber: e.target.value })}
                    className="bg-slate-900 border border-slate-700 focus:border-blue-500 rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none"
                  />
                </div>

                {/* Revision */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-slate-300">Revision (版本号):</label>
                  <input
                    type="text"
                    value={metadata.revision || ''}
                    onChange={(e) => onUpdateMetadata({ revision: e.target.value })}
                    className="bg-slate-900 border border-slate-700 focus:border-blue-500 rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none"
                  />
                </div>

                {/* Part Name */}
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-[11px] font-semibold text-slate-300">Part Name (零件名称):</label>
                  <input
                    type="text"
                    value={metadata.partName || ''}
                    onChange={(e) => onUpdateMetadata({ partName: e.target.value })}
                    className="bg-slate-900 border border-slate-700 focus:border-blue-500 rounded px-2.5 py-1.5 text-white text-xs focus:outline-none"
                  />
                </div>

                {/* Units */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-slate-300">Units (单位):</label>
                  <select
                    value={metadata.units || 'inch'}
                    onChange={(e) => onUpdateMetadata({ units: e.target.value as 'mm' | 'inch' })}
                    className="bg-slate-900 border border-slate-700 focus:border-blue-500 rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none"
                  >
                    <option value="inch">INCH (英制)</option>
                    <option value="mm">MM (公制)</option>
                  </select>
                </div>

                {/* Approved By */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-slate-300">Approved By (审批人):</label>
                  <input
                    type="text"
                    value={metadata.approvedBy || ''}
                    onChange={(e) => onUpdateMetadata({ approvedBy: e.target.value })}
                    placeholder="e.g. JSM, MOB"
                    className="bg-slate-900 border border-slate-700 focus:border-blue-500 rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none"
                  />
                </div>

                {/* Drawn By */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-slate-300">Drawn By (制图人):</label>
                  <input
                    type="text"
                    value={metadata.drawnBy || ''}
                    onChange={(e) => onUpdateMetadata({ drawnBy: e.target.value })}
                    placeholder="e.g. CGC, PMK"
                    className="bg-slate-900 border border-slate-700 focus:border-blue-500 rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none"
                  />
                </div>

                {/* Date */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-slate-300">Date (日期):</label>
                  <input
                    type="text"
                    value={metadata.date || ''}
                    onChange={(e) => onUpdateMetadata({ date: e.target.value })}
                    placeholder="e.g. 5/26/2015, 11/21/11"
                    className="bg-slate-900 border border-slate-700 focus:border-blue-500 rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none"
                  />
                </div>

                {/* Finish Spec */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-slate-300">Finish (表面处理):</label>
                  <input
                    type="text"
                    value={metadata.finish || ''}
                    onChange={(e) => onUpdateMetadata({ finish: e.target.value })}
                    placeholder="e.g. AFTER FINISH"
                    className="bg-slate-900 border border-slate-700 focus:border-blue-500 rounded px-2.5 py-1.5 text-white text-xs focus:outline-none"
                  />
                </div>

                {/* General Tolerance Note */}
                <div className="flex flex-col gap-1 sm:col-span-2 md:col-span-4">
                  <label className="text-[11px] font-semibold text-slate-300">Tolerance Block (标题栏通用公差要求):</label>
                  <input
                    type="text"
                    value={metadata.generalToleranceNote || ''}
                    onChange={(e) => onUpdateMetadata({ generalToleranceNote: e.target.value })}
                    placeholder="e.g. .XXXX ±.0005  .XXX ±.005  .XX ±.010  ANGLES ±1°"
                    className="bg-slate-900 border border-slate-700 focus:border-blue-500 rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Filter Bar */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  filter === 'all' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All Findings ({auditReport.findings.length})
              </button>
              <button
                onClick={() => setFilter('critical')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  filter === 'critical' ? 'bg-red-500/20 text-red-300 font-semibold' : 'text-slate-400 hover:text-red-400'
                }`}
              >
                Critical ({auditReport.criticalCount})
              </button>
              <button
                onClick={() => setFilter('warning')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  filter === 'warning' ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-slate-400 hover:text-amber-400'
                }`}
              >
                Warnings ({auditReport.warningCount})
              </button>
              <button
                onClick={() => setFilter('pass')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  filter === 'pass' ? 'bg-emerald-500/20 text-emerald-300 font-semibold' : 'text-slate-400 hover:text-emerald-400'
                }`}
              >
                Passed ({auditReport.passedCount})
              </button>
            </div>

            {/* Quality Override Waiver Toggle */}
            <button
              onClick={onToggleUnlock}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                isUnlocked
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              {isUnlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              <span>{isUnlocked ? 'Engineering Waiver Active' : 'Apply Quality Waiver'}</span>
            </button>
          </div>

          {/* Audit Findings List */}
          <div className="space-y-3">
            {filteredFindings.map((finding) => {
              const isPass = finding.status === 'pass';
              const isCrit = finding.status === 'critical';

              return (
                <div
                  key={finding.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isCrit
                      ? 'bg-red-950/20 border-red-900/50 hover:border-red-700'
                      : isPass
                      ? 'bg-emerald-950/10 border-emerald-900/30'
                      : 'bg-amber-950/20 border-amber-900/40 hover:border-amber-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <div className="flex items-center gap-2">
                      {isCrit ? (
                        <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                      ) : isPass ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      )}
                      <h4 className="text-sm font-semibold text-white">
                        {finding.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                        {finding.category}
                      </span>
                      {finding.zone && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-900">
                          {finding.zone}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 ml-6 mb-2">
                    {finding.message}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 ml-6 text-[11px] pt-2 border-t border-slate-800/80">
                    <span className="text-slate-400 font-mono">
                      Ref: {finding.standardReference}
                    </span>
                    {finding.remediation && (
                      <div className="text-amber-300/90 flex items-center gap-1 font-medium">
                        <span>Action:</span>
                        <span>{finding.remediation}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/80">
          <div className="text-xs text-slate-400">
            {isBlocked ? (
              <span className="text-red-400 font-semibold flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" />
                Critical audit failures must be resolved or waived by QA Lead.
              </span>
            ) : (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Ready to generate inspection control plan and export.
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors"
            >
              Close
            </button>
            <button
              disabled={isBlocked}
              onClick={() => {
                onProceedToBallooning();
                onClose();
              }}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-lg ${
                isBlocked
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/20'
              }`}
            >
              <span>Proceed to Inspection Ballooning</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
