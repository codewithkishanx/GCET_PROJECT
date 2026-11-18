import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BookOpen, Code2, Flame, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { ErrorState } from '@/components/ui/error-state'
import { SkeletonList } from '@/components/ui/skeleton'
import { StatusBadge } from '@/features/submissions/components/status-badge'
import { useAuth } from '@/features/auth/auth-context'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { formatNumber, relativeTime } from '@/lib/format'
import { queryKeys } from '@/services/query-keys'
import { submissionsApi } from '@/services/submissions.api'
import { algorithms, topics } from '@/features/dsa/content/catalog'

const RECOMMENDED = ['bubble-sort', 'list-reverse', 'bfs']

export function DashboardPage() {
  useDocumentTitle('Dashboard')
  const { user } = useAuth()

  const recent = useQuery({
    queryKey: queryKeys.submissions.mine(),
    queryFn: ({ signal }) => submissionsApi.mine(undefined, signal),
  })

  const recommended = RECOMMENDED.map((slug) => algorithms.find((item) => item.slug === slug)).filter(
    (item): item is (typeof algorithms)[number] => Boolean(item),
  )

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Dashboard
        </p>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {user ? `Hi, ${user.displayName ?? user.username}` : 'Dashboard'}
        </h1>
        <p className="text-sm text-muted-foreground">
          Your score, recent submissions, and a next step that is actually next.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={Flame} label="Points" value={formatNumber(user?.points ?? 0)} hint="Awarded once per accepted challenge" />
        <StatCard icon={Trophy} label="Solved" value={formatNumber(user?.solvedCount ?? 0)} hint="Distinct challenges accepted" />
        <StatCard icon={BookOpen} label="Topics" value={String(topics.length)} hint={`${algorithms.length} algorithms available`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <section className="space-y-3">
          <div className="flex items-end justify-between">
            <h2 className="text-sm font-semibold">Recent submissions</h2>
            <Link to="/submissions" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          </div>

          {recent.isPending ? <SkeletonList rows={3} /> : null}
          {recent.isError ? (
            <ErrorState error={recent.error} onRetry={() => void recent.refetch()} compact />
          ) : null}
          {recent.data && recent.data.items.length === 0 ? (
            <div className="card flex flex-col items-center gap-2 px-6 py-10 text-center">
              <Code2 className="size-5 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm font-medium">No submissions yet</p>
              <p className="max-w-sm text-xs text-muted-foreground">
                Pick a challenge, fix the buggy starter code, and submit it. Verdicts appear here.
              </p>
              <Link to="/challenges" className="mt-1 text-xs font-semibold text-primary hover:underline">
                Browse challenges →
              </Link>
            </div>
          ) : null}
          {recent.data && recent.data.items.length > 0 ? (
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
              {recent.data.items.slice(0, 5).map((submission) => (
                <li key={submission.id}>
                  <Link
                    to={`/submissions/${submission.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-sunken"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {submission.challengeTitle ?? 'Challenge'}
                      </p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {submission.language} · {relativeTime(submission.createdAt)}
                      </p>
                    </div>
                    <StatusBadge status={submission.status} verdict={submission.verdict} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <aside className="space-y-3">
          <h2 className="text-sm font-semibold">Pick up a visualiser</h2>
          <div className="space-y-2">
            {recommended.map((algorithm) => (
              <Link
                key={algorithm.slug}
                to={`/algorithms/${algorithm.slug}`}
                className="card group flex items-center justify-between gap-2 p-3.5 transition-colors hover:border-border-strong"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{algorithm.title}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{algorithm.time}</p>
                </div>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            ))}
          </div>
          <div className="card p-4">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Badge tone="primary">Tip</Badge>
            </h3>
            <p className="mt-2 text-xs text-muted-foreground">
              Step backwards through a sort after the first swap. The comparison that caused the
              swap is one step earlier — reading it backwards is the fastest way to understand it.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3.5" aria-hidden={true} />
        {label}
      </div>
      <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </div>
  )
}
