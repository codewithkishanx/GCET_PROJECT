import { http } from '@/lib/http'
import type {
  CreateSubmissionInput,
  SubmissionDetail,
  SubmissionStatus,
  SubmissionSummary,
} from '@/types'

function normalizeSubmission<T extends Record<string, any>>(raw: T): T & {
  status: SubmissionStatus
  errorMessage: string | null
  output: string | null
} {
  const statusUpper = (
    typeof raw.status === 'string' ? raw.status.toUpperCase() : 'QUEUED'
  ) as SubmissionStatus
  return {
    ...raw,
    status: statusUpper,
    failedTest: raw.failedTest ?? null,
    errorMessage: raw.errorMessage ?? raw.message ?? null,
    output: raw.output ?? raw.outputPreview ?? null,
  }
}

export const submissionsApi = {
  create: async (input: CreateSubmissionInput) => {
    const res = await http.post<{ submission?: SubmissionSummary } & SubmissionSummary>(
      '/challenges/' + input.challengeId + '/submissions',
      {
        language: input.language,
        sourceCode: input.sourceCode,
      },
    )
    const raw = res.submission ?? res
    return normalizeSubmission(raw)
  },
  detail: async (id: string, signal?: AbortSignal) => {
    const res = await http.get<{ submission?: SubmissionDetail } & SubmissionDetail>(
      `/submissions/${encodeURIComponent(id)}`,
      { signal },
    )
    const raw = res.submission ?? res
    return normalizeSubmission(raw)
  },
  mine: async (cursor?: string | null, signal?: AbortSignal) => {
    const res = await http.get<{
      items?: SubmissionSummary[]
      submissions?: SubmissionSummary[]
      nextCursor?: string | null
    }>('/users/me/submissions', {
      query: { cursor: cursor ?? undefined, limit: 20 },
      signal,
    })
    const rawList = res.items ?? res.submissions ?? []
    return {
      items: rawList.map((item) => normalizeSubmission(item)),
      nextCursor: res.nextCursor ?? null,
    }
  },
  forChallenge: async (challengeId: string, signal?: AbortSignal) => {
    const res = await http.get<{
      items?: SubmissionSummary[]
      submissions?: SubmissionSummary[]
      nextCursor?: string | null
    }>('/users/me/submissions', {
      query: { challengeId, limit: 10 },
      signal,
    })
    const rawList = res.items ?? res.submissions ?? []
    return {
      items: rawList.map((item) => normalizeSubmission(item)),
      nextCursor: res.nextCursor ?? null,
    }
  },
}
