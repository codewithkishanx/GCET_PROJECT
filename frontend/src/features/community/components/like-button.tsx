import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Heart } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '@/features/auth/auth-context'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/cn'
import { describeError } from '@/lib/api-error'
import { formatNumber } from '@/lib/format'
import { queryKeys } from '@/services/query-keys'
import { communityApi } from '@/services/community.api'
import { Link, useLocation } from 'react-router-dom'

export function LikeButton({
  postId,
  slug,
  likeCount,
  likedByMe,
}: {
  postId: string
  slug?: string
  likeCount: number
  likedByMe: boolean
}) {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const location = useLocation()
  const [state, setState] = useState({ likeCount, likedByMe })

  useEffect(() => {
    setState({ likeCount, likedByMe })
  }, [likeCount, likedByMe, postId])

  const mutation = useMutation<
    { likeCount: number; likedByMe: boolean },
    Error,
    boolean,
    { previous: { likeCount: number; likedByMe: boolean } }
  >({
    mutationFn: async (nextLiked) =>
      nextLiked ? communityApi.like(postId) : communityApi.unlike(postId),
    onMutate: (nextLiked) => {
      const previous = state
      setState({
        likedByMe: nextLiked,
        likeCount: Math.max(0, state.likeCount + (nextLiked ? 1 : -1)),
      })
      return { previous }
    },
    onError: (error, _next, context) => {
      if (context?.previous) setState(context.previous)
      toast({
        title: 'Could not update like',
        description: describeError(error),
        tone: 'error',
      })
    },
    onSuccess: (data) => {
      setState({ likeCount: data.likeCount, likedByMe: data.likedByMe })
      void queryClient.invalidateQueries({ queryKey: queryKeys.posts.detail(slug ?? '') })
      void queryClient.invalidateQueries({ queryKey: ['posts', 'list'] })
    },
  })

  if (!user) {
    return (
      <Link
        to="/login"
        state={{ from: location.pathname }}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <Heart className="size-3.5" aria-hidden="true" />
        {formatNumber(state.likeCount)} · sign in to like
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={() => mutation.mutate(!state.likedByMe)}
      disabled={mutation.isPending}
      aria-pressed={state.likedByMe}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60',
        state.likedByMe
          ? 'border-danger/40 bg-danger-soft text-danger'
          : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground',
      )}
    >
      <Heart
        className={cn('size-3.5', state.likedByMe && 'fill-current')}
        aria-hidden="true"
      />
      {formatNumber(state.likeCount)}
      <span className="sr-only">{state.likedByMe ? 'Unlike this post' : 'Like this post'}</span>
    </button>
  )
}
