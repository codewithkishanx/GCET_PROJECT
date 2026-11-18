/**
 * Central query-key factory. Keys are nested arrays so mutations can invalidate
 * precisely what changed without nuking the whole cache.
 */
export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  users: {
    profile: (username: string) => ['users', 'profile', username] as const,
    stats: (username: string) => ['users', 'stats', username] as const,
  },
  challenges: {
    list: (filters: Record<string, unknown>) => ['challenges', 'list', filters] as const,
    detail: (slug: string) => ['challenges', 'detail', slug] as const,
  },
  submissions: {
    detail: (id: string) => ['submissions', 'detail', id] as const,
    mine: (cursor?: string | null) => ['submissions', 'mine', cursor ?? null] as const,
    forChallenge: (challengeId: string) =>
      ['submissions', 'challenge', challengeId] as const,
  },
  leaderboard: {
    list: (limit: number) => ['leaderboard', limit] as const,
  },
  posts: {
    list: (filters: Record<string, unknown>) => ['posts', 'list', filters] as const,
    detail: (slug: string) => ['posts', 'detail', slug] as const,
    comments: (postId: string) => ['posts', 'comments', postId] as const,
  },
  admin: {
    overview: ['admin', 'overview'] as const,
    users: (query: Record<string, unknown>) => ['admin', 'users', query] as const,
    reports: (status: string) => ['admin', 'reports', status] as const,
  },
}
