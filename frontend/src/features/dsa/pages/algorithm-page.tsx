import { AlertCircle, ArrowLeft, ArrowRight, Shuffle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Page } from '@/components/layout/public-layout'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Field } from '@/components/ui/field'
import { Input, Select } from '@/components/ui/input'
import { useDocumentTitle } from '@/hooks/use-document-title'
import {
  algorithmBySlug,
  algorithmsForTopic,
  defaultParams,
  graphDatasets,
  topicBySlug,
  type AlgorithmMeta,
  type AlgorithmParams,
} from '../content/catalog'
import { parseInteger, parseNumberList } from '../algorithms/types'
import { PlayerControls, StepExplainer } from '../components/player-controls'
import { usePlayer } from '../components/use-player'
import { ArrayLegend, ArrayVisualizer } from '../visualizers/array-visualizer'
import { ListVisualizer } from '../visualizers/list-visualizer'
import { TreeVisualizer } from '../visualizers/tree-visualizer'
import { GraphVisualizer } from '../visualizers/graph-visualizer'
import { LinearVisualizer } from '../visualizers/linear-visualizer'
import { BoardVisualizer } from '../visualizers/board-visualizer'

function buildForm(algorithm: AlgorithmMeta): Record<string, string> {
  const defaults = defaultParams(algorithm)
  return {
    values: defaults.values.join(', '),
    target: String(defaults.target),
    index: String(defaults.index),
    k: String(defaults.k),
    size: String(defaults.size),
    graphId: defaults.graphId,
    start: defaults.start,
  }
}

