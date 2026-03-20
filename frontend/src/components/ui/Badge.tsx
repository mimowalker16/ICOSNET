import type { AssetStatus, Severity, IncidentStatus } from '@/types'
import { cn } from '@/lib/utils'

const statusStyles: Record<AssetStatus, string> = {
  UP:       'bg-[var(--color-up-bg)] text-[var(--color-up)]',
  DOWN:     'bg-[var(--color-down-bg)] text-[var(--color-down)]',
  DEGRADED: 'bg-[var(--color-degraded-bg)] text-[var(--color-degraded)]',
}

const severityStyles: Record<Severity, string> = {
  CRITICAL: 'bg-[var(--color-critical-bg)] text-[var(--color-critical)]',
  HIGH:     'bg-[var(--color-high-bg)] text-[var(--color-high)]',
  MEDIUM:   'bg-[var(--color-medium-bg)] text-[var(--color-medium)]',
  LOW:      'bg-[var(--color-low-bg)] text-[var(--color-low)]',
}

const incidentStatusStyles: Record<IncidentStatus, string> = {
  NEW:         'bg-slate-100 text-slate-700',
  ASSIGNED:    'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-orange-100 text-orange-700',
  RESOLVED:    'bg-green-100 text-green-700',
  CLOSED:      'bg-gray-100 text-gray-600',
}

interface BadgeProps {
  value: string
  type: 'asset-status' | 'severity' | 'incident-status'
  className?: string
}

export default function Badge({ value, type, className }: BadgeProps) {
  const styles =
    type === 'asset-status'     ? statusStyles[value as AssetStatus] :
    type === 'severity'         ? severityStyles[value as Severity] :
                                  incidentStatusStyles[value as IncidentStatus]

  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide',
      styles, className
    )}>
      {value.replace('_', ' ')}
    </span>
  )
}
