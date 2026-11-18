import { http } from '@/lib/http'
import type {
  Comment,
  PostDetail,
  PostInput,
  PostListQuery,
  PostSummary,
  ReportTargetType,
} from '@/types'

export const communityApi = {
  list: async (query: PostListQuery, signal?: AbortSignal) => {
    const res = await http.get<{
      items?: PostSummary[]
      posts?: PostSummary[]
      nextCursor?: string | null
    }>('/posts', {
      query: {
        tag: query.tag,
        author: query.author,
        search: query.search?.trim() || undefined,
        status: query.status === 'all' ? undefined : query.status,
        cursor: query.cursor ?? undefined,
        limit: query.limit,
      },
      signal,
    })
    return {
      items: res.items ?? res.posts ?? [],
      nextCursor: res.nextCursor ?? null,
    }
  },
  detail: async (slug: string, signal?: AbortSignal) => {
    const res = await http.get<{ post?: PostDetail } & PostDetail>(
      `/posts/${encodeURIComponent(slug)}`,
      { signal },
    )
    return res.post ?? res
  },
  create: async (input: PostInput) => {
    const res = await http.post<{ post?: PostDetail } & PostDetail>('/posts', input)
    return res.post ?? res
  },
  update: async (id: string, input: PostInput) => {
    const res = await http.patch<{ post?: PostDetail } & PostDetail>(`/posts/${id}`, input)
    return res.post ?? res
  },
  remove: (id: string) => http.delete<void>(`/posts/${id}`),
  like: (id: string) => http.post<{ likeCount: number; likedByMe: true }>(`/posts/${id}/likes`),
  unlike: (id: string) =>
    http.delete<{ likeCount: number; likedByMe: false }>(`/posts/${id}/likes`),
  comments: async (postId: string, cursor?: string | null, signal?: AbortSignal) => {
    const res = await http.get<{
      items?: Comment[]
      comments?: Comment[]
      nextCursor?: string | null
    }>(`/posts/${postId}/comments`, {
      query: { cursor: cursor ?? undefined, limit: 20 },
      signal,
    })
    return {
      items: res.items ?? res.comments ?? [],
      nextCursor: res.nextCursor ?? null,
    }
  },
  addComment: (postId: string, body: string) =>
    http.post<Comment>(`/posts/${postId}/comments`, { body }),
  report: (input: {
    targetType: ReportTargetType
    targetId: string
    reason: string
    details?: string
  }) => http.post<{ id: string }>('/reports', input),
}
