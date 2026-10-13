// ============================================================================
// Quality Compass // Shared User Management & RBAC Types
// NHI Mechanical Motion LLC (NHIMM)
// ============================================================================

import type { OperatingCompanyId } from '../data/operatingCompanies';

export type PersonStatus = 'ACTIVE' | 'ARCHIVED';

export interface Person {
  id: string; // UUID
  employee_number: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  job_title?: string | null;
  operating_company: OperatingCompanyId;
  department_id: string;
  shift: string;
  hire_date: string; // YYYY-MM-DD
  supervisor_id?: string | null; // UUID
  status: PersonStatus;
  archive_reason?: string | null;
  archived_at?: string | null;
  ukg_employee_id?: string | null;
  ukg_sync_hash?: string | null;
  last_ukg_sync_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserAccount {
  id: string; // UUID
  person_id: string; // UUID
  auth_user_id?: string | null; // UUID linking to Supabase auth.users
  pin_must_change: boolean;
  failed_attempts: number;
  is_locked: boolean;
  locked_at?: string | null;
  is_active: boolean;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppModule {
  code: string; // 'DOCUMENT_CONTROL' | 'TRAINING' | 'QMS_CORE' | 'CAD_INSPECTION' | 'APQP_PPAP' | 'SYSTEM'
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ModuleRole {
  id: string; // e.g. 'DOCUMENT_CONTROL:AUTHOR'
  module_code: string;
  role_code: string;
  role_name: string;
  description?: string | null;
  created_at: string;
}

export interface UserRoleAssignment {
  id: string; // UUID
  person_id: string; // UUID
  module_code: string;
  role_code: string;
  scope_department?: string | null;
  scope_doc_type?: string | null;
  start_date: string; // YYYY-MM-DD
  end_date?: string | null; // YYYY-MM-DD
  assigned_by?: string | null; // UUID
  created_at: string;
}

export type AuditActionType = 
  | 'INSERT' 
  | 'UPDATE' 
  | 'DELETE' 
  | 'ARCHIVE' 
  | 'RESTORE' 
  | 'LOCK' 
  | 'UNLOCK' 
  | 'PIN_RESET' 
  | 'ROLE_GRANT' 
  | 'ROLE_REVOKE';

export interface UserManagementAuditEntry {
  id: number;
  table_name: string;
  record_id: string;
  action: AuditActionType;
  performed_by: string;
  old_values?: Record<string, any> | null;
  new_values?: Record<string, any> | null;
  timestamp: string;
}

/**
 * Composite view of a person with their account and active roles,
 * powering the HR / Quality admin dossier view.
 */
export interface PersonDossier extends Person {
  account?: UserAccount | null;
  roles: UserRoleAssignment[];
  supervisor_name?: string | null;
}

/**
 * Format expected by the Step 2A.c CSV Roster Importer.
 */
export interface RosterCsvRow {
  employee_number: string;
  first_name: string;
  last_name: string;
  email?: string;
  job_title?: string;
  operating_company: string;
  department: string;
  shift?: string;
  hire_date?: string;
  supervisor_employee_number?: string;
}
