import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Trophy } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Page } from '@/components/layout/public-layout'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { SkeletonList } from '@/components/ui/skeleton'
import { languageLabel } from '@/components/editor/languages'
import { useAuth } from '@/features/auth/auth-context'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { formatDate, formatNumber, initials } from '@/lib/format'
import { queryKeys } from '@/services/query-keys'
import { usersApi } from '@/services/users.api'

export function PublicProfilePage() {
  const { username = '' } = useParams()
  const { user: me } = useAuth()
  useDocumentTitle(`@${username}`)

  const profile = useQuery({
    queryKey: queryKeys.users.profile(username),
    queryFn: ({ signal }) => usersApi.byUsername(username, signal),
    enabled: Boolean(username),
  })

  const stats = useQuery({
    queryKey: queryKeys.users.stats(username),
    queryFn: ({ signal }) => usersApi.stats(username, signal),
    enabled: Boolean(username),
  })

  if (profile.isPending) {
    return (
      <Page>
        <SkeletonList rows={3} />
      </Page>
    )
  }

  if (profile.isError) {
    return (
      <Page>
        <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />
      </Page>
    )
  }

  const user = profile.data.user

  return (
    <Page className="!max-w-4xl">
      <Link
        to="/leaderboard"
        className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Leaderboard
      </Link>

      <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-primary-soft text-xl font-semibold text-primary">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="size-full object-cover" />
          ) : (
            initials(user.displayName ?? user.username)
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">
              {user.displayName ?? user.username}
            </h1>
            <span className="font-mono text-xs text-muted-foreground">@{user.username}</span>
            {me?.username === user.username ? <Badge tone="primary">you</Badge> : null}
            {user.role === 'admin' ? <Badge tone="info">admin</Badge> : null}
          </div>
          {user.bio ? <p className="mt-1 text-sm text-muted-foreground">{user.bio}</p> : null}
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            joined {formatDate(user.createdAt)}
          </p>
        </div>
        <div className="flex gap-4 rounded-xl border border-border bg-surface-sunken px-4 py-3">
          <div className="text-center">
            <p className="font-mono text-lg font-semibold tabular-nums">{formatNumber(user.points)}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">points</p>
          </div>
          <div className="text-center">
            <p className="font-mono text-lg font-semibold tabular-nums">{user.solvedCount}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">solved</p>
          </div>
        </div>
      </div>

      {stats.isError ? (
        <div className="mt-4">
          <ErrorState error={stats.error} onRetry={() => void stats.refetch()} />
        </div>
      ) : null}

      {stats.data ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <section className="card p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              By language
            </h2>
            {stats.data.languageBreakdown.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">No accepted submissions yet.</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {stats.data.languageBreakdown.map((entry) => (
                  <li key={entry.language} className="flex justify-between text-sm">
                    <span>{languageLabel(entry.language)}</span>
                    <span className="font-mono text-xs tabular-nums">{entry.accepted}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Recent accepted
            </h2>
            {stats.data.recentAccepted.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">Nothing accepted yet.</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {stats.data.recentAccepted.map((entry) => (
                  <li key={`${entry.challengeSlug}-${entry.at}`} className="flex justify-between gap-2 text-sm">
                    <Link to={`/challenges/${entry.challengeSlug}`} className="truncate hover:text-primary">
                      {entry.challengeTitle}
                    </Link>
                    <span className="shrink-0 font-mono text-xs text-success">+{entry.points}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}

      {user.solvedCount === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={Trophy}
            title="No accepted challenges yet"
            description="Progress appears here after the judge accepts a submission."
          />
        </div>
      ) : null}
    </Page>
  )
}
