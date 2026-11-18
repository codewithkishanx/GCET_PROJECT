import { useQuery } from '@tanstack/react-query'
import { Trophy } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Page } from '@/components/layout/public-layout'
import { PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Select } from '@/components/ui/input'
import { SkeletonList } from '@/components/ui/skeleton'
import { Table, TableWrap, Td, Th } from '@/components/ui/table'
import { useAuth } from '@/features/auth/auth-context'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/cn'
import { queryKeys } from '@/services/query-keys'
import { leaderboardApi } from '@/services/leaderboard.api'

const LIMITS = [10, 25, 50, 100]

export function LeaderboardPage() {
  useDocumentTitle('Leaderboard')
  const { user } = useAuth()
  const [limit, setLimit] = useState(25)

  const query = useQuery({
    queryKey: queryKeys.leaderboard.list(limit),
    queryFn: ({ signal }) => leaderboardApi.list(limit, signal),
  })

  return (
    <Page>
      <PageHeader
        eyebrow="Compete"
        title="Leaderboard"
        description="Ranked by points, then solved count, then username. Every point comes from an accepted submission recorded by the server."
        actions={
          <Select
            value={limit}
            onChange={(event) => setLimit(Number(event.target.value))}
            aria-label="Number of entries"
            className="w-32"
          >
            {LIMITS.map((value) => (
              <option key={value} value={value}>
                Top {value}
              </option>
            ))}
          </Select>
        }
      />

      {query.isPending ? <SkeletonList rows={6} /> : null}
      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : null}

      {query.data && query.data.items.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No ranked players yet"
          description="The leaderboard fills up once submissions are accepted. It is never seeded with demo rankings."
        />
      ) : null}

      {query.data && query.data.items.length > 0 ? (
        <TableWrap>
          <Table>
            <caption className="sr-only">
              Leaderboard ranked by points descending, solved count descending, username ascending
            </caption>
            <thead>
              <tr>
                <Th className="w-16">Rank</Th>
                <Th>Player</Th>
                <Th className="text-right">Points</Th>
                <Th className="text-right">Solved</Th>
              </tr>
            </thead>
            <tbody>
              {query.data.items.map((entry) => {
                const isMe = user?.username === entry.username
                return (
                  <tr key={entry.userId} className={cn(isMe && 'bg-primary-soft/60')}>
                    <Td>
                      <span
                        className={cn(
                          'inline-grid size-7 place-items-center rounded-md font-mono text-xs font-semibold',
                          entry.rank === 1
                            ? 'bg-warning-soft text-warning'
                            : entry.rank <= 3
                              ? 'bg-success-soft text-success'
                              : 'bg-surface-sunken text-muted-foreground',
                        )}
                      >
                        {entry.rank}
                      </span>
                    </Td>
                    <Td>
                      <Link
                        to={`/u/${entry.username}`}
                        className="flex items-center gap-2 text-sm font-medium hover:text-primary"
                      >
                        {entry.displayName ?? entry.username}
        <span className="font-mono text-[11px] text-muted-foreground">
          @{entry.username}
        </span>
                        {isMe ? <span className="text-[10px] text-primary">you</span> : null}
                      </Link>
                    </Td>
                    <Td className="text-right font-mono tabular-nums">{formatNumber(entry.points)}</Td>
                    <Td className="text-right font-mono tabular-nums">{entry.solvedCount}</Td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        </TableWrap>
      ) : null}

      <p className="mt-4 text-[11px] text-muted-foreground">
        Tie-break: points ↓, solved ↓, username ↑. Scores are cached on the user document but
        reward transactions remain the source of truth.
      </p>
    </Page>
  )
}
