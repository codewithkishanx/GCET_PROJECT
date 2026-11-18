import { useQuery } from '@tanstack/react-query'
import { Activity, AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ErrorState } from '@/components/ui/error-state'
import { SkeletonList } from '@/components/ui/skeleton'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { formatNumber, relativeTime } from '@/lib/format'
import { queryKeys } from '@/services/query-keys'
import { adminApi } from '@/services/admin.api'

export function AdminOpsPage() {
  useDocumentTitle('Admin · Operations')
  const query = useQuery({
    queryKey: queryKeys.admin.overview,
    queryFn: ({ signal }) => adminApi.overview(signal),
  })

  if (query.isPending) return <SkeletonList rows={3} />
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />

  const { queue, counts, recentActivity } = query.data
  const jobActivity = recentActivity.filter((item) => /submission|job|worker/i.test(item.type))

  return (
    <div className="space-y-5">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Admin
        </p>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Execution operations</h1>
        <p className="text-sm text-muted-foreground">
          Queue health as reported by the API. Worker internals, container logs, and sandbox
          configuration are not exposed here by design.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Waiting
            </span>
            <Clock className="size-4 text-muted-foreground" aria-hidden="true" />
          </div>
          <p className="mt-1 font-mono text-2xl font-semibold">{formatNumber(queue.waiting)}</p>
          <p className="text-[11px] text-muted-foreground">Jobs queued for a worker</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Running
            </span>
            <Activity className="size-4 text-info" aria-hidden="true" />
          </div>
          <p className="mt-1 font-mono text-2xl font-semibold">{formatNumber(queue.active)}</p>
          <p className="text-[11px] text-muted-foreground">Active sandboxes</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Failed (24h)
            </span>
            <AlertTriangle
              className={queue.failedLast24h > 0 ? 'size-4 text-danger' : 'size-4 text-success'}
              aria-hidden="true"
            />
          </div>
          <p className="mt-1 font-mono text-2xl font-semibold">{formatNumber(queue.failedLast24h)}</p>
          <p className="text-[11px] text-muted-foreground">Infrastructure or system failures</p>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="text-sm font-semibold">Submission totals</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-[11px] text-muted-foreground">Last 24h</dt>
            <dd className="font-mono">{formatNumber(counts.submissionsLast24h)}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted-foreground">Accepted</dt>
            <dd className="font-mono">{formatNumber(counts.acceptedSubmissions)}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted-foreground">Published challenges</dt>
            <dd className="font-mono">
              {counts.publishedChallenges}/{counts.challenges}
            </dd>
          </div>
        </dl>
      </div>

      <div className="card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Execution-related activity</h2>
        </div>
        {jobActivity.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No execution events reported.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {jobActivity.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <CheckCircle2 className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <p className="truncate text-sm">{item.summary}</p>
                </div>
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                  {relativeTime(item.at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <Badge tone="neutral">Documented limitation</Badge>
        <p className="mt-2 text-xs text-muted-foreground">
          Queue depth alone cannot prove worker health. Production runs should also monitor worker
          heartbeats, timeout rate, and container cleanup, and those signals belong on the worker,
          not in the browser.
        </p>
      </div>
    </div>
  )
}
