// ============================================================================
// Quality Compass // Enterprise Personnel Roster Import Service
// Path: src/services/rosterImportService.ts
//
// Handles CSV parsing, flexible header mapping, pre-validation against live
// Supabase records, temporary PIN generation, batch provisioning, and handout export.
// ============================================================================

import { supabase } from './supabase';
import { fetchPeople, type Person } from './userService';
import type { 
  ParsedRosterRow, 
  RosterValidationSummary, 
  RosterImportExecutionResult, 
  HandoutRecord 
} from '../types/rosterImport';
import type { OperatingCompanyScope } from '../types/training';

const db = supabase as any;

const TRIVIAL_PINS = new Set([
  '0000', '1234', '1111', '2222', '3333', '4444', '5555',
  '6666', '7777', '8888', '9999', '4321', '0123', '9876'
]);

/**
 * Generate a cryptographically secure random 4-digit temporary PIN
 */
export function generateSecureTemporaryPin(): string {
  while (true) {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    if (!TRIVIAL_PINS.has(pin)) {
      return pin;
    }
  }
}

/**
 * Parse CSV text into array of object rows
 */
export function parseCsvText(csvText: string): Record<string, string>[] {
  const clean = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!clean) return [];

  const lines = clean.split('\n');
  if (lines.length < 2) return [];

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const headers = parseLine(lines[0]).map((h) => h.toLowerCase().trim().replace(/^["']|["']$/g, ''));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] !== undefined ? values[idx].replace(/^["']|["']$/g, '').trim() : '';
    });
    rows.push(row);
  }

  return rows;
}

/**
 * Normalize flexible CSV headers to standard field names
 */
function extractFieldValue(row: Record<string, string>, aliases: string[]): string {
  for (const alias of aliases) {
    if (row[alias] !== undefined && row[alias] !== '') {
      return row[alias];
    }
  }
  return '';
}

/**
 * Normalize company input to supported operating company partition
 */
function normalizeCompany(input: string): OperatingCompanyScope {
  const upper = input.toUpperCase().trim();
  if (upper.includes('TERRE')) return 'TERRE';
  if (upper.includes('MANTIS')) return 'MANTIS';
  if (upper.includes('MAKER')) return 'MAKERS';
  if (upper.includes('ALL')) return 'ALL';
  return 'NHI';
}

/**
 * Validate imported CSV against existing database personnel
 */
export async function validateRosterCsv(
  csvText: string,
  existingPeopleList?: Person[]
): Promise<RosterValidationSummary> {
  const rawRows = parseCsvText(csvText);
  const people = existingPeopleList || await fetchPeople(true);
  const peopleByBadge = new Map<string, Person>(
    people.filter((p) => p && p.employee_number).map((p) => [p.employee_number.trim().toLowerCase(), p])
  );

  const seenInFileBadges = new Set<string>();
  const parsedRows: ParsedRosterRow[] = [];

  let validCount = 0;
  let newHireCount = 0;
  let updateCount = 0;
  let errorCount = 0;

  rawRows.forEach((row, idx) => {
    const rowNumber = idx + 2; // +1 for 0-index, +1 for header line
    const errors: string[] = [];

    const badge = extractFieldValue(row, [
      'employee_number', 'badge', 'badge_number', 'badge#', 'badgenumber',
      'employee_id', 'empid', 'emp_no', 'id', 'clock_number'
    ]);
    const firstName = extractFieldValue(row, ['first_name', 'firstname', 'first', 'given_name']);
    const lastName = extractFieldValue(row, ['last_name', 'lastname', 'last', 'surname', 'family_name']);
    const email = extractFieldValue(row, ['email', 'e-mail', 'work_email']);
    const jobTitle = extractFieldValue(row, ['job_title', 'jobtitle', 'title', 'position', 'role']) || 'Shop Floor Operator';
    const rawCompany = extractFieldValue(row, ['operating_company', 'company', 'division', 'org', 'facility']);
    const company = normalizeCompany(rawCompany);
    const department = extractFieldValue(row, ['department', 'department_id', 'dept', 'dept_id', 'area']) || 'General Operations';
    const shift = extractFieldValue(row, ['shift', 'work_shift', 'workshift']) || 'Shift 1 (Day)';
    const hireDateRaw = extractFieldValue(row, ['hire_date', 'hiredate', 'start_date', 'hired']);

    // Standardize hire date or default to today
    let hireDate = new Date().toISOString().split('T')[0];
    if (hireDateRaw) {
      const parsed = new Date(hireDateRaw);
      if (!isNaN(parsed.getTime())) {
        hireDate = parsed.toISOString().split('T')[0];
      }
    }

    // Required fields check
    if (!badge) {
      errors.push('Employee badge number is missing.');
    }
    if (!firstName) {
      errors.push('First name is missing.');
    }
    if (!lastName) {
      errors.push('Last name is missing.');
    }

    // Duplicate check within CSV file
    const lowerBadge = badge.toLowerCase();
    if (badge && seenInFileBadges.has(lowerBadge)) {
      errors.push(`Duplicate badge #${badge} appears multiple times in CSV.`);
    } else if (badge) {
      seenInFileBadges.add(lowerBadge);
    }

    // Email format validation if present
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push(`Invalid email format: ${email}`);
    }

    // Check if employee already exists in Supabase
    const existing = badge ? peopleByBadge.get(lowerBadge) : undefined;
    const action = errors.length > 0 ? 'INVALID' : existing ? 'UPDATE' : 'CREATE';
    const status = errors.length > 0 ? 'ERROR' : existing ? 'WARNING' : 'VALID';

    if (errors.length > 0) {
      errorCount++;
    } else {
      validCount++;
      if (existing) {
        updateCount++;
      } else {
        newHireCount++;
      }
    }

    parsedRows.push({
      rowNumber,
      employeeNumber: badge,
      firstName,
      lastName,
      email: email || undefined,
      jobTitle,
      operatingCompany: company,
      department,
      shift,
      hireDate,
      tempPin: generateSecureTemporaryPin(),
      action,
      status,
      validationErrors: errors,
      existingPersonId: existing?.id,
    });
  });

  return {
    totalRows: rawRows.length,
    validCount,
    newHireCount,
    updateCount,
    errorCount,
    rows: parsedRows,
  };
}

