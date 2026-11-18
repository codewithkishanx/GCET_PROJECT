import { ArrowLeft } from 'lucide-react'
import { Suspense, lazy } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { SkeletonList } from '@/components/ui/skeleton'
import { languageLabel } from '@/components/editor/languages'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { formatDateTime, formatDuration } from '@/lib/format'
import { VerdictPanel } from '../components/verdict-panel'
import { useSubmissionPolling } from '../hooks/use-submission-polling'

const CodeEditor = lazy(() =>
  import('@/components/editor/code-editor').then((module) => ({ default: module.CodeEditor })),
)

export function SubmissionDetailPage() {
  const { id = '' } = useParams()
  const query = useSubmissionPolling(id || null)
  useDocumentTitle('Submission')

  if (query.isPending) return <SkeletonList rows={3} />
  if (query.isError) {
    return (
      <VerdictPanel
        submission={undefined}
        error={query.error}
        loading={false}
        onRetry={() => void query.refetch()}
      />
    )
  }

  const submission = query.data
  if (!submission) return null

  return (
    <div className="space-y-5">
      <Link
        to="/submissions"
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        All submissions
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">
            {submission.challengeTitle ?? 'Submission'}
          </h1>
          <p className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted-foreground">
            {submission.challengeSlug ? (
              <Link
                to={`/challenges/${submission.challengeSlug}`}
                className="text-primary hover:underline"
              >
                {submission.challengeSlug}
              </Link>
            ) : null}
            <span aria-hidden="true">·</span>
            <span>{languageLabel(submission.language)}</span>
            <span aria-hidden="true">·</span>
            <span>{formatDateTime(submission.createdAt)}</span>
          </p>
        </div>
        <Badge tone="neutral">id {submission.id.slice(0, 8)}</Badge>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="space-y-3">
          <VerdictPanel
            submission={submission}
            loading={query.isFetching && !submission}
            error={null}
            onRetry={() => void query.refetch()}
          />
          <dl className="card grid grid-cols-2 gap-3 p-4 text-xs">
            <div>
              <dt className="text-muted-foreground">Started</dt>
              <dd className="font-mono">{formatDateTime(submission.startedAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Completed</dt>
              <dd className="font-mono">{formatDateTime(submission.completedAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Duration</dt>
              <dd className="font-mono">{formatDuration(submission.durationMs)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Memory</dt>
              <dd className="font-mono">
                {submission.memoryKb === null ? '—' : `${Math.round(submission.memoryKb / 1024)} MB`}
              </dd>
            </div>
          </dl>
        </section>

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
            <span className="text-xs font-semibold">Submitted source</span>
            <span className="font-mono text-[10px] text-muted-foreground">read only</span>
          </div>
          <Suspense
            fallback={
              <div className="grid h-[24rem] place-items-center text-sm text-muted-foreground">
                Loading editor…
              </div>
            }
          >
            <CodeEditor
              value={submission.sourceCode}
              language={submission.language}
              readOnly
              height="24rem"
              ariaLabel="Submitted source code"
            />
          </Suspense>
        </section>
      </div>
    </div>
  )
}
