import { useInfiniteQuery } from '@tanstack/react-query'
import { MessagesSquare, PenLine, Search, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Page } from '@/components/layout/public-layout'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Input } from '@/components/ui/input'
import { LoadMore } from '@/components/ui/load-more'
import { SkeletonList } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/auth-context'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { queryKeys } from '@/services/query-keys'
import { communityApi } from '@/services/community.api'
import { PostCard } from '../components/post-card'

export function CommunityFeedPage() {
  useDocumentTitle('Community')
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const tag = searchParams.get('tag') ?? ''
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)

  const filters = { tag: tag || undefined, search: debouncedSearch, status: 'published' as const }

  const query = useInfiniteQuery({
    queryKey: queryKeys.posts.list(filters),
    queryFn: ({ pageParam, signal }) =>
      communityApi.list({ ...filters, cursor: pageParam as string | null }, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  })

  const posts = query.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <Page>
      <PageHeader
        eyebrow="Share"
        title="Community notes"
        description="Technical write-ups, debugging lessons, and explanations from other learners. Markdown is sanitized before rendering."
        actions={
          user ? (
            <Link to="/community/new">
              <Button icon={PenLine}>Write a post</Button>
            </Link>
          ) : (
            <Link to="/login">
              <Button variant="secondary">Sign in to write</Button>
            </Link>
          )
        }
      />

      <div className="card mb-5 flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search titles"
            aria-label="Search posts"
            className="pl-9"
          />
        </div>
        {tag ? (
          <Button
            variant="secondary"
            size="sm"
            icon={X}
            onClick={() => {
              const next = new URLSearchParams(searchParams)
              next.delete('tag')
              setSearchParams(next)
            }}
          >
            tag: {tag}
          </Button>
        ) : null}
      </div>

      {query.isPending ? <SkeletonList rows={4} /> : null}
      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : null}

      {!query.isPending && !query.isError && posts.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title="No published posts yet"
          description={
            tag || search
              ? 'No posts match this filter. Try clearing it.'
              : 'Published notes appear here. Be the first to explain something clearly.'
          }
          action={
            user ? (
              <Link to="/community/new">
                <Button size="sm">Write the first post</Button>
              </Link>
            ) : undefined
          }
        />
      ) : null}

      <div className="grid gap-3">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      <LoadMore
        hasMore={Boolean(query.hasNextPage)}
        loading={query.isFetchingNextPage}
        onLoad={() => void query.fetchNextPage()}
      />
    </Page>
  )
}
