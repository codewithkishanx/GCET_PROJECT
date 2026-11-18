import { AlertTriangle, CheckCircle2, Clock, Cpu, ExternalLink, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { ErrorState } from '@/components/ui/error-state'
import { useAuth } from '@/features/auth/auth-context'
import { formatDuration } from '@/lib/format'
import type { SubmissionDetail } from '@/types'
import { StatusBadge, verdictLabels } from './status-badge'

export function VerdictPanel({
  submission,
  error,
  loading,
  onRetry,
}: {
  submission: SubmissionDetail | undefined
  error: unknown
  loading: boolean
  onRetry: () => void
}) {
  const { user } = useAuth()

  if (error) return <ErrorState error={error} onRetry={onRetry} compact />

  if (loading || !submission) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-border bg-surface-sunken px-4 py-3 text-xs text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        <span>Loading submission…</span>
      </div>
    )
  }

  const normStatus = submission.status ? String(submission.status).toUpperCase() : ''
  const terminal = normStatus === 'COMPLETED' || normStatus === 'FAILED'
  const accepted = submission.verdict === 'ACCEPTED'

  return (
    <div className="space-y-3" aria-live="polite">
      <div
        className={
          accepted
            ? 'rounded-2xl border border-success/30 bg-success-soft/70 p-5'
            : terminal
              ? 'rounded-2xl border border-danger/25 bg-danger-soft/70 p-5'
              : 'rounded-2xl border border-info/25 bg-info-soft/70 p-5'
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            {accepted ? (
              <CheckCircle2 className="size-5 text-success shrink-0" aria-hidden="true" />
            ) : terminal ? (
              <AlertTriangle className="size-5 text-danger shrink-0" aria-hidden="true" />
            ) : (
              <Loader2 className="size-5 animate-spin text-info shrink-0" aria-hidden="true" />
            )}
            <p className="text-sm font-semibold tracking-tight text-foreground">
              {submission.verdict
                ? verdictLabels[submission.verdict]
                : normStatus === 'RUNNING'
                  ? 'Running on judge…'
                  : 'Waiting in queue…'}
            </p>
          </div>
          <StatusBadge status={submission.status} verdict={submission.verdict} />
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <div className="rounded-xl bg-surface/50 border border-border/40 p-2.5">
            <dt className="text-muted-foreground">Tests</dt>
            <dd className="font-mono text-sm font-semibold tabular-nums mt-0.5">
              {submission.passedTests ?? '—'} / {submission.totalTests ?? '—'}
            </dd>
          </div>
          <div className="rounded-xl bg-surface/50 border border-border/40 p-2.5">
            <dt className="flex items-center gap-1 text-muted-foreground">
              <Clock className="size-3" aria-hidden="true" /> Time
            </dt>
            <dd className="font-mono text-sm font-semibold tabular-nums mt-0.5">{formatDuration(submission.durationMs)}</dd>
          </div>
          <div className="rounded-xl bg-surface/50 border border-border/40 p-2.5">
            <dt className="flex items-center gap-1 text-muted-foreground">
              <Cpu className="size-3" aria-hidden="true" /> Memory
            </dt>
            <dd className="font-mono text-sm font-semibold tabular-nums mt-0.5">
              {submission.memoryKb === null ? '—' : `${Math.round(submission.memoryKb / 1024)} MB`}
            </dd>
          </div>
          <div className="rounded-xl bg-surface/50 border border-border/40 p-2.5">
            <dt className="text-muted-foreground">Points</dt>
            <dd className="font-mono text-sm font-semibold tabular-nums mt-0.5">
              {submission.pointsAwarded === null ? '—' : `+${submission.pointsAwarded}`}
            </dd>
          </div>
        </dl>

        {accepted && submission.pointsAwarded ? (
          <p className="mt-3 text-xs text-success font-medium">
            Awarded once for this challenge{user ? ` · total points: ${user.points}` : ''}.
          </p>
        ) : null}
      </div>

      {submission.failedTest ? (
        <div className="space-y-3 rounded-2xl border border-danger/25 bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <p className="text-xs font-semibold text-danger">
              Failed test case #{submission.failedTest.index}
            </p>
          </div>
          <div className="space-y-2.5 text-xs">
            {submission.failedTest.input !== undefined && submission.failedTest.input !== null ? (
              <div>
                <span className="text-[11px] font-medium text-muted-foreground">
                  Input:
                </span>
                <pre className="mt-1 max-h-32 overflow-auto rounded-xl bg-surface-sunken p-2.5 font-mono text-[11px] leading-relaxed">
                  {submission.failedTest.input || '(empty input)'}
                </pre>
              </div>
            ) : null}
            {submission.failedTest.expectedOutput !== undefined &&
            submission.failedTest.expectedOutput !== null ? (
              <div>
                <span className="text-[11px] font-medium text-success">
                  Expected output:
                </span>
                <pre className="mt-1 max-h-32 overflow-auto rounded-xl bg-surface-sunken p-2.5 font-mono text-[11px] leading-relaxed text-success">
                  {submission.failedTest.expectedOutput || '(empty output)'}
                </pre>
              </div>
            ) : null}
            {submission.failedTest.actualOutput ? (
              <div>
                <span className="text-[11px] font-medium text-danger">
                  Your output:
                </span>
                <pre className="mt-1 max-h-32 overflow-auto rounded-xl bg-surface-sunken p-2.5 font-mono text-[11px] leading-relaxed text-danger">
                  {submission.failedTest.actualOutput}
                </pre>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {submission.errorMessage ? (
        <div className="rounded-2xl border border-danger/25 bg-surface p-4 shadow-sm">
          <p className="text-xs font-semibold text-danger">
            Judge message
          </p>
          <pre className="mt-1.5 max-h-40 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-foreground">
            {submission.errorMessage}
          </pre>
        </div>
      ) : null}

      {submission.output ? (
        <details className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">
            Runtime output (truncated by server)
          </summary>
          <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed">
            {submission.output}
          </pre>
        </details>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground pt-1">
        <span className="font-mono tabular-nums text-[11px]">submission {submission.id.slice(0, 8)}</span>
        <Link
          to={`/submissions/${submission.id}`}
          className="inline-flex items-center gap-1 font-medium text-primary hover:underline active:opacity-75"
        >
          Permanent link
          <ExternalLink className="size-3" aria-hidden="true" />
        </Link>
      </div>

      {terminal && !accepted ? (
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Review the test case input, expected output, and your output above to debug the issue.
        </p>
      ) : null}

      {normStatus === 'RUNNING' || normStatus === 'QUEUED' ? (
        <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Badge tone="info">polling</Badge>
          Status updates automatically when execution completes.
        </p>
      ) : null}
    </div>
  )
}
