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

export type ReviewItemStatus = 'CONFORMING' | 'EXCELLENT' | 'ACTION_REQUIRED' | 'PLANNED';

export interface ManagementReviewInput {
  id?: string;
  clause: string;
  topic: string;
  status: ReviewItemStatus;
  notes: string;
  allotted_time_minutes?: number;
  presenter?: string;
  is_custom?: boolean;
  clause_description?: string;
  linked_audit_ids?: string[];
  linked_capa_ids?: string[];
  linked_risk_ids?: string[];
}

export type ReviewActionPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type ReviewActionStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'VERIFIED_CLOSED';

export interface ManagementReviewAction {
  id: string;
  review_id?: string;
  source_clause?: string;
  source_agenda_id?: string;
  action_description: string;
  owner: string;
  department?: string;
  due_date: string;
  priority: ReviewActionPriority;
  status: ReviewActionStatus;
  completion_notes?: string | null;
  verified_by?: string | null;
  verified_at?: string | null;
  resource_required?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface QmsRiskReviewItem {
  id: string;
  risk_description: string;
  category: 'OPERATIONAL' | 'SUPPLY_CHAIN' | 'QUALITY_COMPLIANCE' | 'TOOLING_EQUIPMENT' | 'CUSTOMER_REQUIREMENT';
  severity: number; // 1 to 5
  likelihood: number; // 1 to 5
  risk_score: number; // severity * likelihood (1 - 25)
  mitigation_plan: string;
  status: 'MITIGATED' | 'OPEN' | 'MONITORING';
  owner: string;
  clause_target?: string;
  updated_at?: string;
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
  risk_reviews?: QmsRiskReviewItem[];
  executive_decision_summary?: string | null;
  next_review_date?: string | null;
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
  pdf_file_url?: string | null;
  pdf_file_name?: string | null;
  pdf_file_size_bytes?: number;
  approved_by?: string | null;
  approved_at?: string | null;
  source_vault_id?: string | null;
  source_file_name?: string | null;
  source_file_type?: string | null;
  watermark_text?: string;
  revisions?: QmsDocumentRevision[];
  created_at?: string;
  updated_at?: string;
}

export interface SourceVaultItem {
  id: string;
  document_id: string;
  doc_number: string;
  title: string;
  revision: string;
  file_name: string;
  file_type: string; // e.g., 'docx', 'xlsx', 'dwg', 'pptx'
  file_size_bytes: number;
  uploaded_by: string;
  uploaded_at: string;
  file_url?: string | null;
  is_checked_out: boolean;
  checked_out_by?: string | null;
  notes?: string;
}

export interface WorkingDocument {
  id: string;
  doc_number: string;
  title: string;
  target_revision: string;
  category: DocumentCategory;
  department: string;
  author: string;
  stage: 'DRAFT' | 'IN_REVIEW' | 'PENDING_APPROVAL';
  source_file_name?: string;
  source_file_type?: string;
  source_vault_ref?: string;
  draft_pdf_url?: string;
  change_summary: string;
  created_at: string;
  updated_at: string;
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

export interface OdooQualityPpmMetric {
  period: string;
  total_units: number;
  defective_units: number;
  ppm: number;
  target_ppm: number;
  fpy_percentage: number;
  scrap_dollars: number;
  scrap_percentage: number;
  // Operational MO scrap metrics
  mo_pieces_produced?: number;
  mo_scrap_qty?: number;
  mo_scrap_ppm?: number;
  // Finished Goods returns (Rolling 12M: Make vs Buy)
  fg_make_sold_12m?: number;
  fg_make_returned_12m?: number;
  fg_make_ppm?: number;
  fg_buy_sold_12m?: number;
  fg_buy_returned_12m?: number;
  fg_buy_ppm?: number;
  fg_total_sold_12m?: number;
  fg_total_returned_12m?: number;
  fg_total_ppm?: number;
}

export interface OdooWorkCenterQuality {
  workcenter_name: string;
  total_units: number;
  defective_units: number;
  ppm: number;
  scrap_cost: number;
  primary_defect: string;
}

export interface OdooDefectPareto {
  reason: string;
  count: number;
  cost_impact: number;
  percentage: number;
  cumulative_percentage: number;
}

export interface OdooQualityDetailRecord {
  id: string;
  alert_code: string;
  product_sku: string;
  product_name: string;
  customer_name: string;
  workcenter: string;
  lot_number: string;
  work_order: string;
  defect_type: string;
  quantity_inspected: number;
  quantity_rejected: number;
  calculated_ppm: number;
  scrap_cost: number;
  date: string;
  stage: 'New' | 'Confirmed' | 'Action Proposed' | 'Resolved';
  is_quarantined_mrb: boolean;
  notes: string;
}

export interface OdooSyncSummary {
  scrap_ytd: number;
  scrap_target: number;
  open_quality_alerts: number;
  mrb_quarantined_lots: number;
  supplier_rma_cost: number;
  last_synced_at: string;
  connection_status: 'CONNECTED' | 'DISCONNECTED' | 'SYNCING' | 'ERROR';
  overall_ppm: number;
  target_ppm: number;
  fpy_percentage: number;
  // Operational MO scrap metrics
  mo_pieces_produced?: number;
  mo_scrap_qty?: number;
  mo_scrap_ppm?: number;
  // Finished Goods returns (Rolling 12M: Make vs Buy)
  fg_make_sold_12m?: number;
  fg_make_returned_12m?: number;
  fg_make_ppm?: number;
  fg_buy_sold_12m?: number;
  fg_buy_returned_12m?: number;
  fg_buy_ppm?: number;
  fg_total_sold_12m?: number;
  fg_total_returned_12m?: number;
  fg_total_ppm?: number;
  recent_alerts: OdooQualityAlert[];
  ppm_monthly_trends: OdooQualityPpmMetric[];
  defect_pareto: OdooDefectPareto[];
  workcenter_performance: OdooWorkCenterQuality[];
  quality_records: OdooQualityDetailRecord[];
}

export type QmsTab = 
  | 'OVERVIEW' 
  | 'AUDITS' 
  | 'MANAGEMENT_REVIEW' 
  | 'CAPA_CI' 
  | 'QUALITY_METRICS'
  | 'DOCUMENT_CONTROL' 
  | 'ODOO_CONFIG';

