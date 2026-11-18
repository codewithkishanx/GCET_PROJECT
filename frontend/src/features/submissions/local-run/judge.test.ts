import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { compareOutput, normalizeOutput, runLocally } from './judge'

describe('normalizeOutput', () => {
  it('converts CRLF to LF', () => {
    expect(normalizeOutput('a\r\nb')).toBe('a\nb')
  })

  it('trims trailing whitespace on each line', () => {
    expect(normalizeOutput('a   \nb\t\n')).toBe('a\nb')
  })

  it('drops trailing blank lines but keeps inner ones', () => {
    expect(normalizeOutput('a\n\n\nb\n\n')).toBe('a\n\n\nb')
  })

  it('leaves leading whitespace alone (indentation can be meaningful)', () => {
    expect(normalizeOutput('  a')).toBe('  a')
  })

  it('normalises an empty string to empty', () => {
    expect(normalizeOutput('\n\n')).toBe('')
  })
})

describe('compareOutput', () => {
  it('ignores trailing newlines and line-end whitespace', () => {
    expect(compareOutput('42\n', '42')).toBe(true)
    expect(compareOutput('1  \r\n2\r\n', '1\n2')).toBe(true)
  })

  it('is strict about inner differences', () => {
    expect(compareOutput('1 2', '1  2')).toBe(false)
    expect(compareOutput('42', '43')).toBe(false)
    expect(compareOutput('', '0')).toBe(false)
  })
})

/* -------------------------------------------------------------------------
 * The real runner needs a Worker. jsdom has none, and a fake worker keeps the
 * protocol (postMessage → onmessage, terminate, timeout) testable without
 * executing the user source.
------------------------------------------------------------------------- */

type Listener = (event: MessageEvent) => void

class FakeWorker {
  static instances: FakeWorker[] = []
  static behaviour: 'reply' | 'throw-in-source' | 'silent' = 'reply'
  static received: unknown = null

  onmessage: Listener | null = null
  onerror: ((event: ErrorEvent) => void) | null = null
  terminated = false

  constructor() {
    FakeWorker.instances.push(this)
  }

  postMessage(payload: unknown) {
    FakeWorker.received = payload
    const source = (payload as { source: string }).source

    if (FakeWorker.behaviour === 'silent') return

    queueMicrotask(() => {
      if (FakeWorker.behaviour === 'throw-in-source' || source.includes('THROW')) {
        this.onmessage?.(
          new MessageEvent('message', {
            data: { ok: false, error: 'boom', logs: ['log: hi'] },
          }),
        )
        return
      }
      const tests = (payload as { tests: Array<{ input: string }> }).tests
      this.onmessage?.(
        new MessageEvent('message', {
          data: {
            ok: true,
            logs: ['log: solved'],
            results: tests.map((test) => ({ output: `out:${test.input}`, error: null })),
          },
        }),
      )
    })
  }

  terminate() {
    this.terminated = true
  }
}

describe('runLocally', () => {
  const originalWorker = globalThis.Worker

  beforeEach(() => {
    FakeWorker.instances = []
    FakeWorker.behaviour = 'reply'
    FakeWorker.received = null
    vi.stubGlobal('Worker', FakeWorker as unknown as typeof Worker)
  })

  afterEach(() => {
    vi.stubGlobal('Worker', originalWorker)
    vi.useRealTimers()
  })

  it('returns one result per test case', async () => {
    const outcome = await runLocally('function solve() {}', [
      { input: '1', expected: 'out:1' },
      { input: '2', expected: 'out:2' },
    ])
    expect(outcome.fatalError).toBeNull()
    expect(outcome.timedOut).toBe(false)
    expect(outcome.results.map((result) => result.output)).toEqual(['out:1', 'out:2'])
    expect(outcome.logs).toEqual(['log: solved'])
    expect(outcome.durationMs).toBeGreaterThanOrEqual(0)
  })

  it('terminates the worker and revokes the blob URL after a run', async () => {
    const revoke = vi.spyOn(URL, 'revokeObjectURL')
    await runLocally('function solve() {}', [{ input: '1', expected: 'out:1' }])
    expect(FakeWorker.instances[0]?.terminated).toBe(true)
    expect(revoke).toHaveBeenCalledOnce()
  })

  it('surfaces a fatal error from the worker', async () => {
    FakeWorker.behaviour = 'throw-in-source'
    const outcome = await runLocally('THROW', [{ input: '1', expected: '1' }])
    expect(outcome.fatalError).toBe('boom')
    expect(outcome.results).toEqual([])
  })

  it('times out and terminates a runaway worker', async () => {
    vi.useFakeTimers()
    FakeWorker.behaviour = 'silent'
    const promise = runLocally('function solve() {}', [], 50)
    await vi.advanceTimersByTimeAsync(60)
    const outcome = await promise
    expect(outcome.timedOut).toBe(true)
    expect(outcome.fatalError).toContain('50 ms')
    expect(FakeWorker.instances[0]?.terminated).toBe(true)
  })

  it('reports a missing Worker implementation instead of throwing', async () => {
    vi.stubGlobal('Worker', undefined)
    const outcome = await runLocally('function solve() {}', [])
    expect(outcome.fatalError).toContain('Web Workers')
    expect(outcome.results).toEqual([])
  })
})
