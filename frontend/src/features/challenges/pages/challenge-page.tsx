import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, FlaskConical, Play, RotateCcw, XCircle } from 'lucide-react'
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
import { formatBytes, formatDuration } from '@/lib/format'
import { cn } from '@/lib/cn'
import { queryKeys } from '@/services/query-keys'
import { challengesApi } from '@/services/challenges.api'
import { submissionsApi } from '@/services/submissions.api'
import type { Language } from '@/types'
import { DifficultyBadge } from '../components/difficulty-badge'
import { VerdictPanel } from '@/features/submissions/components/verdict-panel'
import { useSubmissionPolling } from '@/features/submissions/hooks/use-submission-polling'
import { compareOutput, runLocally, type LocalRunOutcome } from '@/features/submissions/local-run/judge'

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
  const [localOutcome, setLocalOutcome] = useState<LocalRunOutcome | null>(null)
  const [localRunning, setLocalRunning] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

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
      setLocalOutcome(null)
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

  const runLocal = async () => {
    if (!challenge.data || language !== 'javascript') return
    setLocalRunning(true)
    setLocalError(null)
    try {
      const outcome = await runLocally(
        code,
        challenge.data.examples.map((example) => ({
          input: example.input,
          expected: example.output,
        })),
      )
      setLocalOutcome(outcome)
    } catch (error) {
      setLocalError(describeError(error))
    } finally {
      setLocalRunning(false)
    }
  }

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
  const localPassed = localOutcome
    ? localOutcome.results.filter((result, index) => {
        const example = data.examples[index]
        return example && !result.error && compareOutput(result.output, example.output)
      }).length
    : 0

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

              {language === 'javascript' ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={FlaskConical}
                    loading={localRunning}
                    onClick={() => void runLocal()}
                  >
                    Demo run
                  </Button>
                  <span className="text-[11px] text-muted-foreground">
                    JavaScript only · browser worker · examples above only
                  </span>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Demo run is JavaScript-only.{' '}
                  {language ? languageLabel(language) : 'This language'} submissions go straight to
                  the server judge.
                </p>
              )}
              {localError ? <p className="text-xs text-danger">{localError}</p> : null}
            </div>
          </section>

          {localOutcome ? (
            <section className="card border-dashed p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-1.5 text-sm font-semibold">
                  <FlaskConical className="size-4 text-warning" aria-hidden="true" />
                  Local demo result
                </h2>
                <Badge tone={localPassed === data.examples.length ? 'success' : 'warning'}>
                  local · {localPassed}/{data.examples.length} examples
                </Badge>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Not a submission. Nothing was sent to the judge, and no points were awarded.
                {localOutcome.timedOut ? ' The run timed out and was terminated.' : ''}
              </p>
              <ul className="mt-2 space-y-1.5">
                {data.examples.map((example, index) => {
                  const result = localOutcome.results[index]
                  const ok = result && !result.error && compareOutput(result.output, example.output)
                  return (
                    <li
                      key={index}
                      className={cn(
                        'flex items-start gap-2 rounded-md border px-2.5 py-1.5 text-[11px]',
                        ok ? 'border-success/30 bg-success-soft' : 'border-danger/30 bg-danger-soft',
                      )}
                    >
                      {ok ? (
                        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden="true" />
                      ) : (
                        <XCircle className="mt-0.5 size-3.5 shrink-0 text-danger" aria-hidden="true" />
                      )}
                      <span className="min-w-0">
                        <span className="font-medium">Example {index + 1}</span>
                        <span className="block break-words font-mono">
                          expected {example.output} · got {result?.error ?? result?.output ?? '(no output)'}
                        </span>
                      </span>
                    </li>
                  )
                })}
              </ul>
              {localOutcome.fatalError ? (
                <p className="mt-2 font-mono text-[11px] text-danger">{localOutcome.fatalError}</p>
              ) : null}
              {localOutcome.logs.length > 0 ? (
                <pre className="mt-2 max-h-32 overflow-auto rounded-md bg-surface-sunken p-2 font-mono text-[10px]">
                  {localOutcome.logs.join('\n')}
                </pre>
              ) : null}
              <p className="mt-2 text-right font-mono text-[10px] text-muted-foreground">
                {formatDuration(localOutcome.durationMs)}
              </p>
            </section>
          ) : null}

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
