// ============================================================================
// Quality Compass: Unified Authentication Service
// Path: src/services/authService.ts
//
// Supports Office Email/Password login and Floor Kiosk Badge/PIN login
// with automatic session minting, lockout protection, and PIN change flow.
// ============================================================================

import { supabase } from './supabase';
import { 
  fetchPersonById, 
  fetchPersonRoleAssignments, 
  type Person, 
  type UserAccount, 
  type UserRoleAssignment 
} from './userService';

const db = supabase as any;

export interface AuthenticatedUser {
  person: Person;
  account: UserAccount | null;
  roles: UserRoleAssignment[];
  authMethod: 'OFFICE_PASSWORD' | 'FLOOR_PIN';
  isKiosk: boolean;
  pinMustChange: boolean;
}

export interface AuthLoginResult {
  success: boolean;
  user?: AuthenticatedUser;
  error?: string;
  errorCode?: 'RATE_LIMITED' | 'ACCOUNT_LOCKED' | 'INVALID_CREDENTIALS' | 'DEACTIVATED' | 'SERVER_ERROR' | 'UNKNOWN';
}

/**
 * 1. Office Staff Login (Standard Supabase Auth with Email and Password)
 */
export async function loginOffice(email: string, password: string): Promise<AuthLoginResult> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    
    // Sign in via Supabase GoTrue Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: password,
    });

    if (authError || !authData.user) {
      return {
        success: false,
        error: authError?.message || 'Invalid email or password.',
        errorCode: 'INVALID_CREDENTIALS',
      };
    }

    // Lookup corresponding people record by email
    const { data: personData } = await db
      .from('people')
      .select('*')
      .eq('email', cleanEmail)
      .limit(1)
      .maybeSingle();

    // Lookup corresponding user_accounts record
    let accountQuery = db.from('user_accounts').select('*');
    if (personData) {
      accountQuery = accountQuery.or(`auth_user_id.eq.${authData.user.id},person_id.eq.${personData.id}`);
    } else {
      accountQuery = accountQuery.eq('auth_user_id', authData.user.id);
    }
    let { data: accountData, error: accError } = await accountQuery.limit(1).maybeSingle();

    if (accError) {
      console.error('Error fetching user account:', accError);
    }

    // Auto-provision user_accounts record if person exists in directory
    if (!accountData && personData) {
      const { data: newAccount, error: createAccErr } = await db
        .from('user_accounts')
        .insert([{
          person_id: personData.id,
          auth_user_id: authData.user.id,
          is_active: true,
          is_locked: false,
          failed_attempts: 0,
          pin_must_change: false,
        }])
        .select()
        .single();

      if (!createAccErr && newAccount) {
        accountData = newAccount;
      }
    } else if (accountData && !accountData.auth_user_id) {
      // Link the authenticated user id
      await db
        .from('user_accounts')
        .update({ auth_user_id: authData.user.id })
        .eq('id', accountData.id);
      accountData.auth_user_id = authData.user.id;
    }

    if (!accountData) {
      return {
        success: false,
        error: 'Your login credentials are valid, but no matching employee profile was found in Quality Compass. Contact HR.',
        errorCode: 'DEACTIVATED',
      };
    }

    if (!accountData.is_active) {
      await supabase.auth.signOut();
      return {
        success: false,
        error: 'This account has been deactivated. Contact your Quality Administrator.',
        errorCode: 'DEACTIVATED',
      };
    }

    if (accountData.is_locked) {
      await supabase.auth.signOut();
      return {
        success: false,
        error: 'This account is locked due to multiple failed login attempts. Contact your Supervisor or HR.',
        errorCode: 'ACCOUNT_LOCKED',
      };
    }

    // Fetch master person profile
    const person = await fetchPersonById(accountData.person_id);
    if (!person) {
      await supabase.auth.signOut();
      return {
        success: false,
        error: 'Associated employee record not found in system directory.',
        errorCode: 'DEACTIVATED',
      };
    }

    // Fetch active roles
    const roles = await fetchPersonRoleAssignments(person.id);

    return {
      success: true,
      user: {
        person,
        account: accountData as UserAccount,
        roles,
        authMethod: 'OFFICE_PASSWORD',
        isKiosk: false,
        pinMustChange: accountData.pin_must_change,
      },
    };
  } catch (err: any) {
    console.error('Office login unexpected error:', err);
    return {
      success: false,
      error: err.message || 'An unexpected error occurred during login.',
      errorCode: 'SERVER_ERROR',
    };
  }
}

/**
 * 2. Floor Kiosk Login (Badge Number + 4-Digit PIN via Edge Function)
 */