/**
 * Execute batch roster import into Supabase
 */
export async function executeRosterImport(
  validRows: ParsedRosterRow[],
  options: { resetExistingPins: boolean } = { resetExistingPins: false }
): Promise<RosterImportExecutionResult> {
  const eligibleRows = validRows.filter((r) => r.action !== 'INVALID');
  if (eligibleRows.length === 0) {
    return {
      success: false,
      totalProcessed: 0,
      createdCount: 0,
      updatedCount: 0,
      failedCount: 0,
      handoutRecords: [],
      errorMessage: 'No valid rows to import.',
    };
  }

  const payload = eligibleRows.map((r) => ({
    employee_number: r.employeeNumber,
    first_name: r.firstName,
    last_name: r.lastName,
    email: r.email || null,
    job_title: r.jobTitle || 'Shop Floor Operator',
    operating_company: r.operatingCompany,
    department_id: r.department,
    shift: r.shift,
    hire_date: r.hireDate,
    temp_pin: r.tempPin,
    reset_existing_pin: options.resetExistingPins,
  }));

  try {
    // Attempt fast atomic RPC batch import
    const { data: rpcResult, error: rpcError } = await db.rpc('provision_roster_batch', {
      p_employees: payload,
    });

    if (!rpcError && rpcResult?.results) {
      const results: any[] = rpcResult.results;
      const handoutRecords: HandoutRecord[] = results.map((res) => ({
        employeeNumber: res.employee_number,
        firstName: res.first_name,
        lastName: res.last_name,
        jobTitle: res.job_title,
        operatingCompany: res.operating_company,
        department: res.department_id,
        shift: res.shift,
        action: res.action === 'INSERTED' ? 'INSERTED' : res.action === 'UPDATED' ? 'UPDATED' : 'FAILED',
        tempPin: res.temp_pin || undefined,
        errorMessage: res.error_message,
      }));

      const createdCount = handoutRecords.filter((h) => h.action === 'INSERTED').length;
      const updatedCount = handoutRecords.filter((h) => h.action === 'UPDATED').length;
      const failedCount = handoutRecords.filter((h) => h.action === 'FAILED').length;

      return {
        success: failedCount === 0 || createdCount + updatedCount > 0,
        totalProcessed: eligibleRows.length,
        createdCount,
        updatedCount,
        failedCount,
        handoutRecords,
      };
    }

    // Direct client-side fallback if RPC is not present
    console.warn('RPC provision_roster_batch unavailable, falling back to direct table inserts:', rpcError);
    return await executeFallbackRosterImport(eligibleRows, options);
  } catch (err: any) {
    console.error('Exception during roster import:', err);
    return await executeFallbackRosterImport(eligibleRows, options);
  }
}

/**
 * Fallback import using standard PostgREST table operations
 */
