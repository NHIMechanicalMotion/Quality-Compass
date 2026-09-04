import type { CharacteristicClassification, DimensionType } from './balloon';

export interface InspectionMethodTool {
  id: string;
  code: string;
  nameEn: string;
  nameZh: string;
  category: 'DIMENSIONAL' | 'ATTRIBUTE' | 'GEOMETRIC' | 'SURFACE' | 'MECHANICAL' | 'OPTICAL' | 'NON_DESTRUCTIVE' | 'CUSTOM';
  accuracyRange: string;
  isCustom?: boolean;
}

export type ConformanceStatus = 'PASS' | 'FAIL' | 'PENDING';

export type ChinaApprovalDecision = 
  | 'APPROVED'   // 批准 - In full conformance
  | 'CONCESSION' // 特采 / 让步接收 - Deviation approved by MRB / Quality Engineering
  | 'REJECTED'   // 拒收 - Non-conforming, reworked or scrapped
  | 'PENDING';   // 待审核

export interface SampleMeasurement {
  sample1?: number;
  sample2?: number;
  sample3?: number;
  sample4?: number;
  sample5?: number;
}

export interface InspectionControlPlanItem {
  id: string;
  itemNumber: number; // Balloon #
  balloonId: string;
  
  // Characteristic Information
  characteristicNameEn: string;
  characteristicNameZh: string;
  dimensionType: DimensionType;
  classification: CharacteristicClassification;
  drawingZone: string;
  
  // Specification
  nominal: number;
  lowerTol: number;
  upperTol: number;
  minLimit: number;
  maxLimit: number;
  unit: 'mm' | 'inch';
  rawCallout: string;
  
  // Inspection Method (Tooling)
  recommendedToolId: string;
  recommendedToolEn: string;
  recommendedToolZh: string;
  selectedToolEn: string;
  selectedToolZh: string;
  
  // Quality Sampling & Frequency
  samplingPlanEn: string;
  samplingPlanZh: string;
  
  // Actual Inspection Measurements (Sample 1 to 5)
  measurements: SampleMeasurement;
  
  // Computed evaluation
  status: ConformanceStatus;
  deviationNotes?: string;
}

export interface ChinaApprovalRecord {
  inspectorName: string;
  inspectorNameZh: string;
  inspectionDate: string;
  facilityLocation: string;
  qaManagerName: string;
  approvalDate: string;
  decision: ChinaApprovalDecision;
  decisionNotes: string;
  correctiveActionRequired: boolean;
  correctiveActionDetails?: string;
}

export interface InspectionControlPlan {
  id: string;
  drawingId: string;
  partNumber: string;
  partName: string;
  revision: string;
  supplierFacility: string;
  preparedBy: string;
  approvedBy: string;
  standardApplied: string;
  creationDate: string;
  items: InspectionControlPlanItem[];
  chinaApproval: ChinaApprovalRecord;
}
