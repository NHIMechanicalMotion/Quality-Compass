export type AuditType = 
  | 'INTERNAL' 
  | 'EXTERNAL_REGISTRAR' 
  | 'EXTERNAL_CUSTOMER' 
  | 'EXTERNAL_REGULATORY';

export type AuditStatus = 
  | 'SCHEDULED' 
  | 'IN_PROGRESS' 
  | 'UNDER_REVIEW' 
  | 'COMPLETED';

export type FindingSeverity = 'MAJOR' | 'MINOR' | 'OFI';
export type FindingStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'VERIFIED';

export interface QmsAuditFinding {
  id: string;
  audit_id: string;
  finding_number: string;
  severity: FindingSeverity;
  standard_clause: string;
  description: string;
  department: string;
  target_closure_date?: string | null;
  status: FindingStatus;
  root_cause?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface QmsAudit {
  id: string;
  audit_number: string;
  title: string;
  audit_type: AuditType;
  scope_standard: string;
  lead_auditor: string;
  department: string;
  start_date: string;
  end_date: string;
  status: AuditStatus;
  score?: number;
  summary_notes?: string | null;
  findings?: QmsAuditFinding[];
  created_at?: string;
  updated_at?: string;
}

export interface ManagementReviewInput {
  clause: string;
  topic: string;
  status: 'CONFORMING' | 'EXCELLENT' | 'ACTION_REQUIRED';
  notes: string;
}

export type ReviewActionPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type ReviewActionStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED';

export interface ManagementReviewAction {
  id: string;
  review_id?: string;
  action_description: string;
  owner: string;
  due_date: string;
  priority: ReviewActionPriority;
  status: ReviewActionStatus;
  completion_notes?: string | null;
  created_at?: string;
}

export interface QmsManagementReview {
  id: string;
  review_code: string;
  title: string;
  review_period: string;
  meeting_date: string;
  facilitator: string;
  attendees: string[];
  status: 'SCHEDULED' | 'CONDUCTED' | 'COMPLETED';
  inputs_evaluated: ManagementReviewInput[];
  summary_notes?: string | null;
  actions?: ManagementReviewAction[];
  created_at?: string;
  updated_at?: string;
}

export type CapaSeverity = 'CRITICAL' | 'MAJOR' | 'MODERATE' | 'LOW';
export type CapaStatus = 'OPEN' | 'IN_PROGRESS' | 'PENDING_VERIFICATION' | 'CLOSED';
export type EightDStep = 
  | 'D1_TEAM' 
  | 'D2_PROBLEM' 
  | 'D3_CONTAINMENT' 
  | 'D4_ROOT_CAUSE' 
  | 'D5_PCA' 
  | 'D6_IMPLEMENT' 
  | 'D7_PREVENT' 
  | 'D8_RECOGNITION';

export interface EightDData {
  d1_team?: string[];
  d2_problem?: string;
  d3_containment?: string;
  d4_root_cause?: string;
  d5_pca?: string;
  d6_implementation?: string;
  d7_prevention?: string;
  d8_recognition?: string;
}

export interface QmsCapa {
  id: string;
  capa_number: string;
  title: string;
  source: 'INTERNAL_AUDIT' | 'EXTERNAL_AUDIT' | 'CUSTOMER_COMPLAINT' | 'ODOO_ERP_SCRAP' | 'MANAGEMENT_REVIEW';
  severity: CapaSeverity;
  status: CapaStatus;
  current_step: EightDStep;
  owner: string;
  target_close_date: string;
  eight_d_data: EightDData;
  odoo_cost_impact: number;
  odoo_alert_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type CiCategory = 
  | 'CYCLE_TIME_REDUCTION' 
  | 'SCRAP_REDUCTION' 
  | 'ERGONOMICS' 
  | 'DIGITAL_POKAYOKE' 
  | 'TOOLING';

export type CiStatus = 
  | 'SUBMITTED' 
  | 'UNDER_REVIEW' 
  | 'APPROVED_TRIAL' 
  | 'IMPLEMENTED' 
  | 'CLOSED';

export interface ContinuousImprovement {
  id: string;
  ci_number: string;
  title: string;
  submitted_by: string;
  department: string;
  category: CiCategory;
  status: CiStatus;
  estimated_annual_savings: number;
  description: string;
  actual_savings: number;
  created_at?: string;
  updated_at?: string;
}

export type DocumentCategory = 
  | 'Quality Manual' 
  | 'SOP' 
  | 'Work Instruction' 
  | 'Inspection Procedure' 
  | 'Form/Template';

export type DocumentStatus = 
  | 'DRAFT' 
  | 'IN_REVIEW' 
  | 'APPROVED' 
  | 'OBSOLETE';

export interface QmsDocumentRevision {
  id: string;
  document_id: string;
  revision: string;
  change_summary: string;
  created_by: string;
  approved_by?: string | null;
  status: string;
  approved_at?: string | null;
  created_at?: string;
}

export interface ControlledDocument {
  id: string;
  doc_number: string;
  title: string;
  category: DocumentCategory;
  department: string;
  current_revision: string;
  status: DocumentStatus;
  owner: string;
  effective_date: string;
  next_review_date: string;
  description?: string | null;
  file_url?: string | null;
  revisions?: QmsDocumentRevision[];
  created_at?: string;
  updated_at?: string;
}

export interface OdooConfig {
  url: string;
  database: string;
  username: string;
  apiKey: string;
  autoSyncIntervalMinutes: number;
  syncShopfloorScrap: boolean;
  syncQualityAlerts: boolean;
  syncMrbLots: boolean;
}

export interface OdooQualityAlert {
  id: string;
  alert_code: string;
  product_name: string;
  lot_number: string;
  work_order: string;
  reason: string;
  stage: 'New' | 'Confirmed' | 'Action Proposed' | 'Resolved';
  cost_impact: number;
  date: string;
}

export interface OdooSyncSummary {
  scrap_ytd: number;
  scrap_target: number;
  open_quality_alerts: number;
  mrb_quarantined_lots: number;
  supplier_rma_cost: number;
  last_synced_at: string;
  connection_status: 'CONNECTED' | 'DISCONNECTED' | 'SYNCING' | 'ERROR';
  recent_alerts: OdooQualityAlert[];
}

export type QmsTab = 
  | 'OVERVIEW' 
  | 'AUDITS' 
  | 'MANAGEMENT_REVIEW' 
  | 'CAPA_CI' 
  | 'DOCUMENT_CONTROL' 
  | 'ODOO_CONFIG';
