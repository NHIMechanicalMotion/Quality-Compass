import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, PlayCircle, MinusCircle, Award } from 'lucide-react';
import type { TrainingStatusType, QualificationLevel } from '../../types/training';

interface StatusBadgeProps {
  status?: TrainingStatusType;
  level?: QualificationLevel;
  className?: string;
  size?: 'normal' | 'large';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status = 'QUALIFIED',
  level,
  className = '',
  size = 'normal'
}) => {
  // If a qualification level is supplied, format level badge with Tri-Attribute style
  if (level !== undefined) {
    if (level === 0) {
      return (
        <span
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-semibold ${
            size === 'large' ? 'text-lg min-h-[48px]' : 'text-base min-h-[40px]'
          } bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 ${className}`}
        >
          <MinusCircle className="w-5 h-5 text-slate-500 shrink-0" />
          <span>Not Qualified</span>
        </span>
      );
    }
    if (level === 1) {
      return (
        <span
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-semibold ${
            size === 'large' ? 'text-lg min-h-[48px]' : 'text-base min-h-[40px]'
          } bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800 ${className}`}
        >
          <PlayCircle className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
          <span>Level 1: Trainee</span>
        </span>
      );
    }
    if (level === 2) {
      return (
        <span
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-semibold ${
            size === 'large' ? 'text-lg min-h-[48px]' : 'text-base min-h-[40px]'
          } bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 ${className}`}
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Level 2: Qualified</span>
        </span>
      );
    }
    if (level === 3) {
      return (
        <span
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-semibold ${
            size === 'large' ? 'text-lg min-h-[48px]' : 'text-base min-h-[40px]'
          } bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 ${className}`}
        >
          <Award className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>Level 3: Expert / Trainer</span>
        </span>
      );
    }
    if (level === 4) {
      return (
        <span
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-semibold ${
            size === 'large' ? 'text-lg min-h-[48px]' : 'text-base min-h-[40px]'
          } bg-purple-50 text-purple-900 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800 ${className}`}
        >
          <Award className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0" />
          <span>Level 4: Master Specialist</span>
        </span>
      );
    }
  }

  // Tri-Attribute Status Presentation (Color + Word + Icon)
  switch (status) {
    case 'QUALIFIED':
      return (
        <span
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-semibold ${
            size === 'large' ? 'text-lg min-h-[48px]' : 'text-base min-h-[40px]'
          } bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 ${className}`}
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Qualified</span>
        </span>
      );

    case 'DUE_SOON':
      return (
        <span
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-semibold ${
            size === 'large' ? 'text-lg min-h-[48px]' : 'text-base min-h-[40px]'
          } bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 ${className}`}
        >
          <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>Due Soon</span>
        </span>
      );

    case 'EXPIRED':
      return (
        <span
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-semibold ${
            size === 'large' ? 'text-lg min-h-[48px]' : 'text-base min-h-[40px]'
          } bg-rose-50 text-rose-900 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800 ${className}`}
        >
          <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>Expired</span>
        </span>
      );

    case 'IN_TRAINING':
      return (
        <span
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-semibold ${
            size === 'large' ? 'text-lg min-h-[48px]' : 'text-base min-h-[40px]'
          } bg-sky-50 text-sky-900 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800 ${className}`}
        >
          <PlayCircle className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
          <span>In Training</span>
        </span>
      );

    case 'NOT_TRAINED':
    default:
      return (
        <span
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-semibold ${
            size === 'large' ? 'text-lg min-h-[48px]' : 'text-base min-h-[40px]'
          } bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 ${className}`}
        >
          <MinusCircle className="w-5 h-5 text-slate-500 shrink-0" />
          <span>Not Trained</span>
        </span>
      );
  }
};
