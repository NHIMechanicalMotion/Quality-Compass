import React, { useState, useEffect, useRef } from 'react';
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
  ShieldCheck,
  Building2,
  Wrench,
  ChevronDown,
  ChevronUp,
  Menu,
  User,
  Lock,
  LogOut,
  HardHat,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from './auth/AuthModal';
import type { StandardType, AuditReport } from '../types/cad';
import type { PartFamilyProfile } from '../types/templates';
import { PART_FAMILY_PROFILES } from '../data/partFamilyTemplates';
import { PRELOADED_DRAWINGS } from '../data/sampleDrawings';
import { OPERATING_COMPANIES, type OperatingCompanyId } from '../data/operatingCompanies';
import { CompanyBrandLogo, CombineFamilyMiniLogo } from './common/CompanyBrandLogo';

interface HeaderProps {
  activeViewMode?: 'INSPECTION' | 'QMS_DASHBOARD' | 'APQP_PPAP' | 'TRAINING_MOCKUP';
  onToggleViewMode?: (mode: 'INSPECTION' | 'QMS_DASHBOARD' | 'APQP_PPAP' | 'TRAINING_MOCKUP') => void;
  selectedCompany?: OperatingCompanyId;
  onSelectCompany?: (company: OperatingCompanyId) => void;
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
  activeViewMode = 'INSPECTION',
  onToggleViewMode,
  selectedCompany = 'ALL',
  onSelectCompany,
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
  const { currentUser, logout } = useAuth();
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMobileCollapsed, setIsMobileCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024;
    }
    return false;
  });
  const toolsMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
        setIsToolsMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-[#07172C] border-b border-[#132E58] text-white sticky top-0 z-40 px-4 py-2 shadow-xl">
      <div className="max-w-[1750px] mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Identity: NHI Mechanical Motion LLC */}
        <div className="flex items-center justify-between w-full lg:w-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0B2545] to-[#132E58] flex items-center justify-center shadow-lg shadow-[#81C341]/10 border border-[#81C341]/40 shrink-0">
              <Compass className="w-6 h-6 text-[#81C341] animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-extrabold tracking-widest text-blue-400 font-mono">
                  NHI Mechanical Motion LLC
                </span>
                <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-[#81C341]/15 text-[#81C341] border border-[#81C341]/40 tracking-wider">
                  Quality Compass
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-white flex items-center gap-2">
                <span>APQP / PPAP &amp; Quality Engineering</span>
              </h1>
            </div>
          </div>

          {/* Mobile Collapse Toggle Button */}
          <button
            type="button"
            onClick={() => setIsMobileCollapsed(prev => !prev)}
            className="lg:hidden min-h-[44px] min-w-[44px] px-3 py-1.5 bg-[#0B2545] hover:bg-[#132E58] border border-[#132E58] rounded-xl text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title={isMobileCollapsed ? 'Show navigation controls' : 'Collapse header navigation'}
          >
            {isMobileCollapsed ? (
              <>
                <Menu className="w-4 h-4 text-[#81C341]" />
                <span>Menu</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#81C341]" />
              </>
            ) : (
              <>
                <span>Collapse</span>
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              </>
            )}
          </button>
        </div>

        {/* Collapsible Mobile Wrapper for Navigation & Toolbars */}
        <div className={`w-full lg:w-auto flex-wrap lg:flex items-center gap-3 ${isMobileCollapsed ? 'hidden lg:flex' : 'flex'}`}>

        {/* Operating Company Scope Selector (NHIMM Combined, NHI, Terre Products, Mantis, Makers) */}
        {onSelectCompany && (
          <div className="flex items-center gap-1.5 bg-[#0B2545]/80 p-1 rounded-xl border border-[#132E58] shadow-inner overflow-x-auto">
            <div className="flex items-center gap-1 text-slate-400 text-[11px] font-mono px-1.5 hidden md:flex">
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-bold uppercase tracking-wider text-[10px]">Scope:</span>
            </div>

            {/* NHIMM Consolidated Enterprise Rollup */}
            <button
              type="button"
              onClick={() => onSelectCompany('ALL')}
              className={`relative flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                selectedCompany === 'ALL'
                  ? 'bg-blue-900/90 text-white border-blue-400 ring-2 ring-blue-500/60 shadow-md'
                  : 'bg-[#07172C] text-slate-300 border-[#132E58] hover:border-slate-500 hover:text-white'
              }`}
              title="Consolidated Enterprise: NHI Mechanical Motion LLC (All 4 Operating Companies)"
            >
              <CombineFamilyMiniLogo />
              <span className="hidden sm:inline">Consolidated</span>
            </button>

            {/* Individual Operating Companies */}
            {(['NHI', 'TERRE', 'MANTIS', 'MAKERS'] as OperatingCompanyId[]).map((cId) => {
              const comp = OPERATING_COMPANIES[cId];
              const isSelected = selectedCompany === cId;
              return (
                <button
                  key={cId}
                  type="button"
                  onClick={() => onSelectCompany(cId)}
                  className={`relative flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                    isSelected
                      ? `${comp.badgeBg} ${comp.textColor} ${comp.badgeBorder} ring-2 ring-white/30 shadow-md font-bold scale-[1.02]`
                      : 'bg-[#07172C] text-slate-400 border-[#132E58] hover:border-slate-500 hover:text-slate-200'
                  }`}
                  title={`${comp.name}: ${comp.tagline}`}
                >
                  <CompanyBrandLogo companyId={cId} size="xs" showText={false} />
                  <span>{comp.name}</span>
                  {isSelected && (
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Pillar Switcher: Pillar 1 (QMS) | Pillar 2 (APQP/PPAP) | Tools Category (CAD & FAI) */}
        {onToggleViewMode && (
          <div className="flex items-center gap-1.5 bg-[#0B2545]/60 p-1 rounded-xl border border-[#132E58] shadow-inner">
            {/* Pillar 1: QMS Executive Operating System */}
            <button
              onClick={() => onToggleViewMode('QMS_DASHBOARD')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeViewMode === 'QMS_DASHBOARD'
                  ? 'bg-[#132E58] text-white border border-cyan-400/50 shadow-md ring-1 ring-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-300" />
              <span>QMS Executive</span>
              <span className="text-[10px] uppercase px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-400/30">
                Pillar 1
              </span>
            </button>

            {/* Pillar 2: APQP & PPAP Launch Hub */}
            <button
              onClick={() => onToggleViewMode('APQP_PPAP')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeViewMode === 'APQP_PPAP'
                  ? 'bg-[#132E58] text-white border border-[#81C341]/60 shadow-md shadow-[#81C341]/20 ring-1 ring-[#81C341]/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#81C341]" />
              <span>APQP & PPAP Hub</span>
              <span className="text-[10px] uppercase px-1.5 py-0.2 rounded-full bg-[#81C341]/20 text-[#81C341] font-semibold border border-[#81C341]/40">
                Pillar 2
              </span>
            </button>

            {/* Visual Divider */}
            <div className="h-5 w-px bg-slate-700/60 mx-0.5" />

            {/* Tools Category Menu: CAD & First Article Inspection + Metrology Tools */}
            <div className="relative flex items-center" ref={toolsMenuRef}>
              <button
                type="button"
                onClick={() => onToggleViewMode('INSPECTION')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-l-lg text-xs font-bold transition-all cursor-pointer ${
                  activeViewMode === 'INSPECTION'
                    ? 'bg-[#132E58] text-white border-y border-l border-blue-400/50 shadow-md ring-1 ring-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
                title="CAD & First Article Inspection (under Tools Category)"
              >
                <Wrench className="w-3.5 h-3.5 text-blue-400" />
                <span>Tools: CAD &amp; FAI</span>
              </button>

              <button
                type="button"
                onClick={() => setIsToolsMenuOpen(prev => !prev)}
                className={`flex items-center px-1.5 py-1.5 rounded-r-lg text-xs font-bold transition-all cursor-pointer border-l border-slate-700/50 ${
                  activeViewMode === 'INSPECTION'
                    ? 'bg-[#132E58] text-white border-y border-r border-blue-400/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
                title="View All Quality Tools"
              >
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isToolsMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Tools Category Dropdown */}
              {isToolsMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl z-50 p-1.5 space-y-1 backdrop-blur-md">
                  <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    Quality &amp; Engineering Tools
                  </div>

                  {/* CAD & First Article Inspection */}
                  <button
                    type="button"
                    onClick={() => {
                      onToggleViewMode('INSPECTION');
                      setIsToolsMenuOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-start gap-2.5 transition-colors cursor-pointer ${
                      activeViewMode === 'INSPECTION'
                        ? 'bg-blue-950/70 text-blue-200 border border-blue-800/60'
                        : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Layers className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-semibold flex items-center gap-1.5">
                        CAD &amp; First Article Inspection
                        {activeViewMode === 'INSPECTION' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block"></span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-normal">
                        Blueprint canvas, OCR auto-ballooning, ASME/ISO GD&amp;T audit
                      </div>
                    </div>
                  </button>

                  {/* Part Family Profile Manager */}
                  {onOpenTemplateManager && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenTemplateManager();
                        setIsToolsMenuOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-start gap-2.5 text-slate-200 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                    >
                      <Layers className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-semibold">Part Family Templates</div>
                        <div className="text-[11px] text-slate-400 font-normal">
                          Rule-based inspection training &amp; profiles
                        </div>
                      </div>
                    </button>
                  )}

                  {/* Shop Floor Operator Training (Phase 1a Mock-Up) */}
                  <button
                    type="button"
                    onClick={() => {
                      onToggleViewMode('TRAINING_MOCKUP');
                      setIsToolsMenuOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-start gap-2.5 transition-colors cursor-pointer border-t border-slate-800/80 ${
                      activeViewMode === 'TRAINING_MOCKUP'
                        ? 'bg-lime-950/70 text-lime-200 border-lime-800/60'
                        : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4 text-lime-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-semibold flex items-center gap-1.5">
                        Shop Floor Training Hub
                        <span className="text-[9px] uppercase px-1.5 py-0.2 rounded-full bg-lime-500/20 text-lime-300 border border-lime-400/40 font-bold">
                          Phase 1
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-normal">
                        Operator training, supervisor sign-off, skills matrix
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Visual Divider */}
            <div className="h-5 w-px bg-slate-700/60 mx-0.5" />

            {/* Shop Floor Training Direct Header Pill */}
            <button
              type="button"
              onClick={() => onToggleViewMode('TRAINING_MOCKUP')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeViewMode === 'TRAINING_MOCKUP'
                  ? 'bg-lime-950 text-lime-200 border border-lime-400 shadow-md ring-2 ring-lime-400/40'
                  : 'bg-lime-950/30 text-lime-300 hover:bg-lime-900/50 hover:text-white border border-lime-500/30'
              }`}
              title="Shop-Floor Operator Training & Skills Qualification System (Phase 1)"
            >
              <GraduationCap className="w-3.5 h-3.5 text-lime-400" />
              <span>Shop Training</span>
              <span className="text-[10px] uppercase px-1.5 py-0.2 rounded-full bg-lime-500/20 text-lime-300 font-bold border border-lime-400/40">
                Phase 1
              </span>
            </button>
          </div>
        )}

        {/* ========================================================
            TOOLS CATEGORY: CAD BLUEPRINT & FIRST ARTICLE INSPECTION
            ======================================================== */}
        {activeViewMode === 'INSPECTION' && (
          <div className="flex items-center gap-3 flex-wrap">
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
        )}

        {/* ========================================================
            PILLAR 1: EXECUTIVE QMS DASHBOARD DEDICATED HEADER
            ======================================================== */}
        {activeViewMode === 'QMS_DASHBOARD' && (
          <div className="flex items-center gap-3 flex-wrap ml-auto">
            {/* Standards Compliance Badge */}
            <div className="hidden lg:flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/80 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300 font-medium">Standards Scope:</span>
              <span className="text-emerald-400 font-bold font-mono">ISO 9001:2015 / IATF 16949 / AS9100D</span>
            </div>

            {/* Supabase Live DB Indicator */}
            <div className="hidden md:flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-slate-300 font-medium">QMS Database:</span>
              <span className="text-emerald-400 font-bold font-mono">Supabase Live</span>
            </div>

            {/* Odoo Live ERP Indicator */}
            <div className="hidden xl:flex items-center gap-2 bg-purple-950/30 px-3 py-1.5 rounded-lg border border-purple-800/50 text-xs">
              <span className="h-2 w-2 rounded-full bg-purple-400"></span>
              <span className="text-slate-300 font-medium">ERP Connector:</span>
              <span className="text-purple-300 font-bold font-mono">Odoo v18 Synced</span>
            </div>

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
          </div>
        )}

        {/* ========================================================
            PILLAR 2: AIAG APQP & PPAP LAUNCH HUB DEDICATED HEADER
            ======================================================== */}
        {activeViewMode === 'APQP_PPAP' && (
          <div className="flex items-center gap-3 flex-wrap ml-auto">
            {/* Standards Compliance Badge */}
            <div className="hidden lg:flex items-center gap-2 bg-[#0B2545]/80 px-3 py-1.5 rounded-lg border border-[#132E58] text-xs">
              <ShieldCheck className="w-4 h-4 text-[#81C341]" />
              <span className="text-slate-300 font-medium">Standards Scope:</span>
              <span className="text-[#81C341] font-bold font-mono">AIAG APQP 3rd Ed / PPAP 4th Ed</span>
            </div>

            {/* Supabase Live DB Indicator */}
            <div className="hidden md:flex items-center gap-2 bg-[#07172C] px-3 py-1.5 rounded-lg border border-[#132E58] text-xs">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
              </span>
              <span className="text-slate-300 font-medium">Database:</span>
              <span className="text-cyan-400 font-bold font-mono">Supabase Live</span>
            </div>

            {/* Odoo Live ERP Indicator */}
            <div className="hidden sm:flex items-center gap-2 bg-[#0B2545] px-3 py-1.5 rounded-lg border border-[#81C341]/40 text-xs">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#81C341] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#81C341]"></span>
              </span>
              <span className="text-slate-300 font-medium">Odoo ERP:</span>
              <span className="text-[#81C341] font-bold font-mono">Connected</span>
            </div>

            {/* Submission Default Badge */}
            <div className="hidden xl:flex items-center gap-2 bg-[#0B2545]/60 px-3 py-1.5 rounded-lg border border-[#132E58] text-xs">
              <span className="h-2 w-2 rounded-full bg-[#81C341]"></span>
              <span className="text-slate-300 font-medium">Warrant Default:</span>
              <span className="text-slate-200 font-bold font-mono">Level 3 Full Dossier</span>
            </div>

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
          </div>
        )}

        {/* Visual Divider */}
        <div className="h-6 w-px bg-slate-700/60 mx-0.5 hidden sm:block" />

        {/* Enterprise User Authentication & Profile Menu */}
        <div className="relative flex items-center shrink-0" ref={userMenuRef}>
          {currentUser ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(prev => !prev)}
                className="flex items-center gap-2 h-9 px-3 rounded-xl bg-[#0B2545] hover:bg-[#132E58] border border-[#132E58] text-xs font-semibold text-white shadow-md cursor-pointer transition-colors"
                title={`Active User: ${currentUser.person.first_name} ${currentUser.person.last_name}`}
              >
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-[#81C341] border border-[#81C341]/40 flex items-center justify-center shrink-0">
                  {currentUser.isKiosk ? <HardHat className="w-3 h-3 text-[#81C341]" /> : <User className="w-3 h-3 text-cyan-300" />}
                </div>
                <span className="hidden sm:inline font-bold">
                  {currentUser.person.first_name} {currentUser.person.last_name}
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/50 hidden md:inline">
                  {currentUser.person.job_title || (currentUser.isKiosk ? 'Kiosk' : 'Staff')}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 p-2 space-y-2 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400">
                      Authenticated Session
                    </div>
                    <div className="text-sm font-bold text-white mt-0.5">
                      {currentUser.person.first_name} {currentUser.person.last_name}
                    </div>
                    <div className="text-xs text-slate-400">
                      {currentUser.person.job_title || 'Operator'} &bull; Badge #{currentUser.person.employee_number}
                    </div>
                    <div className="text-[11px] font-mono text-cyan-400 mt-1">
                      Company: {currentUser.person.operating_company}
                    </div>
                  </div>

                  {currentUser.roles.length > 0 && (
                    <div className="px-1 py-1">
                      <div className="text-[10px] font-mono uppercase text-slate-400 font-bold mb-1">
                        Active Roles ({currentUser.roles.length})
                      </div>
                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                        {currentUser.roles.map((r, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700"
                          >
                            {r.module_code}:{r.role_code}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border-t border-slate-800 pt-1 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsAuthModalOpen(true);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <User className="w-4 h-4 text-blue-400" />
                      <span>Switch User / Kiosk</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        setIsUserMenuOpen(false);
                        await logout();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-200 hover:bg-rose-950/40 flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-rose-400" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-2 h-9 px-3.5 rounded-xl bg-gradient-to-r from-blue-700 to-[#132E58] hover:from-blue-600 hover:to-[#0B2545] border border-blue-400/50 text-xs font-bold text-white shadow-md shadow-blue-900/30 cursor-pointer transition-all"
              title="Sign in to Quality Compass (Floor Kiosk or Office)"
            >
              <Lock className="w-3.5 h-3.5 text-cyan-300" />
              <span>Sign In</span>
            </button>
          )}
        </div>
        </div>
      </div>

      {/* Enterprise Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </header>
  );
};
