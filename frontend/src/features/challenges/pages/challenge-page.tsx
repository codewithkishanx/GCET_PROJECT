import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Play, RotateCcw } from 'lucide-react'
import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Page } from '@/components/layout/public-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/ui/error-state'
import { Select } from '@/components/ui/input'
import { SkeletonList } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { languageLabel } from '@/components/editor/languages'
import { useAuth } from '@/features/auth/auth-context'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { describeError } from '@/lib/api-error'
import { formatBytes } from '@/lib/format'
import { queryKeys } from '@/services/query-keys'
import { challengesApi } from '@/services/challenges.api'
import { submissionsApi } from '@/services/submissions.api'
import type { Language } from '@/types'
import { DifficultyBadge } from '../components/difficulty-badge'
import { VerdictPanel } from '@/features/submissions/components/verdict-panel'
import { useSubmissionPolling } from '@/features/submissions/hooks/use-submission-polling'

const CodeEditor = lazy(() =>
  import('@/components/editor/code-editor').then((module) => ({ default: module.CodeEditor })),
)

export function ChallengePage() {
  const { slug = '' } = useParams()
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const challenge = useQuery({
    queryKey: queryKeys.challenges.detail(slug),
    queryFn: ({ signal }) => challengesApi.detail(slug, signal),
  })
  useDocumentTitle(challenge.data?.title ?? 'Challenge')

  const [language, setLanguage] = useState<Language | null>(null)
  const [drafts, setDrafts] = useState<Partial<Record<Language, string>>>({})
  const [submissionId, setSubmissionId] = useState<string | null>(null)

  useEffect(() => {
    if (!challenge.data) return
    const supported = challenge.data.supportedLanguages
    setLanguage((current) =>
      current && supported.includes(current) ? current : (supported[0] ?? null),
    )
    setDrafts(challenge.data.starterCode ?? {})
  }, [challenge.data])

  const code = language ? (drafts[language] ?? '') : ''
  const starterCode = language ? (challenge.data?.starterCode?.[language] ?? '') : ''
  const isDirty = code !== starterCode
  const byteLength = useMemo(() => new TextEncoder().encode(code).length, [code])
  const overLimit = Boolean(challenge.data && byteLength > challenge.data.maxSourceBytes)

  const submitMutation = useMutation({
    mutationFn: () => {
      if (!challenge.data || !language) throw new Error('Choose a language first.')
      return submissionsApi.create({
        challengeId: challenge.data.id,
        language,
        sourceCode: code,
      })
    },
    onSuccess: (submission) => {
      setSubmissionId(submission.id)
      toast({ title: 'Submission queued', description: 'The judge will pick it up shortly.', tone: 'info' })
      void queryClient.invalidateQueries({ queryKey: queryKeys.submissions.mine() })
    },
  })

  const polling = useSubmissionPolling(submissionId)

  useEffect(() => {
    const verdict = polling.data?.verdict
    if (!verdict) return
    if (verdict === 'ACCEPTED') {
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me })
      void queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard.list(25) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.challenges.detail(slug) })
    }
  }, [polling.data?.verdict, polling.data?.id, queryClient, slug])

  if (challenge.isPending) {
    return (
      <Page>
        <SkeletonList rows={4} />
      </Page>
    )
  }

  if (challenge.isError) {
    return (
      <Page>
        <ErrorState error={challenge.error} onRetry={() => void challenge.refetch()} />
      </Page>
    )
  }

  const data = challenge.data

  return (
    <Page wide>
      <Link
        to="/challenges"
        className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        All challenges
      </Link>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-5">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{data.title}</h1>
            <DifficultyBadge difficulty={data.difficulty} />
            {data.solved ? <Badge tone="success">solved</Badge> : null}
          </div>
          <p className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted-foreground">
            <span>{data.topic}</span>
            <span aria-hidden="true">·</span>
            <span>{data.pointValue} points</span>
            <span aria-hidden="true">·</span>
            <span>{data.timeLimitMs} ms limit</span>
            <span aria-hidden="true">·</span>
            <span>{data.memoryLimitMb} MB</span>
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="space-y-5">
          <section className="card p-5">
            <h2 className="text-sm font-semibold">Problem</h2>
            <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {data.description}
            </div>
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-semibold">Examples</h2>
            <div className="mt-3 space-y-3">
              {data.examples.map((example, index) => (
                <div key={index} className="rounded-lg border border-border bg-surface-sunken p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Example {index + 1}
                  </p>
                  <dl className="mt-1.5 space-y-1 font-mono text-xs">
                    <div className="flex gap-2">
                      <dt className="w-16 shrink-0 text-muted-foreground">input</dt>
                      <dd className="whitespace-pre-wrap break-words">{example.input}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-16 shrink-0 text-muted-foreground">output</dt>
                      <dd className="whitespace-pre-wrap break-words">{example.output}</dd>
                    </div>
                  </dl>
                  {example.explanation ? (
                    <p className="mt-2 text-xs text-muted-foreground">{example.explanation}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-semibold">Constraints</h2>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              {data.constraints.map((constraint) => (
                <li key={constraint} className="flex gap-2">
                  <span className="text-primary" aria-hidden="true">
                    •
                  </span>
                  <span className="font-mono text-xs">{constraint}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 rounded-md border border-border bg-surface-sunken px-3 py-2 text-[11px] text-muted-foreground">
              Hidden tests and reference solutions stay on the server. Nothing in this page can
              reveal them.
            </p>
          </section>
        </div>

        <div className="space-y-4">
          <section className="card overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
              <Select
                value={language ?? ''}
                onChange={(event) => setLanguage(event.target.value as Language)}
                aria-label="Programming language"
                className="h-8 w-36 text-xs"
              >
                {data.supportedLanguages.map((item) => (
                  <option key={item} value={item}>
                    {languageLabel(item)}
                  </option>
                ))}
              </Select>
              <span className="font-mono text-[10px] text-muted-foreground">
                {formatBytes(byteLength)} / {formatBytes(data.maxSourceBytes)}
              </span>
              <div className="ml-auto flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={RotateCcw}
                  disabled={!isDirty}
                  onClick={() => {
                    if (!language) return
                    setDrafts((current) => ({ ...current, [language]: starterCode }))
                  }}
                >
                  Reset
                </Button>
                <Button
                  size="sm"
                  icon={Play}
                  loading={submitMutation.isPending}
                  disabled={!user || overLimit || !code.trim() || !language}
                  onClick={() => submitMutation.mutate()}
                  title={!user ? 'Sign in to submit' : undefined}
                >
                  Submit
                </Button>
              </div>
            </div>

            <Suspense
              fallback={
                <div className="grid h-[22rem] place-items-center text-sm text-muted-foreground">
                  Loading editor…
                </div>
              }
            >
              {language ? (
                <CodeEditor
                  value={code}
                  language={language}
                  onChange={(next) =>
                    setDrafts((current) => ({ ...current, [language]: next }))
                  }
                  height="22rem"
                  ariaLabel={`${languageLabel(language)} solution editor`}
                />
              ) : (
                <div className="grid h-[22rem] place-items-center px-6 text-center text-sm text-muted-foreground">
                  This challenge does not enable any language yet.
                </div>
              )}
            </Suspense>

            <div className="space-y-2 border-t border-border px-3 py-2.5">
              {!user ? (
                <p className="text-xs text-warning">
                  <Link to="/login" className="font-semibold underline">
                    Sign in
                  </Link>{' '}
                  to submit — verdicts and points require an authenticated account.
                </p>
              ) : null}
              {overLimit ? (
                <p className="text-xs text-danger">
                  Source exceeds {formatBytes(data.maxSourceBytes)}; the server would reject it.
                </p>
              ) : null}
              {submitMutation.isError ? (
                <p role="alert" className="text-xs text-danger">
                  {describeError(submitMutation.error)}
                </p>
              ) : null}
            </div>
          </section>

          {submissionId ? (
            <section className="card p-4">
              <h2 className="mb-2 text-sm font-semibold">Judge result</h2>
              <VerdictPanel
                submission={polling.data}
                loading={polling.isPending}
                error={polling.error}
                onRetry={() => void polling.refetch()}
              />
            </section>
          ) : null}
        </div>
      </div>
    </Page>
  )
}
