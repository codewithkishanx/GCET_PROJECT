import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Flag, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Page } from '@/components/layout/public-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { SkeletonList } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/features/auth/auth-context'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { describeError } from '@/lib/api-error'
import { formatDate } from '@/lib/format'
import { MarkdownContent } from '@/lib/markdown'
import { queryKeys } from '@/services/query-keys'
import { communityApi } from '@/services/community.api'
import { CommentSection } from '../components/comment-section'
import { LikeButton } from '../components/like-button'
import { ReportDialog } from '../components/report-dialog'

export function PostPage() {
  const { slug = '' } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [reportOpen, setReportOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const query = useQuery({
    queryKey: queryKeys.posts.detail(slug),
    queryFn: ({ signal }) => communityApi.detail(slug, signal),
    enabled: Boolean(slug),
  })
  useDocumentTitle(query.data?.title ?? 'Post')

  const remove = useMutation({
    mutationFn: () => communityApi.remove(query.data!.id),
    onSuccess: () => {
      toast({ title: 'Post deleted', tone: 'info' })
      void queryClient.invalidateQueries({ queryKey: ['posts', 'list'] })
      navigate('/community')
    },
  })

  if (query.isPending) {
    return (
      <Page>
        <SkeletonList rows={3} />
      </Page>
    )
  }

  if (query.isError) {
    return (
      <Page>
        <EmptyState
          title="Post not available"
          description="It may have been removed, hidden by a moderator, or never existed."
          action={
            <Link to="/community" className="text-sm font-medium text-primary hover:underline">
              Back to the community
            </Link>
          }
        />
        <div className="mt-4">
          <ErrorState error={query.error} compact />
        </div>
      </Page>
    )
  }

  const post = query.data

  return (
    <Page className="!max-w-4xl">
      <Link
        to="/community"
        className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Community
      </Link>

      {post.status !== 'published' ? (
        <p className="mb-4 rounded-lg border border-warning/40 bg-warning-soft px-3 py-2 text-xs text-warning">
          This post is <span className="font-mono">{post.status}</span> and is not visible in the
          public feed.
        </p>
      ) : null}

      <article className="card p-6">
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <Link to={`/u/${post.author.username}`} className="font-medium text-foreground hover:text-primary">
            {post.author.displayName ?? post.author.username}
          </Link>
          <span aria-hidden="true">·</span>
          <span>{formatDate(post.publishedAt ?? post.createdAt)}</span>
        </div>

        <h1 className="mt-2 text-2xl font-bold tracking-tight">{post.title}</h1>
        {post.summary ? (
          <p className="mt-1 text-sm text-muted-foreground">{post.summary}</p>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <Link
              key={tag}
              to={`/community?tag=${encodeURIComponent(tag)}`}
              className="rounded border border-border bg-surface-sunken px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground hover:text-foreground"
            >
              #{tag}
            </Link>
          ))}
        </div>

        <hr className="my-5 border-border" />

        <MarkdownContent markdown={post.contentMarkdown} />

        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <LikeButton
            postId={post.id}
            slug={post.slug}
            likeCount={post.likeCount}
            likedByMe={post.likedByMe}
          />

          {post.isMine ? (
            <>
              <Link to={`/community/${post.slug}/edit`}>
                <Button variant="secondary" size="sm" icon={Pencil}>
                  Edit
                </Button>
              </Link>
              <Button variant="ghost" size="sm" icon={Trash2} onClick={() => setConfirmOpen(true)}>
                Delete
              </Button>
            </>
          ) : user ? (
            <Button variant="ghost" size="sm" icon={Flag} onClick={() => setReportOpen(true)}>
              Report
            </Button>
          ) : null}

          <Badge tone="neutral" className="ml-auto">
            {post.commentCount} comments
          </Badge>
        </div>
      </article>

      <div className="mt-5">
        <CommentSection postId={post.id} />
      </div>

      {reportOpen ? (
        <ReportDialog
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          targetType="post"
          targetId={post.id}
          targetLabel={post.title}
        />
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Delete this post?"
        description="This removes the post and its comments. It cannot be undone."
        confirmLabel="Delete post"
        destructive
        onConfirm={async () => {
          try {
            await remove.mutateAsync()
          } catch (error) {
            toast({ title: 'Delete failed', description: describeError(error), tone: 'error' })
          }
        }}
      />
    </Page>
  )
}
