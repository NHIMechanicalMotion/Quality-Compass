// ============================================================================
// Quality Compass: Enterprise Unified Authentication Context
// Path: src/context/AuthContext.tsx
//
// Provides authentication state across CAD Inspection, QMS, APQP, and Training.
// Includes 5-minute inactivity auto-logout for shared shop-floor kiosks.
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';
import { 
  loginOffice as apiLoginOffice, 
  loginFloorKiosk as apiLoginFloor, 
  logoutUser as apiLogout, 
  changeUserPin as apiChangePin,
  type AuthenticatedUser, 
  type AuthLoginResult 
} from '../services/authService';
import { 
  fetchPersonById, 
  fetchPersonRoleAssignments 
} from '../services/userService';

const KIOSK_INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const INACTIVITY_WARNING_THRESHOLD_MS = 30 * 1000; // 30 seconds before timeout

interface AuthContextType {
  currentUser: AuthenticatedUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isKiosk: boolean;
  pinMustChange: boolean;
  inactivitySecondsRemaining: number | null;
  showInactivityWarning: boolean;
  inactivityNotice: string | null;
  loginOffice: (email: string, password: string) => Promise<AuthLoginResult>;
  loginFloor: (badgeNumber: string, pin: string) => Promise<AuthLoginResult>;
  logout: (reason?: string) => Promise<void>;
  submitPinChange: (newPin: string, oldPin?: string) => Promise<{ success: boolean; message: string }>;
  extendSession: () => void;
  clearInactivityNotice: () => void;
  hasRole: (moduleCode: string, roleCode: string) => boolean;
  hasPermission: (moduleCode: string, roleCode: string, department?: string, docType?: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pinMustChange, setPinMustChange] = useState<boolean>(false);
  const [inactivityNotice, setInactivityNotice] = useState<string | null>(null);
  const [inactivitySecondsRemaining, setInactivitySecondsRemaining] = useState<number | null>(null);
  const [showInactivityWarning, setShowInactivityWarning] = useState<boolean>(false);

  const lastActivityRef = useRef<number>(Date.now());
  const timerIntervalRef = useRef<any>(null);

  // 1. Initialize session from Supabase on mount
  useEffect(() => {
    let isMounted = true;

    async function loadUserFromSession(session: any) {
      if (!session?.user) {
        if (isMounted) setCurrentUser(null);
        return;
      }

      try {
        // Look up user_accounts by auth_user_id
        let { data: acc } = await (supabase as any)
          .from('user_accounts')
          .select('*')
          .eq('auth_user_id', session.user.id)
          .limit(1)
          .maybeSingle();

        // If no account is directly linked to auth_user_id yet, match by email (common for newly invited users)
        if (!acc && session.user.email) {
          const cleanEmail = session.user.email.toLowerCase().trim();
          const { data: personByEmail } = await (supabase as any)
            .from('people')
            .select('*')
            .eq('email', cleanEmail)
            .limit(1)
            .maybeSingle();

          if (personByEmail) {
            const { data: accByPerson } = await (supabase as any)
              .from('user_accounts')
              .select('*')
              .eq('person_id', personByEmail.id)
              .limit(1)
              .maybeSingle();

            if (accByPerson) {
              acc = accByPerson;
              // Auto-link auth_user_id to the user_accounts record
              if (!accByPerson.auth_user_id) {
                await (supabase as any)
                  .from('user_accounts')
                  .update({ auth_user_id: session.user.id })
                  .eq('id', accByPerson.id);
              }
            }
          }
        }

        if (acc && acc.is_active && !acc.is_locked && isMounted) {
          const person = await fetchPersonById(acc.person_id);
          if (person) {
            const roles = await fetchPersonRoleAssignments(person.id);
            setCurrentUser({
              person,
              account: acc,
              roles,
              authMethod: session.user.email?.endsWith('@kiosk.nhimm.internal') ? 'FLOOR_PIN' : 'OFFICE_PASSWORD',
              isKiosk: session.user.email?.endsWith('@kiosk.nhimm.internal') || false,
              pinMustChange: acc.pin_must_change,
            });
            setPinMustChange(acc.pin_must_change);
          }
        }
      } catch (err) {
        console.warn('Session user load error:', err);
      }
    }

    async function initSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && isMounted) {
          await loadUserFromSession(session);
        }
      } catch (err) {
        console.warn('Session initialization warning:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initSession();

    // Listen to Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setPinMustChange(false);
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
        if (session && isMounted) {
          await loadUserFromSession(session);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // 2. Inactivity Tracking for Kiosk Sessions (5-minute auto-logout)
  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowInactivityWarning(false);
    setInactivitySecondsRemaining(null);
  }, []);

  const logout = useCallback(async (reason?: string) => {
    try {
      await apiLogout();
    } finally {
      setCurrentUser(null);
      setPinMustChange(false);
      setShowInactivityWarning(false);
      setInactivitySecondsRemaining(null);
      if (reason === 'INACTIVITY') {
        setInactivityNotice('Kiosk session timed out after 5 minutes of inactivity.');
      }
    }
  }, []);

  useEffect(() => {
    // Only activate inactivity timer when logged in as a floor kiosk
    if (!currentUser || !currentUser.isKiosk) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      setShowInactivityWarning(false);
      setInactivitySecondsRemaining(null);
      return;
    }

    // Attach user activity listeners
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
    const handleUserActivity = () => resetActivity();

    activityEvents.forEach((ev) => window.addEventListener(ev, handleUserActivity, { passive: true }));
    lastActivityRef.current = Date.now();

    // Inactivity interval check every 1 second
    timerIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remainingMs = KIOSK_INACTIVITY_TIMEOUT_MS - elapsed;

      if (remainingMs <= 0) {
        // Inactivity timeout triggered!
        clearInterval(timerIntervalRef.current);
        logout('INACTIVITY');
      } else if (remainingMs <= INACTIVITY_WARNING_THRESHOLD_MS) {
        setShowInactivityWarning(true);
        setInactivitySecondsRemaining(Math.ceil(remainingMs / 1000));
      } else {
        setShowInactivityWarning(false);
        setInactivitySecondsRemaining(null);
      }
    }, 1000);

