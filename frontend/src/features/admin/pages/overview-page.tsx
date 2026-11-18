import { useQuery } from '@tanstack/react-query'
import { Activity, AlertTriangle, Flag, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { ErrorState } from '@/components/ui/error-state'
import { SkeletonList } from '@/components/ui/skeleton'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { formatNumber, relativeTime } from '@/lib/format'
import { queryKeys } from '@/services/query-keys'
import { adminApi } from '@/services/admin.api'

export function AdminOverviewPage() {
  useDocumentTitle('Admin overview')
  const query = useQuery({
    queryKey: queryKeys.admin.overview,
    queryFn: ({ signal }) => adminApi.overview(signal),
  })

  if (query.isPending) return <SkeletonList rows={4} />
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />

  const { counts, queue, recentActivity } = query.data

  return (
    <div className="space-y-5">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Admin
        </p>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Platform overview</h1>
        <p className="text-sm text-muted-foreground">
          Aggregates are served by the API. Nothing on this page is fabricated when the API is
          unavailable.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          icon={Users}
          label="Users"
          value={formatNumber(counts.users)}
          hint={`${counts.activeUsers} active · ${counts.suspendedUsers} suspended`}
        />
        <Metric
          icon={Activity}
          label="Submissions (24h)"
          value={formatNumber(counts.submissionsLast24h)}
          hint={`${formatNumber(counts.acceptedSubmissions)} accepted all-time`}
        />
        <Metric
          icon={Flag}
          label="Open reports"
          value={formatNumber(counts.openReports)}
          hint="Needs moderator attention"
          tone={counts.openReports > 0 ? 'warning' : 'neutral'}
        />
        <Metric
          icon={AlertTriangle}
          label="Queue failures (24h)"
          value={formatNumber(queue.failedLast24h)}
          hint={`${queue.waiting} waiting · ${queue.active} running`}
          tone={queue.failedLast24h > 0 ? 'danger' : 'neutral'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <section className="card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Recent activity</h2>
          </div>
          {recentActivity.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No recorded activity yet.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {recentActivity.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{item.summary}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {item.type} · {item.actor}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {relativeTime(item.at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="space-y-3">
          <div className="card p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Content
            </h2>
            <dl className="mt-2 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Challenges</dt>
                <dd className="font-mono">{counts.challenges}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Published</dt>
                <dd className="font-mono">{counts.publishedChallenges}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Posts</dt>
                <dd className="font-mono">{counts.posts}</dd>
              </div>
            </dl>
          </div>

          <div className="card space-y-2 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Shortcuts
            </h2>
            <Link to="/admin/reports" className="block text-sm text-primary hover:underline">
              Moderation queue →
            </Link>
            <Link to="/admin/users" className="block text-sm text-primary hover:underline">
              User accounts →
            </Link>
            <Link to="/admin/challenges" className="block text-sm text-primary hover:underline">
              Challenge editor →
            </Link>
          </div>

          <div className="card p-4">
            <Badge tone="neutral">No secrets</Badge>
            <p className="mt-2 text-[11px] text-muted-foreground">
              This console never receives Docker configuration, database credentials, hidden tests,
              or reference solutions.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  label: string
  value: string
  hint: string
  tone?: 'neutral' | 'warning' | 'danger'
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <Icon className="size-4 text-muted-foreground" aria-hidden={true} />
      </div>
      <p
        className={
          tone === 'danger'
            ? 'mt-1 font-mono text-2xl font-semibold text-danger'
            : tone === 'warning'
              ? 'mt-1 font-mono text-2xl font-semibold text-warning'
              : 'mt-1 font-mono text-2xl font-semibold'
        }
      >
        {value}
      </p>
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </div>
  )
}
