import { supabase } from './supabase';
import type { 
  Employee, 
  Department, 
  Equipment, 
  TrainingModule, 
  TrainingResource, 
  TrainingRecord, 
  EquipmentQualification, 
  TrainingRequirement, 
  TrainingAuditLogEntry,
  AppUser,
  FrequencyType,
  TrainingStatusType,
  MissingRequirementItem
} from '../types/training';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// Local Storage Keys for offline fallback and seamless testing
const STORAGE_PREFIX = 'qc_phase1_';
const DB = supabase as any;

// ============================================================================
// INITIAL SEED DATA (Used when Supabase tables are offline / not yet populated)
// ============================================================================

export const SEED_DEPARTMENTS: Department[] = [
  { id: 'dept-cnc', code: 'CNC', name: 'CNC Machining & Turning', operating_company: 'NHI', area: 'Building A - North Bay', is_active: true },
  { id: 'dept-stamp', code: 'STAMP', name: 'Stamping & Heavy Castings', operating_company: 'TERRE', area: 'Building B - Press Hall', is_active: true },
  { id: 'dept-conv', code: 'CONV', name: 'Conveyor & Pulleys', operating_company: 'MANTIS', area: 'Building C - Assembly Line', is_active: true },
  { id: 'dept-robot', code: 'ROBOT', name: 'Automation & Robotics', operating_company: 'MAKERS', area: 'Robotics Automation Lab', is_active: true },
  { id: 'dept-qa', code: 'QA', name: 'Quality Assurance & Metrology', operating_company: 'ALL', area: 'QA Inspection Center', is_active: true }
];

export const SEED_EMPLOYEES: Employee[] = [
  { id: 'emp-1015', employee_number: '1015', first_name: 'Marcus', last_name: 'Vance', email: 'm.vance@nhimm.com', department_id: 'dept-cnc', role: 'OPERATOR', shift: 'Shift 1 (Day)', status: 'ACTIVE', hire_date: '2022-03-15' },
  { id: 'emp-1022', employee_number: '1022', first_name: 'Sarah', last_name: 'Jenkins', email: 's.jenkins@nhimm.com', department_id: 'dept-cnc', role: 'OPERATOR', shift: 'Shift 1 (Day)', status: 'ACTIVE', hire_date: '2023-06-01' },
  { id: 'emp-1034', employee_number: '1034', first_name: 'David', last_name: 'Chen', email: 'd.chen@nhimm.com', department_id: 'dept-stamp', role: 'LEAD', shift: 'Shift 2 (Night)', status: 'ACTIVE', hire_date: '2020-01-10' },
  { id: 'emp-1041', employee_number: '1041', first_name: 'Elena', last_name: 'Rostova', email: 'e.rostova@nhimm.com', department_id: 'dept-robot', role: 'OPERATOR', shift: 'Shift 1 (Day)', status: 'ACTIVE', hire_date: '2024-02-18' },
  { id: 'emp-1055', employee_number: '1055', first_name: 'Tom', last_name: 'Bradley', email: 't.bradley@nhimm.com', department_id: 'dept-conv', role: 'OPERATOR', shift: 'Shift 2 (Night)', status: 'ACTIVE', hire_date: '2021-08-22' },
  { id: 'emp-1068', employee_number: '1068', first_name: 'Carlos', last_name: 'Mendez', email: 'c.mendez@nhimm.com', department_id: 'dept-stamp', role: 'OPERATOR', shift: 'Shift 1 (Day)', status: 'ACTIVE', hire_date: '2022-11-05' },
  { id: 'emp-1070', employee_number: '1070', first_name: 'Lisa', last_name: 'Ray', email: 'l.ray@nhimm.com', department_id: 'dept-qa', role: 'QUALITY_TECH', shift: 'Shift 1 (Day)', status: 'ACTIVE', hire_date: '2019-04-12' },
  { id: 'emp-1082', employee_number: '1082', first_name: 'James', last_name: 'Wilson', email: 'j.wilson@nhimm.com', department_id: 'dept-cnc', role: 'OPERATOR', shift: 'Shift 3 (Weekend)', status: 'ACTIVE', hire_date: '2023-09-14' },
  { id: 'emp-1090', employee_number: '1090', first_name: 'Kevin', last_name: 'Patel', email: 'k.patel@nhimm.com', department_id: 'dept-robot', role: 'OPERATOR', shift: 'Shift 1 (Day)', status: 'ACTIVE', hire_date: '2024-01-20' },
  { id: 'emp-1002', employee_number: '1002', first_name: 'Jack', last_name: 'Miller', email: 'j.miller@nhimm.com', department_id: 'dept-cnc', role: 'SUPERVISOR', shift: 'Shift 1 (Day)', status: 'ACTIVE', hire_date: '2018-05-01' }
];

export const SEED_EQUIPMENT: Equipment[] = [
  { id: 'eq-haas-vf4', code: 'MC-101', name: 'Haas VF-4 Vertical Machining Center', department_id: 'dept-cnc', location: 'Cell 1 - Machining Bay', model: 'VF-4SS', serial_number: 'HAAS-2022-8819', status: 'ACTIVE', sop_document_url: '/templates/haas_vf4_standard_work.pdf' },
  { id: 'eq-mazak-qt', code: 'MC-104', name: 'Mazak Quick Turn 250MSY Lathe', department_id: 'dept-cnc', location: 'Cell 2 - Turning Center', model: 'QT-250MSY', serial_number: 'MZK-2021-4402', status: 'ACTIVE' },
  { id: 'eq-okuma-lb', code: 'MC-108', name: 'Okuma LB3000 EX II CNC Lathe', department_id: 'dept-cnc', location: 'Cell 3 - Turning Center', model: 'LB3000-EX', serial_number: 'OKU-2023-9112', status: 'ACTIVE' },
  { id: 'eq-minster-200', code: 'PR-201', name: 'Minster 200-Ton Mechanical Press', department_id: 'dept-stamp', location: 'Press Line 1', model: 'Minster E2-200', serial_number: 'MIN-2018-1188', status: 'ACTIVE' },
  { id: 'eq-fanuc-robot', code: 'RB-301', name: 'Fanuc M-20iD/25 Robotic Tending Cell', department_id: 'dept-robot', location: 'Automation Cell A', model: 'M-20iD/25', serial_number: 'FAN-2024-5541', status: 'ACTIVE' },
  { id: 'eq-keyence-im', code: 'IM-401', name: 'Keyence IM-8000 Optical Comparator', department_id: 'dept-qa', location: 'Metrology Lab', model: 'IM-8000', serial_number: 'KEY-2023-7729', status: 'ACTIVE' }
];

