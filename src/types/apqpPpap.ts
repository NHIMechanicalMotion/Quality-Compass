import type { OperatingCompanyId } from '../data/operatingCompanies';
export type { OperatingCompanyId };

export type ApqpPhaseNumber = 1 | 2 | 3 | 4 | 5;

export type GateStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'APPROVED' | 'BLOCKED' | 'PENDING';

export type ChecklistStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | 'NOT_APPLICABLE';

export type WorkflowMode = 'ENFORCED' | 'FLEXIBLE';

export type ApqpTab =
  | 'ROADMAP'
  | 'CHECKLIST'
  | 'ELEMENTS_18'
  | 'PSW_WARRANT'
  | 'PROCESS_FLOW'
  | 'CONTROL_PLAN'
  | 'DIMENSIONAL'
  | 'PFMEA'
  | 'CAPACITY_ANALYSIS'
  | 'DOCUMENTS';

export interface ApqpChecklistItem {
  id: string;
  item_no: string;
  phase: ApqpPhaseNumber;
  section: string;
  title: string;
  description: string;
  aiag_ref: string;
  is_gate_prerequisite: boolean;
  status: ChecklistStatus;
  assigned_to: string;
  target_date: string;
  completion_date: string | null;
  verified_by: string | null;
  notes: string;
  linked_tab?: ApqpTab;
}

export interface PhaseGateDetail {
  name: string;
  status: GateStatus;
  completion_pct: number;
  sign_off_date: string | null;
  approved_by: string;
  deliverables?: {
    id: string;
    title: string;
    completed: boolean;
    assigned_to?: string;
  }[];
}

export interface ApqpProject {
  id: string;
  project_code: string;
  project_name: string;
  customer_name: string;
  customer_contact?: string;
  part_number: string;
  part_revision: string;
  program_name?: string;
  target_sop_date?: string;
  target_ppap_date?: string;
  current_phase: ApqpPhaseNumber;
  workflow_mode?: WorkflowMode;
  phase_gates: {
    phase1?: PhaseGateDetail;
    phase2?: PhaseGateDetail;
    phase3?: PhaseGateDetail;
    phase4?: PhaseGateDetail;
    phase5?: PhaseGateDetail;
    [key: string]: PhaseGateDetail | undefined;
  };
  checklist_data?: ApqpChecklistItem[];
  lead_engineer: string;
  operating_company?: OperatingCompanyId;
  status: 'ACTIVE' | 'GATE_REVIEW' | 'ON_HOLD' | 'COMPLETED';
  created_at?: string;
  updated_at?: string;
}

export type PpapLevel = 1 | 2 | 3 | 4 | 5;

export type PpapSubmissionReason =
  | 'INITIAL_SUBMISSION'
  | 'ENGINEERING_CHANGE'
  | 'TOOLING_TRANSFER'
  | 'PROCESS_CHANGE'
  | 'CORRECTION_DISCREPANCY'
  | 'OTHER';

export type PpapStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'INTERIM_APPROVED'
  | 'APPROVED'
  | 'REJECTED';

export type ElementDisposition =
  | 'INCLUDED'
  | 'NOT_APPLICABLE'
  | 'RETAINED_AT_SUPPLIER'
  | 'PENDING';

export interface PpapElementItem {
  name: string;
  status: ElementDisposition;
  comments: string;
  file_url?: string;
}

export interface PswFormData {
  part_name: string;
  cust_part_number: string;
  supplier_name: string;
  supplier_phone: string;
  supplier_email: string;
  authorized_rep: string;
  rep_title: string;
  submission_date: string;
  materials_reporting: boolean;
  polymeric_parts_identified: boolean;
  meets_all_specs: boolean;
  process_meets_capability: boolean;
  customer_disposition: 'APPROVED' | 'INTERIM_APPROVED' | 'REJECTED' | 'PENDING';
  customer_reviewer?: string;
  customer_comments?: string;
  customer_signature_date?: string;
}

export type ProcessStepType = 'OPERATION' | 'INSPECTION' | 'TRANSPORT' | 'STORAGE' | 'DELAY';

export interface ProcessFlowItem {
  id?: string;
  op_no: number;
  operation_name: string;
  step_type: ProcessStepType;
  work_center: string;
  key_product_char: string;
  key_process_char: string;
  control_method: string;
}

export interface ControlPlanRow {
  id?: string;
  op_no: number;
  process_step: string;
  machine: string;
  char_desc: string;
  class_symbol: 'NONE' | 'CRITICAL' | 'DIAMOND' | 'MAJOR';
  spec: string;
  eval_technique: string;
  sample_size: string;
  sample_freq: string;
  control_method: string;
  reaction_plan: string;
}

export interface DimensionalResultRow {
  balloon_no: string;
  feature_desc: string;
  nominal: number;
  upper_tol: number;
  lower_tol: number;
  min_limit: number;
  max_limit: number;
  gage_tool: string;
  sample_1: number;
  sample_2: number;
  sample_3: number;
  sample_4: number;
  sample_5: number;
  status: 'PASS' | 'FAIL' | 'PENDING';
}

export interface FmeaRow {
  process_step: string;
  failure_mode: string;
  failure_effect: string;
  severity: number;
  cause: string;
  occurrence: number;
  prev_controls: string;
  det_controls: string;
  detection: number;
  rpn?: number;
  action_priority: 'HIGH' | 'MEDIUM' | 'LOW';
  actions_taken: string;
}

export interface CapacityDailyLog {
  day_no: number;
  date: string;
  workers: number;
  hours_worked: number;
  downtime_hours: number;
  overtime_hours: number;
  units_produced: number;
  scrap_units: number;
}

export interface CapacityAnalysisData {
  constraint_type: 'MACHINE' | 'LABOR';
  constraint_description: string;
  num_constraints: number;
  shifts_per_day: number;
  hours_per_shift: number;
  daily_demand: number;
  days_in_sample: number;
  daily_logs: CapacityDailyLog[];
  additional_business_units?: number;
}

export interface PpapSubmission {
  id: string;
  project_id: string;
  submission_number: string;
  part_name: string;
  part_number: string;
  drawing_number: string;
  drawing_revision: string;
  engineering_change_level: string;
  supplier_name: string;
  supplier_code: string;
  facility_address: string;
  customer_name: string;
  operating_company?: OperatingCompanyId;
  customer_division?: string;
  application?: string;
  submission_level: PpapLevel;
  submission_reason: PpapSubmissionReason;
  reason_other_description?: string;
  imds_number?: string;
  weight_kg?: number;
  status: PpapStatus;
  psw_data: PswFormData;
  elements_status: Record<string, PpapElementItem>;
  process_flow_data?: ProcessFlowItem[];
  control_plan_data: ControlPlanRow[];
  dimensional_results: DimensionalResultRow[];
  fmea_items: FmeaRow[];
  capacity_data?: CapacityAnalysisData;
  created_at?: string;
  updated_at?: string;
}

export interface PpapDocumentAttachment {
  id: string;
  ppap_id: string;
  project_id?: string;
  title: string;
  doc_type: 'PSW_WARRANT' | 'DIMENSIONAL_REPORT' | 'CONTROL_PLAN' | 'PFMEA' | 'FULL_PACKAGE_PDF' | 'OTHER';
  file_url?: string;
  file_data?: string;
  file_size: number;
  created_at: string;
}
