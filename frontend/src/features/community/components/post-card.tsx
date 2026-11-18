import { Link } from 'react-router-dom'
import { MessageSquare, Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatNumber } from '@/lib/format'
import type { PostSummary } from '@/types'

export function PostCard({ post }: { post: PostSummary }) {
  return (
    <article className="card flex flex-col gap-2.5 p-6 rounded-2xl transition-all hover:border-border-strong active:scale-[0.99]">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Link to={`/u/${post.author.username}`} className="font-medium text-foreground hover:text-primary">
          {post.author.displayName ?? post.author.username}
        </Link>
        <span className="text-border-strong">·</span>
        <span>{post.publishedAt ? formatDate(post.publishedAt) : 'Draft'}</span>
        {post.status !== 'published' ? (
          <Badge tone={post.status === 'draft' ? 'neutral' : 'warning'}>{post.status}</Badge>
        ) : null}
        {post.isMine ? (
          <Badge tone="primary">
            <Pencil className="size-2.5" aria-hidden="true" />
            yours
          </Badge>
        ) : null}
      </div>

      <h2 className="text-base font-semibold leading-snug tracking-tight text-foreground">
        <Link to={`/community/${post.slug}`} className="hover:text-primary transition-colors">
          {post.title}
        </Link>
      </h2>

      {post.summary ? (
        <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed">{post.summary}</p>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-2 pt-1 border-t border-border/40">
        {post.tags.slice(0, 4).map((tag) => (
          <Link
            key={tag}
            to={`/community?tag=${encodeURIComponent(tag)}`}
            className="rounded-lg border border-border bg-surface-sunken px-2 py-0.5 font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            #{tag}
          </Link>
        ))}
        <span className="ml-auto flex items-center gap-3 text-xs tabular-nums text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <MessageSquare className="size-3" aria-hidden="true" />
            {formatNumber(post.commentCount)}
          </span>
          <span>{formatNumber(post.likeCount)} likes</span>
        </span>
      </div>
    </article>
  )
}
