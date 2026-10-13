// Phase 1: Shop-Floor Operator Training & Skills Qualification Types
// Matches Supabase Schema and ISO 9001:2015 Clause 7.2 Competency Specifications

export type OperatingCompanyScope = 'NHI' | 'TERRE' | 'MANTIS' | 'MAKERS' | 'ALL';

export type EmployeeRole = 'OPERATOR' | 'LEAD' | 'SUPERVISOR' | 'QUALITY_TECH' | 'MANAGER' | 'ADMIN';

export type SystemUserRole = 'ADMIN' | 'SUPERVISOR' | 'HR' | 'OPERATOR' | 'TRAINER';

export type RecordStatus = 'ACTIVE' | 'ARCHIVED';

export type QualificationLevel = 0 | 1 | 2 | 3 | 4;

export type TrainingStatusType = 'QUALIFIED' | 'DUE_SOON' | 'EXPIRED' | 'IN_TRAINING' | 'NOT_TRAINED';

export type TrainingCategory = 'OSHA' | 'HR' | 'QUALITY' | 'MACHINE';

export type FrequencyType = 'ONE_TIME' | 'ANNUAL' | 'BIENNIAL' | 'TRIENNIAL' | 'CUSTOM_MONTHS';

export type ResourceType = 'YOUTUBE' | 'SHAREPOINT' | 'PDF' | 'WEB';

export interface Department {
  id: string;
  code: string;
  name: string;
  operating_company: OperatingCompanyScope;
  area?: string;
  is_active: boolean;
}

export interface Employee {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  email?: string;
  department_id: string;
  supervisor_id?: string;
  role: EmployeeRole;
  shift: string;
  status: RecordStatus;
  archive_reason?: string;
  hire_date: string;
  created_at?: string;
  updated_at?: string;
  // Computed / joined helpers
  department_name?: string;
  supervisor_name?: string;
}

export interface AppUser {
  id: string;
  user_id?: string; // Auth UID
  employee_id: string;
  system_role: SystemUserRole;
  pin_hash: string;
  is_active: boolean;
  last_login_at?: string;
  employee_name?: string;
  employee_number?: string;
}

export interface Equipment {
  id: string;
  code: string;
  name: string;
  department_id: string;
  location: string;
  model?: string;
  serial_number?: string;
  status: RecordStatus;
  archive_reason?: string;
  sop_document_url?: string;
  created_at?: string;
  updated_at?: string;
  department_name?: string;
  qualified_operator_count?: number;
  trainee_count?: number;
}

export interface TrainingModule {
  id: string;
  code: string;
  title: string;
  description?: string;
  category: TrainingCategory;
  frequency_type: FrequencyType;
  custom_frequency_months?: number;
  linked_equipment_id?: string;
  passing_score?: number;
  status: RecordStatus;
  archive_reason?: string;
  created_at?: string;
  updated_at?: string;
  linked_equipment_name?: string;
  resources?: TrainingResource[];
}

export interface TrainingResource {
  id: string;
  training_id: string;
  title: string;
  resource_type: ResourceType;
  url: string;
  is_required: boolean;
  sort_order: number;
}

export interface TrainingRecord {
  id: string;
  employee_id: string;
  training_id: string;
  completion_date: string;
  expiration_date?: string;
  trainer_name: string;
  trainer_id?: string;
  result: 'PASS' | 'FAIL';
  score?: number;
  certificate_url?: string;
  notes?: string;
  recorded_by: string;
  created_at?: string;
  // Joined helpers
  employee_name?: string;
  employee_number?: string;
  training_title?: string;
  training_code?: string;
  category?: TrainingCategory;
}

export interface EquipmentQualification {
  id: string;
  employee_id: string;
  equipment_id: string;
  level: QualificationLevel;
  level_label: string;
  status: TrainingStatusType;
  certified_date: string;
  expiration_date: string;
  certified_by: string;
  evaluation_notes?: string;
  checklist_answers?: Record<string, boolean>;
  created_at?: string;
  // Joined helpers
  employee_name?: string;
  employee_number?: string;
  equipment_name?: string;
  equipment_code?: string;
}

export interface TrainingRequirement {
  id: string;
  requirement_type: 'BY_ROLE' | 'BY_EQUIPMENT';
  target_role?: EmployeeRole;
  target_equipment_id?: string;
  training_id: string;
  is_mandatory: boolean;
  grace_period_days: number;
  // Joined helpers
  training_title?: string;
  training_code?: string;
}

export interface TrainingAuditLogEntry {
  id: number;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'ARCHIVE' | 'RESTORE';
  performed_by: string;
  old_values?: any;
  new_values?: any;
  timestamp: string;
}

export interface MissingRequirementItem {
  employee: Employee;
  training: TrainingModule;
  requirement: TrainingRequirement;
  reason: string;
  daysOverdue: number;
}
