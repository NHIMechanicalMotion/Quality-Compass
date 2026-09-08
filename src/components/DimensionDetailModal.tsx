import React, { useState } from 'react';
import { 
  X, 
  Save, 
  Trash2,
} from 'lucide-react';
import type { InspectionBalloon, CharacteristicClassification, DimensionType } from '../types/balloon';
import type { InspectionControlPlanItem } from '../types/inspection';
import { recommendInspectionTool } from '../utils/toolRecommender';

interface DimensionDetailModalProps {
  balloon: InspectionBalloon | null;
  item: InspectionControlPlanItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedBalloon: InspectionBalloon, updatedItem: InspectionControlPlanItem) => void;
  onDelete: (balloonId: string) => void;
}

export const DimensionDetailModal: React.FC<DimensionDetailModalProps> = ({
  balloon,
  item,
  isOpen,
  onClose,
  onSave,
  onDelete,
}) => {
  const [itemNumber, setItemNumber] = useState<number>(balloon?.itemNumber || 1);
  const [nameEn, setNameEn] = useState<string>(balloon?.dimensionName || '');
  const [nameZh, setNameZh] = useState<string>(balloon?.dimensionNameZh || '');
  const [type, setType] = useState<DimensionType>(balloon?.type || 'LINEAR');
  const [classification, setClassification] = useState<CharacteristicClassification>(balloon?.classification || 'MINOR');
  const [nominal, setNominal] = useState<number>(balloon?.nominal || 0);
  const [upperTol, setUpperTol] = useState<number>(balloon?.upperTol || 0);
  const [lowerTol, setLowerTol] = useState<number>(balloon?.lowerTol || 0);
  const [zone, setZone] = useState<string>(balloon?.drawingZone || 'B-2');
  const [color, setColor] = useState<string>(balloon?.balloonColor || '#2563eb');

  if (!isOpen || !balloon || !item) return null;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const minLimit = Math.round((nominal + lowerTol) * 10000) / 10000;
    const maxLimit = Math.round((nominal + upperTol) * 10000) / 10000;

    const updatedBalloon: InspectionBalloon = {
      ...balloon,
      itemNumber,
      dimensionName: nameEn,
      dimensionNameZh: nameZh,
      type,
      classification,
      nominal,
      upperTol,
      lowerTol,
      minLimit,
      maxLimit,
      drawingZone: zone,
      balloonColor: color,
    };

    const recommendedTool = recommendInspectionTool(
      type,
      nominal,
      Math.abs(upperTol - lowerTol),
      balloon.rawCallout
    );

    const updatedItem: InspectionControlPlanItem = {
      ...item,
      itemNumber,
      characteristicNameEn: nameEn,
      characteristicNameZh: nameZh,
      dimensionType: type,
      classification,
      drawingZone: zone,
      nominal,
      lowerTol,
      upperTol,
      minLimit,
      maxLimit,
      recommendedToolId: recommendedTool.id,
      recommendedToolEn: recommendedTool.nameEn,
      recommendedToolZh: recommendedTool.nameZh,
    };

    onSave(updatedBalloon, updatedItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div 
              style={{ backgroundColor: color }}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold font-mono text-sm shadow-md"
            >
              {itemNumber}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Edit Dimension Characteristic #{itemNumber}
              </h3>
              <p className="text-xs text-slate-400">
                {balloon.rawCallout}
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
        <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Item / Balloon # (气泡号):
              </label>
              <input
                type="number"
                min="1"
                value={itemNumber}
                onChange={(e) => setItemNumber(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Drawing Zone (图纸坐标):
              </label>
              <input
                type="text"
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                placeholder="e.g. B-2, C-4"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Feature Name (English):
            </label>
            <input
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Feature Name (Chinese 中文名称):
            </label>
            <input
              type="text"
              value={nameZh}
              onChange={(e) => setNameZh(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Classification (特性分类):
              </label>
              <select
                value={classification}
                onChange={(e) => setClassification(e.target.value as CharacteristicClassification)}
                className="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              >
                <option value="CRITICAL">CRITICAL (关键尺寸/CTQ)</option>
                <option value="MAJOR">MAJOR (主要尺寸)</option>
                <option value="MINOR">MINOR (次要尺寸)</option>
                <option value="REFERENCE">REFERENCE (参考尺寸)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Feature Type (几何类型):
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as DimensionType)}
                className="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              >
                <option value="DIAMETER">Diameter (直径 Ø)</option>
                <option value="LINEAR">Linear (线性尺寸)</option>
                <option value="THREAD">Thread (螺纹)</option>
                <option value="CHAMFER">Chamfer (倒角)</option>
                <option value="RADIUS">Radius (圆角 R)</option>
                <option value="GDT">GD&T (几何形位公差)</option>
                <option value="SURFACE_FINISH">Surface Finish (表面粗糙度)</option>
                <option value="ANGLE">Angle (角度)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nominal (标准值):
              </label>
              <input
                type="number"
                step="0.001"
                value={nominal}
                onChange={(e) => setNominal(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Lower Tol (下公差 -):
              </label>
              <input
                type="number"
                step="0.001"
                value={lowerTol}
                onChange={(e) => setLowerTol(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Upper Tol (上公差 +):
              </label>
              <input
                type="number"
                step="0.001"
                value={upperTol}
                onChange={(e) => setUpperTol(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Min Spec:</span>
              <span className="font-mono font-bold text-blue-400">
                {(nominal + lowerTol).toFixed(3)} {balloon.unit}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Max Spec:</span>
              <span className="font-mono font-bold text-blue-400">
                {(nominal + upperTol).toFixed(3)} {balloon.unit}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Tolerance Band:</span>
              <span className="font-mono font-bold text-emerald-400">
                {Math.abs(upperTol - lowerTol).toFixed(3)} {balloon.unit}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Balloon Color:</span>
              {['#2563eb', '#dc2626', '#16a34a', '#d97706', '#9333ea'].map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-5 h-5 rounded-full border-2 transition-transform ${
                    color === c ? 'border-white scale-110 shadow-md' : 'border-transparent hover:scale-105'
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                onDelete(balloon.id);
                onClose();
              }}
              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-semibold px-2 py-1 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Characteristic</span>
            </button>
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
              className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition-all active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
