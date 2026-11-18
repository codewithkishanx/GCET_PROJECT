/* ---------------------------------------------------------------------------
 * Local JavaScript runner.
 *
 * This is a convenience for trying a solution without the backend. It runs in a
 * dedicated Web Worker, denies network APIs on a best-effort basis, and is
 * terminated on timeout. A worker shares the page's origin, so this is NOT a
 * security boundary — the server-side judge remains the only source of truth
 * for points and verdicts.
--------------------------------------------------------------------------- */

export interface LocalTestCase {
  input: string
  expected: string
}

export interface LocalTestResult {
  output: string
  error: string | null
}

export interface LocalRunOutcome {
  results: LocalTestResult[]
  logs: string[]
  fatalError: string | null
  timedOut: boolean
  durationMs: number
}

export const LOCAL_TIMEOUT_MS = 2000
export const MAX_LOGS = 40
export const MAX_OUTPUT_CHARS = 20_000

/** Whitespace policy matches the documented server judge: trim line ends, drop trailing blank lines. */
export function normalizeOutput(value: string): string {
  return value
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n+$/, '')
}

export function compareOutput(actual: string, expected: string): boolean {
  return normalizeOutput(actual) === normalizeOutput(expected)
}

const WORKER_SOURCE = `
self.onmessage = function (event) {
  const source = event.data.source
  const tests = event.data.tests
  const logs = []
  const format = function (value) {
    if (typeof value === 'string') return value
    try { return JSON.stringify(value) } catch (error) { return String(value) }
  }
  const capture = function (level) {
    return function () {
      if (logs.length >= ${MAX_LOGS}) return
      const parts = []
      for (let i = 0; i < arguments.length; i++) parts.push(format(arguments[i]))
      logs.push(level + ': ' + parts.join(' ').slice(0, 400))
    }
  }
  const proxyConsole = {
    log: capture('log'),
    info: capture('info'),
    warn: capture('warn'),
    error: capture('error'),
    debug: capture('debug'),
  }
  const deny = function (name) {
    return function () { throw new Error(name + ' is disabled in the local runner.') }
  }

  try {
    const factory = new Function(
      'console', 'fetch', 'XMLHttpRequest', 'WebSocket', 'importScripts', 'globalThis',
      source + '\\n;return typeof solve === "function" ? solve : null;'
    )
    const solve = factory(
      proxyConsole,
      deny('fetch'),
      deny('XMLHttpRequest'),
      deny('WebSocket'),
      deny('importScripts'),
      Object.freeze({ console: proxyConsole })
    )
    if (typeof solve !== 'function') {
      self.postMessage({ ok: false, error: 'Define a function named solve(input) that returns a value.', logs: logs })
      return
    }

    const results = []
    for (let i = 0; i < tests.length; i++) {
      const test = tests[i]
      try {
        const output = solve(test.input)
        const text = output === undefined ? '' : String(output)
        results.push({ output: text.slice(0, ${MAX_OUTPUT_CHARS}), error: null })
      } catch (error) {
        results.push({ output: '', error: String((error && error.message) || error) })
      }
    }
    self.postMessage({ ok: true, results: results, logs: logs })
  } catch (error) {
    self.postMessage({ ok: false, error: String((error && error.message) || error), logs: logs })
  }
}
`

interface WorkerReply {
  ok: boolean
  error?: string
  results?: LocalTestResult[]
  logs?: string[]
}

export async function runLocally(
  sourceCode: string,
  tests: LocalTestCase[],
  timeoutMs = LOCAL_TIMEOUT_MS,
): Promise<LocalRunOutcome> {
  const started = performance.now()
  const base: LocalRunOutcome = {
    results: [],
    logs: [],
    fatalError: null,
    timedOut: false,
    durationMs: 0,
  }

  if (typeof Worker === 'undefined') {
    return { ...base, fatalError: 'Web Workers are not available in this browser.' }
  }

  const blob = new Blob([WORKER_SOURCE], { type: 'application/javascript' })
  const url = URL.createObjectURL(blob)
  const worker = new Worker(url)

  try {
    const reply = await new Promise<WorkerReply>((resolve, reject) => {
      const timer = setTimeout(() => {
        worker.terminate()
        reject(new Error('timeout'))
      }, timeoutMs)

      worker.onmessage = (event: MessageEvent<WorkerReply>) => {
        clearTimeout(timer)
        resolve(event.data)
      }
      worker.onerror = (event) => {
        clearTimeout(timer)
        reject(new Error(event.message || 'Worker crashed.'))
      }
      worker.postMessage({
        source: sourceCode,
        tests: tests.map((test) => ({ input: test.input, expected: test.expected })),
      })
    })

    return {
      results: reply.results ?? [],
      logs: reply.logs ?? [],
      fatalError: reply.ok ? null : (reply.error ?? 'The runner failed.'),
      timedOut: false,
      durationMs: performance.now() - started,
    }
  } catch (error) {
    const timedOut = error instanceof Error && error.message === 'timeout'
    return {
      ...base,
      timedOut,
      fatalError: timedOut
        ? `Execution exceeded ${timeoutMs} ms and was terminated.`
        : error instanceof Error
          ? error.message
          : 'The runner failed.',
      durationMs: performance.now() - started,
    }
  } finally {
    worker.terminate()
    URL.revokeObjectURL(url)
  }
}
