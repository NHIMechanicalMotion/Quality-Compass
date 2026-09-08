import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Header } from './components/Header';
import { DrawingCanvas } from './components/DrawingCanvas';
import { InspectionTable } from './components/InspectionTable';
import { StandardsAuditModal } from './components/StandardsAuditModal';
import { ChinaApprovalModal } from './components/ChinaApprovalModal';
import { DimensionDetailModal } from './components/DimensionDetailModal';
import { SupabaseRevisionsModal } from './components/SupabaseRevisionsModal';
import { AddInspectionMethodModal } from './components/AddInspectionMethodModal';
import { AutoBalloonReviewModal } from './components/AutoBalloonReviewModal';
import { TemplateManagerModal } from './components/TemplateManagerModal';
import { QmsDashboard } from './components/qms/QmsDashboard';
import { ApqpPpapDashboard } from './components/apqp/ApqpPpapDashboard';
import type { StandardType, TitleBlockMetadata, AuditReport } from './types/cad';
import type { InspectionBalloon } from './types/balloon';
import type { InspectionControlPlan, InspectionControlPlanItem, ChinaApprovalRecord, InspectionMethodTool } from './types/inspection';
import type { PartFamilyProfile } from './types/templates';
import { SINGLE_PULLEY_PROFILE } from './data/partFamilyTemplates';
import { PRELOADED_DRAWINGS } from './data/sampleDrawings';
import { runDrawingAudit } from './standards/auditEngine';
import { recommendInspectionTool, INSPECTION_TOOLS_DATABASE } from './utils/toolRecommender';
import { parseDimensionString, evaluateMeasurements } from './utils/dimensionParser';
import { exportInspectionControlPlanToExcel } from './utils/excelExport';
import { exportDrawingAsPdf } from './utils/pdfExport';
import { loadPdfDocument, loadImageFileDataUrl, type PdfDocumentInfo } from './utils/pdfLoader';
import { loadDxfDocument, type ParsedDxfDocument } from './utils/dxfLoader';
import { 
  extractPdfTextTokens, 
  runTesseractOcr, 
  parseDetectedCadDimensions, 
  convertDetectedToBalloon, 
  type DetectedDimension 
} from './utils/cadOcrParser';
import { extractTitleBlockMetadata, applyExtractedTitleBlock } from './utils/titleBlockExtractor';
import { getStoredPartFamilyProfiles, savePartFamilyProfile, resetPartFamilyProfilesToDefault } from './utils/templateManager';
import type { OperatingCompanyId } from './data/operatingCompanies';
import { saveAs } from 'file-saver';

