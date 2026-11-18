import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, Send } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/ui/error-state'
import { Textarea } from '@/components/ui/input'
import { LoadMore } from '@/components/ui/load-more'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/features/auth/auth-context'
import { describeError } from '@/lib/api-error'
import { relativeTime } from '@/lib/format'
import { queryKeys } from '@/services/query-keys'
import { communityApi } from '@/services/community.api'

const MAX_COMMENT = 1000

export function CommentSection({ postId }: { postId: string }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [body, setBody] = useState('')

  const query = useInfiniteQuery({
    queryKey: queryKeys.posts.comments(postId),
    queryFn: ({ pageParam, signal }) =>
      communityApi.comments(postId, pageParam as string | null, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  })

  const mutation = useMutation({
    mutationFn: () => communityApi.addComment(postId, body.trim()),
    onSuccess: () => {
      setBody('')
      void queryClient.invalidateQueries({ queryKey: queryKeys.posts.comments(postId) })
      void queryClient.invalidateQueries({ queryKey: ['posts', 'detail'] })
      toast({ title: 'Comment posted', tone: 'success' })
    },
  })

  const comments = query.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <section className="card p-5" aria-label="Comments">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <MessageSquare className="size-4 text-muted-foreground" aria-hidden="true" />
        Comments
      </h2>

      {query.isPending ? (
        <div className="mt-3 space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-3/4" />
        </div>
      ) : null}

      {query.isError ? (
        <div className="mt-3">
          <ErrorState error={query.error} onRetry={() => void query.refetch()} compact />
        </div>
      ) : null}

      {!query.isPending && !query.isError && comments.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          No comments yet. Add the first explanation or question.
        </p>
      ) : null}

      <ul className="mt-4 space-y-3">
        {comments.map((comment) => (
          <li key={comment.id} className="rounded-lg border border-border bg-surface-sunken p-3">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <Link
                to={`/u/${comment.author.username}`}
                className="font-medium text-foreground hover:text-primary"
              >
                {comment.author.displayName ?? comment.author.username}
              </Link>
              {comment.isMine ? <Badge tone="primary">you</Badge> : null}
              <span aria-hidden="true">·</span>
              <span>{relativeTime(comment.createdAt)}</span>
            </div>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm">{comment.body}</p>
          </li>
        ))}
      </ul>

      <LoadMore
        hasMore={Boolean(query.hasNextPage)}
        loading={query.isFetchingNextPage}
        onLoad={() => void query.fetchNextPage()}
      />

      {user ? (
        <form
          className="mt-5 space-y-2 border-t border-border pt-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (!body.trim()) return
            mutation.mutate()
          }}
        >
          <label htmlFor="comment-body" className="text-xs font-medium">
            Add a comment
          </label>
          <Textarea
            id="comment-body"
            value={body}
            maxLength={MAX_COMMENT}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Explain a step, ask a question, or point out a bug."
            className="min-h-20 text-sm"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground">
              {body.length}/{MAX_COMMENT}
            </span>
            <Button
              type="submit"
              size="sm"
              icon={Send}
              loading={mutation.isPending}
              disabled={!body.trim()}
            >
              Post comment
            </Button>
          </div>
          {mutation.isError ? (
            <p role="alert" className="text-xs text-danger">
              {describeError(mutation.error)}
            </p>
          ) : null}
        </form>
      ) : (
        <p className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>{' '}
          to comment.
        </p>
      )}
    </section>
  )
}
