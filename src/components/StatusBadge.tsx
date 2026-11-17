import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import type { AlertStage } from '../types/compliance';

interface StatusBadgeProps {
  stage: AlertStage;
}

const STAGE_STYLES: Record<
  AlertStage,
  { bg: string; text: string; border: string; Icon: typeof AlertCircle }
> = {
  Expired: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    Icon: ShieldAlert,
  },
  '14-Day Urgent': {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    Icon: AlertCircle,
  },
  '30-Day Warning': {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    Icon: AlertTriangle,
  },
  '60-Day Warning': {
    bg: 'bg-amber-50/70',
    text: 'text-amber-700',
    border: 'border-amber-200',
    Icon: Clock,
  },
  '90-Day Notice': {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    Icon: Clock,
  },
  Compliant: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    Icon: CheckCircle2,
  },
};

export function StatusBadge({ stage }: StatusBadgeProps) {
  const { bg, text, border, Icon } = STAGE_STYLES[stage];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium whitespace-nowrap ${bg} ${text} ${border}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{stage}</span>
    </span>
  );
}
