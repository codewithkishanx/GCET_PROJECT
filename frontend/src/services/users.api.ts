import { http } from '@/lib/http'
import type { PublicUser, UserStats } from '@/types'

export const usersApi = {
  byUsername: (username: string, signal?: AbortSignal) =>
    http.get<{ user: PublicUser }>(`/users/${encodeURIComponent(username)}`, { signal }),
  stats: async (username: string, signal?: AbortSignal) => {
    const res = await http.get<{ stats?: UserStats } & UserStats>(
      `/users/${encodeURIComponent(username)}/stats`,
      { signal },
    )
    return (res.stats ?? res) as UserStats
  },
}
