import { useInfiniteQuery } from '@tanstack/react-query'
import { Code2, Filter, Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Page } from '@/components/layout/public-layout'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Input, Select } from '@/components/ui/input'
import { LoadMore } from '@/components/ui/load-more'
import { SkeletonList } from '@/components/ui/skeleton'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { queryKeys } from '@/services/query-keys'
import { challengesApi } from '@/services/challenges.api'
import { topics } from '@/features/dsa/content/catalog'
import type { Difficulty, Language } from '@/types'
import { DifficultyBadge } from '../components/difficulty-badge'
import { languageLabel } from '@/components/editor/languages'

export function ChallengesPage() {
  useDocumentTitle('Challenges')
  const [search, setSearch] = useState('')
  const [topic, setTopic] = useState('all')
  const [difficulty, setDifficulty] = useState<Difficulty | 'all'>('all')
  const [language, setLanguage] = useState<Language | 'all'>('all')
  const debouncedSearch = useDebouncedValue(search)

  const filters = { topic, difficulty, language, search: debouncedSearch }

  const query = useInfiniteQuery({
    queryKey: queryKeys.challenges.list(filters),
    queryFn: ({ pageParam, signal }) =>
      challengesApi.list({ ...filters, cursor: pageParam as string | null }, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  })

  const items = query.data?.pages.flatMap((page) => page.items) ?? []
  const hasFilters = topic !== 'all' || difficulty !== 'all' || language !== 'all' || search !== ''

  return (
    <Page>
      <PageHeader
        eyebrow="Debug"
        title="Challenges"
        description="Each challenge ships with intentionally broken starter code. Fix it, submit it, and the judge returns a verdict against server-side tests."
      />

      <div className="card mb-6 flex flex-col gap-3 p-3.5 rounded-2xl sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search challenges…"
            aria-label="Search challenges"
            className="pl-10"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <Select value={topic} onChange={(event) => setTopic(event.target.value)} aria-label="Filter by topic" className="sm:w-40">
            <option value="all">All topics</option>
            {topics.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.title}
              </option>
            ))}
          </Select>
          <Select
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value as Difficulty | 'all')}
            aria-label="Filter by difficulty"
            className="sm:w-36"
          >
            <option value="all">Any difficulty</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </Select>
          <Select
            value={language}
            onChange={(event) => setLanguage(event.target.value as Language | 'all')}
            aria-label="Filter by language"
            className="sm:w-36"
          >
            <option value="all">Any language</option>
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
          </Select>
          {hasFilters ? (
            <Button
              variant="ghost"
              size="sm"
              icon={Filter}
              onClick={() => {
                setSearch('')
                setTopic('all')
                setDifficulty('all')
                setLanguage('all')
              }}
            >
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      {query.isPending ? <SkeletonList rows={4} /> : null}

      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : null}

      {!query.isPending && !query.isError && items.length === 0 ? (
        <EmptyState
          icon={Code2}
          title="No challenges match"
          description={
            hasFilters
              ? 'Try clearing a filter or searching for a different term.'
              : 'The catalogue is empty. An administrator can publish the first challenge from the admin console.'
          }
        />
      ) : null}

      <ul className="space-y-3">
        {items.map((challenge) => (
          <li key={challenge.id}>
            <Link
              to={`/challenges/${challenge.slug}`}
              className="card group flex flex-col gap-2.5 p-5 rounded-2xl transition-all hover:border-border-strong active:scale-[0.99] sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold tracking-tight text-foreground">{challenge.title}</span>
                  {challenge.solved ? <Badge tone="success">Solved</Badge> : null}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono text-[11px]">{challenge.topic}</span>
                  <span className="text-border-strong">·</span>
                  <span className="font-mono text-[11px] tabular-nums">{challenge.pointValue} pts</span>
                  <span className="text-border-strong">·</span>
                  <span className="truncate text-[11px]">
                    {challenge.supportedLanguages.map(languageLabel).join(', ')}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <DifficultyBadge difficulty={challenge.difficulty} />
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
    </Page>
  )
}
