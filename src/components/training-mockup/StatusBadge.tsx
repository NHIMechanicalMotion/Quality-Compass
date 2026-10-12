import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  PlayCircle, 
  MinusCircle 
} from 'lucide-react';
import type { TrainingStatusType } from '../../data/mockTrainingData';

interface StatusBadgeProps {
  status: TrainingStatusType;
  customText?: string;
  size?: 'normal' | 'large';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  customText,
  size = 'normal',
  className = '',
}) => {
  const isLarge = size === 'large';
  const iconSizeClass = isLarge ? 'w-6 h-6 shrink-0' : 'w-5 h-5 shrink-0';
  const paddingClass = isLarge ? 'px-4 py-2.5 min-h-[48px]' : 'px-3.5 py-1.5 min-h-[38px]';

  switch (status) {
    case 'QUALIFIED':
      return (
        <span
          className={`inline-flex items-center gap-2.5 rounded-lg border-2 border-emerald-500 bg-emerald-950/80 text-emerald-200 font-semibold text-base shadow-sm ${paddingClass} ${className}`}
        >
          <CheckCircle2 className={`${iconSizeClass} text-emerald-400`} />
          <span>{customText || 'Qualified'}</span>
        </span>
      );

    case 'DUE_SOON':
      return (
        <span
          className={`inline-flex items-center gap-2.5 rounded-lg border-2 border-amber-500 bg-amber-950/80 text-amber-200 font-semibold text-base shadow-sm ${paddingClass} ${className}`}
        >
          <Clock className={`${iconSizeClass} text-amber-400`} />
          <span>{customText || 'Due Soon'}</span>
        </span>
      );

    case 'EXPIRED':
      return (
        <span
          className={`inline-flex items-center gap-2.5 rounded-lg border-2 border-rose-500 bg-rose-950/90 text-rose-200 font-bold text-base shadow-md animate-pulse ${paddingClass} ${className}`}
        >
          <AlertTriangle className={`${iconSizeClass} text-rose-400`} />
          <span>{customText || 'Expired (Overdue)'}</span>
        </span>
      );

    case 'IN_TRAINING':
      return (
        <span
          className={`inline-flex items-center gap-2.5 rounded-lg border-2 border-sky-500 bg-sky-950/80 text-sky-200 font-semibold text-base shadow-sm ${paddingClass} ${className}`}
        >
          <PlayCircle className={`${iconSizeClass} text-sky-400`} />
          <span>{customText || 'In Training (Level 1)'}</span>
        </span>
      );

    case 'NOT_TRAINED':
    default:
      return (
        <span
          className={`inline-flex items-center gap-2.5 rounded-lg border-2 border-slate-600 bg-slate-800/80 text-slate-300 font-medium text-base ${paddingClass} ${className}`}
        >
          <MinusCircle className={`${iconSizeClass} text-slate-400`} />
          <span>{customText || 'Not Trained'}</span>
        </span>
      );
  }
};
