import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Stamp,
  AlertOctagon,
  Wrench,
} from 'lucide-react';
import type { InspectionControlPlanItem, ChinaApprovalRecord, InspectionMethodTool } from '../types/inspection';
import { INSPECTION_TOOLS_DATABASE } from '../utils/toolRecommender';
import { evaluateMeasurements } from '../utils/dimensionParser';

interface InspectionTableProps {
  items: InspectionControlPlanItem[];
  selectedItemId: string | null;
  hoveredItemId: string | null;
  onSelectItem: (id: string | null) => void;
  onHoverItem: (id: string | null) => void;
  onUpdateItem: (updated: InspectionControlPlanItem) => void;
  onDeleteItem: (id: string) => void;
  onAddNewItem: () => void;
  onOpenChinaApproval: () => void;
  onOpenAddToolModal?: (targetItemId?: string) => void;
  allInspectionTools?: InspectionMethodTool[];
  chinaApproval: ChinaApprovalRecord;
  language: 'bilingual' | 'en' | 'zh';
}

export const InspectionTable: React.FC<InspectionTableProps> = ({
  items,
  selectedItemId,
  hoveredItemId,
  onSelectItem,
  onHoverItem,
  onUpdateItem,
  onDeleteItem,
  onAddNewItem,
  onOpenChinaApproval,
  onOpenAddToolModal,
  allInspectionTools,
  chinaApproval,
  language,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PASS' | 'FAIL' | 'PENDING'>('ALL');
  const [filterClass, setFilterClass] = useState<'ALL' | 'CRITICAL' | 'MAJOR' | 'MINOR'>('ALL');

  const handleSampleChange = (
    item: InspectionControlPlanItem,
    sampleKey: 'sample1' | 'sample2' | 'sample3' | 'sample4' | 'sample5',
    valStr: string
  ) => {
    const val = valStr.trim() === '' ? undefined : parseFloat(valStr);
    const updatedMeasurements = {
      ...item.measurements,
      [sampleKey]: isNaN(val as number) ? undefined : val,
    };
    const newStatus = evaluateMeasurements(updatedMeasurements, item.minLimit, item.maxLimit);

    onUpdateItem({
      ...item,
      measurements: updatedMeasurements,
      status: newStatus,
    });
  };

  const filteredItems = items.filter(item => {
    const matchSearch = 
      item.characteristicNameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.characteristicNameZh.includes(searchTerm) ||
      item.itemNumber.toString().includes(searchTerm) ||
      item.rawCallout.toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus = filterStatus === 'ALL' || item.status === filterStatus;
    const matchClass = filterClass === 'ALL' || item.classification === filterClass;

    return matchSearch && matchStatus && matchClass;
  });

  const passCount = items.filter(i => i.status === 'PASS').length;
  const failCount = items.filter(i => i.status === 'FAIL').length;
  const pendingCount = items.filter(i => i.status === 'PENDING').length;
  const criticalCount = items.filter(i => i.classification === 'CRITICAL').length;

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 select-none">
      
      {/* Top Header Controls */}
      <div className="p-3.5 border-b border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-bold text-white tracking-tight">
              Inspection Control Plan
            </h3>
            <span className="text-xs text-slate-400">
              (检验控制计划)
            </span>
          </div>

          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            {items.length} Characteristics
          </span>

          {criticalCount > 0 && (
            <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
              <AlertOctagon className="w-3 h-3 text-red-400" />
              {criticalCount} Critical (CTQ)
            </span>
          )}
        </div>

        {/* China QC Sign-off CTA */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenChinaApproval}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md ${
              chinaApproval.decision === 'APPROVED'
                ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30'
                : chinaApproval.decision === 'CONCESSION'
                ? 'bg-amber-600/20 text-amber-300 border border-amber-500/40 hover:bg-amber-600/30'
                : chinaApproval.decision === 'REJECTED'
                ? 'bg-red-600/20 text-red-300 border border-red-500/40 hover:bg-red-600/30'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/20'
            }`}
          >
            <Stamp className="w-3.5 h-3.5" />
            <span>
              {chinaApproval.decision === 'APPROVED'
                ? 'China QC: Approved (已批准)'
                : chinaApproval.decision === 'CONCESSION'
                ? 'China QC: Concession (特采)'
                : chinaApproval.decision === 'REJECTED'
                ? 'China QC: Rejected (拒收)'
                : 'China QC Sign-Off (质检签核)'}
            </span>
          </button>

          <button
            onClick={onAddNewItem}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-blue-400" />
            <span>Add Item</span>
          </button>

          {onOpenAddToolModal && (
            <button
              onClick={() => onOpenAddToolModal()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold transition-colors shadow-sm"
              title="Add Custom Inspection Method / Tool to Dropdown"
            >
              <Wrench className="w-3.5 h-3.5 text-emerald-400" />
              <span>+ Method (检具库)</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="px-3.5 py-2 border-b border-slate-800 bg-slate-950/40 flex flex-wrap items-center justify-between gap-3 text-xs">
        
        {/* Search Input */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter by feature, callout, or #..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              filterStatus === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({items.length})
          </button>
          <button
            onClick={() => setFilterStatus('PASS')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              filterStatus === 'PASS' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400 hover:text-emerald-400'
            }`}
          >
            Pass ({passCount})
          </button>
          <button
            onClick={() => setFilterStatus('FAIL')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              filterStatus === 'FAIL' ? 'bg-red-500/20 text-red-300 font-bold' : 'text-slate-400 hover:text-red-400'
            }`}
          >
            Fail ({failCount})
          </button>
          <button
            onClick={() => setFilterStatus('PENDING')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              filterStatus === 'PENDING' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400 hover:text-amber-400'
            }`}
          >
            Pending ({pendingCount})
          </button>
        </div>

        {/* Classification Filter */}
        <div className="flex items-center gap-1 text-[11px]">
          <span className="text-slate-500">Class:</span>
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value as any)}
            className="bg-slate-950 text-slate-300 border border-slate-800 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">All</option>
            <option value="CRITICAL">Critical / CTQ</option>
            <option value="MAJOR">Major</option>
            <option value="MINOR">Minor</option>
          </select>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-950 text-slate-300 text-[11px] font-semibold sticky top-0 z-10 shadow-sm border-b border-slate-800">
            <tr>
              <th className="py-2.5 px-3 w-12 text-center"># 气泡</th>
              <th className="py-2.5 px-3 min-w-[200px]">Feature Description / 检验特性</th>
              <th className="py-2.5 px-2.5 w-20 text-center">Class / 类别</th>
              <th className="py-2.5 px-2 w-14 text-center">Zone</th>
              <th className="py-2.5 px-2.5 text-right w-20">Nominal</th>
              <th className="py-2.5 px-2 text-right w-16">Lower</th>
              <th className="py-2.5 px-2 text-right w-16">Upper</th>
              <th className="py-2.5 px-2.5 text-right w-20 text-blue-400">Min Spec</th>
              <th className="py-2.5 px-2.5 text-right w-20 text-blue-400">Max Spec</th>
              <th className="py-2.5 px-2 w-12 text-center">Unit</th>
              <th className="py-2.5 px-3 min-w-[210px] text-emerald-400">
                <div className="flex items-center justify-between gap-1">
                  <span>Inspection Tool / 测量工具</span>
                  {onOpenAddToolModal && (
                    <button
                      onClick={() => onOpenAddToolModal()}
                      className="p-1 hover:bg-emerald-500/20 text-emerald-300 rounded transition-colors"
                      title="Add Custom Tool / Inspection Method to List"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </th>
              <th className="py-2.5 px-2.5 w-24 text-center">Sampling</th>
              <th className="py-2.5 px-2 text-center w-14">S1</th>
              <th className="py-2.5 px-2 text-center w-14">S2</th>
              <th className="py-2.5 px-2 text-center w-14">S3</th>
              <th className="py-2.5 px-2 text-center w-14">S4</th>
              <th className="py-2.5 px-2 text-center w-14">S5</th>
              <th className="py-2.5 px-3 w-20 text-center">Result</th>
              <th className="py-2.5 px-2 w-10 text-center"></th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/60 font-sans">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={19} className="text-center py-12 text-slate-500">
                  No inspection characteristics match your filter criteria.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const isSelected = item.balloonId === selectedItemId;
                const isHovered = item.balloonId === hoveredItemId;
                const isCritical = item.classification === 'CRITICAL';

                return (
                  <tr
                    key={item.id}
                    onMouseEnter={() => onHoverItem(item.balloonId)}
                    onMouseLeave={() => onHoverItem(null)}
                    onClick={() => onSelectItem(item.balloonId)}
                    className={`transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-950/40 border-l-4 border-blue-500'
                        : isHovered
                        ? 'bg-slate-800/40'
                        : 'hover:bg-slate-900/60'
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center">
                      <div className="w-6 h-6 rounded-full bg-blue-600/30 text-blue-300 border border-blue-500/50 flex items-center justify-center font-mono font-bold text-[11px] mx-auto shadow-sm">
                        {item.itemNumber}
                      </div>
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-200">
                        {language === 'zh'
                          ? item.characteristicNameZh
                          : language === 'en'
                          ? item.characteristicNameEn
                          : `${item.characteristicNameEn} / ${item.characteristicNameZh}`}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        {item.rawCallout}
                      </div>
                    </td>

                    <td className="py-2.5 px-2.5 text-center">
                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isCritical
                            ? 'bg-red-500/20 text-red-300 border-red-500/40'
                            : item.classification === 'MAJOR'
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {item.classification}
                      </span>
                    </td>

                    <td className="py-2.5 px-2 text-center font-mono text-slate-400 text-[11px]">
                      {item.drawingZone}
                    </td>

                    <td className="py-2.5 px-2.5 text-right font-mono font-bold text-white">
                      {item.nominal.toFixed(3)}
                    </td>

                    <td className="py-2.5 px-2 text-right font-mono text-slate-400">
                      {item.lowerTol >= 0 ? `+${item.lowerTol.toFixed(3)}` : item.lowerTol.toFixed(3)}
                    </td>

                    <td className="py-2.5 px-2 text-right font-mono text-slate-400">
                      {item.upperTol >= 0 ? `+${item.upperTol.toFixed(3)}` : item.upperTol.toFixed(3)}
                    </td>

                    <td className="py-2.5 px-2.5 text-right font-mono text-blue-300 bg-blue-950/20">
                      {item.minLimit.toFixed(3)}
                    </td>

                    <td className="py-2.5 px-2.5 text-right font-mono text-blue-300 bg-blue-950/20">
                      {item.maxLimit.toFixed(3)}
                    </td>

                    <td className="py-2.5 px-2 text-center text-slate-400 font-mono text-[11px]">
                      {item.unit}
                    </td>

                    <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                      {(() => {
                        const toolsList = allInspectionTools && allInspectionTools.length > 0 
                          ? allInspectionTools 
                          : INSPECTION_TOOLS_DATABASE;
                        
                        return (
                          <select
                            value={item.selectedToolZh || item.recommendedToolZh}
                            onChange={(e) => {
                              if (e.target.value === '__ADD_NEW_METHOD__') {
                                onOpenAddToolModal?.(item.id);
                                return;
                              }
                              const chosenTool = toolsList.find(
                                t => t.nameZh === e.target.value || t.nameEn === e.target.value
                              );
                              onUpdateItem({
                                ...item,
                                selectedToolEn: chosenTool ? chosenTool.nameEn : e.target.value,
                                selectedToolZh: chosenTool ? chosenTool.nameZh : e.target.value,
                              });
                            }}
                            className="w-full bg-slate-950 text-slate-200 border border-slate-700/80 rounded px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium truncate"
                          >
                            <optgroup label="── Standard Inspection Tools (标准检具) ──">
                              {toolsList.filter(t => !t.isCustom).map(tool => (
                                <option key={tool.id} value={tool.nameZh}>
                                  {language === 'zh'
                                    ? tool.nameZh
                                    : language === 'en'
                                    ? tool.nameEn
                                    : `${tool.nameEn} (${tool.nameZh})`}
                                </option>
                              ))}
                            </optgroup>

                            {toolsList.some(t => t.isCustom) && (
                              <optgroup label="── Custom Registered Tools (自定义专用检具) ──">
                                {toolsList.filter(t => t.isCustom).map(tool => (
                                  <option key={tool.id} value={tool.nameZh} className="text-emerald-300 font-semibold">
                                    ★ {language === 'zh'
                                      ? tool.nameZh
                                      : language === 'en'
                                      ? tool.nameEn
                                      : `${tool.nameEn} (${tool.nameZh})`}
                                  </option>
                                ))}
                              </optgroup>
                            )}

                            <option value="__ADD_NEW_METHOD__" className="text-emerald-400 font-bold bg-slate-900">
                              ➕ {language === 'zh' ? '添加自定义测量工具...' : 'Add Custom Method... (添加新检具)'}
                            </option>
                          </select>
                        );
                      })()}
                    </td>

                    <td className="py-2.5 px-2.5 text-center text-slate-300 text-[11px]">
                      {language === 'zh' ? item.samplingPlanZh : item.samplingPlanEn}
                    </td>

                    {(['sample1', 'sample2', 'sample3', 'sample4', 'sample5'] as const).map(sampleKey => {
                      const val = item.measurements[sampleKey];
                      const isOutOfSpec = val !== undefined && (val < item.minLimit - 0.0001 || val > item.maxLimit + 0.0001);
                      const isInSpec = val !== undefined && !isOutOfSpec;

                      return (
                        <td key={sampleKey} className="py-1.5 px-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="number"
                            step="0.001"
                            value={val !== undefined ? val : ''}
                            onChange={(e) => handleSampleChange(item, sampleKey, e.target.value)}
                            placeholder="-"
                            className={`w-14 text-center font-mono text-xs rounded py-1 px-0.5 border focus:outline-none transition-colors ${
                              isOutOfSpec
                                ? 'bg-red-950/80 border-red-500 text-red-200 font-bold focus:ring-1 focus:ring-red-400'
                                : isInSpec
                                ? 'bg-emerald-950/50 border-emerald-600/80 text-emerald-200 font-bold'
                                : 'bg-slate-950 border-slate-800 text-slate-400 focus:border-blue-500'
                            }`}
                          />
                        </td>
                      );
                    })}

                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                          item.status === 'PASS'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : item.status === 'FAIL'
                            ? 'bg-red-500/20 text-red-300 border-red-500/40'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}
                      >
                        {item.status === 'PASS' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>PASS</span>
                          </>
                        ) : item.status === 'FAIL' ? (
                          <>
                            <XCircle className="w-3 h-3 text-red-400" />
                            <span>FAIL</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>PENDING</span>
                          </>
                        )}
                      </span>
                    </td>

                    <td className="py-2.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onDeleteItem(item.balloonId || item.id)}
                        className="p-1 text-slate-500 hover:text-red-400 rounded transition-colors"
                        title="Delete Inspection Characteristic & Balloon"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
