import type { TitleBlockMetadata, StandardType } from '../types/cad';
import type { InspectionBalloon } from '../types/balloon';

export interface SampleDrawing {
  id: string;
  title: string;
  titleZh: string;
  description: string;
  recommendedStandard: StandardType;
  metadata: TitleBlockMetadata;
  dimensions: InspectionBalloon[];
}

export const SAMPLE_FLANGE_DIMENSIONS: InspectionBalloon[] = [];
export const SAMPLE_SHAFT_DIMENSIONS: InspectionBalloon[] = [];
export const SAMPLE_BRACKET_DIMENSIONS: InspectionBalloon[] = [];

export const PRELOADED_DRAWINGS: SampleDrawing[] = [
  {
    id: 'drawing-blank',
    title: 'Blank Blueprint / Clean Inspection Canvas',
    titleZh: '空白工程图 / 新建检验画布',
    description: 'Fresh inspection workspace with zero pre-placed balloons. Ready for blueprint import, manual ballooning, or vector OCR.',
    recommendedStandard: 'ASME_Y14_5',
    metadata: {
      drawingNumber: 'DWG-NEW-001',
      partName: 'New Inspection Part',
      revision: 'Rev A',
      organization: 'NHI Mechanical Motion LLC',
      drawnBy: '',
      checkedBy: '',
      approvedBy: '',
      date: new Date().toISOString().slice(0, 10),
      sheet: '1 OF 1',
      scale: '1:1',
      material: 'Steel',
      finish: 'As Machined',
      units: 'mm',
      projection: 'THIRD_ANGLE',
      generalToleranceNote: 'STANDARD GENERAL TOLERANCES APPLY',
    },
    dimensions: [],
  },
  {
    id: 'drawing-flange',
    title: 'Precision CNC Adapter Flange (ASME Y14.5 Compliant)',
    titleZh: '高精数控转接法兰 (符合 ASME Y14.5 美标)',
    description: 'Complete production drawing with GD&T datums, 3rd angle projection icon, general tolerances, and finish callouts.',
    recommendedStandard: 'ASME_Y14_5',
    metadata: {
      drawingNumber: 'QC-ENG-2026-F10',
      partName: 'PRECISION ADAPTER FLANGE',
      revision: 'B',
      organization: 'NHI Mechanical Motion LLC',
      drawnBy: '',
      checkedBy: '',
      approvedBy: '',
      date: '2026-08-20',
      sheet: '1 OF 1',
      scale: '1:1',
      material: 'ALUMINUM 6061-T6 (AMS 4027)',
      finish: 'CLEAR ANODIZE MIL-A-8625 TYPE II CL 1',
      units: 'mm',
      projection: 'THIRD_ANGLE',
      generalToleranceNote: 'UNLESS OTHERWISE SPECIFIED: DIMENSIONS IN MM. .X ±0.1, .XX ±0.05, ANGLES ±0.5°',
    },
    dimensions: [],
  },
  {
    id: 'drawing-shaft',
    title: 'CNC Precision Stepped Drive Shaft',
    titleZh: 'CNC 阶梯传动轴 (带公制螺纹与轴承位)',
    description: 'Precision turned shaft with metric thread M24x1.5, tight bearing journal tolerances (8µm), and keyway.',
    recommendedStandard: 'ASME_Y14_5',
    metadata: {
      drawingNumber: 'QC-SFT-8820-T2',
      partName: 'CNC DRIVE SHAFT',
      revision: 'A',
      organization: 'NHI Mechanical Motion LLC',
      drawnBy: '',
      checkedBy: '',
      approvedBy: '',
      date: '2026-08-15',
      sheet: '1 OF 1',
      scale: '1:2',
      material: 'AISI 4140 ALLOY STEEL (Q&T 28-32 HRC)',
      finish: 'BLACK OXIDE MIL-DTL-13924 CLASS 1',
      units: 'mm',
      projection: 'THIRD_ANGLE',
      generalToleranceNote: 'UNLESS NOTED: .X ±0.15, .XX ±0.05, CHAMFERS ±0.2, ANGLES ±0.5°',
    },
    dimensions: [],
  },
  {
    id: 'drawing-bracket',
    title: 'Sheet Metal Chassis Bracket (ISO 2768-m)',
    titleZh: '钣金底盘固定支架 (ISO 2768-m 欧标公制)',
    description: 'Formed sheet metal bracket according to European ISO standards with bend radii and punch hole patterns.',
    recommendedStandard: 'ISO_1101',
    metadata: {
      drawingNumber: 'QC-BKT-5041-M1',
      partName: 'CHASSIS MOUNTING BRACKET',
      revision: 'C',
      organization: 'NHI Mechanical Motion LLC',
      drawnBy: '',
      checkedBy: '',
      approvedBy: '',
      date: '2026-07-28',
      sheet: '1 OF 1',
      scale: '1:1',
      material: 'STAINLESS STEEL 304 2B (2.0 MM)',
      finish: 'DEBURRED & PASSIVATED ASTM A967',
      units: 'mm',
      projection: 'FIRST_ANGLE',
      generalToleranceNote: 'GENERAL TOLERANCES ACCORDING TO ISO 2768-mK',
    },
    dimensions: [],
  },
];
