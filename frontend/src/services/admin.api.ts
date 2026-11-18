import { http } from '@/lib/http'
import type {
  AdminOverview,
  AdminUserRow,
  Report,
  UserStatus,
} from '@/types'

export const adminApi = {
  overview: (signal?: AbortSignal) =>
    http.get<AdminOverview>('/admin/overview', { signal }),
  users: async (
    query: { search?: string; status?: UserStatus | 'all'; cursor?: string | null },
    signal?: AbortSignal,
  ) => {
    const res = await http.get<{
      items?: AdminUserRow[]
      users?: AdminUserRow[]
      nextCursor?: string | null
    }>('/admin/users', {
      query: {
        search: query.search?.trim() || undefined,
        status: query.status === 'all' ? undefined : query.status,
        cursor: query.cursor ?? undefined,
      },
      signal,
    })
    return {
      items: res.items ?? res.users ?? [],
      nextCursor: res.nextCursor ?? null,
    }
  },
  setUserStatus: (userId: string, status: UserStatus) =>
    http.patch<{ id: string; status: UserStatus }>(`/admin/users/${userId}/status`, { status }),
  reports: async (status: 'open' | 'resolved' | 'dismissed' | 'all', cursor?: string | null) => {
    const res = await http.get<{
      items?: Report[]
      reports?: Report[]
      nextCursor?: string | null
    }>('/admin/reports', {
      query: { status: status === 'all' ? undefined : status, cursor: cursor ?? undefined },
    })
    return {
      items: res.items ?? res.reports ?? [],
      nextCursor: res.nextCursor ?? null,
    }
  },
  updateReport: async (reportId: string, input: { status: 'resolved' | 'dismissed'; note?: string }) => {
    const res = await http.patch<{ report?: Report } & Report>(`/admin/reports/${reportId}`, input)
    return res.report ?? res
  },
}
