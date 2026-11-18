import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/services/query-keys'
import { submissionsApi } from '@/services/submissions.api'
import type { SubmissionDetail } from '@/types'

const MAX_POLLS = 40

/**
 * Polls a queued/running submission with a bounded number of attempts. Stops as
 * soon as a terminal status arrives; never leaves a request open indefinitely.
 */
export function useSubmissionPolling(submissionId: string | null, initial?: SubmissionDetail) {
  return useQuery({
    queryKey: queryKeys.submissions.detail(submissionId ?? 'none'),
    queryFn: ({ signal }) => submissionsApi.detail(submissionId!, signal),
    enabled: Boolean(submissionId),
    initialData: initial,
    refetchInterval: (query) => {
      const data = query.state.data
      if (!data) return 1200
      const status = data.status ? String(data.status).toUpperCase() : ''
      if (status === 'QUEUED' || status === 'RUNNING') {
        if (query.state.dataUpdateCount > MAX_POLLS) return false
        return 1500
      }
      return false
    },
    refetchIntervalInBackground: false,
    staleTime: 0,
  })
}
