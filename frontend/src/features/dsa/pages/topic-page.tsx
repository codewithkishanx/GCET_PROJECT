import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Page } from '@/components/layout/public-layout'
import { PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { algorithmsForTopic, topicBySlug } from '../content/catalog'

export function TopicPage() {
  const { slug = '' } = useParams()
  const topic = topicBySlug.get(slug)
  useDocumentTitle(topic?.title ?? 'Topic')

  if (!topic) {
    return (
      <Page>
        <EmptyState
          title="Topic not found"
          description="That topic does not exist. Browse the topic index instead."
          action={
            <Link to="/topics" className="text-sm font-medium text-primary hover:underline">
              All topics
            </Link>
          }
        />
      </Page>
    )
  }

  const list = algorithmsForTopic(topic.slug)

  return (
    <Page>
      <Link
        to="/topics"
        className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        All topics
      </Link>

      <PageHeader eyebrow="Topic" title={topic.title} description={topic.overview} />

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-3">
          {list.map((algorithm) => (
            <Link
              key={algorithm.slug}
              to={`/algorithms/${algorithm.slug}`}
              className="card group flex items-start justify-between gap-4 p-4 transition-colors hover:border-border-strong"
            >
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-semibold">{algorithm.title}</p>
                <p className="text-xs text-muted-foreground">{algorithm.blurb}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="hidden font-mono text-[10px] text-muted-foreground sm:inline">
                  {algorithm.time}
                </span>
                <ArrowRight
                  className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </div>
            </Link>
          ))}
        </div>

        <aside className="space-y-4">
          <div className="card p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              At a glance
            </h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Algorithms</dt>
                <dd className="font-mono">{list.length}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Best time</dt>
                <dd className="font-mono">{bestOf(list.map((item) => item.time))}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Extra space</dt>
                <dd className="font-mono">{bestOf(list.map((item) => item.space))}</dd>
              </div>
            </dl>
          </div>

          <div className="card p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              How to read a trace
            </h2>
            <ul className="mt-2 space-y-2 text-xs text-muted-foreground">
              <li>Colour marks the event: compare, swap, visit, or settled.</li>
              <li>Pointers are labelled <span className="font-mono">i</span>, <span className="font-mono">L</span>, <span className="font-mono">R</span>, or the heap index.</li>
              <li>Arrow keys step; <kbd className="rounded border border-border px-1">Space</kbd> plays and pauses.</li>
            </ul>
          </div>
        </aside>
      </div>
    </Page>
  )
}

function bestOf(values: string[]): string {
  if (values.length === 0) return '—'
  const unique = [...new Set(values)]
  return unique.slice(0, 2).join(' · ')
}
