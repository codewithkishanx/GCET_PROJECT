import { Badge } from '@/components/ui/badge'
import type { SubmissionStatus, Verdict } from '@/types'

export const verdictLabels: Record<Verdict, string> = {
  ACCEPTED: 'Accepted',
  WRONG_ANSWER: 'Wrong answer',
  COMPILATION_ERROR: 'Compilation error',
  RUNTIME_ERROR: 'Runtime error',
  TIME_LIMIT_EXCEEDED: 'Time limit exceeded',
  MEMORY_LIMIT_EXCEEDED: 'Memory limit exceeded',
  OUTPUT_LIMIT_EXCEEDED: 'Output limit exceeded',
  SYSTEM_ERROR: 'System error',
}

const verdictTones: Record<Verdict, 'success' | 'danger' | 'warning' | 'info'> = {
  ACCEPTED: 'success',
  WRONG_ANSWER: 'danger',
  COMPILATION_ERROR: 'warning',
  RUNTIME_ERROR: 'danger',
  TIME_LIMIT_EXCEEDED: 'warning',
  MEMORY_LIMIT_EXCEEDED: 'warning',
  OUTPUT_LIMIT_EXCEEDED: 'warning',
  SYSTEM_ERROR: 'danger',
}

const statusLabels: Record<SubmissionStatus, string> = {
  QUEUED: 'Queued',
  RUNNING: 'Running',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
}

export function StatusBadge({
  status,
  verdict,
}: {
  status: SubmissionStatus
  verdict: Verdict | null
}) {
  const normStatus = (
    status ? String(status).toUpperCase() : 'QUEUED'
  ) as SubmissionStatus
  if (normStatus === 'QUEUED') return <Badge tone="neutral">Queued</Badge>
  if (normStatus === 'RUNNING') return <Badge tone="info">Running</Badge>
  if (normStatus === 'FAILED') return <Badge tone="danger">Failed</Badge>
  if (verdict) return <Badge tone={verdictTones[verdict]}>{verdictLabels[verdict]}</Badge>
  return <Badge tone="neutral">{statusLabels[normStatus] ?? normStatus}</Badge>
}

export function verdictTone(verdict: Verdict | null) {
  return verdict ? verdictTones[verdict] : 'neutral'
}
