import React from 'react';
import { 
  Compass, 
  FileSpreadsheet, 
  Upload, 
  Download, 
  Layers, 
  Save, 
  FolderOpen,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  GraduationCap,
} from 'lucide-react';
import type { StandardType, AuditReport } from '../types/cad';
import type { PartFamilyProfile } from '../types/templates';
import { PART_FAMILY_PROFILES } from '../data/partFamilyTemplates';
import { PRELOADED_DRAWINGS } from '../data/sampleDrawings';

interface HeaderProps {
  currentDrawingId: string;
  onSelectDrawing: (id: string) => void;
  activeStandard: StandardType;
  onChangeStandard: (standard: StandardType) => void;
  activeProfile?: PartFamilyProfile;
  allProfiles?: PartFamilyProfile[];
  onChangeProfile?: (profile: PartFamilyProfile) => void;
  onOpenTemplateManager?: () => void;
  auditReport: AuditReport | null;
  onOpenAuditModal: () => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
  onSaveProject: () => void;
  onLoadProject: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUploadCustomDrawing: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenSupabaseModal: () => void;
  language: 'bilingual' | 'en' | 'zh';
  onChangeLanguage: (lang: 'bilingual' | 'en' | 'zh') => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentDrawingId,
  onSelectDrawing,
  activeStandard,
  onChangeStandard,
  activeProfile,
  allProfiles,
  onChangeProfile,
  onOpenTemplateManager,
  auditReport,
  onOpenAuditModal,
  onExportExcel,
  onExportPdf,
  onSaveProject,
  onLoadProject,
  onUploadCustomDrawing,
  onOpenSupabaseModal,
  language,
  onChangeLanguage,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 px-4 py-2.5 shadow-xl">
      <div className="max-w-[1700px] mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/30">
            <Compass className="w-6 h-6 text-white animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
                Quality Compass
              </h1>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 tracking-wider">
                Pro v2.0
              </span>
            </div>
            <p className="text-xs text-slate-400">
              CAD Standards Review & Inspection Control Plan Platform
            </p>
          </div>
        </div>

        {/* Drawing Selector & Upload */}
        <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-lg border border-slate-700/80">
          <div className="flex items-center gap-1.5 px-2 text-xs text-slate-300 font-medium">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">CAD Drawing:</span>
          </div>

          <select
            value={currentDrawingId}
            onChange={(e) => onSelectDrawing(e.target.value)}
            aria-label="CAD Drawing Selection"
            className="bg-slate-950 text-slate-100 text-xs rounded-md px-2.5 py-1.5 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[210px] font-medium truncate"
          >
            {PRELOADED_DRAWINGS.map((d) => (
              <option key={d.id} value={d.id}>
                {language === 'zh' ? d.titleZh : d.title}
              </option>
            ))}
            {!PRELOADED_DRAWINGS.some(d => d.id === currentDrawingId) && (
              <option value={currentDrawingId}>
                {currentDrawingId === 'drawing-custom' 
                  ? '📄 Custom Blueprint (PDF/DXF)' 
                  : `Supabase Drawing (${currentDrawingId})`}
              </option>
            )}
          </select>

          {/* Upload Custom Drawing (PDF, DXF, Images) */}
          <label 
            aria-label="Upload Custom Drawing"
            title="Upload Blueprint (.pdf, .dxf, .png, .jpg, .svg)"
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white rounded-md text-xs font-medium cursor-pointer transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">Upload</span>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.svg,.webp,.dxf"
              onChange={onUploadCustomDrawing}
              className="hidden"
            />
          </label>
        </div>