export const SEED_TRAININGS: TrainingModule[] = [
  { id: 'trn-loto', code: 'SOP-SAF-001', title: 'Lockout/Tagout (LOTO) & Electrical Zero Energy State', description: 'OSHA 1910.147 authorized worker protocol and energy isolation verification.', category: 'OSHA', frequency_type: 'ANNUAL', passing_score: 80, status: 'ACTIVE' },
  { id: 'trn-ppe', code: 'SOP-SAF-002', title: 'PPE & Rotating Spindle Safety Protocol', description: 'Mandatory shop-floor eye, foot, and hearing protection with strict no-gloves near rotating spindles.', category: 'OSHA', frequency_type: 'ANNUAL', passing_score: 80, status: 'ACTIVE' },
  { id: 'trn-fai', code: 'SOP-QUA-010', title: 'Five-Piece First Article Inspection & Blueprint Sign-Off', description: 'ASME Y14.5 dimension verification, calibration check, and first-piece sign-off procedure.', category: 'QUALITY', frequency_type: 'ANNUAL', passing_score: 85, status: 'ACTIVE' },
  { id: 'trn-haas-l2', code: 'SOP-MAC-101', title: 'Haas VF-4 Level 2 Qualified Setup & Operation', description: 'Independent tool touch-off, work offset verification, safe part loading, and cycle execution.', category: 'MACHINE', frequency_type: 'ANNUAL', linked_equipment_id: 'eq-haas-vf4', passing_score: 85, status: 'ACTIVE' },
  { id: 'trn-mazak-l2', code: 'SOP-MAC-104', title: 'Mazak QT-250 Level 2 Setup & Turret Indexing', description: 'Live tooling alignment, collet changeover, spindle speed override, and part catcher setup.', category: 'MACHINE', frequency_type: 'ANNUAL', linked_equipment_id: 'eq-mazak-qt', passing_score: 85, status: 'ACTIVE' },
  { id: 'trn-okuma-l2', code: 'SOP-MAC-108', title: 'Okuma LB3000 Level 2 Turning & Chip Management', description: 'OSP control navigation, tool eye touch-off, safe chip clearance, and finish surface check.', category: 'MACHINE', frequency_type: 'ANNUAL', linked_equipment_id: 'eq-okuma-lb', passing_score: 85, status: 'ACTIVE' },
  { id: 'trn-press-safe', code: 'SOP-SAF-020', title: 'Mechanical Press Light Curtain & Dual Palm Safety', description: 'Point-of-operation safeguarding, stroke inspection, and emergency stop interlock verification.', category: 'OSHA', frequency_type: 'ANNUAL', linked_equipment_id: 'eq-minster-200', passing_score: 85, status: 'ACTIVE' },
  { id: 'trn-iso-policy', code: 'SOP-QMS-001', title: 'ISO 9001:2015 Quality Policy & Defect Quarantine SOP', description: 'Understanding enterprise quality objectives, MRB non-conformance containment, and root cause reporting.', category: 'QUALITY', frequency_type: 'BIENNIAL', custom_frequency_months: 24, passing_score: 80, status: 'ACTIVE' }
];

