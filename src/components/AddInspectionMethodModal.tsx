import React, { useState } from 'react';
import { 
  X, 
  Wrench, 
  Plus, 
  Trash2, 
  Search, 
  Sparkles, 
  Check, 
  Layers, 
  Tag
} from 'lucide-react';
import type { InspectionMethodTool } from '../types/inspection';

interface AddInspectionMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTool: (newTool: InspectionMethodTool, targetItemId?: string) => void;
  onDeleteTool?: (toolId: string) => void;
  existingTools: InspectionMethodTool[];
  targetItemId?: string | null;
  targetItemInfo?: { itemNumber: number; nameEn: string } | null;
}

// Industry Presets for quick selection
const TOOL_PRESETS: Array<{
  nameEn: string;
  nameZh: string;
  code: string;
  category: InspectionMethodTool['category'];
  accuracyRange: string;
}> = [
  {
    nameEn: 'Air Gauge / Pneumatic Column System',
    nameZh: '高精度气动量仪 (内孔/外径柱式显示)',
    code: 'AIR-01',
    category: 'DIMENSIONAL',
    accuracyRange: '±0.0005 mm',
  },
  {
    nameEn: 'Keyence Instant Vision Measurement System (IM)',
    nameZh: '基恩士一键式快速图像尺寸测量仪 (IM系列)',
    code: 'IM-KEY',
    category: 'OPTICAL',
    accuracyRange: '±0.002 mm',
  },
  {
    nameEn: 'Custom Dedicated Attribute Checking Fixture',
    nameZh: '定制产品专用综合检具 / 功能治具',
    code: 'FIX-CUST',
    category: 'ATTRIBUTE',
    accuracyRange: 'Go / No-Go (通止规判定)',
  },
  {
    nameEn: 'Custom Special Pitch Thread Plug Gauge',
    nameZh: '非标定制特殊螺距螺纹塞规 (通止端)',
    code: 'TG-SPEC',
    category: 'ATTRIBUTE',
    accuracyRange: 'Class 6H / 4H Special',
  },
  {
    nameEn: 'Pneumatic Pressure Leak Decay Tester',
    nameZh: '差压式气密性泄漏测试仪 (检漏仪)',
    code: 'LEAK-01',
    category: 'NON_DESTRUCTIVE',
    accuracyRange: '0.01 sccm / 1 Pa decay',
  },
  {
    nameEn: 'Coating / Anodizing Thickness Gauge (Eddy Current)',
    nameZh: '电涡流阳极氧化/涂层测厚仪 (膜厚仪)',
    code: 'COAT-01',
    category: 'SURFACE',
    accuracyRange: '±0.5 µm',
  },
  {
    nameEn: 'Flush-Pin & Gap Step Gauge',
    nameZh: '面差阶梯销 / 间隙通止平销规',
    code: 'FLUSH-01',
    category: 'ATTRIBUTE',
    accuracyRange: '±0.05 mm',
  },
  {
    nameEn: 'Handheld XRF Alloy Analyzer',
    nameZh: '手持式XRF荧光光谱合金分析仪 (化学成分验证)',
    code: 'XRF-01',
    category: 'MECHANICAL',
    accuracyRange: 'Chemical Grade ID Conformance',
  },
  {
    nameEn: 'Ultrasonic Precision Thickness Gauge',
    nameZh: '高精度超声波测厚仪 (承压壁厚检测)',
    code: 'UTG-01',
    category: 'NON_DESTRUCTIVE',
    accuracyRange: '±0.005 mm',
  },
];

