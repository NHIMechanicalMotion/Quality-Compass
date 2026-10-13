// ============================================================================
// Quality Compass // Roster Import & Provisioning Types
// Path: src/types/rosterImport.ts
// ============================================================================

import type { OperatingCompanyScope } from './training';

export interface ParsedRosterRow {
  rowNumber: number;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  jobTitle?: string;
  operatingCompany: OperatingCompanyScope;
  department: string;
  shift: string;
  hireDate: string;
  tempPin: string;
  action: 'CREATE' | 'UPDATE' | 'INVALID';
  status: 'VALID' | 'WARNING' | 'ERROR';
  validationErrors: string[];
  existingPersonId?: string;
}

export interface RosterValidationSummary {
  totalRows: number;
  validCount: number;
  newHireCount: number;
  updateCount: number;
  errorCount: number;
  rows: ParsedRosterRow[];
}

export interface HandoutRecord {
  employeeNumber: string;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  operatingCompany: string;
  department: string;
  shift: string;
  action: 'INSERTED' | 'UPDATED' | 'FAILED';
  tempPin?: string;
  errorMessage?: string;
}

export interface RosterImportExecutionResult {
  success: boolean;
  totalProcessed: number;
  createdCount: number;
  updatedCount: number;
  failedCount: number;
  handoutRecords: HandoutRecord[];
  errorMessage?: string;
}