export const SEED_RESOURCES: TrainingResource[] = [
  { id: 'res-1', training_id: 'trn-haas-l2', title: 'Haas VF-4 Work Offset & Tool Setting Video Guide', resource_type: 'YOUTUBE', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', is_required: true, sort_order: 1 },
  { id: 'res-2', training_id: 'trn-haas-l2', title: 'Haas Standard Work Instruction PDF', resource_type: 'PDF', url: '/templates/haas_vf4_standard_work.pdf', is_required: true, sort_order: 2 },
  { id: 'res-3', training_id: 'trn-loto', title: 'NHIMM Zero Energy LOTO Procedure (SharePoint)', resource_type: 'SHAREPOINT', url: 'https://nhimm.sharepoint.com/quality/SOP-SAF-001.pdf', is_required: true, sort_order: 1 },
  { id: 'res-4', training_id: 'trn-fai', title: 'Metrology Tools First Article Inspection Manual', resource_type: 'WEB', url: 'https://www.keyence.com/products/measure/measurement-systems/', is_required: true, sort_order: 1 }
];

export const SEED_REQUIREMENTS: TrainingRequirement[] = [
  { id: 'req-1', requirement_type: 'BY_ROLE', target_role: 'OPERATOR', training_id: 'trn-loto', is_mandatory: true, grace_period_days: 30 },
  { id: 'req-2', requirement_type: 'BY_ROLE', target_role: 'OPERATOR', training_id: 'trn-ppe', is_mandatory: true, grace_period_days: 30 },
  { id: 'req-3', requirement_type: 'BY_ROLE', target_role: 'OPERATOR', training_id: 'trn-fai', is_mandatory: true, grace_period_days: 30 },
  { id: 'req-4', requirement_type: 'BY_EQUIPMENT', target_equipment_id: 'eq-haas-vf4', training_id: 'trn-haas-l2', is_mandatory: true, grace_period_days: 14 },
  { id: 'req-5', requirement_type: 'BY_EQUIPMENT', target_equipment_id: 'eq-mazak-qt', training_id: 'trn-mazak-l2', is_mandatory: true, grace_period_days: 14 },
  { id: 'req-6', requirement_type: 'BY_EQUIPMENT', target_equipment_id: 'eq-okuma-lb', training_id: 'trn-okuma-l2', is_mandatory: true, grace_period_days: 14 },
  { id: 'req-7', requirement_type: 'BY_EQUIPMENT', target_equipment_id: 'eq-minster-200', training_id: 'trn-press-safe', is_mandatory: true, grace_period_days: 14 }
];

export const SEED_QUALIFICATIONS: EquipmentQualification[] = [
  // Marcus Vance: Haas L3, Mazak L2, Okuma L1 (Due Soon), Keyence L2
  { id: 'q-1', employee_id: 'emp-1015', equipment_id: 'eq-haas-vf4', level: 3, level_label: 'Level 3 (Expert / Trainer)', status: 'QUALIFIED', certified_date: '2026-01-15', expiration_date: '2027-01-15', certified_by: 'Jack Miller', evaluation_notes: 'Certified lead setup expert.' },
  { id: 'q-2', employee_id: 'emp-1015', equipment_id: 'eq-mazak-qt', level: 2, level_label: 'Level 2 (Qualified Operator)', status: 'QUALIFIED', certified_date: '2025-11-10', expiration_date: '2026-11-10', certified_by: 'Jack Miller', evaluation_notes: 'Standard production qualified.' },
  { id: 'q-3', employee_id: 'emp-1015', equipment_id: 'eq-okuma-lb', level: 1, level_label: 'Level 1 (Trainee)', status: 'DUE_SOON', certified_date: '2026-09-01', expiration_date: '2026-10-18', certified_by: 'Jack Miller', evaluation_notes: 'Due soon for Level 2 signoff.' },
  { id: 'q-4', employee_id: 'emp-1015', equipment_id: 'eq-keyence-im', level: 2, level_label: 'Level 2 (Qualified Operator)', status: 'QUALIFIED', certified_date: '2026-03-12', expiration_date: '2027-03-12', certified_by: 'Lisa Ray', evaluation_notes: 'Optical inspection certified.' },

  // Sarah Jenkins: Haas L1 (Eligible for L2 sign-off), Mazak L2
  { id: 'q-5', employee_id: 'emp-1022', equipment_id: 'eq-haas-vf4', level: 1, level_label: 'Level 1 (Trainee)', status: 'IN_TRAINING', certified_date: '2026-08-15', expiration_date: '2026-11-15', certified_by: 'Jack Miller', evaluation_notes: 'Ready for supervisor sign-off.' },
  { id: 'q-6', employee_id: 'emp-1022', equipment_id: 'eq-mazak-qt', level: 2, level_label: 'Level 2 (Qualified Operator)', status: 'QUALIFIED', certified_date: '2026-04-10', expiration_date: '2027-04-10', certified_by: 'Jack Miller', evaluation_notes: 'Verified independent runner.' },

  // David Chen: Minster Press Expired, Fanuc Robot L3
  { id: 'q-7', employee_id: 'emp-1034', equipment_id: 'eq-minster-200', level: 2, level_label: 'Level 2 (Qualified Operator)', status: 'EXPIRED', certified_date: '2025-09-20', expiration_date: '2026-09-20', certified_by: 'Jack Miller', evaluation_notes: 'Annual recertification expired.' },
  { id: 'q-8', employee_id: 'emp-1034', equipment_id: 'eq-fanuc-robot', level: 3, level_label: 'Level 3 (Expert / Trainer)', status: 'QUALIFIED', certified_date: '2026-02-14', expiration_date: '2027-02-14', certified_by: 'Jack Miller', evaluation_notes: 'Robotics cell lead.' },

  // Elena Rostova: Fanuc Robot L2, Keyence L2
  { id: 'q-9', employee_id: 'emp-1041', equipment_id: 'eq-fanuc-robot', level: 2, level_label: 'Level 2 (Qualified Operator)', status: 'QUALIFIED', certified_date: '2026-05-18', expiration_date: '2027-05-18', certified_by: 'David Chen', evaluation_notes: 'Autonomous cell attendant.' },
  { id: 'q-10', employee_id: 'emp-1041', equipment_id: 'eq-keyence-im', level: 2, level_label: 'Level 2 (Qualified Operator)', status: 'QUALIFIED', certified_date: '2026-06-20', expiration_date: '2027-06-20', certified_by: 'Lisa Ray', evaluation_notes: 'Optical first piece inspector.' },

  // Tom Bradley: Haas L1 (Due Soon)
  { id: 'q-11', employee_id: 'emp-1055', equipment_id: 'eq-haas-vf4', level: 1, level_label: 'Level 1 (Trainee)', status: 'DUE_SOON', certified_date: '2026-09-10', expiration_date: '2026-10-25', certified_by: 'Jack Miller', evaluation_notes: 'Requires observation signoff.' }
];

export const SEED_RECORDS: TrainingRecord[] = [
  { id: 'tr-1', employee_id: 'emp-1015', training_id: 'trn-ppe', completion_date: '2026-01-10', expiration_date: '2027-01-10', trainer_name: 'Jack Miller', result: 'PASS', score: 100, recorded_by: 'Jack Miller', notes: 'Verified safety attire and no-gloves near spindle.' },
  { id: 'tr-2', employee_id: 'emp-1015', training_id: 'trn-fai', completion_date: '2026-01-12', expiration_date: '2027-01-12', trainer_name: 'Lisa Ray', result: 'PASS', score: 95, recorded_by: 'Lisa Ray', notes: 'Micrometer and caliper proficiency demonstrated.' },
  { id: 'tr-3', employee_id: 'emp-1022', training_id: 'trn-ppe', completion_date: '2026-03-05', expiration_date: '2027-03-05', trainer_name: 'Jack Miller', result: 'PASS', score: 100, recorded_by: 'Jack Miller', notes: 'Standard work reviewed.' },
  { id: 'tr-4', employee_id: 'emp-1034', training_id: 'trn-iso-policy', completion_date: '2024-05-10', expiration_date: '2026-05-10', trainer_name: 'Quality Lead', result: 'PASS', score: 92, recorded_by: 'System', notes: 'Biennial QMS compliance - EXPIRED.' }
];

export const SEED_USERS: AppUser[] = [
  { id: 'usr-1002', employee_id: 'emp-1002', system_role: 'SUPERVISOR', pin_hash: '1234', is_active: true, employee_name: 'Jack Miller', employee_number: '1002' },
  { id: 'usr-1015', employee_id: 'emp-1015', system_role: 'OPERATOR', pin_hash: '1234', is_active: true, employee_name: 'Marcus Vance', employee_number: '1015' },
  { id: 'usr-1022', employee_id: 'emp-1022', system_role: 'OPERATOR', pin_hash: '1234', is_active: true, employee_name: 'Sarah Jenkins', employee_number: '1022' },
  { id: 'usr-1070', employee_id: 'emp-1070', system_role: 'ADMIN', pin_hash: '1234', is_active: true, employee_name: 'Lisa Ray', employee_number: '1070' }
];

// Helper to load or initialize LocalStorage collection
function getLocalCollection<T>(key: string, defaultSeed: T[]): T[] {
  if (typeof window === 'undefined') return defaultSeed;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(defaultSeed));
      return defaultSeed;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`LocalStorage read error for ${key}:`, e);
    return defaultSeed;
  }
}

