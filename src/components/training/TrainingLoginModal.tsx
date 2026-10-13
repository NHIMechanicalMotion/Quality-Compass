// ============================================================================
// Quality Compass: Training Authentication Adapter (Step 2A.b)
// Path: src/components/training/TrainingLoginModal.tsx
//
// Adapter wrapping the unified enterprise AuthModal.
// All hardcoded demo presets, quick-switch presets, and fake PINs (1234)
// have been permanently removed. Real credentials enforced via Supabase.
// ============================================================================

import React from 'react';
import type { SystemUserRole } from '../../types/training';
import { AuthModal } from '../auth/AuthModal';
import { useAuth } from '../../context/AuthContext';

export interface CurrentUserSession {
  role: SystemUserRole;
  employeeId: string;
  name: string;
  badgeNumber: string;
  department: string;
}

interface TrainingLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: CurrentUserSession;
  onSelectUser?: (user: CurrentUserSession) => void;
}

export const TrainingLoginModal: React.FC<TrainingLoginModalProps> = ({
  isOpen,
  onClose,
  onSelectUser,
}) => {
  const { currentUser: authUser } = useAuth();

  // If parent component provided legacy onSelectUser callback, sync it when auth changes
  React.useEffect(() => {
    if (authUser && onSelectUser) {
      // Determine training role from assigned roles
      let trainingRole: SystemUserRole = 'OPERATOR';
      if (authUser.roles.some((r) => r.module_code === 'SYSTEM_ADMIN' || r.role_code === 'ADMIN')) {
        trainingRole = 'ADMIN';
      } else if (authUser.roles.some((r) => r.role_code === 'SUPERVISOR')) {
        trainingRole = 'SUPERVISOR';
      } else if (authUser.roles.some((r) => r.role_code === 'TRAINER')) {
        trainingRole = 'TRAINER';
      }

      onSelectUser({
        role: trainingRole,
        employeeId: authUser.person.id,
        name: `${authUser.person.first_name} ${authUser.person.last_name}`,
        badgeNumber: authUser.person.employee_number || '',
        department: authUser.person.job_title || authUser.person.operating_company,
      });
    }
  }, [authUser, onSelectUser]);

  return <AuthModal isOpen={isOpen} onClose={onClose} defaultMode="FLOOR" />;
};
