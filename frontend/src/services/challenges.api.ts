import { http } from '@/lib/http'
import type {
  ChallengeDetail,
  ChallengeListQuery,
  ChallengeSummary,
} from '@/types'

function listQuery(query: ChallengeListQuery): Record<string, string | number | undefined> {
  return {
    topic: query.topic === 'all' ? undefined : query.topic,
    difficulty: query.difficulty === 'all' ? undefined : query.difficulty,
    language: query.language === 'all' ? undefined : query.language,
    search: query.search?.trim() || undefined,
    cursor: query.cursor ?? undefined,
    limit: query.limit,
  }
}

export const challengesApi = {
  list: async (query: ChallengeListQuery, signal?: AbortSignal) => {
    const res = await http.get<{
      items?: ChallengeSummary[]
      challenges?: ChallengeSummary[]
      nextCursor?: string | null
    }>('/challenges', {
      query: listQuery(query),
      signal,
    })
    return {
      items: res.items ?? res.challenges ?? [],
      nextCursor: res.nextCursor ?? null,
    }
  },
  detail: async (slug: string, signal?: AbortSignal) => {
    const res = await http.get<{ challenge?: ChallengeDetail } & ChallengeDetail>(
      `/challenges/${encodeURIComponent(slug)}`,
      { signal },
    )
    return res.challenge ?? res
  },
  // Admin surface
  adminCreate: (body: unknown) => http.post<ChallengeDetail>('/admin/challenges', body),
  adminUpdate: (id: string, body: unknown) =>
    http.patch<ChallengeDetail>(`/admin/challenges/${id}`, body),
}