export function AlgorithmPage() {
  const { slug = '' } = useParams()
  const algorithm = algorithmBySlug.get(slug)
  useDocumentTitle(algorithm?.title ?? 'Algorithm')

  const [form, setForm] = useState<Record<string, string>>(() =>
    algorithm
      ? buildForm(algorithm)
      : { values: '', target: '0', index: '0', k: '3', size: '6', graphId: 'sample', start: 'A' },
  )
  const [params, setParams] = useState<AlgorithmParams | null>(() =>
    algorithm ? defaultParams(algorithm) : null,
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!algorithm) return
    setForm(buildForm(algorithm))
    setParams(defaultParams(algorithm))
    setErrors({})
  }, [algorithm])

  const trace = useMemo(() => {
    if (!algorithm || !params) return null
    try {
      return algorithm.run(params)
    } catch {
      return null
    }
  }, [algorithm, params])

  const steps = trace?.steps ?? []
  const player = usePlayer(steps)

  if (!algorithm || !params) {
    return (
      <Page>
        <EmptyState
          title="Algorithm not found"
          description="That algorithm is not part of the catalogue."
          action={
            <Link to="/topics" className="text-sm font-medium text-primary hover:underline">
              Browse topics
            </Link>
          }
        />
      </Page>
    )
  }

  const topic = topicBySlug.get(algorithm.topic)
  const siblings = algorithmsForTopic(algorithm.topic)
  const position = siblings.findIndex((item) => item.slug === algorithm.slug)
  const previous = position > 0 ? siblings[position - 1] : undefined
  const next = position >= 0 && position < siblings.length - 1 ? siblings[position + 1] : undefined

  const update = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }))

  const apply = () => {
    const nextErrors: Record<string, string> = {}
    const values = parseNumberList(form.values ?? '')
    if ('error' in values) nextErrors.values = values.error

    const needsNumbers = algorithm.controls.includes('values')
    const parsedValues = 'error' in values ? [] : values

    let target = params.target
    if (algorithm.controls.includes('target')) {
      const result = parseInteger(form.target ?? '', { min: -999, max: 999, field: 'Value' })
      if (typeof result !== 'number') nextErrors.target = result.error
      else target = result
    }

    let index = params.index
    if (algorithm.controls.includes('index')) {
      const max = Math.max(0, parsedValues.length)
      const result = parseInteger(form.index ?? '', { min: 0, max, field: 'Index' })
      if (typeof result !== 'number') nextErrors.index = result.error
      else index = result
    }

    let k = params.k
    if (algorithm.controls.includes('k')) {
      const max = Math.max(1, parsedValues.length)
      const result = parseInteger(form.k ?? '', { min: 1, max, field: 'Window size' })
      if (typeof result !== 'number') nextErrors.k = result.error
      else k = result
    }

    let size = params.size
    if (algorithm.controls.includes('size')) {
      const result = parseInteger(form.size ?? '', { min: 4, max: 8, field: 'Board size' })
      if (typeof result !== 'number') nextErrors.size = result.error
      else size = result
    }

    const graphId = algorithm.controls.includes('graph') ? (form.graphId ?? 'sample') : params.graphId
    const dataset = graphDatasets[graphId]
    const start = algorithm.controls.includes('graph')
      ? (form.start ?? dataset?.start ?? 'A')
      : params.start

    if (needsNumbers && ('error' in values || values.length === 0)) {
      nextErrors.values = 'error' in values ? values.error : 'Enter at least one number.'
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setParams({
      values: 'error' in values ? params.values : values,
      target,
      index,
      k,
      size,
      order: params.order,
      graphId,
      start,
    })
  }

  const randomise = () => {
    const length = 8
    const values = Array.from({ length }, () => Math.floor(Math.random() * 89) + 10)
    update('values', values.join(', '))
  }

  return (
    <Page wide>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Link to="/topics" className="hover:text-foreground">
          Topics
        </Link>
        <span aria-hidden="true">/</span>
        {topic ? (
          <Link to={`/topics/${topic.slug}`} className="hover:text-foreground">
            {topic.title}
          </Link>
        ) : null}
        <span aria-hidden="true">/</span>
        <span className="text-foreground">{algorithm.title}</span>
      </div>

      <PageHeader
        eyebrow={topic?.title ?? 'Algorithm'}
        title={algorithm.title}
        description={algorithm.blurb}
        actions={
          <>
            <Badge tone="neutral">{algorithm.time}</Badge>
            <Badge tone="neutral">space {algorithm.space}</Badge>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <section className="card p-4" aria-label="Input controls">
            <div className="flex flex-wrap items-end gap-3">
              {algorithm.controls.includes('values') ? (
                <Field label="Array values" htmlFor="values" error={errors.values} className="min-w-56 flex-1">
                  <Input
                    id="values"
                    value={form.values ?? ''}
                    onChange={(event) => update('values', event.target.value)}
                    placeholder="e.g. 42, 17, 63, 8"
                    invalid={Boolean(errors.values)}
                    inputMode="numeric"
                  />
                </Field>
              ) : null}

              {algorithm.controls.includes('target') ? (
                <Field
                  label={algorithm.slug.includes('insert') ? 'Value to insert' : 'Target value'}
                  htmlFor="target"
                  error={errors.target}
                  className="w-36"
                >
                  <Input
                    id="target"
                    value={form.target ?? ''}
                    onChange={(event) => update('target', event.target.value)}
                    invalid={Boolean(errors.target)}
                    inputMode="numeric"
                  />
                </Field>
              ) : null}

              {algorithm.controls.includes('index') ? (
                <Field label="Index" htmlFor="index" error={errors.index} className="w-24">
                  <Input
                    id="index"
                    value={form.index ?? ''}
                    onChange={(event) => update('index', event.target.value)}
                    invalid={Boolean(errors.index)}
                    inputMode="numeric"
                  />
                </Field>
              ) : null}

              {algorithm.controls.includes('k') ? (
                <Field label="Window size" htmlFor="k" error={errors.k} className="w-28">
                  <Input
                    id="k"
                    value={form.k ?? ''}
                    onChange={(event) => update('k', event.target.value)}
                    invalid={Boolean(errors.k)}
                    inputMode="numeric"
                  />
                </Field>
              ) : null}

              {algorithm.controls.includes('size') ? (
                <Field label="Board" htmlFor="size" error={errors.size} className="w-28">
                  <Select
                    id="size"
                    value={form.size ?? '6'}
                    onChange={(event) => update('size', event.target.value)}
                  >
                    {[4, 5, 6, 7, 8].map((value) => (
                      <option key={value} value={value}>
                        {value} × {value}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : null}

              {algorithm.controls.includes('graph') ? (
                <>
                  <Field label="Graph" htmlFor="graphId" className="w-48">
                    <Select
                      id="graphId"
                      value={form.graphId ?? 'sample'}
                      onChange={(event) => {
                        const nextId = event.target.value
                        update('graphId', nextId)
                        update('start', graphDatasets[nextId]?.start ?? 'A')
                      }}
                    >
                      {Object.entries(graphDatasets).map(([id, dataset]) => (
                        <option key={id} value={id}>
                          {dataset.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Start node" htmlFor="start" className="w-28">
                    <Select
                      id="start"
                      value={form.start ?? 'A'}
                      onChange={(event) => update('start', event.target.value)}
                    >
                      {(graphDatasets[form.graphId ?? 'sample']?.data.nodes ?? []).map((node) => (
                        <option key={node.id} value={node.id}>
                          {node.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </>
              ) : null}

              <div className="flex items-center gap-2 pb-0.5">
                <Button onClick={apply}>Apply</Button>
                {algorithm.controls.includes('values') ? (
                  <Button variant="ghost" size="icon" onClick={randomise} title="Randomise values" aria-label="Randomise values">
                    <Shuffle className="size-4" aria-hidden="true" />
                  </Button>
                ) : null}
              </div>
            </div>
          </section>

          <section className="card p-5" aria-label="Visualisation">
            {trace ? (
              <>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold">Visualisation</h2>
                  {algorithm.visualizer === 'array' || algorithm.visualizer === 'heap' ? (
                    <ArrayLegend />
                  ) : null}
                </div>

                <Visualizer algorithm={algorithm} step={player.step} />

                <div className="mt-4 space-y-3 border-t border-border pt-4">
                  <PlayerControls player={player} />
                  <StepExplainer
                    message={player.step?.message ?? 'No steps generated for this input.'}
                    index={player.index}
                    total={steps.length}
                  />
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 py-10 text-sm text-danger">
                <AlertCircle className="size-4" aria-hidden="true" />
                This input could not be simulated. Check the values and try again.
              </div>
            )}
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-semibold">Reference implementation</h2>
            <pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-surface-sunken p-4 font-mono text-xs leading-relaxed">
              <code>{algorithm.code}</code>
            </pre>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="card p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              The idea
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{algorithm.idea}</p>
          </section>

          <section className="card p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Complexity
            </h2>
            <dl className="mt-2 space-y-1.5 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Time</dt>
                <dd className="font-mono">{trace?.complexity.time ?? algorithm.time}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Space</dt>
                <dd className="font-mono">{trace?.complexity.space ?? algorithm.space}</dd>
              </div>
            </dl>
            {trace ? (
              <p className="mt-2 text-xs text-muted-foreground">{trace.complexity.summary}</p>
            ) : null}
          </section>

          {trace ? (
            <section className="card p-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Edge cases
              </h2>
              <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                {trace.edgeCases.map((edgeCase) => (
                  <li key={edgeCase} className="flex gap-1.5">
                    <span className="text-primary" aria-hidden="true">
                      •
                    </span>
                    {edgeCase}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <nav className="flex flex-col gap-2" aria-label="Adjacent algorithms">
            {previous ? (
              <Link
                to={`/algorithms/${previous.slug}`}
                className="card flex items-center gap-2 p-3 text-sm transition-colors hover:border-border-strong"
              >
                <ArrowLeft className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
                    Previous
                  </span>
                  <span className="block truncate">{previous.title}</span>
                </span>
              </Link>
            ) : null}
            {next ? (
              <Link
                to={`/algorithms/${next.slug}`}
                className="card flex items-center justify-end gap-2 p-3 text-right text-sm transition-colors hover:border-border-strong"
              >
                <span className="min-w-0">
                  <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
                    Next
                  </span>
                  <span className="block truncate">{next.title}</span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            ) : null}
          </nav>
        </aside>
      </div>
    </Page>
  )
}

function Visualizer({
  algorithm,
  step,
}: {
  algorithm: AlgorithmMeta
  step: ReturnType<typeof usePlayer>['step']
}) {
  if (!step) return null
  switch (algorithm.visualizer) {
    case 'array':
    case 'heap':
      return <ArrayVisualizer step={step} />
    case 'list':
      return <ListVisualizer step={step} />
    case 'tree':
      return <TreeVisualizer step={step} />
    case 'graph':
      return <GraphVisualizer step={step} />
    case 'linear':
      return <LinearVisualizer step={step} />
    case 'board':
      return <BoardVisualizer step={step} />
    default:
      return null
  }
}
