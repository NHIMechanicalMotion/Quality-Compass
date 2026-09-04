import React, { useState, useRef, useEffect } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Move, 
  Plus, 
  Hash, 
  Sparkles,
  Crosshair,
  Trash2,
  ArrowUpRight,
  X,
  Upload,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileUp,
  FileText,
} from 'lucide-react';
import type { InspectionBalloon } from '../types/balloon';
import type { TitleBlockMetadata } from '../types/cad';

interface DrawingCanvasProps {
  drawingId: string;
  metadata: TitleBlockMetadata;
  balloons: InspectionBalloon[];
  selectedBalloonId: string | null;
  hoveredBalloonId: string | null;
  customDrawingImageUrl?: string | null;
  isLoadingDrawing?: boolean;
  isAnalyzingOcr?: boolean;
  ocrProgress?: number;
  ocrStatusMessage?: string;
  pdfPageNumber?: number;
  pdfTotalPages?: number;
  onChangePdfPage?: (page: number) => void;
  onUploadFile?: (file: File) => void;
  onEditBalloon?: (id: string) => void;
  onSelectBalloon: (id: string | null) => void;
  onHoverBalloon: (id: string | null) => void;
  onUpdateBalloonPosition: (id: string, x: number, y: number) => void;
  onUpdateLeaderTarget?: (id: string, targetX: number, targetY: number) => void;
  onToggleLeaderArrow?: (id: string) => void;
  onAddBalloonWithTarget: (
    balloonX: number,
    balloonY: number,
    targetX: number,
    targetY: number,
    detectedData?: Partial<InspectionBalloon>
  ) => void;
  onDeleteBalloon: (id: string) => void;
  onRenumberBalloons: () => void;
  onAutoDetectDimensions: () => void;
  svgRef: React.RefObject<SVGSVGElement | null>;
  balloonColor: string;
  balloonSize: number;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  drawingId,
  metadata,
  balloons,
  selectedBalloonId,
  hoveredBalloonId,
  customDrawingImageUrl,
  isLoadingDrawing,
  isAnalyzingOcr,
  ocrProgress,
  ocrStatusMessage,
  pdfPageNumber,
  pdfTotalPages,
  onChangePdfPage,
  onUploadFile,
  onEditBalloon,
  onSelectBalloon,
  onHoverBalloon,
  onUpdateBalloonPosition,
  onUpdateLeaderTarget,
  onToggleLeaderArrow,
  onAddBalloonWithTarget,
  onDeleteBalloon,
  onRenumberBalloons,
  onAutoDetectDimensions,
  svgRef,
  balloonColor,
  balloonSize,
}) => {
  const [scale, setScale] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [draggingBalloonId, setDraggingBalloonId] = useState<string | null>(null);
  const [draggingTargetId, setDraggingTargetId] = useState<string | null>(null);
  const [hoveredNoteIndex, setHoveredNoteIndex] = useState<number | null>(null);
  const [addMode, setAddMode] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut listener: Delete/Backspace deletes selected balloon, Esc cancels addMode/selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT')
      ) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedBalloonId) {
          e.preventDefault();
          onDeleteBalloon(selectedBalloonId);
        }
      } else if (e.key === 'Escape') {
        if (addMode) {
          setAddMode(false);
        } else if (selectedBalloonId) {
          onSelectBalloon(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBalloonId, addMode, onDeleteBalloon, onSelectBalloon]);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.15, 3.5));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.15, 0.4));
  const handleResetZoom = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(prev => Math.max(0.4, Math.min(3.5, prev + delta)));
  };

  const handleNoteClick = (noteIndex: number, noteY: number, _noteContent?: string) => {
    // Leader arrow points right at the note text in the drawing blueprint
    const targetX = 140;
    const targetY = noteY;

    // Balloon circle positioned neatly beside the notes block
    const balloonX = 360;
    const balloonY = Math.max(targetY - 15, 45);

    let detectedData: Partial<InspectionBalloon> = {};

    if (noteIndex === 1) {
      detectedData = {
        dimensionName: 'General Tolerance Note',
        dimensionNameZh: '未注公差说明',
        type: 'NOTE',
        classification: 'MAJOR',
        rawCallout: `General Tol: ${metadata.generalToleranceNote || 'ISO 2768-mK'}`,
        nominal: 0, upperTol: 0, lowerTol: 0, minLimit: 0, maxLimit: 0,
      };
    } else if (noteIndex === 2) {
      detectedData = {
        dimensionName: 'Edge Condition / Deburring',
        dimensionNameZh: '去毛刺与倒角规范',
        type: 'NOTE',
        classification: 'STANDARD' as any,
        rawCallout: 'Break all sharp edges 0.2 - 0.4 mm',
        nominal: 0.3, upperTol: 0.1, lowerTol: -0.1, minLimit: 0.2, maxLimit: 0.4,
      };
    } else if (noteIndex === 3) {
      detectedData = {
        dimensionName: 'Material Specification',
        dimensionNameZh: '材质技术要求',
        type: 'NOTE',
        classification: 'CRITICAL',
        rawCallout: `Material: ${metadata.material || 'Alloy'}`,
        nominal: 0, upperTol: 0, lowerTol: 0, minLimit: 0, maxLimit: 0,
      };
    } else if (noteIndex === 4) {
      detectedData = {
        dimensionName: 'Surface Finish Callout',
        dimensionNameZh: '表面粗糙度要求',
        type: 'SURFACE_FINISH',
        classification: 'MAJOR',
        rawCallout: `Finish: ${metadata.finish || 'Standard'}`,
        nominal: 0, upperTol: 0, lowerTol: 0, minLimit: 0, maxLimit: 0,
      };
    } else if (noteIndex === 5) {
      detectedData = {
        dimensionName: 'Drafting Standard Note',
        dimensionNameZh: '制图规范标准',
        type: 'NOTE',
        classification: 'STANDARD' as any,
        rawCallout: `Interpret per ${metadata.projection === 'FIRST_ANGLE' ? 'ISO 1101' : 'ASME Y14.5-2018'}`,
        nominal: 0, upperTol: 0, lowerTol: 0, minLimit: 0, maxLimit: 0,
      };
    }

    onAddBalloonWithTarget(balloonX, balloonY, targetX, targetY, detectedData);
    setAddMode(false);
    setHoveredNoteIndex(null);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (addMode) {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const svgX = (e.clientX - rect.left) / scale;
      const svgY = (e.clientY - rect.top) / scale;
      const targetX = Math.round(svgX);
      const targetY = Math.round(svgY);

      // Check if click was in Notes section (only for preloaded drawings with synthetic notes)
      if (drawingId !== 'drawing-custom' && targetX >= 35 && targetX <= 460 && targetY >= 35 && targetY <= 135) {
        if (targetY < 67) {
          handleNoteClick(1, targetY, metadata.generalToleranceNote);
          return;
        } else if (targetY < 79) {
          handleNoteClick(2, targetY, 'BREAK ALL SHARP EDGES 0.2 - 0.4 MM.');
          return;
        } else if (targetY < 91) {
          handleNoteClick(3, targetY, metadata.material);
          return;
        } else if (targetY < 103) {
          handleNoteClick(4, targetY, metadata.finish);
          return;
        } else {
          handleNoteClick(5, targetY, metadata.projection);
          return;
        }
      }

      // Check if click was in Title Block (only for preloaded drawings with synthetic title block)
      let detectedData: Partial<InspectionBalloon> | undefined = undefined;
      let balloonX = targetX > 800 ? targetX - 60 : targetX + 50;
      let balloonY = targetY > 580 ? targetY - 45 : (targetY < 80 ? targetY + 45 : targetY - 35);

      if (drawingId !== 'drawing-custom' && targetX >= 620 && targetX <= 1030 && targetY >= 490 && targetY <= 660) {
        balloonX = targetX - 65;
        balloonY = Math.max(targetY - 35, 470);
        if (targetY >= 495 && targetY < 540 && targetX >= 820) {
          detectedData = {
            dimensionName: 'Part Name Attribute',
            dimensionNameZh: '零件名称属性',
            type: 'NOTE',
            classification: 'MAJOR',
            rawCallout: `Part Name: ${metadata.partName}`,
            nominal: 0, upperTol: 0, lowerTol: 0, minLimit: 0, maxLimit: 0,
          };
        } else if (targetY >= 540 && targetY < 580) {
          detectedData = {
            dimensionName: 'Drawing Number Attribute',
            dimensionNameZh: '图纸图号属性',
            type: 'NOTE',
            classification: 'CRITICAL',
            rawCallout: `Drawing No: ${metadata.drawingNumber}`,
            nominal: 0, upperTol: 0, lowerTol: 0, minLimit: 0, maxLimit: 0,
          };
        }
      }

      // Clamp coordinates inside drawing border
      balloonX = Math.max(40, Math.min(1010, balloonX));
      balloonY = Math.max(35, Math.min(645, balloonY));

      onAddBalloonWithTarget(balloonX, balloonY, targetX, targetY, detectedData);
      setAddMode(false);
      return;
    }

    if (e.target instanceof SVGElement && e.target.closest('.balloon-handle')) {
      return;
    }

    setIsPanning(true);
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
    } else if (draggingBalloonId) {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const svgX = (e.clientX - rect.left) / scale;
      const svgY = (e.clientY - rect.top) / scale;
      onUpdateBalloonPosition(draggingBalloonId, Math.round(svgX), Math.round(svgY));
    } else if (draggingTargetId) {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const svgX = (e.clientX - rect.left) / scale;
      const svgY = (e.clientY - rect.top) / scale;
      onUpdateLeaderTarget?.(draggingTargetId, Math.round(svgX), Math.round(svgY));
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingBalloonId(null);
    setDraggingTargetId(null);
  };

  const renderProjectionSymbol = () => {
    if (metadata.projection === 'THIRD_ANGLE') {
      return (
        <g transform="translate(860, 550) scale(0.6)">
          <line x1="0" y1="15" x2="60" y2="15" stroke="#94a3b8" strokeDasharray="3,3" strokeWidth="0.8" />
          <line x1="80" y1="15" x2="140" y2="15" stroke="#94a3b8" strokeDasharray="3,3" strokeWidth="0.8" />
          <line x1="110" y1="-15" x2="110" y2="45" stroke="#94a3b8" strokeDasharray="3,3" strokeWidth="0.8" />
          <polygon points="10,0 50,7 50,23 10,30" fill="none" stroke="#38bdf8" strokeWidth="1.2" />
          <circle cx="110" cy="15" r="7" fill="none" stroke="#38bdf8" strokeWidth="1.2" />
          <circle cx="110" cy="15" r="14" fill="none" stroke="#38bdf8" strokeWidth="1.2" />
          <text x="60" y="42" fill="#94a3b8" fontSize="8" textAnchor="middle" fontFamily="monospace">
            3RD ANGLE
          </text>
        </g>
      );
    } else if (metadata.projection === 'FIRST_ANGLE') {
      return (
        <g transform="translate(860, 550) scale(0.6)">
          <line x1="0" y1="15" x2="60" y2="15" stroke="#94a3b8" strokeDasharray="3,3" strokeWidth="0.8" />
          <line x1="80" y1="15" x2="140" y2="15" stroke="#94a3b8" strokeDasharray="3,3" strokeWidth="0.8" />
          <line x1="30" y1="-15" x2="30" y2="45" stroke="#94a3b8" strokeDasharray="3,3" strokeWidth="0.8" />
          <circle cx="30" cy="15" r="7" fill="none" stroke="#38bdf8" strokeWidth="1.2" />
          <circle cx="30" cy="15" r="14" fill="none" stroke="#38bdf8" strokeWidth="1.2" />
          <polygon points="90,7 130,0 130,30 90,23" fill="none" stroke="#38bdf8" strokeWidth="1.2" />
          <text x="60" y="42" fill="#94a3b8" fontSize="8" textAnchor="middle" fontFamily="monospace">
            1ST ANGLE
          </text>
        </g>
      );
    }
    return (
      <g transform="translate(860, 550)">
        <rect x="0" y="0" width="80" height="24" fill="#450a0a" stroke="#ef4444" strokeWidth="1" rx="2" />
        <text x="40" y="15" fill="#fca5a5" fontSize="8" textAnchor="middle" fontWeight="bold" fontFamily="monospace">
          PROJ: UNKNOWN!
        </text>
      </g>
    );
  };

  return (
    <div className="relative flex-1 flex flex-col h-full bg-slate-950 overflow-hidden select-none">
      {/* Top Floating Toolbar */}
      <div className="absolute top-3 left-4 z-20 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 shadow-xl">
        <button
          onClick={handleZoomIn}
          title="Zoom In (+)"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out (-)"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetZoom}
          title="Reset Zoom & Pan"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <span className="text-[11px] font-mono text-slate-400 px-1">
          {Math.round(scale * 100)}%
        </span>

        <div className="w-[1px] h-4 bg-slate-800 mx-0.5" />

        {/* Add Balloon Tool */}
        <button
          onClick={() => setAddMode(!addMode)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
            addMode 
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-2 ring-blue-400' 
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="Click on any drawing feature or note to place balloon & arrow leader"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{addMode ? 'Click Canvas / Note...' : 'Add Balloon'}</span>
        </button>

        {/* Auto Number */}
        <button
          onClick={onRenumberBalloons}
          title="Renumber Balloons Sequentially 1, 2, 3..."
          className="flex items-center gap-1 px-2 py-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-xs transition-colors"
        >
          <Hash className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">Renumber</span>
        </button>

        {/* Auto-Detect Features */}
        <button
          onClick={onAutoDetectDimensions}
          title="Auto-Detect & Auto-Balloon all CAD Dimensions"
          className="flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 hover:from-blue-600/30 hover:to-indigo-600/30 border border-blue-500/30 text-blue-300 rounded-lg text-xs font-medium transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Auto-Balloon</span>
        </button>

        {/* Multi-page PDF Sheet Navigator */}
        {drawingId === 'drawing-custom' && pdfTotalPages && pdfTotalPages > 1 && (
          <>
            <div className="w-[1px] h-4 bg-slate-800 mx-0.5" />
            <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700 px-2 py-1 rounded-lg text-xs">
              <span className="text-slate-400 font-medium">Sheet:</span>
              <button
                disabled={!pdfPageNumber || pdfPageNumber <= 1}
                onClick={() => onChangePdfPage?.((pdfPageNumber || 1) - 1)}
                className="p-0.5 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                title="Previous Sheet / Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono font-bold text-cyan-300">
                {pdfPageNumber || 1} / {pdfTotalPages}
              </span>
              <button
                disabled={!pdfPageNumber || pdfPageNumber >= pdfTotalPages}
                onClick={() => onChangePdfPage?.((pdfPageNumber || 1) + 1)}
                className="p-0.5 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                title="Next Sheet / Page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}

        {/* Upload or Swap Blueprint Button */}
        {drawingId === 'drawing-custom' && (
          <>
            <div className="w-[1px] h-4 bg-slate-800 mx-0.5" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-medium transition-colors"
              title="Upload or swap CAD blueprint (PDF, DXF, PNG, JPG, SVG)"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>{customDrawingImageUrl ? 'Swap Blueprint' : 'Upload Blueprint'}</span>
            </button>
          </>
        )}

        {/* Selected Balloon Actions (Toolbar Shortcut) */}
        {selectedBalloonId && (() => {
          const sel = balloons.find(b => b.id === selectedBalloonId);
          if (!sel) return null;
          return (
            <>
              <div className="w-[1px] h-4 bg-slate-800 mx-0.5" />
              <div className="flex items-center gap-1.5 bg-blue-950/60 border border-blue-500/30 px-2 py-0.5 rounded-lg text-xs">
                <span className="font-bold text-blue-300 font-mono">#{sel.itemNumber}</span>
                <span className="text-slate-300 text-[11px] max-w-[110px] truncate hidden md:inline">
                  {sel.dimensionName}
                </span>

                {/* Edit button */}
                <button
                  onClick={() => onEditBalloon?.(sel.id)}
                  className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded text-[11px] font-semibold transition-colors"
                  title="Edit Dimension Details & Tolerances"
                >
                  <FileText className="w-3 h-3 text-cyan-400" />
                  <span>Edit</span>
                </button>

                {/* Delete button */}
                <button
                  onClick={() => onDeleteBalloon(sel.id)}
                  className="flex items-center gap-1 px-1.5 py-0.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 rounded text-[11px] font-semibold transition-colors"
                  title="Delete Selected Balloon (or press Delete key)"
                >
                  <Trash2 className="w-3 h-3 text-red-400" />
                  <span>Delete</span>
                </button>

                {/* Toggle Arrow Leader */}
                <button
                  onClick={() => onToggleLeaderArrow?.(sel.id)}
                  className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] transition-colors"
                  title="Toggle Arrow Leader Line"
                >
                  <ArrowUpRight className="w-3 h-3 text-blue-400" />
                  <span>{sel.leaderTargetX !== undefined ? 'Remove Arrow' : 'Add Arrow'}</span>
                </button>

                <button
                  onClick={() => onSelectBalloon(null)}
                  className="text-slate-400 hover:text-white p-0.5 rounded"
                  title="Deselect"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </>
          );
        })()}
      </div>

      {/* Floating Guidance Banner when in Add Balloon Mode */}
      {addMode && (
        <div className="absolute top-14 left-4 z-20 flex items-center gap-2 bg-gradient-to-r from-blue-900/95 to-slate-900/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-blue-400/60 shadow-2xl text-xs text-white">
          <Crosshair className="w-4 h-4 text-cyan-300 animate-spin-slow" />
          <span>Click on any <strong>Note (Material, Finish, Tol)</strong> or drawing feature to place the arrow tip!</span>
          <button
            onClick={() => setAddMode(false)}
            className="ml-2 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] border border-slate-700 font-medium"
          >
            Cancel (Esc)
          </button>
        </div>
      )}

      {/* Floating Info Pill */}
      <div className="absolute top-3 right-4 z-20 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-xs shadow-xl">
        <span className="text-slate-400">Drawing:</span>
        <span className="font-mono text-slate-200 font-bold">
          {metadata.drawingNumber || 'UNASSIGNED'}
        </span>
        <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-[10px]">
          Rev {metadata.revision || '-'}
        </span>
        <span className="text-slate-500">|</span>
        <span className="text-slate-400">{balloons.length} Balloons</span>
      </div>

      {/* Interactive CAD Drawing Viewport */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file && onUploadFile) {
            onUploadFile(file);
          }
        }}
        className={`w-full h-full flex items-center justify-center p-4 cad-grid-pattern cursor-grab active:cursor-grabbing overflow-hidden relative ${
          addMode ? '!cursor-crosshair' : ''
        }`}
      >
        {/* Hidden File Input for Canvas Dropzone & Swap Button */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.svg,.webp,.dxf"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && onUploadFile) onUploadFile(file);
            e.target.value = '';
          }}
          className="hidden"
        />

        {/* Drag-over glowing drop indicator */}
        {isDragOver && (
          <div className="absolute inset-4 z-40 flex flex-col items-center justify-center border-4 border-dashed border-cyan-400 bg-cyan-950/85 backdrop-blur-md rounded-2xl pointer-events-none transition-all animate-pulse shadow-2xl">
            <FileUp className="w-16 h-16 text-cyan-300 mb-3 animate-bounce" />
            <h3 className="text-xl font-bold text-white">Drop CAD Blueprint (PDF / DXF / Image)</h3>
            <p className="text-cyan-200 text-sm mt-1">Release to load engineering print into Quality Compass</p>
          </div>
        )}

        {/* OCR / Vector Dimension Detection Progress Overlay */}
        {isAnalyzingOcr && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md p-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600/30 to-purple-600/30 border border-blue-500/40 flex items-center justify-center mb-4 shadow-xl shadow-blue-600/20 animate-pulse">
              <Sparkles className="w-8 h-8 text-cyan-300 animate-spin-slow" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              Analyzing CAD Blueprint & Dimensions
            </h3>
            <p className="text-xs text-slate-300 mb-4 max-w-md text-center">
              {ocrStatusMessage || 'Scanning drawing for dimensions, tolerances, diameters, and GD&T callouts...'}
            </p>
            {/* Progress Bar */}
            <div className="w-72 h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 transition-all duration-300 rounded-full"
                style={{ width: `${Math.max(10, Math.min(100, ocrProgress || 20))}%` }}
              />
            </div>
            <span className="text-[11px] font-mono text-cyan-300 mt-2 font-semibold">
              {ocrProgress ? `${Math.round(ocrProgress)}%` : 'Processing...'}
            </span>
          </div>
        )}

        {/* Loading Drawing Indicator */}
        {isLoadingDrawing && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-md">
            <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mb-4" />
            <p className="text-white font-semibold text-base">Rendering CAD Drawing in High Definition...</p>
            <p className="text-slate-400 text-xs mt-1">Converting engineering print layers to high-DPI canvas for inspection ballooning</p>
          </div>
        )}

        {/* Custom Drawing Empty State / Dropzone */}
        {drawingId === 'drawing-custom' && !customDrawingImageUrl && !isLoadingDrawing && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-10 z-30 flex flex-col items-center justify-center border-2 border-dashed border-slate-700 hover:border-cyan-500 bg-slate-900/90 hover:bg-slate-900/95 backdrop-blur-md rounded-2xl transition-all cursor-pointer p-8 group text-center shadow-2xl"
          >
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-lg shadow-cyan-500/10">
              <FileUp className="w-8 h-8 text-cyan-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Upload Your Engineering CAD Drawing</h3>
            <p className="text-slate-300 text-xs max-w-md mb-5 leading-relaxed">
              Drag & drop your 2D engineering print (DXF, PDF, PNG, JPG, SVG) here or click to browse. Quality Compass renders your drawing at high resolution with zero-loss vector precision so you can balloon dimensions and generate the inspection control plan.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
              <span className="px-3 py-1 bg-emerald-950/60 border border-emerald-500/40 rounded-lg text-xs font-mono text-emerald-300 font-medium">📐 DXF (AutoCAD 2D Vector)</span>
              <span className="px-3 py-1 bg-cyan-950/60 border border-cyan-500/40 rounded-lg text-xs font-mono text-cyan-300 font-medium">📄 PDF (Multi-page / Single)</span>
              <span className="px-3 py-1 bg-blue-950/60 border border-blue-500/40 rounded-lg text-xs font-mono text-blue-300 font-medium">🖼 PNG</span>
              <span className="px-3 py-1 bg-indigo-950/60 border border-indigo-500/40 rounded-lg text-xs font-mono text-indigo-300 font-medium">🖼 JPG / JPEG</span>
              <span className="px-3 py-1 bg-purple-950/60 border border-purple-500/40 rounded-lg text-xs font-mono text-purple-300 font-medium">📐 SVG Vector</span>
            </div>
            <p className="text-[11px] text-slate-500">
              💡 Supports native 2D DXF files from AutoCAD / SolidWorks, or PDF blueprints exported from any CAD software.
            </p>
          </div>
        )}

        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition: isPanning || draggingBalloonId ? 'none' : 'transform 0.1s ease-out',
          }}
          className="bg-white rounded-md shadow-2xl border-2 border-slate-700 relative"
        >
          {/* Main Vector CAD Drawing (SVG) */}
          <svg
            ref={svgRef}
            width="1050"
            height="680"
            viewBox="0 0 1050 680"
            className="w-[1050px] h-[680px] block"
          >
            <defs>
              <marker
                id="leader-arrow"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto"
              >
                <path d="M 0 2 L 8 5 L 0 8 z" fill="#2563eb" />
              </marker>

              <pattern
                id="section-hatch"
                width="8"
                height="8"
                patternTransform="rotate(45 0 0)"
                patternUnits="userSpaceOnUse"
              >
                <line x1="0" y1="0" x2="0" y2="8" stroke="#cbd5e1" strokeWidth="1" />
              </pattern>
            </defs>

            <rect width="1050" height="680" fill="#ffffff" />

            <rect x="20" y="20" width="1010" height="640" fill="none" stroke="#0f172a" strokeWidth="2.5" />
            <rect x="25" y="25" width="1000" height="630" fill="none" stroke="#0f172a" strokeWidth="1" />

            {['1', '2', '3', '4'].map((num, i) => (
              <React.Fragment key={`num-${num}`}>
                <text x={150 + i * 250} y="18" fill="#64748b" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  {num}
                </text>
                <text x={150 + i * 250} y="670" fill="#64748b" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  {num}
                </text>
                <line x1={25 + (i + 1) * 250} y1="20" x2={25 + (i + 1) * 250} y2="25" stroke="#0f172a" strokeWidth="1" />
                <line x1={25 + (i + 1) * 250} y1="655" x2={25 + (i + 1) * 250} y2="660" stroke="#0f172a" strokeWidth="1" />
              </React.Fragment>
            ))}

            {['A', 'B', 'C', 'D'].map((letter, i) => (
              <React.Fragment key={`letter-${letter}`}>
                <text x="12" y={100 + i * 150} fill="#64748b" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  {letter}
                </text>
                <text x="1038" y={100 + i * 150} fill="#64748b" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  {letter}
                </text>
                <line x1="20" y1={25 + (i + 1) * 157} x2="25" y2={25 + (i + 1) * 157} stroke="#0f172a" strokeWidth="1" />
                <line x1="1025" y1={25 + (i + 1) * 157} x2="1030" y2={25 + (i + 1) * 157} stroke="#0f172a" strokeWidth="1" />
              </React.Fragment>
            ))}

            {/* Synthetic Title Block, Notes Block, Revision Block, and Projection Symbol for Preloaded Drawings */}
            {drawingId !== 'drawing-custom' && (
              <>
                {/* Revision Block */}
                <g transform="translate(680, 25)">
              <rect width="345" height="60" fill="#f8fafc" stroke="#0f172a" strokeWidth="1" />
              <line x1="0" y1="20" x2="345" y2="20" stroke="#0f172a" strokeWidth="1" />
              <line x1="40" y1="0" x2="40" y2="60" stroke="#0f172a" strokeWidth="1" />
              <line x1="210" y1="0" x2="210" y2="60" stroke="#0f172a" strokeWidth="1" />
              <line x1="280" y1="0" x2="280" y2="60" stroke="#0f172a" strokeWidth="1" />
              <text x="20" y="14" fill="#334155" fontSize="8" fontWeight="bold" textAnchor="middle">REV</text>
              <text x="125" y="14" fill="#334155" fontSize="8" fontWeight="bold" textAnchor="middle">DESCRIPTION</text>
              <text x="245" y="14" fill="#334155" fontSize="8" fontWeight="bold" textAnchor="middle">DATE</text>
              <text x="312" y="14" fill="#334155" fontSize="8" fontWeight="bold" textAnchor="middle">APPROVED</text>
              
              <text x="20" y="42" fill="#0f172a" fontSize="10" fontWeight="bold" textAnchor="middle">{metadata.revision || '-'}</text>
              <text x="125" y="42" fill="#0f172a" fontSize="9" textAnchor="middle">INITIAL RELEASE PRODUCTION</text>
              <text x="245" y="42" fill="#0f172a" fontSize="8" textAnchor="middle">{metadata.date || '2026-08-20'}</text>
              <text x="312" y="42" fill="#0f172a" fontSize="8" textAnchor="middle">{metadata.approvedBy || 'TBD'}</text>
            </g>

            {/* Notes Block */}
            <g transform="translate(45, 45)">
              <text x="0" y="0" fill="#0f172a" fontSize="10" fontWeight="bold">NOTES (UNLESS OTHERWISE SPECIFIED):</text>

              {/* Note 1: General Tol */}
              <g
                className={addMode ? 'cursor-crosshair' : ''}
                onClick={(e) => {
                  if (addMode) {
                    e.stopPropagation();
                    handleNoteClick(1, 45 + 16, metadata.generalToleranceNote);
                  }
                }}
                onMouseEnter={() => addMode && setHoveredNoteIndex(1)}
                onMouseLeave={() => setHoveredNoteIndex(null)}
              >
                {addMode && hoveredNoteIndex === 1 && (
                  <rect x="-4" y="6" width="360" height="14" fill="#38bdf8" fillOpacity="0.22" stroke="#0284c7" strokeWidth="1" rx="3" strokeDasharray="3,2" />
                )}
                <text x="0" y="16" fill={addMode && hoveredNoteIndex === 1 ? '#0284c7' : '#334155'} fontSize="8" fontWeight={hoveredNoteIndex === 1 ? 'bold' : 'normal'}>
                  1. {metadata.generalToleranceNote || 'NO GENERAL TOLERANCE CALLOUT SPECIFIED!'}
                </text>
                {addMode && hoveredNoteIndex === 1 && (
                  <text x="350" y="16" fill="#0284c7" fontSize="7" fontWeight="bold" textAnchor="end">Click to Balloon General Tol 🎯</text>
                )}
              </g>

              {/* Note 2: Deburr / Sharp Edges */}
              <g
                className={addMode ? 'cursor-crosshair' : ''}
                onClick={(e) => {
                  if (addMode) {
                    e.stopPropagation();
                    handleNoteClick(2, 45 + 28, 'BREAK ALL SHARP EDGES 0.2 - 0.4 MM.');
                  }
                }}
                onMouseEnter={() => addMode && setHoveredNoteIndex(2)}
                onMouseLeave={() => setHoveredNoteIndex(null)}
              >
                {addMode && hoveredNoteIndex === 2 && (
                  <rect x="-4" y="18" width="360" height="14" fill="#38bdf8" fillOpacity="0.22" stroke="#0284c7" strokeWidth="1" rx="3" strokeDasharray="3,2" />
                )}
                <text x="0" y="28" fill={addMode && hoveredNoteIndex === 2 ? '#0284c7' : '#334155'} fontSize="8" fontWeight={hoveredNoteIndex === 2 ? 'bold' : 'normal'}>
                  2. BREAK ALL SHARP EDGES 0.2 - 0.4 MM.
                </text>
                {addMode && hoveredNoteIndex === 2 && (
                  <text x="350" y="28" fill="#0284c7" fontSize="7" fontWeight="bold" textAnchor="end">Click to Balloon Deburr 🎯</text>
                )}
              </g>

              {/* Note 3: Material */}
              <g
                className={addMode ? 'cursor-crosshair' : ''}
                onClick={(e) => {
                  if (addMode) {
                    e.stopPropagation();
                    handleNoteClick(3, 45 + 40, metadata.material);
                  }
                }}
                onMouseEnter={() => addMode && setHoveredNoteIndex(3)}
                onMouseLeave={() => setHoveredNoteIndex(null)}
              >
                {addMode && hoveredNoteIndex === 3 && (
                  <rect x="-4" y="30" width="360" height="14" fill="#38bdf8" fillOpacity="0.28" stroke="#0284c7" strokeWidth="1.2" rx="3" />
                )}
                <text x="0" y="40" fill={addMode && hoveredNoteIndex === 3 ? '#0284c7' : '#334155'} fontSize="8" fontWeight={hoveredNoteIndex === 3 ? 'bold' : 'normal'}>
                  3. MATERIAL: {metadata.material || 'UNSPECIFIED'}
                </text>
                {addMode && hoveredNoteIndex === 3 && (
                  <text x="350" y="40" fill="#0284c7" fontSize="7" fontWeight="bold" textAnchor="end">Click to Balloon Material 🎯</text>
                )}
              </g>

              {/* Note 4: Finish */}
              <g
                className={addMode ? 'cursor-crosshair' : ''}
                onClick={(e) => {
                  if (addMode) {
                    e.stopPropagation();
                    handleNoteClick(4, 45 + 52, metadata.finish);
                  }
                }}
                onMouseEnter={() => addMode && setHoveredNoteIndex(4)}
                onMouseLeave={() => setHoveredNoteIndex(null)}
              >
                {addMode && hoveredNoteIndex === 4 && (
                  <rect x="-4" y="42" width="360" height="14" fill="#38bdf8" fillOpacity="0.28" stroke="#0284c7" strokeWidth="1.2" rx="3" />
                )}
                <text x="0" y="52" fill={addMode && hoveredNoteIndex === 4 ? '#0284c7' : '#334155'} fontSize="8" fontWeight={hoveredNoteIndex === 4 ? 'bold' : 'normal'}>
                  4. FINISH: {metadata.finish || 'UNSPECIFIED'}
                </text>
                {addMode && hoveredNoteIndex === 4 && (
                  <text x="350" y="52" fill="#0284c7" fontSize="7" fontWeight="bold" textAnchor="end">Click to Balloon Finish 🎯</text>
                )}
              </g>

              {/* Note 5: Interpretation */}
              <g
                className={addMode ? 'cursor-crosshair' : ''}
                onClick={(e) => {
                  if (addMode) {
                    e.stopPropagation();
                    handleNoteClick(5, 45 + 64, metadata.projection === 'FIRST_ANGLE' ? 'ISO 1101' : 'ASME Y14.5-2018');
                  }
                }}
                onMouseEnter={() => addMode && setHoveredNoteIndex(5)}
                onMouseLeave={() => setHoveredNoteIndex(null)}
              >
                {addMode && hoveredNoteIndex === 5 && (
                  <rect x="-4" y="54" width="360" height="14" fill="#38bdf8" fillOpacity="0.22" stroke="#0284c7" strokeWidth="1" rx="3" strokeDasharray="3,2" />
                )}
                <text x="0" y="64" fill={addMode && hoveredNoteIndex === 5 ? '#0284c7' : '#334155'} fontSize="8" fontWeight={hoveredNoteIndex === 5 ? 'bold' : 'normal'}>
                  5. INTERPRET DRAWING PER {metadata.projection === 'FIRST_ANGLE' ? 'ISO 1101' : 'ASME Y14.5-2018'}.
                </text>
                {addMode && hoveredNoteIndex === 5 && (
                  <text x="350" y="64" fill="#0284c7" fontSize="7" fontWeight="bold" textAnchor="end">Click to Balloon Standard 🎯</text>
                )}
              </g>
            </g>

            {/* Title Block */}
            <g transform="translate(625, 495)">
              <rect width="400" height="160" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
              <line x1="0" y1="40" x2="400" y2="40" stroke="#0f172a" strokeWidth="1" />
              <line x1="0" y1="85" x2="400" y2="85" stroke="#0f172a" strokeWidth="1" />
              <line x1="0" y1="120" x2="400" y2="120" stroke="#0f172a" strokeWidth="1" />
              
              <line x1="200" y1="0" x2="200" y2="40" stroke="#0f172a" strokeWidth="1" />
              <line x1="260" y1="40" x2="260" y2="85" stroke="#0f172a" strokeWidth="1" />
              <line x1="330" y1="40" x2="330" y2="85" stroke="#0f172a" strokeWidth="1" />
              <line x1="80" y1="120" x2="80" y2="160" stroke="#0f172a" strokeWidth="1" />
              <line x1="160" y1="120" x2="160" y2="160" stroke="#0f172a" strokeWidth="1" />
              <line x1="260" y1="120" x2="260" y2="160" stroke="#0f172a" strokeWidth="1" />

              <text x="100" y="18" fill="#0f172a" fontSize="10" fontWeight="bold" textAnchor="middle">
                {metadata.organization || 'ANTIGRAVITY QA'}
              </text>
              <text x="100" y="32" fill="#64748b" fontSize="8" textAnchor="middle">
                GLOBAL PRECISION ENGINEERING
              </text>

              <text x="210" y="16" fill="#64748b" fontSize="7" fontWeight="bold">PART NAME / TITLE</text>
              <text x="210" y="32" fill="#0f172a" fontSize="11" fontWeight="bold">
                {metadata.partName || 'UNASSIGNED PART'}
              </text>

              <text x="10" y="54" fill="#64748b" fontSize="7" fontWeight="bold">DRAWING NUMBER (图号)</text>
              <text x="10" y="74" fill="#0f172a" fontSize="13" fontWeight="bold" fontFamily="monospace">
                {metadata.drawingNumber || 'NO-DRAWING-NO'}
              </text>

              <text x="270" y="54" fill="#64748b" fontSize="7" fontWeight="bold">REV (版本)</text>
              <text x="295" y="75" fill="#0f172a" fontSize="14" fontWeight="bold" textAnchor="middle">
                {metadata.revision || '-'}
              </text>

              <text x="340" y="54" fill="#64748b" fontSize="7" fontWeight="bold">SCALE (比例)</text>
              <text x="365" y="66" fill="#0f172a" fontSize="9" textAnchor="middle">{metadata.scale}</text>
              <text x="365" y="80" fill="#64748b" fontSize="7" textAnchor="middle">SHEET {metadata.sheet}</text>

              <text x="10" y="98" fill="#64748b" fontSize="7">DRAWN BY:</text>
              <text x="60" y="98" fill="#0f172a" fontSize="8" fontWeight="bold">{metadata.drawnBy}</text>
              <text x="10" y="112" fill="#64748b" fontSize="7">DATE:</text>
              <text x="60" y="112" fill="#0f172a" fontSize="8">{metadata.date}</text>

              <text x="140" y="98" fill="#64748b" fontSize="7">CHECKED:</text>
              <text x="190" y="98" fill="#0f172a" fontSize="8">{metadata.checkedBy}</text>

              <text x="270" y="98" fill="#64748b" fontSize="7">APPROVED:</text>
              <text x="325" y="98" fill="#0f172a" fontSize="8" fontWeight="bold">{metadata.approvedBy || 'TBD'}</text>

              <text x="10" y="134" fill="#64748b" fontSize="7">UNITS:</text>
              <text x="45" y="150" fill="#0f172a" fontSize="11" fontWeight="bold" textAnchor="middle">
                {metadata.units ? metadata.units.toUpperCase() : 'NONE'}
              </text>

              <text x="90" y="134" fill="#64748b" fontSize="7">PROJECTION:</text>
            </g>

            {renderProjectionSymbol()}
              </>
            )}

            {/* Geometry - Flange */}
            {drawingId === 'drawing-flange' && (
              <g id="cad-geometry-flange">
                <line x1="160" y1="330" x2="410" y2="330" stroke="#94a3b8" strokeDasharray="14,3,4,3" strokeWidth="0.8" />
                <line x1="285" y1="205" x2="285" y2="455" stroke="#94a3b8" strokeDasharray="14,3,4,3" strokeWidth="0.8" />
                <line x1="470" y1="350" x2="750" y2="350" stroke="#94a3b8" strokeDasharray="14,3,4,3" strokeWidth="0.8" />

                <circle cx="285" cy="330" r="115" fill="none" stroke="#0f172a" strokeWidth="2.2" />
                <circle cx="285" cy="330" r="66" fill="none" stroke="#0f172a" strokeWidth="1.6" />
                <circle cx="285" cy="330" r="95" fill="none" stroke="#94a3b8" strokeDasharray="8,4" strokeWidth="0.8" />
                <circle cx="285" cy="330" r="37" fill="#f8fafc" stroke="#0f172a" strokeWidth="2" />

                {[0, 60, 120, 180, 240, 300].map((angle, i) => {
                  const rad = (angle * Math.PI) / 180;
                  const cx = 285 + 95 * Math.cos(rad);
                  const cy = 330 + 95 * Math.sin(rad);
                  return (
                    <g key={`hole-${i}`}>
                      <circle cx={cx} cy={cy} r="7.5" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
                      <circle cx={cx} cy={cy} r="12" fill="none" stroke="#64748b" strokeDasharray="3,2" strokeWidth="0.8" />
                    </g>
                  );
                })}

                <g transform="translate(500, 220)">
                  <path
                    d="M 20,40 L 140,40 L 140,110 L 210,110 L 210,150 L 20,150 L 20,110 L 20,40 Z"
                    fill="url(#section-hatch)"
                    stroke="#0f172a"
                    strokeWidth="2"
                  />
                  <path
                    d="M 20,190 L 210,190 L 210,230 L 140,230 L 140,300 L 20,300 L 20,190 Z"
                    fill="url(#section-hatch)"
                    stroke="#0f172a"
                    strokeWidth="2"
                  />
                  <line x1="20" y1="40" x2="20" y2="300" stroke="#0f172a" strokeWidth="2" />
                  <line x1="210" y1="110" x2="210" y2="230" stroke="#0f172a" strokeWidth="2" />
                  <line x1="140" y1="110" x2="140" y2="230" stroke="#64748b" strokeDasharray="4,2" strokeWidth="1" />
                  <rect x="70" y="80" width="70" height="15" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
                  <rect x="70" y="245" width="70" height="15" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
                  <text x="115" y="335" fill="#0f172a" fontSize="11" fontWeight="bold" textAnchor="middle">
                    SECTION A-A (SCALE 1:1)
                  </text>
                </g>

                <line x1="490" y1="140" x2="720" y2="140" stroke="#0f172a" strokeWidth="1" />
                <line x1="490" y1="135" x2="490" y2="260" stroke="#64748b" strokeWidth="0.8" />
                <line x1="720" y1="135" x2="720" y2="260" stroke="#64748b" strokeWidth="0.8" />
                <text x="605" y="132" fill="#0f172a" fontSize="10" fontWeight="bold" textAnchor="middle">
                  Ø 140.00 ±0.05
                </text>

                <line x1="520" y1="210" x2="650" y2="210" stroke="#0f172a" strokeWidth="1" />
                <text x="585" y="205" fill="#0f172a" fontSize="10" fontWeight="bold" textAnchor="middle">
                  Ø 80.00 +0.02/-0.00
                </text>

                <line x1="285" y1="330" x2="220" y2="280" stroke="#0f172a" strokeWidth="1" markerEnd="url(#leader-arrow)" />
                <text x="180" y="275" fill="#0f172a" fontSize="10" fontWeight="bold">
                  Ø 45.000 +0.012/-0.000
                </text>

                <line x1="720" y1="330" x2="720" y2="450" stroke="#0f172a" strokeWidth="1" />
                <text x="735" y="390" fill="#0f172a" fontSize="10" fontWeight="bold" transform="rotate(90, 735, 390)">
                  28.00 ±0.10
                </text>

                <line x1="745" y1="370" x2="745" y2="450" stroke="#0f172a" strokeWidth="1" />
                <text x="760" y="415" fill="#0f172a" fontSize="10" fontWeight="bold" transform="rotate(90, 760, 415)">
                  12.00 ±0.05
                </text>

                <text x="285" y="225" fill="#334155" fontSize="9" fontWeight="bold" textAnchor="middle">
                  Ø 115.00 B.C.
                </text>

                <text x="190" y="430" fill="#0f172a" fontSize="9" fontWeight="bold">
                  6x Ø 9.00 THRU
                </text>

                <g transform="translate(680, 280)">
                  <rect width="90" height="20" fill="#ffffff" stroke="#0f172a" strokeWidth="1.2" />
                  <line x1="25" y1="0" x2="25" y2="20" stroke="#0f172a" strokeWidth="1" />
                  <line x1="65" y1="0" x2="65" y2="20" stroke="#0f172a" strokeWidth="1" />
                  <text x="12" y="14" fill="#0f172a" fontSize="11" textAnchor="middle">⏥</text>
                  <text x="45" y="14" fill="#0f172a" fontSize="9" textAnchor="middle">0.02</text>
                  <text x="78" y="14" fill="#0f172a" fontSize="9" fontWeight="bold" textAnchor="middle">A</text>
                </g>

                <g transform="translate(180, 455)">
                  <rect width="130" height="20" fill="#ffffff" stroke="#0f172a" strokeWidth="1.2" />
                  <line x1="25" y1="0" x2="25" y2="20" stroke="#0f172a" strokeWidth="1" />
                  <line x1="75" y1="0" x2="75" y2="20" stroke="#0f172a" strokeWidth="1" />
                  <line x1="95" y1="0" x2="95" y2="20" stroke="#0f172a" strokeWidth="1" />
                  <line x1="113" y1="0" x2="113" y2="20" stroke="#0f172a" strokeWidth="1" />
                  <text x="12" y="14" fill="#0f172a" fontSize="12" textAnchor="middle">⌖</text>
                  <text x="50" y="14" fill="#0f172a" fontSize="9" textAnchor="middle">Ø0.05Ⓜ</text>
                  <text x="85" y="14" fill="#0f172a" fontSize="9" fontWeight="bold" textAnchor="middle">A</text>
                  <text x="104" y="14" fill="#0f172a" fontSize="9" fontWeight="bold" textAnchor="middle">B</text>
                  <text x="122" y="14" fill="#0f172a" fontSize="9" fontWeight="bold" textAnchor="middle">C</text>
                </g>

                <g transform="translate(710, 460)">
                  <polygon points="0,0 12,0 6,10" fill="#0f172a" />
                  <line x1="6" y1="10" x2="6" y2="22" stroke="#0f172a" strokeWidth="1.5" />
                  <rect x="-4" y="22" width="20" height="18" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
                  <text x="6" y="35" fill="#0f172a" fontSize="10" fontWeight="bold" textAnchor="middle">A</text>
                </g>
              </g>
            )}

            {/* Geometry - Shaft */}
            {drawingId === 'drawing-shaft' && (
              <g id="cad-geometry-shaft">
                <line x1="80" y1="340" x2="780" y2="340" stroke="#94a3b8" strokeDasharray="16,3,4,3" strokeWidth="0.8" />
                <rect x="160" y="300" width="120" height="80" fill="#f8fafc" stroke="#0f172a" strokeWidth="2" />
                <line x1="160" y1="305" x2="280" y2="305" stroke="#64748b" strokeDasharray="4,2" strokeWidth="1" />
                <line x1="160" y1="375" x2="280" y2="375" stroke="#64748b" strokeDasharray="4,2" strokeWidth="1" />
                <text x="220" y="290" fill="#0f172a" fontSize="10" fontWeight="bold" textAnchor="middle">M24 x 1.5 - 6g</text>

                <rect x="280" y="270" width="240" height="140" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
                <text x="400" y="250" fill="#0f172a" fontSize="10" fontWeight="bold" textAnchor="middle">Ø 35.000 +0.008/-0.000</text>

                <rect x="560" y="325" width="80" height="30" rx="6" fill="#f1f5f9" stroke="#0f172a" strokeWidth="1.5" />
                <text x="600" y="315" fill="#0f172a" fontSize="9" fontWeight="bold" textAnchor="middle">8.000 +0.036 / -0.000</text>

                <rect x="520" y="290" width="180" height="100" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />

                <line x1="160" y1="460" x2="700" y2="460" stroke="#0f172a" strokeWidth="1.2" />
                <text x="430" y="480" fill="#0f172a" fontSize="11" fontWeight="bold" textAnchor="middle">180.00 ±0.20</text>
              </g>
            )}

            {/* Geometry - Bracket */}
            {drawingId === 'drawing-bracket' && (
              <g id="cad-geometry-bracket">
                <path
                  d="M 220,400 L 680,400 Q 700,400 700,380 L 700,240 Q 700,220 720,220 L 780,220"
                  fill="none"
                  stroke="#0f172a"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <circle cx="340" cy="400" r="10" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
                <circle cx="560" cy="400" r="10" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
                <text x="450" y="360" fill="#0f172a" fontSize="11" fontWeight="bold" textAnchor="middle">85.0 ±0.15</text>
                <text x="450" y="440" fill="#0f172a" fontSize="11" fontWeight="bold" textAnchor="middle">120.0 ±0.3</text>
                <text x="750" y="330" fill="#0f172a" fontSize="10" fontWeight="bold">40.0 ±0.2</text>
                <text x="630" y="420" fill="#0f172a" fontSize="10" fontWeight="bold">R 2.5 ±0.2</text>
              </g>
            )}

            {/* Geometry - Defective */}
            {drawingId === 'drawing-defective' && (
              <g id="cad-geometry-defective">
                <circle cx="450" cy="320" r="110" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="6,4" />
                <circle cx="450" cy="320" r="50" fill="none" stroke="#ef4444" strokeWidth="2" />
                <text x="450" y="325" fill="#ef4444" fontSize="12" fontWeight="bold" textAnchor="middle">
                  Ø 50.00 (NO TOLERANCE SPECIFIED!)
                </text>
                <text x="450" y="360" fill="#991b1b" fontSize="11" textAnchor="middle">
                  WARNING: Missing Title Block, No General Tolerance Note, No Projection Standard
                </text>
              </g>
            )}

            {/* Custom Uploaded CAD Drawing Blueprint (PDF or Image) */}
            {drawingId === 'drawing-custom' && customDrawingImageUrl && (
              <g id="cad-geometry-custom-blueprint">
                <image
                  href={customDrawingImageUrl}
                  x="25"
                  y="25"
                  width="1000"
                  height="630"
                  preserveAspectRatio="xMidYMid meet"
                />
              </g>
            )}

            {/* Balloons Overlay */}
            {balloons.map((balloon) => {
              const isSelected = balloon.id === selectedBalloonId;
              const isHovered = balloon.id === hoveredBalloonId;
              const radius = (balloonSize || 24) / 2;
              const col = balloon.balloonColor || balloonColor || '#2563eb';
              const hasLeader = balloon.leaderTargetX !== undefined && balloon.leaderTargetY !== undefined;

              // Calculate start coordinate on circle perimeter towards the leader target
              let lineStartX = balloon.x;
              let lineStartY = balloon.y;
              if (hasLeader) {
                const dx = balloon.leaderTargetX! - balloon.x;
                const dy = balloon.leaderTargetY! - balloon.y;
                const dist = Math.hypot(dx, dy);
                if (dist > radius) {
                  lineStartX = balloon.x + (dx / dist) * radius;
                  lineStartY = balloon.y + (dy / dist) * radius;
                }
              }

              return (
                <g key={balloon.id}>
                  {/* Leader Line */}
                  {hasLeader && (
                    <line
                      x1={lineStartX}
                      y1={lineStartY}
                      x2={balloon.leaderTargetX!}
                      y2={balloon.leaderTargetY!}
                      stroke={col}
                      strokeWidth={isSelected || isHovered ? '2' : '1.3'}
                      strokeDasharray={isSelected ? '3,2' : undefined}
                      markerEnd="url(#leader-arrow)"
                    />
                  )}

                  {/* Draggable Arrow Target Handle (appears when balloon is selected or hovered) */}
                  {hasLeader && (isSelected || isHovered) && (
                    <g
                      className="cursor-move group/target"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDraggingTargetId(balloon.id);
                        onSelectBalloon(balloon.id);
                      }}
                    >
                      <title>Drag arrow tip to point at feature, note, or dimension</title>
                      {/* Pulse target ring */}
                      <circle
                        cx={balloon.leaderTargetX!}
                        cy={balloon.leaderTargetY!}
                        r="9"
                        fill="rgba(56, 189, 248, 0.25)"
                        stroke="#38bdf8"
                        strokeWidth="1.5"
                        strokeDasharray="3,2"
                        className="animate-spin-slow"
                      />
                      {/* Target center dot */}
                      <circle
                        cx={balloon.leaderTargetX!}
                        cy={balloon.leaderTargetY!}
                        r="3.5"
                        fill="#0284c7"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        className="filter drop-shadow-sm"
                      />
                    </g>
                  )}

                  {/* Balloon Circle (Draggable & Double-click to Edit) */}
                  <g
                    className="cursor-grab active:cursor-grabbing balloon-handle"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setDraggingBalloonId(balloon.id);
                      onSelectBalloon(balloon.id);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      onEditBalloon?.(balloon.id);
                    }}
                    onMouseEnter={() => onHoverBalloon(balloon.id)}
                    onMouseLeave={() => onHoverBalloon(null)}
                  >
                    {/* Outer selection halo */}
                    {(isSelected || isHovered) && (
                      <circle
                        cx={balloon.x}
                        cy={balloon.y}
                        r={radius + 5}
                        fill="none"
                        stroke={isSelected ? '#38bdf8' : '#60a5fa'}
                        strokeWidth="2.5"
                        strokeDasharray="4,2"
                        className="animate-pulse"
                      />
                    )}

                    {/* Circle body */}
                    <circle
                      cx={balloon.x}
                      cy={balloon.y}
                      r={radius}
                      fill="#ffffff"
                      stroke={col}
                      strokeWidth={isSelected ? '2.5' : '2'}
                      className="filter drop-shadow-md transition-all"
                    />

                    {/* Balloon Number */}
                    <text
                      x={balloon.x}
                      y={balloon.y + 4.5}
                      fill={col}
                      fontSize={radius > 12 ? '11' : '9'}
                      fontWeight="bold"
                      textAnchor="middle"
                      fontFamily="Arial, sans-serif"
                    >
                      {balloon.itemNumber}
                    </text>
                  </g>

                  {/* On-Canvas Action Badges for Selected Balloon */}
                  {isSelected && (
                    <g>
                      {/* 1. Delete Badge: Red circle with white X right next to balloon */}
                      <g
                        className="cursor-pointer group/del"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteBalloon(balloon.id);
                        }}
                      >
                        <circle
                          cx={balloon.x + radius + 5}
                          cy={balloon.y - radius - 3}
                          r="8.5"
                          fill="#ef4444"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                          className="filter drop-shadow group-hover/del:fill-red-700 transition-colors"
                        />
                        {/* 'X' icon */}
                        <path
                          d={`M ${balloon.x + radius + 2} ${balloon.y - radius - 6} L ${balloon.x + radius + 8} ${balloon.y - radius} M ${balloon.x + radius + 8} ${balloon.y - radius - 6} L ${balloon.x + radius + 2} ${balloon.y - radius}`}
                          stroke="#ffffff"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                        <title>Delete Balloon #{balloon.itemNumber} (or press Delete/Backspace)</title>
                      </g>

                      {/* 2. Arrow Leader Toggle Badge: Blue circle with arrow icon */}
                      <g
                        className="cursor-pointer group/arrow"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleLeaderArrow?.(balloon.id);
                        }}
                      >
                        <circle
                          cx={balloon.x - radius - 5}
                          cy={balloon.y - radius - 3}
                          r="8.5"
                          fill={hasLeader ? '#2563eb' : '#64748b'}
                          stroke="#ffffff"
                          strokeWidth="1.5"
                          className="filter drop-shadow group-hover/arrow:fill-blue-700 transition-colors"
                        />
                        {/* Arrow icon */}
                        <path
                          d={`M ${balloon.x - radius - 8} ${balloon.y - radius} L ${balloon.x - radius - 2} ${balloon.y - radius - 6} M ${balloon.x - radius - 6} ${balloon.y - radius - 6} L ${balloon.x - radius - 2} ${balloon.y - radius - 6} L ${balloon.x - radius - 2} ${balloon.y - radius - 2}`}
                          stroke="#ffffff"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <title>{hasLeader ? 'Remove Arrow Leader' : 'Add Arrow Leader'}</title>
                      </g>

                      {/* 3. Edit Dimension Badge: Indigo circle above balloon */}
                      <g
                        className="cursor-pointer group/edit"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditBalloon?.(balloon.id);
                        }}
                      >
                        <circle
                          cx={balloon.x}
                          cy={balloon.y - radius - 10}
                          r="8.5"
                          fill="#4f46e5"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                          className="filter drop-shadow group-hover/edit:fill-indigo-700 transition-colors"
                        />
                        <path
                          d={`M ${balloon.x - 3} ${balloon.y - radius - 7} L ${balloon.x + 3} ${balloon.y - radius - 13} M ${balloon.x - 4} ${balloon.y - radius - 6} L ${balloon.x - 2} ${balloon.y - radius - 6}`}
                          stroke="#ffffff"
                          strokeWidth="1.3"
                          strokeLinecap="round"
                        />
                        <title>Edit Dimension & Tolerance (or double-click balloon)</title>
                      </g>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <div className="absolute bottom-3 left-4 z-20 flex items-center gap-3 bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-300 shadow-xl">
        <div className="flex items-center gap-1.5">
          <Crosshair className="w-3.5 h-3.5 text-blue-400" />
          <span>Click feature or note to place arrow tip</span>
        </div>
        <span className="text-slate-700">|</span>
        <div className="flex items-center gap-1.5">
          <Move className="w-3.5 h-3.5 text-cyan-400" />
          <span>Drag balloon or arrow tip to reposition</span>
        </div>
        <span className="text-slate-700">|</span>
        <div className="flex items-center gap-1.5 text-red-300">
          <Trash2 className="w-3.5 h-3.5 text-red-400" />
          <span>Press Delete to remove</span>
        </div>
      </div>
    </div>
  );
};
