import { useInfiniteQuery } from '@tanstack/react-query'
import { History, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { LoadMore } from '@/components/ui/load-more'
import { SkeletonList } from '@/components/ui/skeleton'
import { languageLabel } from '@/components/editor/languages'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { relativeTime } from '@/lib/format'
import { queryKeys } from '@/services/query-keys'
import { submissionsApi } from '@/services/submissions.api'
import { StatusBadge } from '../components/status-badge'

export function SubmissionsPage() {
  useDocumentTitle('Submissions')

  const query = useInfiniteQuery({
    queryKey: queryKeys.submissions.mine(null),
    queryFn: ({ pageParam, signal }) => submissionsApi.mine(pageParam as string | null, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  })

  const items = query.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            History
          </p>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Your submissions</h1>
          <p className="text-sm text-muted-foreground">
            Every run is recorded with its language, verdict, and timing.
          </p>
        </div>
        <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => void query.refetch()}>
          Refresh
        </Button>
      </header>

      {query.isPending ? <SkeletonList rows={4} /> : null}
      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : null}

      {!query.isPending && !query.isError && items.length === 0 ? (
        <EmptyState
          icon={History}
          title="No submissions yet"
          description="Solve a challenge to create your first submission. Verdicts and points appear here."
          action={
            <Link to="/challenges" className="text-sm font-medium text-primary hover:underline">
              Browse challenges
            </Link>
          }
        />
      ) : null}

      <ul className="space-y-2">
        {items.map((submission) => (
          <li key={submission.id}>
            <Link
              to={`/submissions/${submission.id}`}
              className="card flex flex-col gap-2 p-4 transition-colors hover:border-border-strong sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {submission.challengeTitle ?? submission.challengeSlug ?? 'Challenge'}
                </p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  {languageLabel(submission.language)} · {relativeTime(submission.createdAt)}
                  {submission.pointsAwarded ? ` · +${submission.pointsAwarded} pts` : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="font-mono text-[11px] text-muted-foreground">
                  {submission.passedTests ?? '—'}/{submission.totalTests ?? '—'}
                </span>
                <StatusBadge status={submission.status} verdict={submission.verdict} />
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <LoadMore
        hasMore={Boolean(query.hasNextPage)}
        loading={query.isFetchingNextPage}
        onLoad={() => void query.fetchNextPage()}
      />
    </div>
  )
}