function saveLocalCollection<T>(key: string, data: T[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
  } catch (e) {
    console.warn(`LocalStorage write error for ${key}:`, e);
  }
}

// Log audit action into audit trail
export function logAuditAction(
  tableName: string,
  recordId: string,
  action: 'INSERT' | 'UPDATE' | 'ARCHIVE' | 'RESTORE',
  performedBy: string = 'User',
  oldValues?: any,
  newValues?: any
) {
  const auditEntries = getLocalCollection<TrainingAuditLogEntry>('audit_log', []);
  const newEntry: TrainingAuditLogEntry = {
    id: Date.now(),
    table_name: tableName,
    record_id: recordId,
    action,
    performed_by: performedBy,
    old_values: oldValues,
    new_values: newValues,
    timestamp: new Date().toISOString()
  };
  auditEntries.unshift(newEntry);
  saveLocalCollection('audit_log', auditEntries);

  // Try writing to Supabase audit log
  DB.from('training_audit_log').insert([{
    table_name: tableName,
    record_id: recordId,
    action,
    performed_by: performedBy,
    old_values: oldValues,
    new_values: newValues,
    timestamp: newEntry.timestamp
  }]).then(() => {}).catch(() => {});
}

// ============================================================================
// DATE & EXPIRATION CALCULATION UTILITIES
// ============================================================================

export function calculateExpirationDate(
  completionDate: string,
  frequencyType: FrequencyType,
  customMonths?: number
): string | undefined {
  if (frequencyType === 'ONE_TIME') return undefined;

  const date = new Date(completionDate);
  if (isNaN(date.getTime())) return undefined;

  let monthsToAdd = 12;
  if (frequencyType === 'ANNUAL') monthsToAdd = 12;
  else if (frequencyType === 'BIENNIAL') monthsToAdd = 24;
  else if (frequencyType === 'TRIENNIAL') monthsToAdd = 36;
  else if (frequencyType === 'CUSTOM_MONTHS' && customMonths && customMonths > 0) {
    monthsToAdd = customMonths;
  }

  date.setMonth(date.getMonth() + monthsToAdd);
  return date.toISOString().slice(0, 10);
}

export function evaluateStatus(expirationDate?: string): TrainingStatusType {
  if (!expirationDate) return 'QUALIFIED';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const exp = new Date(expirationDate);
  exp.setHours(0, 0, 0, 0);

  const diffTime = exp.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'EXPIRED';
  if (diffDays <= 30) return 'DUE_SOON';
  return 'QUALIFIED';
}

// ============================================================================
// CRUD SERVICES: EMPLOYEES & DEPARTMENTS
// ============================================================================

export async function fetchDepartments(): Promise<Department[]> {
  try {
    const { data, error } = await DB.from('training_departments').select('*').order('name');
    if (!error && data && data.length > 0) {
      saveLocalCollection('departments', data);
      return data;
    }
  } catch (e) {
    console.warn('Supabase fetchDepartments falling back to local seed:', e);
  }
  return getLocalCollection<Department>('departments', SEED_DEPARTMENTS);
}

export async function fetchEmployees(includeArchived: boolean = false): Promise<Employee[]> {
  let employees: Employee[] = [];
  try {
    let query = DB.from('training_employees').select('*');
    if (!includeArchived) {
      query = query.eq('status', 'ACTIVE');
    }
    const { data, error } = await query.order('last_name', { ascending: true });
    if (!error && data && data.length > 0) {
      employees = data;
      saveLocalCollection('employees', data);
    } else {
      employees = getLocalCollection<Employee>('employees', SEED_EMPLOYEES);
      if (!includeArchived) {
        employees = employees.filter(e => e.status === 'ACTIVE');
      }
    }
  } catch {
    employees = getLocalCollection<Employee>('employees', SEED_EMPLOYEES);
    if (!includeArchived) {
      employees = employees.filter(e => e.status === 'ACTIVE');
    }
  }

  const departments = await fetchDepartments();
  const deptMap = new Map(departments.map(d => [d.id, d.name]));

  return employees.map(emp => ({
    ...emp,
    department_name: deptMap.get(emp.department_id) || 'General Operations',
  }));
}

