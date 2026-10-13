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
];
