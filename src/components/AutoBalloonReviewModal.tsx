import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  AlertCircle, 
  Cpu, 
  Eye, 
  CheckSquare,
  Square,
  FileCode2,
  FileText,
  Layers,
  CheckCircle2,
  Tag
} from 'lucide-react';
import type { DetectedDimension } from '../utils/cadOcrParser';
import { applyPartFamilySemanticNames } from '../utils/cadOcrParser';
import type { CharacteristicClassification } from '../types/balloon';
import type { PartFamilyProfile } from '../types/templates';
import { PART_FAMILY_PROFILES, SINGLE_PULLEY_PROFILE } from '../data/partFamilyTemplates';

interface AutoBalloonReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  detectedDimensions: DetectedDimension[];
  onApplyBalloons: (selectedDimensions: DetectedDimension[]) => void;
  sourceType: 'VECTOR_PDF' | 'TESSERACT_OCR' | 'HYBRID' | 'VECTOR_DXF';
  pageNumber?: number;
  totalPages?: number;
  activeProfile?: PartFamilyProfile;
  allProfiles?: PartFamilyProfile[];
  onProfileChange?: (profile: PartFamilyProfile) => void;
}

export const AutoBalloonReviewModal: React.FC<AutoBalloonReviewModalProps> = ({
  isOpen,
  onClose,
  detectedDimensions,
  onApplyBalloons,
  sourceType,
  pageNumber,
  totalPages,
  activeProfile = SINGLE_PULLEY_PROFILE,
  allProfiles,
  onProfileChange,
}) => {
  const [items, setItems] = useState<DetectedDimension[]>(detectedDimensions);
  const [activeTab, setActiveTab] = useState<'ALL' | 'DIMENSIONS' | 'NOTES'>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [currentProfile, setCurrentProfile] = useState<PartFamilyProfile>(activeProfile);

  const availableProfiles = (allProfiles && allProfiles.length > 0) ? allProfiles : PART_FAMILY_PROFILES;

  useEffect(() => {
    setItems(detectedDimensions);
  }, [detectedDimensions]);

  useEffect(() => {
    if (activeProfile) {
      setCurrentProfile(activeProfile);
    }
  }, [activeProfile]);

  if (!isOpen) return null;

  const handleProfileSelect = (profileId: string) => {
    const selected = availableProfiles.find((p: PartFamilyProfile) => p.id === profileId) || availableProfiles[0] || SINGLE_PULLEY_PROFILE;
    setCurrentProfile(selected);
    onProfileChange?.(selected);
    // Re-apply semantic names to items
    const remapped = applyPartFamilySemanticNames(items, selected);
    setItems(remapped);
  };

  const handleToggleSelect = (id: string) => {
    setItems(prev =>
      prev.map(it => (it.id === id ? { ...it, selected: !it.selected } : it))
    );
  };

  const handleSelectAll = (select: boolean) => {
    setItems(prev => prev.map(it => ({ ...it, selected: select })));
  };

  const handleSelectNotesOnly = (select: boolean) => {
    setItems(prev => prev.map(it => {
      if (it.isNoteLine || it.type === 'NOTE') {
        return { ...it, selected: select };
      }
      return it;
    }));
  };

  const handleSelectDimensionsOnly = (select: boolean) => {
    setItems(prev => prev.map(it => {
      if (!it.isNoteLine && it.type !== 'NOTE') {
        return { ...it, selected: select };
      }
      return it;
    }));
  };

  const handleUpdateItem = (id: string, updates: Partial<DetectedDimension>) => {
    setItems(prev =>
      prev.map(it => {
        if (it.id !== id) return it;
        const updated = { ...it, ...updates };
        if (updates.nominal !== undefined || updates.upperTol !== undefined || updates.lowerTol !== undefined) {
          updated.minLimit = Math.round((updated.nominal + updated.lowerTol) * 1000) / 1000;
          updated.maxLimit = Math.round((updated.nominal + updated.upperTol) * 1000) / 1000;
        }
        return updated;
      })
    );
  };

  const noteItems = items.filter(it => it.isNoteLine || it.type === 'NOTE');
  const dimensionItems = items.filter(it => !it.isNoteLine && it.type !== 'NOTE');

  const selectedCount = items.filter(i => i.selected).length;
  const criticalCount = items.filter(i => i.classification === 'CRITICAL').length;
  const majorCount = items.filter(i => i.classification === 'MAJOR').length;
  const selectedNotesCount = noteItems.filter(i => i.selected).length;

  const filteredItems = items.filter(it => {
    // Tab filter
    if (activeTab === 'DIMENSIONS' && (it.isNoteLine || it.type === 'NOTE')) return false;
    if (activeTab === 'NOTES' && !it.isNoteLine && it.type !== 'NOTE') return false;

    // Sub-filter
    if (filterType === 'ALL') return true;
    if (filterType === 'CRITICAL') return it.classification === 'CRITICAL';
    if (filterType === 'DIAMETER') return it.type === 'DIAMETER';
    if (filterType === 'LINEAR') return it.type === 'LINEAR';
    if (filterType === 'GDT') return it.type === 'GDT';
    if (filterType === 'NOTE') return it.isNoteLine || it.type === 'NOTE';
    if (filterType === 'TEMPLATE_MATCHED') return !!it.templateFeatureId;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in select-none">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-6xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Sparkles className="w-5 h-5 text-cyan-200" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-white">
                  CAD Auto-Balloon & Feature Recognition
                </h2>

                {sourceType === 'VECTOR_DXF' && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <FileCode2 className="w-3.5 h-3.5 text-emerald-400" />
                    AutoCAD DXF Vector (100% Precision)
                  </span>
                )}
                {sourceType === 'VECTOR_PDF' && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    <Cpu className="w-3 h-3 text-cyan-400" />
                    Vector PDF Extraction
                  </span>
                )}
                {sourceType === 'TESSERACT_OCR' && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    <Eye className="w-3 h-3 text-purple-400" />
                    Tesseract.js OCR Engine
                  </span>
                )}
                {totalPages && totalPages > 1 && (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                    Sheet {pageNumber || 1} of {totalPages}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Automatically trained against engineering conventions, drawing notes, and minimum required dimensions.
              </p>
            </div>
          </div>

          {/* Part Family Profile Selector */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-xl">
              <Layers className="w-4 h-4 text-cyan-400" />
              <div className="flex flex-col text-left">
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Trained Part Family</span>
                <select
                  value={currentProfile.id}
                  onChange={(e) => handleProfileSelect(e.target.value)}
                  className="bg-transparent text-xs font-bold text-cyan-300 focus:outline-none cursor-pointer pr-1"
                >
                  {availableProfiles.map((p: PartFamilyProfile) => (
                    <option key={p.id} value={p.id} className="bg-slate-900 text-slate-200">
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Section Tabs & Filters */}
        <div className="px-6 py-2.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Main Tabs */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveTab('ALL')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'ALL'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>All Recognized</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-blue-900/60 text-blue-200 border border-blue-400/30">
                  {items.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('DIMENSIONS')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'DIMENSIONS'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Dimensions & Features</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-800 text-cyan-300 border border-slate-700">
                  {dimensionItems.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('NOTES')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'NOTES'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Notes & Requirements</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-indigo-900/60 text-indigo-200 border border-indigo-400/30">
                  {noteItems.length}
                </span>
              </button>
            </div>

            <div className="w-[1px] h-4 bg-slate-800 mx-1" />

            {/* Quick Filter chips */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFilterType('ALL')}
                className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  filterType === 'ALL' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                Show All
              </button>
              <button
                onClick={() => setFilterType('CRITICAL')}
                className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  filterType === 'CRITICAL' ? 'bg-red-600/80 text-white' : 'text-slate-400 hover:text-red-300'
                }`}
              >
                Critical CTQ
              </button>
              <button
                onClick={() => setFilterType('TEMPLATE_MATCHED')}
                className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  filterType === 'TEMPLATE_MATCHED' ? 'bg-cyan-600/80 text-white' : 'text-slate-400 hover:text-cyan-300'
                }`}
              >
                Template Matched
              </button>
            </div>
          </div>

          {/* Quick Selection Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSelectAll(true)}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors text-[11px]"
            >
              <CheckSquare className="w-3 h-3 text-cyan-400" />
              <span>Select All</span>
            </button>
            <button
              onClick={() => handleSelectAll(false)}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors text-[11px]"
            >
              <Square className="w-3 h-3 text-slate-400" />
              <span>Clear All</span>
            </button>

            {noteItems.length > 0 && (
              <button
                onClick={() => handleSelectNotesOnly(true)}
                className="flex items-center gap-1 px-2.5 py-1 bg-indigo-950/70 hover:bg-indigo-900/90 text-indigo-300 rounded-lg border border-indigo-700/50 transition-colors text-[11px] font-medium"
              >
                <CheckCircle2 className="w-3 h-3 text-indigo-400" />
                <span>Select Notes ({noteItems.length})</span>
              </button>
            )}

            {dimensionItems.length > 0 && (
              <button
                onClick={() => handleSelectDimensionsOnly(true)}
                className="flex items-center gap-1 px-2.5 py-1 bg-blue-950/70 hover:bg-blue-900/90 text-blue-300 rounded-lg border border-blue-700/50 transition-colors text-[11px] font-medium"
              >
                <CheckCircle2 className="w-3 h-3 text-blue-400" />
                <span>Select Dimensions ({dimensionItems.length})</span>
              </button>
            )}

            <div className="w-[1px] h-4 bg-slate-800 mx-1" />

            {/* Units Toggle */}
            <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 font-medium">Unit:</span>
              <button
                onClick={() => setItems(prev => prev.map(it => ({ ...it, unit: 'inch' })))}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                  (items[0]?.unit || 'inch') === 'inch' ? 'bg-cyan-600 text-white' : 'text-slate-400'
                }`}
              >
                INCH
              </button>
              <button
                onClick={() => setItems(prev => prev.map(it => ({ ...it, unit: 'mm' })))}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                  items[0]?.unit === 'mm' ? 'bg-blue-600 text-white' : 'text-slate-400'
                }`}
              >
                MM
              </button>
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="px-6 py-2 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Profile Template:</span>
            <span className="text-cyan-300 font-medium">{currentProfile.name}</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">{currentProfile.standardFeatures.filter(f => f.isRequired).length} Required Features Monitored</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 font-mono text-[11px]">
              {criticalCount} Critical CTQ
            </span>
            <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-[11px]">
              {majorCount} Major
            </span>
            <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-mono text-[11px]">
              {selectedNotesCount}/{noteItems.length} Notes Included
            </span>
            <span className="px-2.5 py-0.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 font-mono text-[11px] font-bold">
              {selectedCount} To Balloon
            </span>
          </div>
        </div>

        {/* Items Table */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="w-10 h-10 text-amber-400 mb-3" />
              <p className="text-white font-semibold">No items match the current tab/filter</p>
              <p className="text-slate-400 text-xs mt-1 max-w-md">
                Try switching tabs or resetting the filters. You can also manually click anywhere on the drawing canvas to stamp inspection balloons.
              </p>
            </div>
          ) : (
            <div className="border border-slate-800 rounded-xl overflow-hidden shadow-inner">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-medium">
                    <th className="py-2.5 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedCount === items.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
                      />
                    </th>
                    <th className="py-2.5 px-2 w-14 text-center font-mono">Balloon</th>
                    <th className="py-2.5 px-3 min-w-[170px]">Raw Callout / Drawing Note</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Recognized Feature / Standard Name</th>
                    <th className="py-2.5 px-2 w-24 text-right">Nominal</th>
                    <th className="py-2.5 px-2 w-20 text-right">Lower Tol</th>
                    <th className="py-2.5 px-2 w-20 text-right">Upper Tol</th>
                    <th className="py-2.5 px-3 w-28 text-center">Classification</th>
                    <th className="py-2.5 px-3 min-w-[150px]">Inspection Method</th>
                    <th className="py-2.5 px-2 w-16 text-center">Zone</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {filteredItems.map((item, idx) => {
                    const isSelected = item.selected;
                    const isNote = item.isNoteLine || item.type === 'NOTE';
                    const hasTemplateMatch = !!item.templateFeatureId;

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          isSelected
                            ? isNote 
                              ? 'bg-indigo-950/20 hover:bg-indigo-950/30' 
                              : 'bg-slate-900/60 hover:bg-slate-850'
                            : 'bg-slate-950/40 text-slate-500 opacity-60 hover:opacity-90'
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(item.id)}
                            className="rounded border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
                          />
                        </td>

                        {/* Balloon Number */}
                        <td className="py-2 px-2 text-center font-mono font-bold text-blue-400">
                          #{idx + 1}
                        </td>

                        {/* Raw Drawing Callout / Note */}
                        <td className="py-2 px-3">
                          <div className="flex flex-col">
                            <span className="font-mono font-semibold text-slate-200 line-clamp-2">
                              {item.rawCallout}
                            </span>
                            {isNote && (
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                  DRAWING NOTE LINE
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Recognized Feature / Standard Name */}
                        <td className="py-2 px-3">
                          <div className="flex flex-col gap-1">
                            <input
                              type="text"
                              value={item.dimensionName}
                              onChange={(e) => handleUpdateItem(item.id, { dimensionName: e.target.value })}
                              className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none"
                            />
                            {hasTemplateMatch && (
                              <div className="flex items-center gap-1">
                                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                  <Tag className="w-2.5 h-2.5 text-cyan-400" />
                                  Trained Standard: {item.dimensionName}
                                </span>
                                {item.dimensionNameZh && (
                                  <span className="text-[10px] text-slate-400">
                                    ({item.dimensionNameZh})
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Nominal */}
                        <td className="py-2 px-2 text-right">
                          <input
                            type="number"
                            step="any"
                            value={item.nominal}
                            onChange={(e) => handleUpdateItem(item.id, { nominal: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 rounded px-1.5 py-1 text-right text-slate-200 text-xs font-mono focus:outline-none"
                          />
                        </td>

                        {/* Lower Tol */}
                        <td className="py-2 px-2 text-right">
                          <input
                            type="number"
                            step="any"
                            value={item.lowerTol}
                            onChange={(e) => handleUpdateItem(item.id, { lowerTol: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 rounded px-1.5 py-1 text-right text-slate-200 text-xs font-mono focus:outline-none"
                          />
                        </td>

                        {/* Upper Tol */}
                        <td className="py-2 px-2 text-right">
                          <input
                            type="number"
                            step="any"
                            value={item.upperTol}
                            onChange={(e) => handleUpdateItem(item.id, { upperTol: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 rounded px-1.5 py-1 text-right text-slate-200 text-xs font-mono focus:outline-none"
                          />
                        </td>

                        {/* Classification */}
                        <td className="py-2 px-3 text-center">
                          <select
                            value={item.classification}
                            onChange={(e) => handleUpdateItem(item.id, { classification: e.target.value as CharacteristicClassification })}
                            className={`px-2 py-1 rounded text-[11px] font-bold border focus:outline-none ${
                              item.classification === 'CRITICAL'
                                ? 'bg-red-500/20 text-red-300 border-red-500/40'
                                : item.classification === 'MAJOR'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            <option value="CRITICAL">CRITICAL</option>
                            <option value="MAJOR">MAJOR</option>
                            <option value="MINOR">MINOR</option>
                            <option value="REFERENCE">REFERENCE</option>
                          </select>
                        </td>

                        {/* Recommended Tool */}
                        <td className="py-2 px-3">
                          <span className="text-[11px] text-slate-300 font-medium block truncate" title={item.recommendedToolEn}>
                            {item.recommendedToolEn}
                          </span>
                        </td>

                        {/* Drawing Zone */}
                        <td className="py-2 px-2 text-center font-mono text-[11px] text-slate-400">
                          {item.drawingZone}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {selectedCount > 0 ? (
              <span>
                Ready to generate <strong className="text-cyan-300 font-mono">{selectedCount}</strong> sequential inspection balloons ({dimensionItems.filter(d => d.selected).length} dimensions + {selectedNotesCount} notes) and map into Excel control plan.
              </span>
            ) : (
              <span className="text-amber-400">Please select at least one item to apply balloons.</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-colors"
            >
              Cancel
            </button>

            <button
              disabled={selectedCount === 0}
              onClick={() => onApplyBalloons(items.filter(i => i.selected))}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4 text-cyan-200" />
              <span>Apply {selectedCount} Balloons to Drawing</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