export async function loginFloorKiosk(badgeNumber: string, pin: string): Promise<AuthLoginResult> {
  const cleanBadge = badgeNumber.trim();
  const cleanPin = pin.trim();

  if (!cleanBadge || !cleanPin) {
    return {
      success: false,
      error: 'Please enter both your badge number and 4-digit PIN.',
      errorCode: 'INVALID_CREDENTIALS',
    };
  }

  try {
    // Invoke Supabase Edge Function
    const { data: edgeData, error: edgeError } = await supabase.functions.invoke('kiosk-pin-login', {
      body: {
        badge_number: cleanBadge,
        pin: cleanPin,
      },
    });

    // Check for Edge Function errors
    if (edgeError) {
      // If Edge Function returned a specific HTTP error payload
      let parsedError = edgeError.message;
      let errorCode: any = 'SERVER_ERROR';

      // FunctionsHttpError often attaches the response JSON context
      try {
        if ((edgeError as any).context) {
          const body = await (edgeError as any).context.json();
          if (body?.error) parsedError = body.error;
          if (body?.code) errorCode = body.code;
        }
      } catch {
        // Fallback to message
      }

      // If Edge Function is not yet deployed on Supabase project, try direct RPC fallback
      if (edgeError.message?.includes('Failed to send') || edgeError.message?.includes('not found') || edgeError.message?.includes('FunctionsFetchError')) {
        console.warn('Edge function kiosk-pin-login unreachable. Attempting direct database RPC fallback...');
        return await fallbackDirectRpcLogin(cleanBadge, cleanPin);
      }

      return {
        success: false,
        error: parsedError || 'Kiosk login failed.',
        errorCode: errorCode || 'SERVER_ERROR',
      };
    }

    if (!edgeData || !edgeData.person) {
      return {
        success: false,
        error: 'Invalid response from kiosk authentication service.',
        errorCode: 'SERVER_ERROR',
      };
    }

    // Set genuine Supabase Auth session in client
    if (edgeData.session) {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: edgeData.session.access_token,
        refresh_token: edgeData.session.refresh_token,
      });

      if (sessionError) {
        console.warn('Failed to set Supabase client session:', sessionError);
      }
    }

    // Fetch full person profile and roles
    const person = await fetchPersonById(edgeData.person.id);
    const roles = await fetchPersonRoleAssignments(edgeData.person.id);

    return {
      success: true,
      user: {
        person: person || edgeData.person,
        account: null,
        roles,
        authMethod: 'FLOOR_PIN',
        isKiosk: true,
        pinMustChange: edgeData.pin_must_change === true,
      },
    };
  } catch (err: any) {
    console.error('Kiosk login exception:', err);
    // Try direct RPC fallback if network error
    return await fallbackDirectRpcLogin(cleanBadge, cleanPin);
  }
}

/**
 * Direct RPC Fallback for environments where the Edge Function has not yet been deployed
 */
async function fallbackDirectRpcLogin(badgeNumber: string, pin: string): Promise<AuthLoginResult> {
  try {
    const { data: rpcResult, error: rpcError } = await (supabase as any).rpc('kiosk_pin_login', {
      p_ip: 'kiosk-client',
      p_badge: badgeNumber,
      p_pin: pin,
    });

    if (rpcError) {
      return {
        success: false,
        error: rpcError.message || 'Database authentication verification failed.',
        errorCode: 'SERVER_ERROR',
      };
    }

    if (rpcResult.status === 'RATE_LIMITED') {
      return { success: false, error: rpcResult.message, errorCode: 'RATE_LIMITED' };
    }
    if (rpcResult.status === 'LOCKED') {
      return { success: false, error: rpcResult.message, errorCode: 'ACCOUNT_LOCKED' };
    }
    if (rpcResult.status === 'DEACTIVATED') {
      return { success: false, error: rpcResult.message, errorCode: 'DEACTIVATED' };
    }
    if (rpcResult.status !== 'OK') {
      return { success: false, error: rpcResult.message || 'Invalid Badge Number or PIN.', errorCode: 'INVALID_CREDENTIALS' };
    }

    const person = await fetchPersonById(rpcResult.person_id);
    const roles = await fetchPersonRoleAssignments(rpcResult.person_id);

    return {
      success: true,
      user: {
        person: person || {
          id: rpcResult.person_id,
          employee_number: rpcResult.employee_number,
          first_name: rpcResult.first_name,
          last_name: rpcResult.last_name,
          job_title: rpcResult.job_title,
          operating_company: rpcResult.operating_company,
          status: 'ACTIVE',
        } as Person,
        account: null,
        roles,
        authMethod: 'FLOOR_PIN',
        isKiosk: true,
        pinMustChange: rpcResult.pin_must_change === true,
      },
    };
  } catch (rpcErr: any) {
    return {
      success: false,
      error: rpcErr.message || 'Authentication failed. Please verify database connectivity.',
      errorCode: 'SERVER_ERROR',
    };
  }
}

/**
 * 3. Change PIN (Enforces 4 digits, rejects common patterns, clears pin_must_change)
 */
export async function changeUserPin(
  personId: string,
  newPin: string,
  oldPin: string = ''
): Promise<{ success: boolean; message: string }> {
  try {
    const { data, error } = await (supabase as any).rpc('change_user_pin', {
      p_person_id: personId,
      p_old_pin: oldPin,
      p_new_pin: newPin,
    });

    if (error) {
      return { success: false, message: error.message };
    }

    return {
      success: data?.success === true,
      message: data?.message || (data?.success ? 'PIN updated successfully.' : 'Failed to update PIN.'),
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to update PIN.' };
  }
}

/**
 * 4. Sign Out
 */
export async function logoutUser(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.warn('Sign out error:', e);
  }
}
