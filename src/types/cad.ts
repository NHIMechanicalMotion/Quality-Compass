export type StandardType = 'ASME_Y14_5' | 'ISO_1101' | 'AS9102' | 'AIAG_PPAP' | 'CUSTOM';

export type ProjectionType = 'THIRD_ANGLE' | 'FIRST_ANGLE' | 'UNKNOWN';

export type UnitType = 'mm' | 'inch';

export type AuditSeverity = 'pass' | 'warning' | 'critical';

export interface TitleBlockMetadata {
  drawingNumber: string;
  partName: string;
  revision: string;
  organization: string;
  drawnBy: string;
  checkedBy: string;
  approvedBy: string;
  date: string;
  sheet: string;
  scale: string;
  material: string;
  finish: string;
  units: UnitType;
  projection: ProjectionType;
  generalToleranceNote: string;
}

export interface AuditRule {
  id: string;
  category: 'TITLE_BLOCK' | 'TOLERANCES' | 'PROJECTION' | 'GD&T' | 'REVISION_CONTROL' | 'GENERAL_DRAFTING';
  title: string;
  description: string;
  standardReference: string;
  severity: AuditSeverity;
  checkFn?: (metadata: TitleBlockMetadata, dimensions: any[]) => { passed: boolean; message: string; zone?: string };
}

export interface AuditFinding {
  id: string;
  ruleId: string;
  category: string;
  title: string;
  status: AuditSeverity;
  message: string;
  standardReference: string;
  zone?: string;
  remediation?: string;
}

export interface AuditReport {
  standardApplied: StandardType;
  standardName: string;
  totalChecks: number;
  passedCount: number;
  warningCount: number;
  criticalCount: number;
  complianceScore: number; // 0-100%
  overallStatus: 'PASSED' | 'PASSED_WITH_WARNINGS' | 'FAILED_CRITICAL';
  auditedAt: string;
  auditorName: string;
  findings: AuditFinding[];
}
