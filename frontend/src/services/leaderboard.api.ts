import { http } from '@/lib/http'
import type { LeaderboardEntry, Paginated } from '@/types'

export const leaderboardApi = {
  list: async (limit = 25, signal?: AbortSignal): Promise<Paginated<LeaderboardEntry>> => {
    const res = await http.get<{
      items?: LeaderboardEntry[]
      entries?: LeaderboardEntry[]
      nextCursor?: string | null
    }>('/leaderboard', {
      query: { limit },
      signal,
    })
    return {
      items: res.items ?? res.entries ?? [],
      nextCursor: res.nextCursor ?? null,
    }
  },
}