    return () => {
      activityEvents.forEach((ev) => window.removeEventListener(ev, handleUserActivity));
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [currentUser, logout, resetActivity]);

  // 3. Login Handlers
  const loginOffice = async (email: string, password: string): Promise<AuthLoginResult> => {
    setIsLoading(true);
    setInactivityNotice(null);
    try {
      const res = await apiLoginOffice(email, password);
      if (res.success && res.user) {
        setCurrentUser(res.user);
        setPinMustChange(res.user.pinMustChange);
        lastActivityRef.current = Date.now();
      }
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const loginFloor = async (badgeNumber: string, pin: string): Promise<AuthLoginResult> => {
    setIsLoading(true);
    setInactivityNotice(null);
    try {
      const res = await apiLoginFloor(badgeNumber, pin);
      if (res.success && res.user) {
        setCurrentUser(res.user);
        setPinMustChange(res.user.pinMustChange);
        lastActivityRef.current = Date.now();
      }
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const submitPinChange = async (newPin: string, oldPin?: string) => {
    if (!currentUser) return { success: false, message: 'No active session.' };
    const res = await apiChangePin(currentUser.person.id, newPin, oldPin);
    if (res.success) {
      setPinMustChange(false);
      setCurrentUser(prev => prev ? { ...prev, pinMustChange: false } : null);
    }
    return res;
  };

  const extendSession = () => {
    resetActivity();
  };

  const clearInactivityNotice = () => {
    setInactivityNotice(null);
  };

  // 4. Role & Permission Evaluators
  const hasRole = (moduleCode: string, roleCode: string): boolean => {
    if (!currentUser) return false;
    return currentUser.roles.some(
      (r) =>
        (r.module_code === moduleCode || r.module_code === 'SYSTEM_ADMIN') &&
        (r.role_code === roleCode || r.role_code === 'ADMIN')
    );
  };

  const hasPermission = (
    moduleCode: string,
    roleCode: string,
    department?: string,
    docType?: string
  ): boolean => {
    if (!currentUser) return false;
    return currentUser.roles.some((r) => {
      // System Admin match
      if (r.module_code === 'SYSTEM_ADMIN' || (r.module_code === moduleCode && r.role_code === 'ADMIN')) {
        return true;
      }
      // Exact role match
      if (r.module_code !== moduleCode || r.role_code !== roleCode) {
        return false;
      }
      // Department scope check
      if (r.scope_department && department && r.scope_department !== department) {
        return false;
      }
      // Doc type scope check
      if (r.scope_doc_type && docType && r.scope_doc_type !== docType) {
        return false;
      }
      return true;
    });
  };

  const value: AuthContextType = {
    currentUser,
    isAuthenticated: !!currentUser,
    isLoading,
    isKiosk: currentUser?.isKiosk || false,
    pinMustChange,
    inactivitySecondsRemaining,
    showInactivityWarning,
    inactivityNotice,
    loginOffice,
    loginFloor,
    logout,
    submitPinChange,
    extendSession,
    clearInactivityNotice,
    hasRole,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