export const AddInspectionMethodModal: React.FC<AddInspectionMethodModalProps> = ({
  isOpen,
  onClose,
  onAddTool,
  onDeleteTool,
  existingTools,
  targetItemId,
  targetItemInfo,
}) => {
  const [activeTab, setActiveTab] = useState<'NEW' | 'LIST'>('NEW');
  const [nameEn, setNameEn] = useState('');
  const [nameZh, setNameZh] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState<InspectionMethodTool['category']>('DIMENSIONAL');
  const [accuracyRange, setAccuracyRange] = useState('±0.005 mm');
  const [searchTerm, setSearchTerm] = useState('');
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: typeof TOOL_PRESETS[0]) => {
    setNameEn(preset.nameEn);
    setNameZh(preset.nameZh);
    setCode(preset.code);
    setCategory(preset.category);
    setAccuracyRange(preset.accuracyRange);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn.trim()) return;

    const toolId = `tool-custom-${Date.now()}`;
    const toolCode = code.trim() || `CUST-${Math.floor(100 + Math.random() * 900)}`;
    const finalNameZh = nameZh.trim() || nameEn.trim();

    const newTool: InspectionMethodTool = {
      id: toolId,
      code: toolCode,
      nameEn: nameEn.trim(),
      nameZh: finalNameZh,
      category,
      accuracyRange: accuracyRange.trim() || 'Spec Standard',
      isCustom: true,
    };

    onAddTool(newTool, targetItemId || undefined);
    setJustAddedId(toolId);

    // Reset form
    setNameEn('');
    setNameZh('');
    setCode('');
    setAccuracyRange('±0.005 mm');

    // Close after short feedback
    setTimeout(() => {
      onClose();
    }, 400);
  };

  const filteredTools = existingTools.filter(t =>
    t.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.nameZh.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const customToolsCount = existingTools.filter(t => t.isCustom).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-emerald-400/30">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Inspection Methods & Tooling</span>
                <span className="text-xs font-normal text-emerald-400 font-mono">检具与检测方法库</span>
              </h3>
              <p className="text-xs text-slate-400">
                {targetItemInfo 
                  ? `Assigning method for Characteristic #${targetItemInfo.itemNumber} (${targetItemInfo.nameEn})`
                  : 'Add custom gauges, optical systems, fixtures, or test methods to the dropdown'}
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

        {/* Tab Switcher */}
        <div className="flex items-center px-6 pt-3 border-b border-slate-800 bg-slate-950/40 gap-2">
          <button
            onClick={() => setActiveTab('NEW')}
            className={`flex items-center gap-1.5 px-4 py-2 border-b-2 text-xs font-bold transition-colors ${
              activeTab === 'NEW'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Inspection Method (添加新检具)</span>
          </button>
          <button
            onClick={() => setActiveTab('LIST')}
            className={`flex items-center gap-1.5 px-4 py-2 border-b-2 text-xs font-bold transition-colors ${
              activeTab === 'LIST'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Manage Catalog ({existingTools.length} total, {customToolsCount} custom)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'NEW' ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Quick Presets Carousel/Chips */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Quick Presets / 常用检具预设模板 (Click to Auto-Fill):</span>
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                  {TOOL_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="px-2.5 py-1 bg-slate-800/80 hover:bg-emerald-600/20 text-slate-300 hover:text-emerald-300 border border-slate-700/80 hover:border-emerald-500/40 rounded-lg text-[11px] font-medium transition-all text-left truncate max-w-[280px]"
                      title={`${preset.nameEn} / ${preset.nameZh}`}
                    >
                      + {preset.nameEn.split('(')[0].trim()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 border-t border-slate-800">
                {/* Method Name English */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Method / Tool Name (English) <span className="text-red-400">*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    placeholder="e.g. Air Gauge / Bore Column Fixture"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Method Name Chinese */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Method Name in Chinese (检验方法中文名称):
                  </label>
                  <input
                    type="text"
                    value={nameZh}
                    onChange={(e) => setNameZh(e.target.value)}
                    placeholder="例如：高精度气动量仪 (内孔测量)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Tool Code / ID */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-slate-400" />
                    <span>Tool Code / Equipment Tag (检具编号):</span>
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. AIR-01, FIX-CUST, GAUGE-04"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Category (检具类别):
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as InspectionMethodTool['category'])}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="DIMENSIONAL">DIMENSIONAL (尺寸测量工具)</option>
                    <option value="ATTRIBUTE">ATTRIBUTE (通止规 / 专用检具)</option>
                    <option value="GEOMETRIC">GEOMETRIC (形位公差 / 三坐标)</option>
                    <option value="OPTICAL">OPTICAL (光学影像 / 投影仪)</option>
                    <option value="SURFACE">SURFACE (粗糙度 / 涂层测厚)</option>
                    <option value="MECHANICAL">MECHANICAL (材质 / 硬度 / 力学)</option>
                    <option value="NON_DESTRUCTIVE">NON_DESTRUCTIVE (气密检漏 / 超声无损)</option>
                    <option value="CUSTOM">CUSTOM (其他专用工装)</option>
                  </select>
                </div>

                {/* Accuracy / Resolution */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Accuracy / Calibration Resolution (精度范围 / 检定标准):
                  </label>
                  <input
                    type="text"
                    value={accuracyRange}
                    onChange={(e) => setAccuracyRange(e.target.value)}
                    placeholder="e.g. ±0.001 mm, Class 6H Go/No-Go, Ra 0.01 µm"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Submit Controls */}
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
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
                >
                  {justAddedId ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-200" />
                      <span>Added to Dropdown!</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>
                        {targetItemId ? 'Save & Assign to Item' : 'Add to Dropdown List'}
                      </span>
                    </>
                  )}
                </button>
              </div>

            </form>
          ) : (
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by tool name, code, or category..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Tool List */}
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {filteredTools.map((tool) => (
                  <div
                    key={tool.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      tool.isCustom
                        ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/60'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] font-bold text-slate-300">
                          {tool.code}
                        </span>
                        <span className="text-xs font-bold text-white truncate">
                          {tool.nameEn}
                        </span>
                        {tool.isCustom && (
                          <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold">
                            Custom
                          </span>
                        )}
                        <span className="px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 text-[10px]">
                          {tool.category}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-3">
                        <span className="text-slate-300">{tool.nameZh}</span>
                        <span className="text-slate-600">|</span>
                        <span className="font-mono text-emerald-400">{tool.accuracyRange}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {targetItemId && (
                        <button
                          onClick={() => {
                            onAddTool(tool, targetItemId);
                            onClose();
                          }}
                          className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Select
                        </button>
                      )}

                      {tool.isCustom && onDeleteTool && (
                        <button
                          onClick={() => onDeleteTool(tool.id)}
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete Custom Method"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {filteredTools.length === 0 && (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    No inspection methods found matching &quot;{searchTerm}&quot;
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
