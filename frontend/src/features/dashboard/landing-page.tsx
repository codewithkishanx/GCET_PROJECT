import { ArrowRight, BookOpen, ChevronLeft, ChevronRight, Code2, Compass, MessagesSquare, RotateCcw, Trophy } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Page } from '@/components/layout/public-layout'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { algorithms, topics } from '@/features/dsa/content/catalog'

interface DemoStep {
  low: number
  high: number
  mid: number
  message: string
  found?: boolean
}

const demoArray = [2, 5, 8, 12, 16, 23, 38, 45, 56]
const demoTarget = 23
const demoSteps: DemoStep[] = [
  { low: 0, high: 8, mid: 4, message: 'Initial bounds [0, 8]. Inspect middle element index 4 (value 16). 16 < 23, discard left half.' },
  { low: 5, high: 8, mid: 6, message: 'New bounds [5, 8]. Inspect middle element index 6 (value 38). 38 > 23, discard right half.' },
  { low: 5, high: 5, mid: 5, message: 'New bounds [5, 5]. Inspect element index 5 (value 23). Match found at index 5.', found: true },
]

export function LandingPage() {
  useDocumentTitle()
  const visualizerCount = new Set(algorithms.map((algorithm) => algorithm.visualizer)).size
  const [stepIndex, setStepIndex] = useState(0)
  const currentStep = demoSteps[stepIndex] ?? demoSteps[0]!

  return (
    <Page className="!py-0">
      {/* Apple-style Hero: Quiet chrome, typography with optical tightness, and one real product moment */}
      <section className="relative border-b border-border py-16 sm:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 mb-6">
            <Badge tone="primary">
              Deterministic learning &amp; execution
            </Badge>
          </div>

          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-6xl sm:leading-[1.08]">
            See the algorithm,
            <br />
            not just the answer.
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg sm:leading-relaxed">
            Step through data structures one event at a time, repair intentionally broken code,
            and explain what you learned to the community. Every visualisation runs locally, so
            you can inspect the exact state at each step — forward and backward.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/topics">
              <Button size="lg" icon={Compass}>
                Start learning
              </Button>
            </Link>
            <Link to="/challenges">
              <Button size="lg" variant="secondary" icon={Code2}>
                Browse challenges
              </Button>
            </Link>
          </div>

          <p className="mt-6 font-mono text-xs text-muted-foreground tabular-nums">
            {algorithms.length} algorithms · {visualizerCount} visualiser modes · {topics.length} topics
          </p>
        </div>

        {/* The Moment: Interactive Apple-style Visualizer Preview Window */}
        <div className="mx-auto mt-12 max-w-3xl">
          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl transition-all">
            {/* Window Chrome */}
            <div className="flex h-11 items-center justify-between border-b border-border bg-surface-sunken/60 px-4">
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-full bg-foreground/15" />
                <div className="size-3 rounded-full bg-foreground/15" />
                <div className="size-3 rounded-full bg-foreground/15" />
                <span className="ml-2 font-mono text-xs text-muted-foreground">binary-search.trace</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground tabular-nums">
                <span>target = {demoTarget}</span>
                <span className="text-border-strong">|</span>
                <span>step {stepIndex + 1}/{demoSteps.length}</span>
              </div>
            </div>

            {/* Visualizer Canvas */}
            <div className="p-6 sm:p-8">
              {/* Array Elements */}
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 py-4">
                {demoArray.map((val, idx) => {
                  const isMid = idx === currentStep.mid
                  const inRange = idx >= currentStep.low && idx <= currentStep.high
                  const isMatch = currentStep.found && isMid

                  return (
                    <div key={idx} className="flex flex-col items-center gap-1.5">
                      <div
                        className={`flex size-11 sm:size-12 items-center justify-center rounded-xl font-mono text-sm sm:text-base font-semibold transition-all duration-200 tabular-nums ${
                          isMatch
                            ? 'bg-success text-white shadow-md ring-2 ring-success/40 scale-105'
                            : isMid
                            ? 'bg-primary text-primary-foreground shadow-md ring-2 ring-primary/40 scale-105'
                            : inRange
                            ? 'bg-surface border border-border-strong text-foreground'
                            : 'bg-surface-sunken/40 border border-border/40 text-muted-foreground/40 opacity-40'
                        }`}
                      >
                        {val}
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                        {idx}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Explainer Box */}
              <div className="mt-6 rounded-xl border border-border bg-surface-sunken/50 p-4 text-xs text-foreground leading-relaxed">
                <span className="font-semibold text-primary mr-1.5">Step {stepIndex + 1}:</span>
                {currentStep.message}
              </div>

              {/* Step Controls */}
              <div className="mt-4 flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={ChevronLeft}
                    disabled={stepIndex === 0}
                    onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={ChevronRight}
                    disabled={stepIndex === demoSteps.length - 1}
                    onClick={() => setStepIndex((i) => Math.min(demoSteps.length - 1, i + 1))}
                  >
                    Next
                  </Button>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  icon={RotateCcw}
                  onClick={() => setStepIndex(0)}
                >
                  Reset
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid: 4px grid, unified neutral ramp, purposeful icons */}
      <section className="grid gap-4 py-16 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            icon: BookOpen,
            title: 'Learn',
            body: 'Deterministic traces make every comparison, swap, and pointer move explicit.',
            to: '/topics',
            cta: 'Open topics',
          },
          {
            icon: Code2,
            title: 'Debug',
            body: 'Fix buggy starter code and submit it to a server-side judge with real verdicts.',
            to: '/challenges',
            cta: 'View challenges',
          },
          {
            icon: Trophy,
            title: 'Compete',
            body: 'Points come from accepted submissions only. The leaderboard is read from the API.',
            to: '/leaderboard',
            cta: 'Leaderboard',
          },
          {
            icon: MessagesSquare,
            title: 'Share',
            body: 'Publish Markdown notes with code blocks, get comments, and report abuse.',
            to: '/community',
            cta: 'Community',
          },
        ].map((feature) => (
          <article key={feature.title} className="card flex flex-col gap-3 p-6 transition-all">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <feature.icon className="size-4.5" aria-hidden="true" />
            </div>
            <h2 className="text-sm font-semibold tracking-tight text-foreground">{feature.title}</h2>
            <p className="flex-1 text-xs text-muted-foreground leading-relaxed">{feature.body}</p>
            <Link
              to={feature.to}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline active:opacity-75"
            >
              <span>{feature.cta}</span>
              <ArrowRight className="size-3" aria-hidden="true" />
            </Link>
          </article>
        ))}
      </section>

      {/* Topics Grid: Clean cards with Apple micro-interactions */}
      <section className="border-t border-border py-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Topics</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Explore foundational data structures and algorithm categories</p>
          </div>
          <Link to="/topics" className="text-xs font-medium text-primary hover:underline">
            View all ({topics.length})
          </Link>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {topics.slice(0, 8).map((topic) => (
            <Link
              key={topic.slug}
              to={`/topics/${topic.slug}`}
              className="card group flex flex-col gap-1.5 p-5 transition-all hover:border-border-strong active:scale-[0.985]"
            >
              <span className="flex items-center justify-between gap-2 text-sm font-semibold tracking-tight text-foreground">
                {topic.title}
                <ArrowRight
                  className="size-3.5 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
              <span className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{topic.blurb}</span>
              <span className="mt-2 font-mono text-[11px] text-muted-foreground/75 tabular-nums">
                {topic.algorithmSlugs.length} algorithms
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Real Architecture Note: Clean, confident, no hype */}
      <section className="border-t border-border py-12">
        <div className="rounded-2xl border border-border bg-surface p-6 sm:p-7">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">What is real in this build</h2>
          <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed max-w-3xl">
            Visualisers, playback, and demo runs execute entirely in your browser without artificial delay.
            Accounts, challenges, submissions, points, and community content are served by the Express API and judged
            in secure containerized environments.
          </p>
        </div>
      </section>
    </Page>
  )
}