export function App() {
  // Operating company scope (NHI Mechanical Motion LLC, NHI, Terre, Mantis, Makers)
  const [selectedCompany, setSelectedCompany] = useState<OperatingCompanyId>('ALL');

  // Mode selection: Pillar 1 (Inspection & FAI) vs Pillar 2 (QMS Executive) vs Pillar 3 (APQP & PPAP Launch Hub)
  const [activeViewMode, setActiveViewMode] = useState<'INSPECTION' | 'QMS_DASHBOARD' | 'APQP_PPAP'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const modeParam = params.get('mode');
      if (modeParam === 'APQP_PPAP' || window.location.hash === '#apqp') return 'APQP_PPAP';
      if (modeParam === 'QMS_DASHBOARD' || window.location.hash === '#qms') return 'QMS_DASHBOARD';
    }
    return 'INSPECTION';
  });

  // Sync mode changes to URL hash for deep linking
  useEffect(() => {
    if (activeViewMode === 'APQP_PPAP') {
      window.location.hash = '#apqp';
    } else if (activeViewMode === 'QMS_DASHBOARD') {
      window.location.hash = '#qms';
    } else {
      if (window.location.hash === '#apqp' || window.location.hash === '#qms') {
        history.replaceState(null, '', window.location.pathname);
      }
    }
  }, [activeViewMode]);

  // Current active drawing selection
  const [currentDrawingId, setCurrentDrawingId] = useState<string>('drawing-flange');
  const [metadata, setMetadata] = useState<TitleBlockMetadata>(PRELOADED_DRAWINGS[0].metadata);
  const [balloons, setBalloons] = useState<InspectionBalloon[]>(PRELOADED_DRAWINGS[0].dimensions);
  const [activeStandard, setActiveStandard] = useState<StandardType>('ASME_Y14_5');

  // Dynamic Part Family Profiles & Template Training
  const [allProfiles, setAllProfiles] = useState<PartFamilyProfile[]>(() => getStoredPartFamilyProfiles());
  const [activePartFamilyProfile, setActivePartFamilyProfile] = useState<PartFamilyProfile>(() => {
    const stored = getStoredPartFamilyProfiles();
    return stored[0] || SINGLE_PULLEY_PROFILE;
  });
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState<boolean>(false);

  const [auditReport, setAuditReport] = useState<AuditReport | null>(null);
  const [isAuditUnlocked, setIsAuditUnlocked] = useState<boolean>(false);

  // Custom Uploaded Drawing Image & PDF/DXF Document States
  const [customDrawingImageUrl, setCustomDrawingImageUrl] = useState<string | null>(null);
  const [customPdfDoc, setCustomPdfDoc] = useState<PdfDocumentInfo | null>(null);
  const [customDxfDoc, setCustomDxfDoc] = useState<ParsedDxfDocument | null>(null);
  const [pdfPageNumber, setPdfPageNumber] = useState<number>(1);
  const [pdfTotalPages, setPdfTotalPages] = useState<number>(1);
  const [isLoadingDrawing, setIsLoadingDrawing] = useState<boolean>(false);

  // OCR & Automated Dimension Recognition States
  const [isOcrAnalyzing, setIsOcrAnalyzing] = useState<boolean>(false);
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [ocrStatusMessage, setOcrStatusMessage] = useState<string>('');
  const [detectedDimensions, setDetectedDimensions] = useState<DetectedDimension[]>([]);
  const [isAutoBalloonModalOpen, setIsAutoBalloonModalOpen] = useState<boolean>(false);
  const [ocrSourceType, setOcrSourceType] = useState<'VECTOR_PDF' | 'TESSERACT_OCR' | 'HYBRID' | 'VECTOR_DXF'>('VECTOR_PDF');

  // Selection & Hover
  const [selectedBalloonId, setSelectedBalloonId] = useState<string | null>(null);
  const [hoveredBalloonId, setHoveredBalloonId] = useState<string | null>(null);

  // Custom Inspection Methods & Tools
  const [customTools, setCustomTools] = useState<InspectionMethodTool[]>(() => {
    try {
      const saved = localStorage.getItem('qc_custom_inspection_tools');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const allInspectionTools = useMemo(() => {
    return [...INSPECTION_TOOLS_DATABASE, ...customTools];
  }, [customTools]);

  const [isAddToolModalOpen, setIsAddToolModalOpen] = useState<boolean>(false);
  const [targetToolItemId, setTargetToolItemId] = useState<string | null>(null);

  // Modals
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);
  const [isChinaApprovalModalOpen, setIsChinaApprovalModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState<boolean>(false);

  // Language & Visual Preferences
  const [language, setLanguage] = useState<'bilingual' | 'en' | 'zh'>('bilingual');
  const balloonColor = '#2563eb';
  const balloonSize = 24;

  // China QC Approval Record
  const [chinaApproval, setChinaApproval] = useState<ChinaApprovalRecord>({
    inspectorName: 'Zhang Wei (张伟)',
    inspectorNameZh: '张伟',
    inspectionDate: '2026-09-03',
    facilityLocation: 'Suzhou Precision Plant / 苏州精密生产线',
    qaManagerName: 'Li Ming (李明)',
    approvalDate: '2026-09-03',
    decision: 'APPROVED',
    decisionNotes: 'All critical dimensions verified with CMM and optical comparator. First article approved for mass production.',
    correctiveActionRequired: false,
  });

  // Inspection Control Plan Items
  const [items, setItems] = useState<InspectionControlPlanItem[]>([]);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Initialize and synchronize items whenever balloons change
  useEffect(() => {
    const newItems: InspectionControlPlanItem[] = balloons.map((b) => {
      const existing = items.find(it => it.balloonId === b.id);
      if (existing) {
        return {
          ...existing,
          itemNumber: b.itemNumber,
          characteristicNameEn: b.dimensionName,
          characteristicNameZh: b.dimensionNameZh,
          classification: b.classification,
          drawingZone: b.drawingZone,
          nominal: b.nominal,
          lowerTol: b.lowerTol,
          upperTol: b.upperTol,
          minLimit: b.minLimit,
          maxLimit: b.maxLimit,
          unit: b.unit,
          rawCallout: b.rawCallout,
        };
      }

      const recTool = recommendInspectionTool(
        b.type,
        b.nominal,
        Math.abs(b.upperTol - b.lowerTol),
        b.rawCallout
      );

      const mockOffset1 = (Math.random() * 0.4 - 0.2) * (b.upperTol || 0.05);
      const mockOffset2 = (Math.random() * 0.4 - 0.2) * (b.upperTol || 0.05);
      const mockOffset3 = (Math.random() * 0.4 - 0.2) * (b.upperTol || 0.05);

      const measurements = {
        sample1: Math.round((b.nominal + mockOffset1) * 1000) / 1000,
        sample2: Math.round((b.nominal + mockOffset2) * 1000) / 1000,
        sample3: Math.round((b.nominal + mockOffset3) * 1000) / 1000,
        sample4: undefined,
        sample5: undefined,
      };

      const status = evaluateMeasurements(measurements, b.minLimit, b.maxLimit);

      return {
        id: `item-${b.id}`,
        itemNumber: b.itemNumber,
        balloonId: b.id,
        characteristicNameEn: b.dimensionName,
        characteristicNameZh: b.dimensionNameZh,
        dimensionType: b.type,
        classification: b.classification,
        drawingZone: b.drawingZone,
        nominal: b.nominal,
        lowerTol: b.lowerTol,
        upperTol: b.upperTol,
        minLimit: b.minLimit,
        maxLimit: b.maxLimit,
        unit: b.unit,
        rawCallout: b.rawCallout,
        recommendedToolId: recTool.id,
        recommendedToolEn: recTool.nameEn,
        recommendedToolZh: recTool.nameZh,
        selectedToolEn: recTool.nameEn,
        selectedToolZh: recTool.nameZh,
        samplingPlanEn: b.classification === 'CRITICAL' ? '100% Full Inspection' : '5 pcs / Lot',
        samplingPlanZh: b.classification === 'CRITICAL' ? '100% 全检' : '5件/批次',
        measurements,
        status,
        deviationNotes: status === 'PASS' ? 'Within specification' : '',
      };
    });

    setItems(newItems);
  }, [balloons]);

  // Run Standards Audit whenever drawing, metadata, activeStandard or part family changes
  useEffect(() => {
    const report = runDrawingAudit(activeStandard, metadata, balloons, activePartFamilyProfile);
    setAuditReport(report);
  }, [activeStandard, metadata, balloons, activePartFamilyProfile]);

  // Handle switching sample drawings
  const handleSelectDrawing = (id: string) => {
    if (id === 'drawing-custom') {
      setCurrentDrawingId('drawing-custom');
      return;
    }

    const found = PRELOADED_DRAWINGS.find(d => d.id === id);
    if (!found) return;

    setCurrentDrawingId(found.id);
    setMetadata(found.metadata);
    setBalloons(found.dimensions);
    setActiveStandard(found.recommendedStandard);
    setSelectedBalloonId(null);
    setIsAuditUnlocked(false);

    if (found.id === 'drawing-defective') {
      setChinaApproval(prev => ({
        ...prev,
        decision: 'REJECTED',
        decisionNotes: 'Drawing rejected due to critical missing metadata and non-toleranced features.',
      }));
    } else {
      setChinaApproval(prev => ({
        ...prev,
        decision: 'APPROVED',
        decisionNotes: 'Inspection plan conforms to quality guidelines.',
      }));
    }
  };

  // Upload custom drawing (accepts file input change event or direct File from drag-and-drop)
  const handleUploadCustomDrawing = async (eOrFile: React.ChangeEvent<HTMLInputElement> | File) => {
    let file: File | undefined;
    if ('target' in eOrFile) {
      file = eOrFile.target.files?.[0];
      eOrFile.target.value = '';
    } else {
      file = eOrFile;
    }

    if (!file) return;

    setIsLoadingDrawing(true);

    try {
      const fileNameLower = file.name.toLowerCase();
      const isDxf = fileNameLower.endsWith('.dxf');
      const isPdf = fileNameLower.endsWith('.pdf') || file.type === 'application/pdf';
      const isImage = /\.(png|jpe?g|webp|svg)$/i.test(fileNameLower) || file.type.startsWith('image/');

      if (isDxf) {
        const dxfDoc = await loadDxfDocument(file);

        setCustomPdfDoc(null);
        setCustomDxfDoc(dxfDoc);
        setPdfTotalPages(1);
        setPdfPageNumber(1);
        setCustomDrawingImageUrl(dxfDoc.dataUrl);

        const baseName = file.name.replace(/\.[^/.]+$/, '');
        let customMeta: TitleBlockMetadata = {
          drawingNumber: baseName.toUpperCase(),
          partName: baseName.replace(/[-_]/g, ' ').toUpperCase(),
          revision: '-',
          organization: 'UPLOADED CAD DXF',
          drawnBy: '',
          checkedBy: '',
          approvedBy: '',
          date: new Date().toISOString().slice(0, 10),
          sheet: '1 OF 1',
          scale: '1:1',
          material: 'SPHC / SPEC',
          finish: 'AFTER FINISH / SPEC',
          units: dxfDoc.units,
          projection: 'THIRD_ANGLE',
          generalToleranceNote: 'SEE CAD DRAWING GENERAL SPEC NOTES',
        };

        // Extract title block attributes directly from DXF text tokens
        try {
          const extractedTb = extractTitleBlockMetadata(dxfDoc.tokens, true);
          customMeta = applyExtractedTitleBlock(customMeta, extractedTb);
        } catch (tbErr) {
          console.warn('Could not extract DXF title block metadata:', tbErr);
        }

        setMetadata(customMeta);
        setBalloons([]);
        setCurrentDrawingId('drawing-custom');
      } else if (isPdf) {
        setCustomDxfDoc(null);
        const doc = await loadPdfDocument(file);
        const page1 = await doc.getPage(1, 2.5);

        setCustomPdfDoc(doc);
        setPdfTotalPages(doc.numPages);
        setPdfPageNumber(1);
        setCustomDrawingImageUrl(page1.dataUrl);

        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const defaultMaterial = activePartFamilyProfile.category === 'PULLEY' ? 'SPHC' : 'STEEL / SPEC';
        const defaultUnits = activePartFamilyProfile.category === 'PULLEY' ? 'inch' : 'mm';
        let customMeta: TitleBlockMetadata = {
          drawingNumber: baseName.toUpperCase(),
          partName: baseName.replace(/[-_]/g, ' ').toUpperCase(),
          revision: '-',
          organization: 'UPLOADED CLIENT PRINT',
          drawnBy: '',
          checkedBy: '',
          approvedBy: '',
          date: new Date().toISOString().slice(0, 10),
          sheet: `1 OF ${doc.numPages}`,
          scale: '1:1',
          material: defaultMaterial,
          finish: 'AFTER FINISH / SPEC',
          units: defaultUnits,
          projection: 'THIRD_ANGLE',
          generalToleranceNote: 'ALL DIMENSIONS APPLY AFTER FINISH',
        };

        // Extract title block attributes directly from Vector PDF text tokens on Page 1
        try {
          const pdfTokens = await extractPdfTextTokens(doc, 1, 2.5);
          if (pdfTokens && pdfTokens.tokens.length > 0) {
            const extractedTb = extractTitleBlockMetadata(pdfTokens.tokens, false);
            customMeta = applyExtractedTitleBlock(customMeta, extractedTb);
          }
        } catch (tbErr) {
          console.warn('Could not extract PDF title block metadata:', tbErr);
        }

        setMetadata(customMeta);
        setBalloons([]);
        setCurrentDrawingId('drawing-custom');
      } else if (isImage) {
        setCustomDxfDoc(null);
        const dataUrl = await loadImageFileDataUrl(file);

        setCustomPdfDoc(null);
        setPdfTotalPages(1);
        setPdfPageNumber(1);
        setCustomDrawingImageUrl(dataUrl);

        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const defaultMaterial = activePartFamilyProfile.category === 'PULLEY' ? 'SPHC' : 'STEEL / SPEC';
        const defaultUnits = activePartFamilyProfile.category === 'PULLEY' ? 'inch' : 'mm';
        const customMeta: TitleBlockMetadata = {
          drawingNumber: baseName.toUpperCase(),
          partName: baseName.replace(/[-_]/g, ' ').toUpperCase(),
          revision: '-',
          organization: 'UPLOADED CLIENT PRINT',
          drawnBy: '',
          checkedBy: '',
          approvedBy: '',
          date: new Date().toISOString().slice(0, 10),
          sheet: '1 OF 1',
          scale: '1:1',
          material: defaultMaterial,
          finish: 'AFTER FINISH / SPEC',
          units: defaultUnits,
          projection: 'THIRD_ANGLE',
          generalToleranceNote: 'ALL DIMENSIONS APPLY AFTER FINISH',
        };

        setMetadata(customMeta);
        setBalloons([]);
        setCurrentDrawingId('drawing-custom');
      } else {
        alert(
          `The selected file (${file.name}) is not directly supported.\n\nSupported drawing formats:\n• AutoCAD DXF 2D vector (.dxf)\n• PDF documents (.pdf)\n• High-res raster/vector images (.png, .jpg, .jpeg, .webp, .svg)`
        );
      }
    } catch (err: any) {
      console.error('Error loading drawing file:', err);
      alert(`Could not open drawing: ${err?.message || 'The PDF file could not be parsed. Please check if it is password-protected or corrupted.'}`);
    } finally {
      setIsLoadingDrawing(false);
    }
  };

  // Change active page for multi-page PDF blueprints
  const handleChangePdfPage = async (newPage: number) => {
    if (!customPdfDoc || newPage < 1 || newPage > pdfTotalPages) return;
    setIsLoadingDrawing(true);
    try {
      const page = await customPdfDoc.getPage(newPage, 2.5);
      setCustomDrawingImageUrl(page.dataUrl);
      setPdfPageNumber(newPage);
      setMetadata(prev => ({
        ...prev,
        sheet: `${newPage} OF ${pdfTotalPages}`,
      }));
    } catch (err) {
      console.error('Failed to change PDF page:', err);
    } finally {
      setIsLoadingDrawing(false);
    }
  };

  // Balloon Dragging & Movement
  const handleUpdateBalloonPosition = (id: string, x: number, y: number) => {
    setBalloons(prev =>
      prev.map(b => (b.id === id ? { ...b, x, y } : b))
    );
  };

  // Dragging Leader Arrow Target
  const handleUpdateLeaderTarget = (id: string, targetX: number, targetY: number) => {
    setBalloons(prev =>
      prev.map(b => (b.id === id ? { ...b, leaderTargetX: targetX, leaderTargetY: targetY } : b))
    );
  };

  // Toggle Leader Arrow On/Off
  const handleToggleLeaderArrow = (id: string) => {
    setBalloons(prev =>
      prev.map(b => {
        if (b.id !== id) return b;
        if (b.leaderTargetX !== undefined && b.leaderTargetY !== undefined) {
          return { ...b, leaderTargetX: undefined, leaderTargetY: undefined };
        } else {
          // Point arrow offset from current balloon circle
          const targetX = b.x < 500 ? b.x - 45 : b.x + 45;
          const targetY = b.y < 300 ? b.y + 35 : b.y - 35;
          return { ...b, leaderTargetX: targetX, leaderTargetY: targetY };
        }
      })
    );
  };

  // Add balloon at specific canvas coordinates with explicit arrow target
  const handleAddBalloonWithTarget = (
    balloonX: number,
    balloonY: number,
    targetX: number,
    targetY: number,
    detected?: Partial<InspectionBalloon>
  ) => {
    const nextItemNumber = balloons.length + 1;
    const isNote = detected?.type === 'NOTE' || detected?.type === 'SURFACE_FINISH';
    const parsed = parseDimensionString(detected?.rawCallout || `Dimension ${nextItemNumber} 25.0 ±0.05`, metadata.units);

    const zoneX = targetX < 250 ? '1' : targetX < 500 ? '2' : targetX < 750 ? '3' : '4';
    const zoneY = targetY < 160 ? 'A' : targetY < 320 ? 'B' : targetY < 480 ? 'C' : 'D';
    const zone = `${zoneY}-${zoneX}`;

    const newBalloon: InspectionBalloon = {
      id: `custom-balloon-${Date.now()}`,
      itemNumber: nextItemNumber,
      dimensionName: detected?.dimensionName || `Characteristic ${nextItemNumber}`,
      dimensionNameZh: detected?.dimensionNameZh || `检验项目 ${nextItemNumber}`,
      type: detected?.type || parsed.type,
      classification: detected?.classification || (isNote ? 'MAJOR' : parsed.classification),
      nominal: detected?.nominal !== undefined ? detected.nominal : (isNote ? 0 : parsed.nominal),
      upperTol: detected?.upperTol !== undefined ? detected.upperTol : (isNote ? 0 : parsed.upperTol),
      lowerTol: detected?.lowerTol !== undefined ? detected.lowerTol : (isNote ? 0 : parsed.lowerTol),
      minLimit: detected?.minLimit !== undefined ? detected.minLimit : (isNote ? 0 : parsed.minLimit),
      maxLimit: detected?.maxLimit !== undefined ? detected.maxLimit : (isNote ? 0 : parsed.maxLimit),
      unit: metadata.units,
      rawCallout: detected?.rawCallout || parsed.rawCallout,
      x: balloonX,
      y: balloonY,
      leaderTargetX: targetX,
      leaderTargetY: targetY,
      sheet: 1,
      drawingZone: zone,
      balloonColor: detected?.classification === 'CRITICAL' ? '#dc2626' : '#2563eb',
    };

    setBalloons(prev => [...prev, newBalloon]);
    setSelectedBalloonId(newBalloon.id);
  };

  // Renumber balloons sequentially
  const handleRenumberBalloons = () => {
    setBalloons(prev =>
      prev.map((b, idx) => ({
        ...b,
        itemNumber: idx + 1,
      }))
    );
  };

  // Auto-detect & balloon dimensions (supports Vector CAD PDF + Tesseract OCR)
  const handleAutoDetectDimensions = async () => {
    // If a preloaded drawing is active, use its built-in sample dimensions
    if (currentDrawingId !== 'drawing-custom') {
      const sample = PRELOADED_DRAWINGS.find(d => d.id === currentDrawingId);
      if (sample && sample.dimensions.length > 0) {
        setBalloons(sample.dimensions);
      }
      return;
    }

    // If on custom uploaded drawing:
    if (!customDrawingImageUrl && !customPdfDoc && !customDxfDoc) {
      alert('Please upload a CAD drawing (DXF, PDF, or image) first.');
      return;
    }

    setIsOcrAnalyzing(true);
    setOcrProgress(10);
    setOcrStatusMessage('Extracting drawing layers & text fragments...');

    try {
      let tokens: any[] = [];
      let width = 2000;
      let height = 1400;
      let source: 'VECTOR_PDF' | 'TESSERACT_OCR' | 'VECTOR_DXF' = 'VECTOR_PDF';

      // 0. If we have a native DXF document, use exact vector CAD text tokens (100% precision)
      if (customDxfDoc) {
        setOcrStatusMessage('Extracting native AutoCAD vector entities & text tokens...');
        setOcrProgress(50);
        tokens = customDxfDoc.tokens;
        width = customDxfDoc.width;
        height = customDxfDoc.height;
        source = 'VECTOR_DXF';
      }
      // 1. If we have a PDF document, attempt Vector CAD Text Extraction first
      else if (customPdfDoc) {
        setOcrStatusMessage('Reading vector CAD text layers from PDF...');
        setOcrProgress(25);
        try {
          const pdfResult = await extractPdfTextTokens(customPdfDoc, pdfPageNumber, 2.5);
          tokens = pdfResult.tokens;
          width = pdfResult.width;
          height = pdfResult.height;
        } catch (pdfErr) {
          console.warn('Vector PDF extraction threw an error, falling back to OCR:', pdfErr);
        }
      }

      // 2. If vector extraction returned few/no tokens (< 3 tokens, e.g. scanned print), run Tesseract OCR
      if (tokens.length < 3 && customDrawingImageUrl && !customDxfDoc) {
        source = 'TESSERACT_OCR';
        setOcrStatusMessage('Running Tesseract.js Optical Character Recognition on blueprint...');
        const ocrResult = await runTesseractOcr(customDrawingImageUrl, (pct, msg) => {
          setOcrProgress(pct);
          setOcrStatusMessage(msg);
        });
        tokens = ocrResult.tokens;
        width = ocrResult.width;
        height = ocrResult.height;
      }

      setOcrProgress(90);
      setOcrStatusMessage('Parsing engineering dimensions, tolerances & GD&T callouts...');

      // Parse detected dimensions using active Part Family Profile
      const detected = parseDetectedCadDimensions(
        tokens,
        width,
        height,
        metadata.units,
        source,
        balloons.length + 1,
        activePartFamilyProfile
      );

      setOcrSourceType(source);
      setDetectedDimensions(detected);
      setOcrProgress(100);

      if (detected.length > 0) {
        // Automatically extract title block metadata from tokens (approver, drawer, tolerance block, dwg #, rev)
        try {
          const isCartesian = source === 'VECTOR_DXF';
          const extractedTb = extractTitleBlockMetadata(tokens, isCartesian);
          setMetadata(prev => applyExtractedTitleBlock(prev, extractedTb));
        } catch (tbErr) {
          console.warn('Auto-balloon title block extraction warning:', tbErr);
        }

        // Also sync detected units if different
        if (detected[0]?.unit && detected[0].unit !== metadata.units) {
          setMetadata(prev => ({ ...prev, units: detected[0].unit }));
        }

        setIsAutoBalloonModalOpen(true);
      } else {
        alert(
          `No standard dimension callouts could be automatically detected on this sheet.\n\nTips:\n• For vector CAD PDFs: Ensure text is selectable.\n• For scanned blueprints: Check that numbers are legible.\n• You can click "Add Balloon" to manually place balloons and point arrows on any feature or note.`
        );
      }
    } catch (err: any) {
      console.error('Error in dimension detection:', err);
      alert(`Auto-Balloon error: ${err?.message || 'Failed to analyze drawing text'}`);
    } finally {
      setIsOcrAnalyzing(false);
      setOcrProgress(0);
      setOcrStatusMessage('');
    }
  };

  // Apply selected dimensions from review modal as balloons
  const handleApplyDetectedDimensions = (selectedDims: DetectedDimension[]) => {
    if (selectedDims.length === 0) return;

    // If any selected dimension is a Material note, ensure metadata.material is in sync
    const matDim = selectedDims.find(d => d.rawCallout.toUpperCase().includes('MATERIAL'));
    if (matDim) {
      const matMatch = matDim.rawCallout.match(/MATERIAL\s*[:=]\s*([A-Za-z0-9\s\-/]+)/i);
      if (matMatch && matMatch[1]) {
        setMetadata(prev => ({ ...prev, material: matMatch[1].trim() }));
      }
    }

    const newBalloons: InspectionBalloon[] = selectedDims.map((dim, idx) => {
      const balloon = convertDetectedToBalloon(dim, balloonColor);
      balloon.itemNumber = balloons.length + idx + 1;
      balloon.sheet = pdfPageNumber;
      return balloon;
    });

    setBalloons(prev => [...prev, ...newBalloons]);
    setIsAutoBalloonModalOpen(false);
    setDetectedDimensions([]);

    if (newBalloons.length > 0) {
      setSelectedBalloonId(newBalloons[0].id);
    }
  };

  // Delete Balloon (robust against item- prefix from inspection table)
  const handleDeleteBalloon = (idOrItemId: string) => {
    const targetBalloonId = idOrItemId.startsWith('item-')
      ? idOrItemId.replace(/^item-/, '')
      : idOrItemId;
    setBalloons(prev => prev.filter(b => b.id !== targetBalloonId && b.id !== idOrItemId));
    setItems(prev => prev.filter(it => it.balloonId !== targetBalloonId && it.id !== idOrItemId && it.id !== `item-${targetBalloonId}`));
    if (selectedBalloonId === targetBalloonId || selectedBalloonId === idOrItemId) {
      setSelectedBalloonId(null);
    }
  };

  // Update item from table
  const handleUpdateItem = (updated: InspectionControlPlanItem) => {
    setItems(prev => prev.map(it => (it.id === updated.id ? updated : it)));
    setBalloons(prev =>
      prev.map(b =>
        b.id === updated.balloonId
          ? {
              ...b,
              classification: updated.classification,
              nominal: updated.nominal,
              upperTol: updated.upperTol,
              lowerTol: updated.lowerTol,
              minLimit: updated.minLimit,
              maxLimit: updated.maxLimit,
            }
          : b
      )
    );
  };

  // Save changes from DimensionDetailModal
  const handleSaveDimensionModal = (
    updatedBalloon: InspectionBalloon,
    updatedItem: InspectionControlPlanItem
  ) => {
    setBalloons(prev => prev.map(b => (b.id === updatedBalloon.id ? updatedBalloon : b)));
    setItems(prev => prev.map(it => (it.id === updatedItem.id ? updatedItem : it)));
  };

  // Callback when loading a drawing directly from Supabase DB
  const handleLoadDrawingFromSupabase = (
    drawingId: string,
    loadedMeta: TitleBlockMetadata,
    loadedBalloons: InspectionBalloon[],
    loadedItems: InspectionControlPlanItem[],
    loadedApproval: ChinaApprovalRecord
  ) => {
    setCurrentDrawingId(drawingId);
    setMetadata(loadedMeta);
    setBalloons(loadedBalloons);
    if (loadedItems && loadedItems.length > 0) {
      setItems(loadedItems);
    }
    if (loadedApproval) {
      setChinaApproval(loadedApproval);
    }
    setSelectedBalloonId(null);
  };

  // Save Project as JSON
  const handleSaveProject = () => {
    const project = {
      version: '2.0',
      timestamp: new Date().toISOString(),
      metadata,
      activeStandard,
      balloons,
      items,
      chinaApproval,
    };
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    saveAs(blob, `${metadata.drawingNumber || 'QUALITY_COMPASS'}_Project.qcproject`);
  };

  // Load Project JSON
  const handleLoadProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const content = ev.target?.result as string;
        const data = JSON.parse(content);
        if (data.metadata) setMetadata(data.metadata);
        if (data.activeStandard) setActiveStandard(data.activeStandard);
        if (data.balloons) setBalloons(data.balloons);
        if (data.items) setItems(data.items);
        if (data.chinaApproval) setChinaApproval(data.chinaApproval);
        setCurrentDrawingId('drawing-loaded');
      } catch {
        alert('Invalid project JSON file format.');
      }
    };
    reader.readAsText(file);
  };

  // Inspection Tool Methods Management
  const handleOpenAddToolModal = (targetItemId?: string) => {
    setTargetToolItemId(targetItemId || null);
    setIsAddToolModalOpen(true);
  };

  const handleAddCustomTool = (newTool: InspectionMethodTool, targetItemId?: string) => {
    setCustomTools(prev => {
      const exists = prev.some(t => t.id === newTool.id || t.nameEn.toLowerCase() === newTool.nameEn.toLowerCase());
      const updated = exists ? prev.map(t => (t.id === newTool.id || t.nameEn.toLowerCase() === newTool.nameEn.toLowerCase() ? newTool : t)) : [...prev, newTool];
      try {
        localStorage.setItem('qc_custom_inspection_tools', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save custom tools to localStorage', e);
      }
      return updated;
    });

    // If a specific row triggered this, update that row's selected tool immediately
    if (targetItemId) {
      setItems(prev =>
        prev.map(it =>
          it.id === targetItemId || it.balloonId === targetItemId
            ? {
                ...it,
                selectedToolEn: newTool.nameEn,
                selectedToolZh: newTool.nameZh,
              }
            : it
        )
      );
    }
  };

  const handleDeleteCustomTool = (toolId: string) => {
    setCustomTools(prev => {
      const updated = prev.filter(t => t.id !== toolId);
      try {
        localStorage.setItem('qc_custom_inspection_tools', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save custom tools to localStorage', e);
      }
      return updated;
    });
  };

  // Export Excel Control Plan
  const handleExportExcel = async () => {
    const plan: InspectionControlPlan = {
      id: `plan-${Date.now()}`,
      drawingId: currentDrawingId,
      partNumber: metadata.drawingNumber,
      partName: metadata.partName,
      revision: metadata.revision,
      supplierFacility: chinaApproval.facilityLocation,
      preparedBy: metadata.drawnBy || 'Quality Lead',
      approvedBy: metadata.approvedBy || chinaApproval.qaManagerName,
      standardApplied: activeStandard,
      creationDate: metadata.date || new Date().toISOString().slice(0, 10),
      items,
      chinaApproval,
    };

    await exportInspectionControlPlanToExcel(plan, auditReport || undefined, customTools);
  };

  // Export PDF Stamped Drawing
  const handleExportPdf = async () => {
    if (!svgRef.current) return;
    await exportDrawingAsPdf(
      svgRef.current,
      metadata.partName || 'Drawing',
      metadata.drawingNumber || 'DWG'
    );
  };

  // Profile Template Management & Training
  const handleSaveProfile = (updatedProfile: PartFamilyProfile) => {
    savePartFamilyProfile(updatedProfile);
    const refreshed = getStoredPartFamilyProfiles();
    setAllProfiles(refreshed);
    if (activePartFamilyProfile.id === updatedProfile.id) {
      setActivePartFamilyProfile(updatedProfile);
    }
  };

  const handleResetProfiles = () => {
    const defaults = resetPartFamilyProfilesToDefault();
    setAllProfiles(defaults);
    setActivePartFamilyProfile(defaults[0] || SINGLE_PULLEY_PROFILE);
  };

  const activeBalloon = balloons.find(b => b.id === selectedBalloonId) || null;
  const activeItem = items.find(it => it.balloonId === selectedBalloonId) || null;

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      
      {/* App Navigation & Header Bar */}
      <Header
        activeViewMode={activeViewMode}
        onToggleViewMode={setActiveViewMode}
        selectedCompany={selectedCompany}
        onSelectCompany={setSelectedCompany}
        currentDrawingId={currentDrawingId}
        onSelectDrawing={handleSelectDrawing}
        activeStandard={activeStandard}
        onChangeStandard={setActiveStandard}
        activeProfile={activePartFamilyProfile}
        allProfiles={allProfiles}
        onChangeProfile={setActivePartFamilyProfile}
        onOpenTemplateManager={() => setIsTemplateManagerOpen(true)}
        auditReport={auditReport}
        onOpenAuditModal={() => setIsAuditModalOpen(true)}
        onExportExcel={handleExportExcel}
        onExportPdf={handleExportPdf}
        onSaveProject={handleSaveProject}
        onLoadProject={handleLoadProject}
        onUploadCustomDrawing={handleUploadCustomDrawing}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        language={language}
        onChangeLanguage={setLanguage}
      />

      {/* Main Workspace Area: Pillar 3 (APQP & PPAP Launch Hub) vs Pillar 2 (QMS Executive) vs Pillar 1 (CAD Drawing & FAI) */}
      {activeViewMode === 'APQP_PPAP' ? (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <ApqpPpapDashboard
            selectedCompany={selectedCompany}
            onSwitchToInspection={() => setActiveViewMode('INSPECTION')}
            availableBalloons={balloons.map((b) => ({
              itemNumber: b.itemNumber,
              dimensionName: b.dimensionName,
              nominal: b.nominal,
              upperTol: b.upperTol,
              lowerTol: b.lowerTol,
            }))}
          />
        </div>
      ) : activeViewMode === 'QMS_DASHBOARD' ? (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <QmsDashboard onSwitchToInspection={() => setActiveViewMode('INSPECTION')} />
        </div>
      ) : (
        /* Main Workspace Split View */
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* Left: Interactive CAD Drawing Canvas */}
        <div className="flex-1 flex flex-col min-h-[400px] h-full relative">
          <DrawingCanvas
            drawingId={currentDrawingId}
            metadata={metadata}
            balloons={balloons}
            selectedBalloonId={selectedBalloonId}
            hoveredBalloonId={hoveredBalloonId}
            customDrawingImageUrl={customDrawingImageUrl}
            isLoadingDrawing={isLoadingDrawing}
            isAnalyzingOcr={isOcrAnalyzing}
            ocrProgress={ocrProgress}
            ocrStatusMessage={ocrStatusMessage}
            pdfPageNumber={pdfPageNumber}
            pdfTotalPages={pdfTotalPages}
            onChangePdfPage={handleChangePdfPage}
            onUploadFile={handleUploadCustomDrawing}
            onEditBalloon={(id) => {
              setSelectedBalloonId(id);
              setIsEditModalOpen(true);
            }}
            onSelectBalloon={(id) => setSelectedBalloonId(id)}
            onHoverBalloon={setHoveredBalloonId}
            onUpdateBalloonPosition={handleUpdateBalloonPosition}
            onUpdateLeaderTarget={handleUpdateLeaderTarget}
            onToggleLeaderArrow={handleToggleLeaderArrow}
            onAddBalloonWithTarget={handleAddBalloonWithTarget}
            onDeleteBalloon={handleDeleteBalloon}
            onRenumberBalloons={handleRenumberBalloons}
            onAutoDetectDimensions={handleAutoDetectDimensions}
            svgRef={svgRef}
            balloonColor={balloonColor}
            balloonSize={balloonSize}
          />
        </div>

        {/* Right: Inspection Control Plan Table & Approval */}
        <div className="w-full lg:w-[620px] xl:w-[740px] 2xl:w-[820px] h-1/2 lg:h-full flex flex-col shadow-2xl z-10">
          <InspectionTable
            items={items}
            selectedItemId={selectedBalloonId}
            hoveredItemId={hoveredBalloonId}
            onSelectItem={(id) => {
              setSelectedBalloonId(id);
              if (id) setIsEditModalOpen(true);
            }}
            onHoverItem={setHoveredBalloonId}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteBalloon}
            onAddNewItem={() => handleAddBalloonWithTarget(520, 260, 480, 300)}
            onOpenChinaApproval={() => setIsChinaApprovalModalOpen(true)}
            onOpenAddToolModal={handleOpenAddToolModal}
            allInspectionTools={allInspectionTools}
            chinaApproval={chinaApproval}
            language={language}
          />
        </div>

      </div>
      )}

      {/* Add Custom Inspection Method & Tooling Modal */}
      <AddInspectionMethodModal
        isOpen={isAddToolModalOpen}
        onClose={() => {
          setIsAddToolModalOpen(false);
          setTargetToolItemId(null);
        }}
        onAddTool={handleAddCustomTool}
        onDeleteTool={handleDeleteCustomTool}
        existingTools={allInspectionTools}
        targetItemId={targetToolItemId}
        targetItemInfo={(() => {
          if (!targetToolItemId) return null;
          const it = items.find(i => i.id === targetToolItemId || i.balloonId === targetToolItemId);
          return it ? { itemNumber: it.itemNumber, nameEn: it.characteristicNameEn } : null;
        })()}
      />

      {/* Supabase Revisions & Database Sync Modal */}
      <SupabaseRevisionsModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        currentDrawingId={currentDrawingId}
        metadata={metadata}
        balloons={balloons}
        items={items}
        chinaApproval={chinaApproval}
        complianceScore={auditReport?.complianceScore || 100}
        auditStatus={auditReport?.overallStatus || 'PASSED'}
        onLoadDrawingData={handleLoadDrawingFromSupabase}
      />

      {/* Standards Audit Modal */}
      <StandardsAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        auditReport={auditReport}
        onProceedToBallooning={() => setIsAuditModalOpen(false)}
        isUnlocked={isAuditUnlocked}
        onToggleUnlock={() => setIsAuditUnlocked(!isAuditUnlocked)}
        language={language}
        metadata={metadata}
        onUpdateMetadata={(updates) => setMetadata(prev => ({ ...prev, ...updates }))}
      />

      {/* China QC Team Approval Modal */}
      <ChinaApprovalModal
        isOpen={isChinaApprovalModalOpen}
        onClose={() => setIsChinaApprovalModalOpen(false)}
        approvalRecord={chinaApproval}
        onSaveApproval={setChinaApproval}
        language={language}
      />

      {/* Dimension Detail & Tolerance Editor Modal */}
      <DimensionDetailModal
        balloon={activeBalloon}
        item={activeItem}
        isOpen={isEditModalOpen && !!activeBalloon && !!activeItem}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveDimensionModal}
        onDelete={handleDeleteBalloon}
      />

      {/* Auto-Balloon OCR & Vector Recognition Review Modal */}
      <AutoBalloonReviewModal
        isOpen={isAutoBalloonModalOpen}
        onClose={() => setIsAutoBalloonModalOpen(false)}
        detectedDimensions={detectedDimensions}
        onApplyBalloons={handleApplyDetectedDimensions}
        sourceType={ocrSourceType}
        pageNumber={pdfPageNumber}
        totalPages={pdfTotalPages}
        activeProfile={activePartFamilyProfile}
        allProfiles={allProfiles}
        onProfileChange={setActivePartFamilyProfile}
      />

      {/* Dynamic Part Family & Feature Recognition Template Manager */}
      <TemplateManagerModal
        isOpen={isTemplateManagerOpen}
        onClose={() => setIsTemplateManagerOpen(false)}
        profiles={allProfiles}
        activeProfileId={activePartFamilyProfile.id}
        onSelectProfile={(p) => setActivePartFamilyProfile(p)}
        onSaveProfile={handleSaveProfile}
        onResetDefaults={handleResetProfiles}
      />

    </div>
  );
}

export default App;
