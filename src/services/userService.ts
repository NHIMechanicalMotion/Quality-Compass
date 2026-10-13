// ============================================================================
// Quality Compass // Shared User Management Service
// NHI Mechanical Motion LLC (NHIMM)
// ============================================================================

import { supabase } from './supabase';
export type { 
  Person, 
  UserAccount, 
  AppModule, 
  ModuleRole, 
  UserRoleAssignment, 
  PersonDossier,
  UserManagementAuditEntry
} from '../types/userManagement';
import type { 
  Person, 
  UserAccount, 
  AppModule, 
  ModuleRole, 
  UserRoleAssignment, 
  PersonDossier,
  UserManagementAuditEntry
} from '../types/userManagement';

const db = supabase as any;

/**
 * Fetch all personnel from public.people
 */
export async function fetchPeople(includeArchived: boolean = false): Promise<Person[]> {
  try {
    let query = db.from('people').select('*');
    if (!includeArchived) {
      query = query.eq('status', 'ACTIVE');
    }
    const { data, error } = await query.order('last_name', { ascending: true });
    if (error) {
      console.warn('Failed to fetch people from Supabase:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Exception fetching people:', err);
    return [];
  }
}

/**
 * Fetch a single person by UUID
 */
export async function fetchPersonById(id: string): Promise<Person | null> {
  try {
    const { data, error } = await db
      .from('people')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Fetch person by unique employee/badge number
 */
export async function fetchPersonByEmployeeNumber(badgeNumber: string): Promise<Person | null> {
  try {
    const { data, error } = await db
      .from('people')
      .select('*')
      .eq('employee_number', badgeNumber.trim())
      .single();
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Create or update a person record in public.people
 */
export async function savePerson(personData: Partial<Person>): Promise<Person> {
  const payload: any = {
    ...personData,
    updated_at: new Date().toISOString()
  };

  if (!payload.id) {
    payload.created_at = new Date().toISOString();
    const { data, error } = await db.from('people').insert([payload]).select().single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await db.from('people').update(payload).eq('id', payload.id).select().single();
    if (error) throw error;
    return data;
  }
}

/**
 * Soft-archive a person with mandatory justification
 */
export async function archivePerson(id: string, reason: string): Promise<void> {
  const { error } = await db
    .from('people')
    .update({
      status: 'ARCHIVED',
      archive_reason: reason,
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) throw error;

  // Immediately deactivate their login account if one exists
  await db
    .from('user_accounts')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('person_id', id);
}

/**
 * Restore an archived person to active status
 */
export async function restorePerson(id: string): Promise<void> {
  const { error } = await db
    .from('people')
    .update({
      status: 'ACTIVE',
      archive_reason: null,
      archived_at: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Fetch user login account for a person
 */
export async function fetchUserAccount(personId: string): Promise<UserAccount | null> {
  try {
    const { data, error } = await db
      .from('user_accounts')
      .select('*')
      .eq('person_id', personId)
      .single();
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Fetch role assignments for a person
 */
export async function fetchUserRoles(personId: string): Promise<UserRoleAssignment[]> {
  try {
    const { data, error } = await db
      .from('user_role_assignments')
      .select('*')
      .eq('person_id', personId);
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

export const fetchPersonRoleAssignments = fetchUserRoles;

/**
 * Fetch complete dossier for a person (Person + Account + Roles)
 */
export async function fetchPersonDossier(personId: string): Promise<PersonDossier | null> {
  const person = await fetchPersonById(personId);
  if (!person) return null;

  const [account, roles] = await Promise.all([
    fetchUserAccount(personId),
    fetchUserRoles(personId)
  ]);

  let supervisorName: string | null = null;
  if (person.supervisor_id) {
    const sup = await fetchPersonById(person.supervisor_id);
    if (sup) {
      supervisorName = `${sup.first_name} ${sup.last_name} (#${sup.employee_number})`;
    }
  }

  return {
    ...person,
    account,
    roles,
    supervisor_name: supervisorName
  };
}

/**
 * Assign a module role to a person
 */
export async function assignUserRole(
  assignment: Omit<UserRoleAssignment, 'id' | 'created_at'>
): Promise<UserRoleAssignment> {
  const { data, error } = await db
    .from('user_role_assignments')
    .insert([assignment])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Revoke a role assignment
 */
export async function revokeUserRole(assignmentId: string): Promise<void> {
  const { error } = await db
    .from('user_role_assignments')
    .delete()
    .eq('id', assignmentId);

  if (error) throw error;
}

/**
 * Fetch catalog of system modules
 */
export async function fetchAppModules(): Promise<AppModule[]> {
  try {
    const { data, error } = await db
      .from('app_modules')
      .select('*')
      .eq('is_active', true)
      .order('code');
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

/**
 * Fetch module role definitions
 */
export async function fetchModuleRoles(moduleCode?: string): Promise<ModuleRole[]> {
  try {
    let query = db.from('module_roles').select('*');
    if (moduleCode) {
      query = query.eq('module_code', moduleCode);
    }
    const { data, error } = await query.order('role_code');
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

/**
 * Evaluate database helper function has_permission
 */
export async function checkDatabasePermission(
  moduleCode: string,
  requiredRole: string,
  department?: string,
  docType?: string
): Promise<boolean> {
  try {
    const { data, error } = await db.rpc('has_permission', {
      p_module_code: moduleCode,
      p_required_role: requiredRole,
      p_department: department || null,
      p_doc_type: docType || null
    });
    if (error) {
      console.warn('has_permission RPC error:', error);
      return false;
    }
    return !!data;
  } catch (err) {
    console.error('Exception calling has_permission RPC:', err);
    return false;
  }
}

/**
 * Fetch audit log entries
 */
export async function fetchUserManagementAuditLog(recordId?: string): Promise<UserManagementAuditEntry[]> {
  try {
    let query = db.from('user_management_audit_log').select('*');
    if (recordId) {
      query = query.eq('record_id', recordId);
    }
    const { data, error } = await query.order('timestamp', { ascending: false }).limit(50);
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}