export async function saveEmployee(empData: Partial<Employee>, currentUser: string = 'Admin'): Promise<Employee> {
  const employees = getLocalCollection<Employee>('employees', SEED_EMPLOYEES);
  let saved: Employee;

  if (empData.id && employees.some(e => e.id === empData.id)) {
    // Update existing
    const existing = employees.find(e => e.id === empData.id)!;
    saved = { ...existing, ...empData, updated_at: new Date().toISOString() };
    const updatedList = employees.map(e => (e.id === empData.id ? saved : e));
    saveLocalCollection('employees', updatedList);
    logAuditAction('training_employees', saved.id, 'UPDATE', currentUser, existing, saved);

    // Sync to Supabase in background
    DB.from('training_employees').upsert(saved).catch(() => {});
  } else {
    // Insert new
    saved = {
      id: empData.id || `emp-${Date.now()}`,
      employee_number: empData.employee_number || `${Math.floor(1000 + Math.random() * 9000)}`,
      first_name: empData.first_name || '',
      last_name: empData.last_name || '',
      email: empData.email || '',
      department_id: empData.department_id || 'dept-cnc',
      role: empData.role || 'OPERATOR',
      shift: empData.shift || 'Shift 1 (Day)',
      status: 'ACTIVE',
      hire_date: empData.hire_date || new Date().toISOString().slice(0, 10),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    employees.unshift(saved);
    saveLocalCollection('employees', employees);
    logAuditAction('training_employees', saved.id, 'INSERT', currentUser, null, saved);

    DB.from('training_employees').insert([saved]).catch(() => {});
  }

  return saved;
}

export async function archiveEmployee(id: string, reason: string, currentUser: string = 'Admin'): Promise<void> {
  const employees = getLocalCollection<Employee>('employees', SEED_EMPLOYEES);
  const target = employees.find(e => e.id === id);
  if (!target) return;

  const old = { ...target };
  target.status = 'ARCHIVED';
  target.archive_reason = reason;
  target.updated_at = new Date().toISOString();

  saveLocalCollection('employees', employees);
  logAuditAction('training_employees', id, 'ARCHIVE', currentUser, old, target);

  DB.from('training_employees').update({ status: 'ARCHIVED', archive_reason: reason, updated_at: target.updated_at }).eq('id', id).catch(() => {});
}

export async function restoreEmployee(id: string, currentUser: string = 'Admin'): Promise<void> {
  const employees = getLocalCollection<Employee>('employees', SEED_EMPLOYEES);
  const target = employees.find(e => e.id === id);
  if (!target) return;

  const old = { ...target };
  target.status = 'ACTIVE';
  target.archive_reason = undefined;
  target.updated_at = new Date().toISOString();

  saveLocalCollection('employees', employees);
  logAuditAction('training_employees', id, 'RESTORE', currentUser, old, target);

  DB.from('training_employees').update({ status: 'ACTIVE', archive_reason: null, updated_at: target.updated_at }).eq('id', id).catch(() => {});
}

// ============================================================================
// CRUD SERVICES: EQUIPMENT
// ============================================================================

export async function fetchEquipment(includeArchived: boolean = false): Promise<Equipment[]> {
  let equipmentList: Equipment[] = [];
  try {
    let query = DB.from('training_equipment').select('*');
    if (!includeArchived) query = query.eq('status', 'ACTIVE');
    const { data, error } = await query.order('name');
    if (!error && data && data.length > 0) {
      equipmentList = data;
      saveLocalCollection('equipment', data);
    } else {
      equipmentList = getLocalCollection<Equipment>('equipment', SEED_EQUIPMENT);
      if (!includeArchived) equipmentList = equipmentList.filter(eq => eq.status === 'ACTIVE');
    }
  } catch {
    equipmentList = getLocalCollection<Equipment>('equipment', SEED_EQUIPMENT);
    if (!includeArchived) equipmentList = equipmentList.filter(eq => eq.status === 'ACTIVE');
  }

  const departments = await fetchDepartments();
  const deptMap = new Map(departments.map(d => [d.id, d.name]));
  const quals = getLocalCollection<EquipmentQualification>('qualifications', SEED_QUALIFICATIONS);

  return equipmentList.map(eq => {
    const eqQuals = quals.filter(q => q.equipment_id === eq.id);
    const qualifiedCount = eqQuals.filter(q => q.level >= 2 && q.status === 'QUALIFIED').length;
    const traineeCount = eqQuals.filter(q => q.level === 1 || q.status === 'IN_TRAINING').length;

    return {
      ...eq,
      department_name: deptMap.get(eq.department_id) || 'Shop Floor',
      qualified_operator_count: qualifiedCount,
      trainee_count: traineeCount
    };
  });
}

export async function saveEquipment(eqData: Partial<Equipment>, currentUser: string = 'Admin'): Promise<Equipment> {
  const list = getLocalCollection<Equipment>('equipment', SEED_EQUIPMENT);
  let saved: Equipment;

  if (eqData.id && list.some(eq => eq.id === eqData.id)) {
    const existing = list.find(eq => eq.id === eqData.id)!;
    saved = { ...existing, ...eqData, updated_at: new Date().toISOString() };
    const updated = list.map(eq => (eq.id === eqData.id ? saved : eq));
    saveLocalCollection('equipment', updated);
    logAuditAction('training_equipment', saved.id, 'UPDATE', currentUser, existing, saved);
    DB.from('training_equipment').upsert(saved).catch(() => {});
  } else {
    saved = {
      id: eqData.id || `eq-${Date.now()}`,
      code: eqData.code || `MC-${Math.floor(100 + Math.random() * 900)}`,
      name: eqData.name || 'New Work Center',
      department_id: eqData.department_id || 'dept-cnc',
      location: eqData.location || 'Shop Floor Bay',
      model: eqData.model || '',
      serial_number: eqData.serial_number || '',
      status: 'ACTIVE',
      sop_document_url: eqData.sop_document_url || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    list.push(saved);
    saveLocalCollection('equipment', list);
    logAuditAction('training_equipment', saved.id, 'INSERT', currentUser, null, saved);
    DB.from('training_equipment').insert([saved]).catch(() => {});
  }

  return saved;
}

export async function archiveEquipment(id: string, reason: string, currentUser: string = 'Admin'): Promise<void> {
  const list = getLocalCollection<Equipment>('equipment', SEED_EQUIPMENT);
  const target = list.find(eq => eq.id === id);
  if (!target) return;

  const old = { ...target };
  target.status = 'ARCHIVED';
  target.archive_reason = reason;
  target.updated_at = new Date().toISOString();

  saveLocalCollection('equipment', list);
  logAuditAction('training_equipment', id, 'ARCHIVE', currentUser, old, target);
  DB.from('training_equipment').update({ status: 'ARCHIVED', archive_reason: reason }).eq('id', id).catch(() => {});
}

// ============================================================================
// CRUD SERVICES: TRAINING MODULES & MULTIMODAL RESOURCES
// ============================================================================

export async function fetchTrainings(includeArchived: boolean = false): Promise<TrainingModule[]> {
  let modules: TrainingModule[] = [];
  try {
    let query = DB.from('training_modules').select('*');
    if (!includeArchived) query = query.eq('status', 'ACTIVE');
    const { data, error } = await query.order('code');
    if (!error && data && data.length > 0) {
      modules = data;
      saveLocalCollection('trainings', data);
    } else {
      modules = getLocalCollection<TrainingModule>('trainings', SEED_TRAININGS);
      if (!includeArchived) modules = modules.filter(m => m.status === 'ACTIVE');
    }
  } catch {
    modules = getLocalCollection<TrainingModule>('trainings', SEED_TRAININGS);
    if (!includeArchived) modules = modules.filter(m => m.status === 'ACTIVE');
  }

  const equipmentList = await fetchEquipment(true);
  const eqMap = new Map(equipmentList.map(eq => [eq.id, eq.name]));
  const allResources = getLocalCollection<TrainingResource>('resources', SEED_RESOURCES);

  return modules.map(m => ({
    ...m,
    linked_equipment_name: m.linked_equipment_id ? eqMap.get(m.linked_equipment_id) : undefined,
    resources: allResources.filter(r => r.training_id === m.id)
  }));
}

export async function saveTraining(modData: Partial<TrainingModule>, currentUser: string = 'Admin'): Promise<TrainingModule> {
  const list = getLocalCollection<TrainingModule>('trainings', SEED_TRAININGS);
  let saved: TrainingModule;

  if (modData.id && list.some(m => m.id === modData.id)) {
    const existing = list.find(m => m.id === modData.id)!;
    saved = { ...existing, ...modData, updated_at: new Date().toISOString() };
    const updated = list.map(m => (m.id === modData.id ? saved : m));
    saveLocalCollection('trainings', updated);
    logAuditAction('training_modules', saved.id, 'UPDATE', currentUser, existing, saved);
    DB.from('training_modules').upsert(saved).catch(() => {});
  } else {
    saved = {
      id: modData.id || `trn-${Date.now()}`,
      code: modData.code || `SOP-TRN-${Math.floor(100 + Math.random() * 900)}`,
      title: modData.title || 'New Training Module',
      description: modData.description || '',
      category: modData.category || 'QUALITY',
      frequency_type: modData.frequency_type || 'ANNUAL',
      custom_frequency_months: modData.custom_frequency_months || 12,
      linked_equipment_id: modData.linked_equipment_id || undefined,
      passing_score: modData.passing_score || 80,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    list.push(saved);
    saveLocalCollection('trainings', list);
    logAuditAction('training_modules', saved.id, 'INSERT', currentUser, null, saved);
    DB.from('training_modules').insert([saved]).catch(() => {});
  }

  return saved;
}

export async function saveTrainingResource(resData: Partial<TrainingResource>): Promise<TrainingResource> {
  const list = getLocalCollection<TrainingResource>('resources', SEED_RESOURCES);
  const newRes: TrainingResource = {
    id: resData.id || `res-${Date.now()}`,
    training_id: resData.training_id!,
    title: resData.title || 'Resource Link',
    resource_type: resData.resource_type || 'WEB',
    url: resData.url || '',
    is_required: resData.is_required ?? true,
    sort_order: resData.sort_order || list.length + 1
  };

  list.push(newRes);
  saveLocalCollection('resources', list);
  DB.from('training_resources').insert([newRes]).catch(() => {});
  return newRes;
}

// ============================================================================
// TRAINING COMPLETION RECORDS (APPEND-ONLY FOR ISO 9001:2015 7.2)
// ============================================================================

export async function fetchTrainingRecords(employeeId?: string): Promise<TrainingRecord[]> {
  let records: TrainingRecord[] = [];
  try {
    let query = DB.from('training_records').select('*');
    if (employeeId) query = query.eq('employee_id', employeeId);
    const { data, error } = await query.order('completion_date', { ascending: false });
    if (!error && data && data.length > 0) {
      records = data;
      saveLocalCollection('records', data);
    } else {
      records = getLocalCollection<TrainingRecord>('records', SEED_RECORDS);
      if (employeeId) records = records.filter(r => r.employee_id === employeeId);
    }
  } catch {
    records = getLocalCollection<TrainingRecord>('records', SEED_RECORDS);
    if (employeeId) records = records.filter(r => r.employee_id === employeeId);
  }

  const employees = await fetchEmployees(true);
  const empMap = new Map(employees.map(e => [e.id, `${e.first_name} ${e.last_name}`]));
  const empNoMap = new Map(employees.map(e => [e.id, e.employee_number]));

  const trainings = await fetchTrainings(true);
  const trnTitleMap = new Map(trainings.map(t => [t.id, t.title]));
  const trnCodeMap = new Map(trainings.map(t => [t.id, t.code]));
  const trnCatMap = new Map(trainings.map(t => [t.id, t.category]));

  return records.map(r => ({
    ...r,
    employee_name: empMap.get(r.employee_id) || 'Unknown Employee',
    employee_number: empNoMap.get(r.employee_id) || '',
    training_title: trnTitleMap.get(r.training_id) || 'Training Module',
    training_code: trnCodeMap.get(r.training_id) || '',
    category: trnCatMap.get(r.training_id) || 'QUALITY'
  }));
}

export async function recordTrainingCompletion(
  recordInput: Omit<TrainingRecord, 'id' | 'created_at'>,
  currentUser: string = 'Supervisor'
): Promise<TrainingRecord> {
  const trainings = await fetchTrainings(true);
  const targetTrn = trainings.find(t => t.id === recordInput.training_id);

  const expirationDate = recordInput.expiration_date || (targetTrn 
    ? calculateExpirationDate(recordInput.completion_date, targetTrn.frequency_type, targetTrn.custom_frequency_months)
    : undefined);

  const newRecord: TrainingRecord = {
    id: `tr-${Date.now()}`,
    ...recordInput,
    expiration_date: expirationDate,
    created_at: new Date().toISOString()
  };

  // Append-only local storage update
  const records = getLocalCollection<TrainingRecord>('records', SEED_RECORDS);
  records.unshift(newRecord);
  saveLocalCollection('records', records);

  logAuditAction('training_records', newRecord.id, 'INSERT', currentUser, null, newRecord);

  // Commit to Supabase (Append-only insert)
  DB.from('training_records').insert([newRecord]).catch((err: any) => {
    console.warn('Supabase training_records append-only write failed (using local store):', err);
  });

  return newRecord;
}

// ============================================================================
// EQUIPMENT QUALIFICATIONS (APPEND-ONLY LEVEL SIGN-OFFS & SKILLS MATRIX)
// ============================================================================

export async function fetchEquipmentQualifications(
  employeeId?: string,
  equipmentId?: string
): Promise<EquipmentQualification[]> {
  let quals: EquipmentQualification[] = [];
  try {
    let query = DB.from('training_equipment_qualifications').select('*');
    if (employeeId) query = query.eq('employee_id', employeeId);
    if (equipmentId) query = query.eq('equipment_id', equipmentId);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      quals = data;
      saveLocalCollection('qualifications', data);
    } else {
      quals = getLocalCollection<EquipmentQualification>('qualifications', SEED_QUALIFICATIONS);
      if (employeeId) quals = quals.filter(q => q.employee_id === employeeId);
      if (equipmentId) quals = quals.filter(q => q.equipment_id === equipmentId);
    }
  } catch {
    quals = getLocalCollection<EquipmentQualification>('qualifications', SEED_QUALIFICATIONS);
    if (employeeId) quals = quals.filter(q => q.employee_id === employeeId);
    if (equipmentId) quals = quals.filter(q => q.equipment_id === equipmentId);
  }

  const employees = await fetchEmployees(true);
  const empMap = new Map(employees.map(e => [e.id, `${e.first_name} ${e.last_name}`]));
  const empNoMap = new Map(employees.map(e => [e.id, e.employee_number]));

  const equipmentList = await fetchEquipment(true);
  const eqMap = new Map(equipmentList.map(eq => [eq.id, eq.name]));
  const eqCodeMap = new Map(equipmentList.map(eq => [eq.id, eq.code]));

  return quals.map(q => ({
    ...q,
    status: evaluateStatus(q.expiration_date),
    employee_name: empMap.get(q.employee_id) || 'Unknown Employee',
    employee_number: empNoMap.get(q.employee_id) || '',
    equipment_name: eqMap.get(q.equipment_id) || 'Work Center',
    equipment_code: eqCodeMap.get(q.equipment_id) || ''
  }));
}

export async function recordEquipmentSignoff(
  qualInput: Omit<EquipmentQualification, 'id' | 'created_at'>,
  currentUser: string = 'Jack Miller (Supervisor)'
): Promise<EquipmentQualification> {
  const newQual: EquipmentQualification = {
    id: `q-${Date.now()}`,
    ...qualInput,
    status: evaluateStatus(qualInput.expiration_date),
    created_at: new Date().toISOString()
  };

  const quals = getLocalCollection<EquipmentQualification>('qualifications', SEED_QUALIFICATIONS);
  quals.unshift(newQual);
  saveLocalCollection('qualifications', quals);

  logAuditAction('training_equipment_qualifications', newQual.id, 'INSERT', currentUser, null, newQual);

  DB.from('training_equipment_qualifications').insert([newQual]).catch((err: any) => {
    console.warn('Supabase equipment_qualifications append-only write failed (using local store):', err);
  });

  return newQual;
}

// ============================================================================
// TRAINING REQUIREMENTS & MISSING GAP CALCULATION
// ============================================================================

export async function fetchTrainingRequirements(): Promise<TrainingRequirement[]> {
  try {
    const { data, error } = await DB.from('training_requirements').select('*');
    if (!error && data && data.length > 0) {
      saveLocalCollection('requirements', data);
      return data;
    }
  } catch {
    // fallback
  }
  return getLocalCollection<TrainingRequirement>('requirements', SEED_REQUIREMENTS);
}

export function calculateMissingRequirements(
  employees: Employee[],
  qualifications: EquipmentQualification[],
  records: TrainingRecord[],
  requirements: TrainingRequirement[],
  modules: TrainingModule[]
): MissingRequirementItem[] {
  const missing: MissingRequirementItem[] = [];
  const moduleMap = new Map(modules.map(m => [m.id, m]));

  const now = new Date().getTime();

  for (const emp of employees) {
    if (emp.status === 'ARCHIVED') continue;

    // 1. Check Role-based requirements
    const roleReqs = requirements.filter(r => r.requirement_type === 'BY_ROLE' && r.target_role === emp.role);
    for (const req of roleReqs) {
      const module = moduleMap.get(req.training_id);
      if (!module) continue;

      // Has employee completed this module and is it not expired?
      const empRecords = records.filter(r => r.employee_id === emp.id && r.training_id === req.training_id && r.result === 'PASS');
      const hasValid = empRecords.some(r => evaluateStatus(r.expiration_date) !== 'EXPIRED');

      if (!hasValid) {
        const hireDate = new Date(emp.hire_date).getTime();
        const daysSinceHire = Math.floor((now - hireDate) / (1000 * 60 * 60 * 24));
        const daysOverdue = Math.max(0, daysSinceHire - req.grace_period_days);

        missing.push({
          employee: emp,
          training: module,
          requirement: req,
          reason: `Mandatory onboarding requirement for role ${emp.role}`,
          daysOverdue
        });
      }
    }

    // 2. Check Equipment-based requirements (if operator is operating machine without training)
    const empQuals = qualifications.filter(q => q.employee_id === emp.id && q.level >= 1);
    for (const qual of empQuals) {
      const eqReqs = requirements.filter(r => r.requirement_type === 'BY_EQUIPMENT' && r.target_equipment_id === qual.equipment_id);
      for (const req of eqReqs) {
        const module = moduleMap.get(req.training_id);
        if (!module) continue;

        const empRecords = records.filter(r => r.employee_id === emp.id && r.training_id === req.training_id && r.result === 'PASS');
        const hasValid = empRecords.some(r => evaluateStatus(r.expiration_date) !== 'EXPIRED');

        if (!hasValid) {
          missing.push({
            employee: emp,
            training: module,
            requirement: req,
            reason: `Mandatory prerequisite for work center operation`,
            daysOverdue: 0
          });
        }
      }
    }
  }

  return missing;
}

// ============================================================================
// AUDIT LOG SERVICE
// ============================================================================

export async function fetchAuditLog(): Promise<TrainingAuditLogEntry[]> {
  try {
    const { data, error } = await DB.from('training_audit_log').select('*').order('timestamp', { ascending: false });
    if (!error && data && data.length > 0) return data;
  } catch {}
  return getLocalCollection<TrainingAuditLogEntry>('audit_log', []);
}

// ============================================================================
// TWO-STAGE CSV IMPORT & VALIDATION ENGINE
// ============================================================================

export interface CsvParseResult<T> {
  validRows: T[];
  errorRows: { rowNumber: number; raw: Record<string, string>; error: string }[];
  summary: { total: number; valid: number; invalid: number };
}

export function parseCsvRows(csvText: string): Record<string, string>[] {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
    if (values.length === headers.length) {
      const rowObj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        rowObj[h] = values[idx];
      });
      rows.push(rowObj);
    }
  }

  return rows;
}

