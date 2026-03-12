import clsx from 'clsx';

interface BadgeProps {
  label: string | number;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'slate' | 'indigo' | 'rose';
  size?: 'sm' | 'md';
}

const colorMap = {
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
  purple: 'bg-purple-100 text-purple-700',
  slate: 'bg-slate-100 text-slate-600',
  indigo: 'bg-indigo-100 text-indigo-700',
  rose: 'bg-rose-100 text-rose-700',
};

export function Badge({ label, color = 'slate', size = 'md' }: BadgeProps) {
  return (
    <span className={clsx(
      'inline-flex items-center font-medium rounded-full',
      colorMap[color],
      size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
    )}>
      {label}
    </span>
  );
}

// Grade badge
export function GradeBadge({ grade, score }: { grade: string; score: number }) {
  const color = score >= 80 ? 'green' : score >= 70 ? 'blue' : score >= 60 ? 'amber' : score >= 50 ? 'purple' : 'red';
  return <Badge label={grade} color={color} />;
}

// Attendance status badge
export function AttendanceBadge({ status }: { status: string }) {
  const map: Record<string, 'green' | 'red' | 'amber' | 'blue'> = {
    present: 'green', absent: 'red', late: 'amber', excused: 'blue'
  };
  return <Badge label={status.charAt(0).toUpperCase() + status.slice(1)} color={map[status] || 'slate'} />;
}

// Severity badge
export function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, 'blue' | 'amber' | 'red' | 'rose'> = {
    low: 'blue', medium: 'amber', high: 'red', critical: 'rose'
  };
  return <Badge label={severity.charAt(0).toUpperCase() + severity.slice(1)} color={map[severity] || 'slate'} />;
}

// Fee status badge
export function FeeStatusBadge({ status }: { status: string }) {
  const map: Record<string, 'green' | 'blue' | 'red' | 'amber'> = {
    paid: 'green', partial: 'blue', overdue: 'red', pending: 'amber'
  };
  return <Badge label={status.charAt(0).toUpperCase() + status.slice(1)} color={map[status] || 'slate'} />;
}