        {/* Part Family Profile & Standards Audit Center */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Part Family Profile Selection */}
          {onChangeProfile && (() => {
            const profilesToUse = (allProfiles && allProfiles.length > 0) ? allProfiles : PART_FAMILY_PROFILES;
            return (
              <div className="flex items-center gap-1.5 bg-slate-800/80 p-1.5 rounded-lg border border-slate-700/80">
                <span className="text-xs text-slate-400 pl-1 font-medium hidden xl:inline">Part Family:</span>
                <select
                  value={activeProfile?.id || 'profile-single-pulley'}
                  onChange={(e) => {
                    const prof = profilesToUse.find((p: PartFamilyProfile) => p.id === e.target.value);
                    if (prof) onChangeProfile(prof);
                  }}
                  aria-label="Part Family Profile"
                  className="bg-slate-950 text-cyan-300 text-xs rounded-md px-2.5 py-1.5 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-medium"
                >
                  {profilesToUse.map((p: PartFamilyProfile) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>

                {onOpenTemplateManager && (
                  <button
                    onClick={onOpenTemplateManager}
                    title="Train & Manage Feature Recognition Templates"
                    className="flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 rounded text-xs transition-colors font-medium ml-0.5"
                  >
                    <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden sm:inline">Train Templates</span>
                  </button>
                )}
              </div>
            );
          })()}

          <div className="flex items-center gap-1.5 bg-slate-800/80 p-1.5 rounded-lg border border-slate-700/80">
            <span className="text-xs text-slate-400 pl-1 font-medium hidden lg:inline">Standard:</span>
            <select
              value={activeStandard}
              onChange={(e) => onChangeStandard(e.target.value as StandardType)}
              aria-label="Active Drafting Standard"
              className="bg-slate-950 text-slate-200 text-xs rounded-md px-2.5 py-1.5 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            >
              <option value="ASME_Y14_5">ASME Y14.5 (US Standard)</option>
              <option value="ISO_1101">ISO 1101 / 2768 (Metric)</option>
              <option value="AS9102">AS9102 (Aerospace FAI)</option>
              <option value="AIAG_PPAP">AIAG PPAP (Automotive)</option>
              <option value="CUSTOM">Custom Company Rules</option>
            </select>

            {/* Audit Status Button */}
            <button
              onClick={onOpenAuditModal}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all shadow-sm ${
                !auditReport || auditReport.overallStatus === 'FAILED_CRITICAL'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30'
                  : auditReport.overallStatus === 'PASSED_WITH_WARNINGS'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
              }`}
            >
              {!auditReport || auditReport.overallStatus === 'FAILED_CRITICAL' ? (
                <XCircle className="w-3.5 h-3.5 text-red-400" />
              ) : auditReport.overallStatus === 'PASSED_WITH_WARNINGS' ? (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>Audit Review</span>
              <span className="px-1.5 py-0.2 rounded bg-slate-900/60 text-[11px] font-mono">
                {auditReport ? `${auditReport.complianceScore}%` : 'Check'}
              </span>
            </button>
          </div>
        </div>

        {/* Action Controls: Supabase DB, Excel & Drawing Exports */}
        <div className="flex items-center gap-2">
          
          {/* Supabase Cloud DB Button */}
          <button
            onClick={onOpenSupabaseModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold transition-all shadow-sm active:scale-95"
            title="Manage Drawings, Dimensions, & Revisions in Supabase Cloud DB"
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>Supabase DB</span>
          </button>

          {/* Language Toggle */}
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
            <button
              onClick={() => onChangeLanguage('bilingual')}
              className={`px-2 py-1 rounded ${
                language === 'bilingual' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
              title="Bilingual English & Chinese (双语)"
            >
              EN/中
            </button>
            <button
              onClick={() => onChangeLanguage('en')}
              className={`px-2 py-1 rounded ${
                language === 'en' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => onChangeLanguage('zh')}
              className={`px-2 py-1 rounded ${
                language === 'zh' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              中文
            </button>
          </div>

          {/* Export Ballooned Drawing */}
          <button
            onClick={onExportPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-lg text-xs font-medium transition-all"
            title="Export Stamped Ballooned Drawing (PDF/PNG)"
          >
            <Download className="w-3.5 h-3.5 text-slate-300" />
            <span className="hidden sm:inline">Drawing</span>
          </button>

          {/* Export Excel Control Plan */}
          <button
            onClick={onExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-emerald-900/30 transition-all active:scale-95"
            title="Generate Bilingual Excel Inspection Control Plan"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
            <span>Excel Control Plan</span>
          </button>

          {/* Save/Load Project */}
          <div className="flex items-center gap-1 pl-1 border-l border-slate-800">
            <button
              onClick={onSaveProject}
              title="Save Project JSON"
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-md transition-colors"
            >
              <Save className="w-4 h-4" />
            </button>
            <label
              title="Load Project JSON"
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-md transition-colors cursor-pointer"
            >
              <FolderOpen className="w-4 h-4" />
              <input
                type="file"
                accept=".json,.qcproject"
                onChange={onLoadProject}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    </header>
  );
};