export async function validateEmployeesCsv(csvText: string): Promise<CsvParseResult<Partial<Employee>>> {
  const rawRows = parseCsvRows(csvText);
  const departments = await fetchDepartments();
  const validDeptCodes = new Set(departments.map(d => d.code.toLowerCase()));
  const deptCodeToId = new Map(departments.map(d => [d.code.toLowerCase(), d.id]));

  const validRows: Partial<Employee>[] = [];
  const errorRows: { rowNumber: number; raw: Record<string, string>; error: string }[] = [];

  rawRows.forEach((r, idx) => {
    const rowNum = idx + 2; // +1 for 0-index, +1 for header
    const empNo = r['employee_number'] || r['badge'] || r['badge_number'];
    const firstName = r['first_name'] || r['firstname'];
    const lastName = r['last_name'] || r['lastname'];
    const deptCode = (r['department'] || r['department_code'] || '').toLowerCase();
    const role = (r['role'] || 'OPERATOR').toUpperCase() as any;

    if (!empNo) {
      errorRows.push({ rowNumber: rowNum, raw: r, error: 'Missing employee / badge number' });
      return;
    }
    if (!firstName || !lastName) {
      errorRows.push({ rowNumber: rowNum, raw: r, error: 'Missing first or last name' });
      return;
    }
    if (deptCode && !validDeptCodes.has(deptCode)) {
      errorRows.push({ rowNumber: rowNum, raw: r, error: `Invalid department code: "${deptCode}" (Allowed: ${[...validDeptCodes].join(', ')})` });
      return;
    }

    validRows.push({
      employee_number: empNo,
      first_name: firstName,
      last_name: lastName,
      email: r['email'] || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@nhimm.com`,
      department_id: deptCodeToId.get(deptCode) || 'dept-cnc',
      role: ['OPERATOR', 'LEAD', 'SUPERVISOR', 'QUALITY_TECH', 'MANAGER'].includes(role) ? role : 'OPERATOR',
      shift: r['shift'] || 'Shift 1 (Day)',
      hire_date: r['hire_date'] || new Date().toISOString().slice(0, 10),
      status: 'ACTIVE'
    });
  });

  return {
    validRows,
    errorRows,
    summary: { total: rawRows.length, valid: validRows.length, invalid: errorRows.length }
  };
}

export async function validateEquipmentCsv(csvText: string): Promise<CsvParseResult<Partial<Equipment>>> {
  const rawRows = parseCsvRows(csvText);
  const departments = await fetchDepartments();
  const deptCodeToId = new Map(departments.map(d => [d.code.toLowerCase(), d.id]));

  const validRows: Partial<Equipment>[] = [];
  const errorRows: { rowNumber: number; raw: Record<string, string>; error: string }[] = [];

  rawRows.forEach((r, idx) => {
    const rowNum = idx + 2;
    const code = r['code'] || r['equipment_code'] || r['machine_code'];
    const name = r['name'] || r['machine_name'];
    const location = r['location'] || 'Shop Floor';
    const deptCode = (r['department'] || '').toLowerCase();

    if (!code || !name) {
      errorRows.push({ rowNumber: rowNum, raw: r, error: 'Missing equipment code or name' });
      return;
    }

    validRows.push({
      code,
      name,
      location,
      department_id: deptCodeToId.get(deptCode) || 'dept-cnc',
      model: r['model'] || '',
      serial_number: r['serial_number'] || '',
      status: 'ACTIVE'
    });
  });

  return {
    validRows,
    errorRows,
    summary: { total: rawRows.length, valid: validRows.length, invalid: errorRows.length }
  };
}

export async function validateTrainingRecordsCsv(csvText: string): Promise<CsvParseResult<Omit<TrainingRecord, 'id' | 'created_at'>>> {
  const rawRows = parseCsvRows(csvText);
  const employees = await fetchEmployees(true);
  const empNoToId = new Map(employees.map(e => [e.employee_number, e.id]));

  const trainings = await fetchTrainings(true);
  const trnCodeToId = new Map(trainings.map(t => [t.code.toLowerCase(), t.id]));

  const validRows: Omit<TrainingRecord, 'id' | 'created_at'>[] = [];
  const errorRows: { rowNumber: number; raw: Record<string, string>; error: string }[] = [];

  rawRows.forEach((r, idx) => {
    const rowNum = idx + 2;
    const empNo = r['employee_number'] || r['badge'];
    const trnCode = (r['training_code'] || r['sop_code'] || '').toLowerCase();
    const completionDate = r['completion_date'] || new Date().toISOString().slice(0, 10);
    const trainer = r['trainer'] || r['trainer_name'] || 'Lead Trainer';
    const result = (r['result'] || 'PASS').toUpperCase() === 'FAIL' ? 'FAIL' : 'PASS';

    const empId = empNoToId.get(empNo);
    const trnId = trnCodeToId.get(trnCode);

    if (!empId) {
      errorRows.push({ rowNumber: rowNum, raw: r, error: `Employee badge #${empNo} not found in directory` });
      return;
    }
    if (!trnId) {
      errorRows.push({ rowNumber: rowNum, raw: r, error: `Training code "${trnCode}" not found in catalog` });
      return;
    }

    validRows.push({
      employee_id: empId,
      training_id: trnId,
      completion_date: completionDate,
      trainer_name: trainer,
      result,
      score: r['score'] ? Number(r['score']) : 100,
      notes: r['notes'] || 'Historical CSV import',
      recorded_by: 'CSV Bulk Import'
    });
  });

  return {
    validRows,
    errorRows,
    summary: { total: rawRows.length, valid: validRows.length, invalid: errorRows.length }
  };
}

// ============================================================================
// ADMIN "EXPORT EVERYTHING" ZIP BACKUP GENERATOR
// ============================================================================

export async function exportEverythingToZip(): Promise<void> {
  const zip = new JSZip();

  const [employees, equipment, trainings, records, quals, auditLog] = await Promise.all([
    fetchEmployees(true),
    fetchEquipment(true),
    fetchTrainings(true),
    fetchTrainingRecords(),
    fetchEquipmentQualifications(),
    fetchAuditLog()
  ]);

  // Convert array of objects to CSV string
  function toCsv(items: any[]): string {
    if (items.length === 0) return '';
    const headers = Object.keys(items[0]);
    const lines = [headers.join(',')];

    for (const item of items) {
      const row = headers.map(h => {
        const val = item[h];
        if (val === null || val === undefined) return '';
        const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
        return `"${str.replace(/"/g, '""')}"`;
      });
      lines.push(row.join(','));
    }
    return lines.join('\n');
  }

  zip.file('employees.csv', toCsv(employees));
  zip.file('equipment.csv', toCsv(equipment));
  zip.file('trainings_catalog.csv', toCsv(trainings));
  zip.file('training_completion_records.csv', toCsv(records));
  zip.file('equipment_qualifications.csv', toCsv(quals));
  zip.file('system_audit_log.csv', toCsv(auditLog));

  const content = await zip.generateAsync({ type: 'blob' });
  const filename = `Quality_Compass_Training_Backup_${new Date().toISOString().slice(0, 10)}.zip`;
  saveAs(content, filename);
}
