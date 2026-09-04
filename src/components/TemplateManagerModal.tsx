import { useState } from 'react';
import { 
  GraduationCap, 
  Plus, 
  Trash2, 
  X, 
  Sparkles, 
  RotateCcw
} from 'lucide-react';
import type { PartFamilyProfile, PartFamilyFeatureRule } from '../types/templates';
import { 
  savePartFamilyProfile, 
  resetPartFamilyProfilesToDefault 
} from '../utils/templateManager';

export interface TemplateManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: PartFamilyProfile[];
  activeProfile?: PartFamilyProfile;
  activeProfileId?: string;
  onSelectProfile: (profile: PartFamilyProfile) => void;
  onSaveProfile?: (profile: PartFamilyProfile) => void;
  onResetDefaults?: () => void;
  onProfilesUpdated?: (profiles: PartFamilyProfile[]) => void;
}

export function TemplateManagerModal({
  isOpen,
  onClose,
  profiles,
  activeProfile,
  activeProfileId,
  onSelectProfile,
  onSaveProfile,
  onResetDefaults,
  onProfilesUpdated,
}: TemplateManagerModalProps) {
  const currentActiveId = activeProfileId || activeProfile?.id || (profiles[0]?.id ?? 'profile-single-pulley');
  const [selectedProfileId, setSelectedProfileId] = useState<string>(currentActiveId);
  const [isAddingFeature, setIsAddingFeature] = useState<boolean>(false);
  const [isCreatingProfile, setIsCreatingProfile] = useState<boolean>(false);

  // New Profile Form
  const [newProfileName, setNewProfileName] = useState<string>('');
  const [newProfileNameZh, setNewProfileNameZh] = useState<string>('');
  const [newProfileCategory, setNewProfileCategory] = useState<'PULLEY' | 'SHAFT' | 'FLANGE' | 'GENERIC'>('PULLEY');
  const [newProfileDesc, setNewProfileDesc] = useState<string>('');

  // New Feature Rule Form
  const [newFeatName, setNewFeatName] = useState<string>('');
  const [newFeatNameZh, setNewFeatNameZh] = useState<string>('');
  const [newFeatType, setNewFeatType] = useState<'LINEAR' | 'DIAMETER' | 'CHAMFER' | 'RADIUS' | 'GDT'>('DIAMETER');
  const [newFeatClass, setNewFeatClass] = useState<'CRITICAL' | 'MAJOR' | 'MINOR' | 'REFERENCE'>('CRITICAL');
  const [newFeatKeywords, setNewFeatKeywords] = useState<string>('');
  const [newFeatMinNom, setNewFeatMinNom] = useState<string>('0.1');
  const [newFeatMaxNom, setNewFeatMaxNom] = useState<string>('15.0');
  const [newFeatDesc, setNewFeatDesc] = useState<string>('');

  if (!isOpen) return null;

  const currentProfile = profiles.find(p => p.id === selectedProfileId) || profiles[0];
  const activeProf = activeProfile || profiles.find(p => p.id === activeProfileId) || currentProfile;

  const handleCreateProfile = () => {
    if (!newProfileName.trim()) return;
    const newId = `profile-${Date.now()}`;
    const newProf: PartFamilyProfile = {
      id: newId,
      name: newProfileName.trim(),
      nameZh: newProfileNameZh.trim() || newProfileName.trim(),
      category: newProfileCategory,
      description: newProfileDesc.trim() || 'Custom user-trained part family profile.',
      descriptionZh: '用户自定义训练的零件族识别规范。',
      standardFeatures: [],
      requiredNotes: [
        {
          key: 'MATERIAL',
          labelEn: 'Material Specification',
          labelZh: '原材料材质规格',
          keywords: ['material', 'matl', 'steel', 'sphc'],
          isRequired: true,
        },
      ],
    };

    savePartFamilyProfile(newProf);
    onSaveProfile?.(newProf);
    const updated = [...profiles, newProf];
    onProfilesUpdated?.(updated);
    setSelectedProfileId(newId);
    onSelectProfile(newProf);
    setIsCreatingProfile(false);
    setNewProfileName('');
    setNewProfileNameZh('');
    setNewProfileDesc('');
  };

  const handleAddFeature = () => {
    if (!newFeatName.trim()) return;

    const keywordsArray = newFeatKeywords
      .split(/[,;]+/)
      .map(k => k.trim().toLowerCase())
      .filter(Boolean);

    const min = parseFloat(newFeatMinNom);
    const max = parseFloat(newFeatMaxNom);

    const rule: PartFamilyFeatureRule = {
      id: `FEAT_${Date.now().toString(36).toUpperCase()}`,
      featureName: newFeatName.trim(),
      featureNameZh: newFeatNameZh.trim() || newFeatName.trim(),
      dimensionType: newFeatType,
      classification: newFeatClass,
      isRequired: false, // Recommended guideline, not strictly required on every drawing
      description: newFeatDesc.trim() || `Trained feature: ${newFeatName.trim()}`,
      descriptionZh: `已训练的零件特征: ${newFeatNameZh.trim()}`,
      matchingCriteria: {
        keywords: keywordsArray.length > 0 ? keywordsArray : [newFeatName.trim().toLowerCase()],
        nominalRange: !isNaN(min) && !isNaN(max) ? [min, max] : undefined,
        isDiameter: newFeatType === 'DIAMETER',
        isAngle: newFeatType === 'CHAMFER',
      },
    };

    const updatedProfile: PartFamilyProfile = {
      ...currentProfile,
      standardFeatures: [...currentProfile.standardFeatures, rule],
    };

    savePartFamilyProfile(updatedProfile);
    onSaveProfile?.(updatedProfile);
    const updatedList = profiles.map(p => p.id === updatedProfile.id ? updatedProfile : p);
    onProfilesUpdated?.(updatedList);
    if ((activeProfileId && activeProfileId === updatedProfile.id) || (activeProfile && activeProfile.id === updatedProfile.id)) {
      onSelectProfile(updatedProfile);
    }

    // Reset form
    setIsAddingFeature(false);
    setNewFeatName('');
    setNewFeatNameZh('');
    setNewFeatKeywords('');
    setNewFeatDesc('');
  };

  const handleDeleteFeature = (featId: string) => {
    const updatedFeatures = currentProfile.standardFeatures.filter(f => f.id !== featId);
    const updatedProfile: PartFamilyProfile = {
      ...currentProfile,
      standardFeatures: updatedFeatures,
    };
    savePartFamilyProfile(updatedProfile);
    onSaveProfile?.(updatedProfile);
    const updatedList = profiles.map(p => p.id === updatedProfile.id ? updatedProfile : p);
    onProfilesUpdated?.(updatedList);
    if ((activeProfileId && activeProfileId === updatedProfile.id) || (activeProfile && activeProfile.id === updatedProfile.id)) {
      onSelectProfile(updatedProfile);
    }
  };

  const handleResetToDefaults = () => {
    if (confirm('Reset all templates to default factory profiles? Custom changes will be restored.')) {
      if (onResetDefaults) {
        onResetDefaults();
      } else {
        resetPartFamilyProfilesToDefault();
        location.reload();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  Part Family Template Training & Feature Manager
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
                  AI Feature Training
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Train the engine on product dimensional features so recommendations adapt across similar drawings
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

        {/* Info Banner */}
        <div className="bg-blue-950/40 border-b border-blue-900/50 px-6 py-3 flex items-start gap-3 text-xs text-blue-200">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-white">Flexible Product Family Training:</span> Templates teach Quality Compass how to recognize and name standard characteristics (e.g. Pulley Width, Groove Angle, Over Pin Dimension, Involute Splines) and recommend standard inspection tools. Dimensions in the template are <span className="underline font-semibold">not rigid mandatory requirements</span> on every drawing; they guide automated recognition whenever similar features are present.
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Profile Selector Toolbar */}
          <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-300">Active Profile:</label>
              <select
                value={selectedProfileId}
                onChange={(e) => setSelectedProfileId(e.target.value)}
                className="bg-slate-950 text-cyan-300 font-medium text-xs rounded-lg px-3 py-2 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {selectedProfileId !== activeProf?.id && (
                <button
                  type="button"
                  onClick={() => onSelectProfile(currentProfile)}
                  className="px-2.5 py-1.5 rounded text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
                >
                  Set as Active Profile
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCreatingProfile(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-cyan-400" />
                New Product Template
              </button>
              <button
                type="button"
                onClick={handleResetToDefaults}
                className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded-lg transition-colors"
                title="Reset templates to system factory defaults"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* New Profile Creation Form Modal/Card */}
          {isCreatingProfile && (
            <div className="bg-slate-950 p-4 rounded-xl border border-cyan-800/80 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-300">Create New Part Family Profile</span>
                <button onClick={() => setIsCreatingProfile(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Profile Name (English):</label>
                  <input
                    type="text"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    placeholder="e.g. Splined Pulley Assembly"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Profile Name (Chinese / 中文名称):</label>
                  <input
                    type="text"
                    value={newProfileNameZh}
                    onChange={(e) => setNewProfileNameZh(e.target.value)}
                    placeholder="e.g. 花键皮带轮总成"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Product Category:</label>
                  <select
                    value={newProfileCategory}
                    onChange={(e) => setNewProfileCategory(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                  >
                    <option value="PULLEY">Pulley / Idler (皮带轮/惰轮)</option>
                    <option value="SHAFT">Shaft / Spindle (轴类/主轴)</option>
                    <option value="FLANGE">Flange / Hub (法兰/轮毂)</option>
                    <option value="GENERIC">Generic Mechanical (通用机械件)</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Description:</label>
                  <input
                    type="text"
                    value={newProfileDesc}
                    onChange={(e) => setNewProfileDesc(e.target.value)}
                    placeholder="Description of dimensional standards and usage"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingProfile(false)}
                  className="px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 rounded"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateProfile}
                  className="px-3 py-1.5 text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white rounded shadow-sm"
                >
                  Create Profile
                </button>
              </div>
            </div>
          )}

          {/* Current Profile Overview */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{currentProfile.name}</span>
                  <span className="text-xs text-slate-400 font-normal">({currentProfile.nameZh})</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{currentProfile.description}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingFeature(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Train New Feature
              </button>
            </div>
          </div>

          {/* New Feature Form */}
          {isAddingFeature && (
            <div className="bg-slate-950 p-4 rounded-xl border border-cyan-800/80 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-300">Train New Feature for {currentProfile.name}</span>
                <button onClick={() => setIsAddingFeature(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Feature Name (English):</label>
                  <input
                    type="text"
                    value={newFeatName}
                    onChange={(e) => setNewFeatName(e.target.value)}
                    placeholder="e.g. Blank Bore Diameter"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Feature Name (Chinese / 中文):</label>
                  <input
                    type="text"
                    value={newFeatNameZh}
                    onChange={(e) => setNewFeatNameZh(e.target.value)}
                    placeholder="e.g. 内孔毛坯精加工直径"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Dimension Type:</label>
                  <select
                    value={newFeatType}
                    onChange={(e) => setNewFeatType(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                  >
                    <option value="DIAMETER">DIAMETER (直径 Ø)</option>
                    <option value="LINEAR">LINEAR (线性长度/宽度)</option>
                    <option value="CHAMFER">CHAMFER / ANGLE (角度 °)</option>
                    <option value="RADIUS">RADIUS (圆角 R)</option>
                    <option value="GDT">GD&T (形位公差/跳动度)</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Classification (重要度级别):</label>
                  <select
                    value={newFeatClass}
                    onChange={(e) => setNewFeatClass(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                  >
                    <option value="CRITICAL">CRITICAL (关键特性 ★)</option>
                    <option value="MAJOR">MAJOR (主要特性)</option>
                    <option value="MINOR">MINOR (次要特性)</option>
                    <option value="REFERENCE">REFERENCE (参考尺寸 REF)</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Keywords for Auto-Detection (逗号分隔):</label>
                  <input
                    type="text"
                    value={newFeatKeywords}
                    onChange={(e) => setNewFeatKeywords(e.target.value)}
                    placeholder="e.g. bore, blank bore, blank"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="w-1/2">
                    <label className="text-slate-400 block mb-1">Min Nominal:</label>
                    <input
                      type="number"
                      step="any"
                      value={newFeatMinNom}
                      onChange={(e) => setNewFeatMinNom(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>
                  <div className="w-1/2">
                    <label className="text-slate-400 block mb-1">Max Nominal:</label>
                    <input
                      type="number"
                      step="any"
                      value={newFeatMaxNom}
                      onChange={(e) => setNewFeatMaxNom(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingFeature(false)}
                  className="px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 rounded"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddFeature}
                  className="px-3 py-1.5 text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white rounded shadow-sm"
                >
                  Save Trained Feature
                </button>
              </div>
            </div>
          )}

          {/* Trained Features Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">
                Trained Features ({currentProfile.standardFeatures.length})
              </span>
              <span className="text-[11px] text-slate-400">
                Dimensions matching these patterns receive automated naming & inspection recommendations
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400">
                    <th className="p-3 font-semibold">Feature Name</th>
                    <th className="p-3 font-semibold">Chinese Name</th>
                    <th className="p-3 font-semibold">Type</th>
                    <th className="p-3 font-semibold">Classification</th>
                    <th className="p-3 font-semibold">Keywords / Pattern</th>
                    <th className="p-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {currentProfile.standardFeatures.map((feat) => (
                    <tr key={feat.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-3 font-medium text-white">
                        {feat.featureName}
                      </td>
                      <td className="p-3 text-slate-300 font-sans">
                        {feat.featureNameZh}
                      </td>
                      <td className="p-3 font-mono text-slate-400">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 border border-slate-700">
                          {feat.dimensionType}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          feat.classification === 'CRITICAL'
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : feat.classification === 'MAJOR'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : feat.classification === 'REFERENCE'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}>
                          {feat.classification}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-400 text-[11px]">
                        {feat.matchingCriteria?.keywords?.join(', ') || 'Auto'}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteFeature(feat.id)}
                          className="p-1 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                          title="Remove feature"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Required Notes Table */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-200">
              Technical Note Recognition Rules ({currentProfile.requiredNotes.length})
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {currentProfile.requiredNotes.map(n => (
                <div key={n.key} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-200 block">{n.labelEn}</span>
                    <span className="text-[11px] text-slate-400">{n.labelZh}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                    {n.keywords.slice(0, 2).join(', ')}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Active: <strong className="text-cyan-300">{activeProf?.name || currentProfile?.name}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