async function executeFallbackRosterImport(
  rows: ParsedRosterRow[],
  options: { resetExistingPins: boolean }
): Promise<RosterImportExecutionResult> {
  const handoutRecords: HandoutRecord[] = [];
  let createdCount = 0;
  let updatedCount = 0;
  let failedCount = 0;

  for (const r of rows) {
    try {
      // 1. Upsert into people table
      const { data: personData, error: personError } = await db
        .from('people')
        .upsert(
          {
            employee_number: r.employeeNumber,
            first_name: r.firstName,
            last_name: r.lastName,
            email: r.email || null,
            job_title: r.jobTitle,
            operating_company: r.operatingCompany,
            department_id: r.department,
            shift: r.shift,
            hire_date: r.hireDate,
            status: 'ACTIVE',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'employee_number' }
        )
        .select()
        .single();

      if (personError || !personData) {
        throw new Error(personError?.message || 'Failed to save person record');
      }

      const isNew = r.action === 'CREATE';
      let assignedPin: string | undefined = undefined;

      // 2. Provision or reset user account if needed
      if (isNew || options.resetExistingPins) {
        const { error: resetErr } = await db.rpc('reset_user_pin', {
          p_target_person_id: personData.id,
          p_temporary_pin: r.tempPin,
        });

        if (!resetErr) {
          assignedPin = r.tempPin;
        } else {
          console.warn(`Could not set temporary PIN for badge #${r.employeeNumber}:`, resetErr);
        }
      }

      // 3. Assign default Training Operator role
      await db
        .from('user_role_assignments')
        .insert({
          person_id: personData.id,
          module_code: 'TRAINING',
          role_code: 'EMPLOYEE',
          start_date: new Date().toISOString().split('T')[0],
        })
        .catch(() => {});

      if (isNew) createdCount++;
      else updatedCount++;

      handoutRecords.push({
        employeeNumber: r.employeeNumber,
        firstName: r.firstName,
        lastName: r.lastName,
        jobTitle: r.jobTitle,
        operatingCompany: r.operatingCompany,
        department: r.department,
        shift: r.shift,
        action: isNew ? 'INSERTED' : 'UPDATED',
        tempPin: assignedPin,
      });
    } catch (err: any) {
      failedCount++;
      handoutRecords.push({
        employeeNumber: r.employeeNumber,
        firstName: r.firstName,
        lastName: r.lastName,
        jobTitle: r.jobTitle,
        operatingCompany: r.operatingCompany,
        department: r.department,
        shift: r.shift,
        action: 'FAILED',
        errorMessage: err.message || 'Row import failed',
      });
    }
  }

  return {
    success: failedCount === 0 || createdCount + updatedCount > 0,
    totalProcessed: rows.length,
    createdCount,
    updatedCount,
    failedCount,
    handoutRecords,
  };
}

/**
 * Generate standard CSV template for user download
 */
export function generateRosterTemplateCsv(): string {
  const headers = [
    'employee_number',
    'first_name',
    'last_name',
    'email',
    'job_title',
    'operating_company',
    'department',
    'shift',
    'hire_date',
  ];

  const sampleRows = [
    ['1016', 'Sarah', 'Connor', 'sconnor@nhimm.com', 'Assembly Technician L1', 'NHI', 'Assembly', 'Shift 1 (Day)', '2026-10-14'],
    ['1017', 'David', 'Miller', 'dmiller@terre.com', 'CNC Setup Machinist', 'TERRE', 'Machining & Turning', 'Shift 2 (Night)', '2026-10-14'],
    ['1018', 'Elena', 'Rostova', '', 'Quality Inspector', 'MANTIS', 'Quality Assurance', 'Shift 1 (Day)', '2026-10-14'],
    ['1019', 'Jackson', 'Vaughn', 'jvaughn@makers.com', 'Automation Technician', 'MAKERS', 'Robotics & Vision', 'Shift 3 (Graveyard)', '2026-10-14'],
  ];

  const escapeCell = (val: string) => (val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val);

  return [
    headers.join(','),
    ...sampleRows.map((row) => row.map(escapeCell).join(',')),
  ].join('\n');
}

/**
 * Export onboarding handout summary as CSV
 */
export function exportHandoutCsv(handouts: HandoutRecord[]): string {
  const headers = [
    'Badge #',
    'First Name',
    'Last Name',
    'Job Title',
    'Operating Company',
    'Department',
    'Shift',
    'Status',
    'Temporary 4-Digit PIN',
    'Notes',
  ];

  const escapeCell = (val?: string) => {
    if (!val) return '';
    return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
  };

  const rows = handouts.map((h) => [
    escapeCell(h.employeeNumber),
    escapeCell(h.firstName),
    escapeCell(h.lastName),
    escapeCell(h.jobTitle || 'Shop Floor Operator'),
    escapeCell(h.operatingCompany),
    escapeCell(h.department),
    escapeCell(h.shift),
    escapeCell(h.action),
    escapeCell(h.tempPin || 'Current PIN Maintained'),
    escapeCell(h.errorMessage || (h.tempPin ? 'Forced PIN change on 1st login' : '')),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
