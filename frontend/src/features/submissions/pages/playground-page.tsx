import { AlertTriangle, Play, RotateCcw, ShieldQuestion } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/cn'
import { formatDuration } from '@/lib/format'
import {
  compareOutput,
  LOCAL_TIMEOUT_MS,
  normalizeOutput,
  runLocally,
  type LocalRunOutcome,
} from '../local-run/judge'

const STARTER = `// Define solve(input) and return the answer as a string.
// This runner is JavaScript-only and executes in your browser.
function solve(input) {
  const numbers = input
    .split(/[\\s,]+/)
    .filter(Boolean)
    .map(Number)

  return String(numbers.reduce((sum, n) => sum + n, 0))
}
`

const TEST_CASES = [
  { input: '1 2 3 4', expected: '10' },
  { input: '10, 20, 30', expected: '60' },
  { input: '5', expected: '5' },
]

export function PlaygroundPage() {
  const [code, setCode] = useState(STARTER)
  const [outcome, setOutcome] = useState<LocalRunOutcome | null>(null)
  const [running, setRunning] = useState(false)
  const { toast } = useToast()

  const run = async () => {
    setRunning(true)
    setOutcome(null)
    try {
      const result = await runLocally(code, TEST_CASES)
      setOutcome(result)
      if (result.timedOut) {
        toast({ title: 'Timed out', description: `Stopped after ${LOCAL_TIMEOUT_MS} ms.`, tone: 'warning' })
      }
    } finally {
      setRunning(false)
    }
  }

  const passed = outcome
    ? outcome.results.filter((result, index) => {
        const test = TEST_CASES[index]
        return test && !result.error && compareOutput(result.output, test.expected)
      }).length
    : 0

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Local runner
          </p>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">JavaScript playground</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Runs in a Web Worker with a {LOCAL_TIMEOUT_MS} ms wall-clock limit. Public test cases
            only. Results are labelled <span className="font-mono">local</span> and never affect
            points or leaderboard position.
          </p>
        </div>
        <Badge tone="warning">Not a security sandbox</Badge>
      </header>

      <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning-soft px-3 py-2 text-xs text-warning">
        <ShieldQuestion className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>
          A worker shares this page&apos;s origin. Network APIs are stubbed out, but this does not
          provide the isolation of the server execution worker. Do not paste code you would not run
          yourself.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
            <span className="font-mono text-xs text-muted-foreground">solution.js</span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                icon={RotateCcw}
                onClick={() => {
                  setCode(STARTER)
                  setOutcome(null)
                }}
              >
                Reset
              </Button>
              <Button size="sm" icon={Play} onClick={run} loading={running}>
                Run tests
              </Button>
            </div>
          </div>
          <Textarea
            value={code}
            onChange={(event) => setCode(event.target.value)}
            spellCheck={false}
            aria-label="JavaScript source"
            className="min-h-[22rem] rounded-none border-0 bg-surface-sunken px-4 py-3 font-mono text-[13px] leading-relaxed focus-visible:outline-none"
          />
        </section>

        <aside className="space-y-3">
          <div className="card p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Public tests
            </h2>
            <ul className="mt-2 space-y-2 text-xs">
              {TEST_CASES.map((test, index) => {
                const result = outcome?.results[index]
                const ok =
                  result && !result.error && compareOutput(result.output, test.expected)
                return (
                  <li key={test.input} className="rounded-lg border border-border p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] text-muted-foreground">
                        case {index + 1}
                      </span>
                      {result ? (
                        <Badge tone={ok ? 'success' : 'danger'}>{ok ? 'pass' : 'fail'}</Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 font-mono text-[11px]">in: {test.input}</p>
                    <p className="font-mono text-[11px]">out: {test.expected}</p>
                    {result ? (
                      <p className={cn('mt-1 font-mono text-[11px]', ok ? 'text-success' : 'text-danger')}>
                        got: {result.error ?? (normalizeOutput(result.output) || '(empty)')}
                      </p>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="card p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Result
            </h2>
            {!outcome ? (
              <p className="mt-2 text-xs text-muted-foreground">Run the tests to see output.</p>
            ) : outcome.fatalError ? (
              <div className="mt-2 space-y-1">
                <Badge tone="danger">runner error</Badge>
                <p className="font-mono text-[11px] text-danger">{outcome.fatalError}</p>
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <Badge tone={passed === TEST_CASES.length ? 'success' : 'warning'}>
                    local · {passed}/{TEST_CASES.length} passed
                  </Badge>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {formatDuration(outcome.durationMs)}
                  </span>
                </div>
                {outcome.logs.length > 0 ? (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      console
                    </p>
                    <pre className="mt-1 max-h-40 overflow-auto rounded-md bg-surface-sunken p-2 font-mono text-[10px] leading-relaxed">
                      {outcome.logs.join('\n')}
                    </pre>
                  </div>
                ) : null}
                <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                  <AlertTriangle className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                  Demo result only. Submit against the server judge for a real verdict.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
