import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { StepSnapshot } from '../algorithms/types'
import { usePlayer } from './use-player'

const steps: StepSnapshot[] = [
  { message: 'one' },
  { message: 'two' },
  { message: 'three' },
]

describe('usePlayer', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts at the first step with nothing to go back to', () => {
    const { result } = renderHook(() => usePlayer(steps))
    expect(result.current.index).toBe(0)
    expect(result.current.step?.message).toBe('one')
    expect(result.current.canPrev).toBe(false)
    expect(result.current.canNext).toBe(true)
    expect(result.current.progress).toBe(0)
  })

  it('steps forward and backward without re-simulating', () => {
    const { result } = renderHook(() => usePlayer(steps))

    act(() => result.current.next())
    expect(result.current.index).toBe(1)
    expect(result.current.step?.message).toBe('two')

    act(() => result.current.next())
    act(() => result.current.next())
    expect(result.current.index).toBe(2)
    expect(result.current.canNext).toBe(false)

    act(() => result.current.prev())
    expect(result.current.index).toBe(1)
    expect(result.current.step?.message).toBe('two')
  })

  it('clamps goTo and reset returns to the first step', () => {
    const { result } = renderHook(() => usePlayer(steps))

    act(() => result.current.goTo(99))
    expect(result.current.index).toBe(2)

    act(() => result.current.goTo(-5))
    expect(result.current.index).toBe(0)

    act(() => result.current.goTo(1))
    act(() => result.current.reset())
    expect(result.current.index).toBe(0)
  })

  it('advances on a timer while playing and stops at the last step', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => usePlayer(steps))

    act(() => result.current.toggle())
    expect(result.current.playing).toBe(true)

    act(() => {
      vi.advanceTimersByTime(950)
    })
    expect(result.current.index).toBe(1)

    act(() => {
      vi.advanceTimersByTime(950)
    })
    expect(result.current.index).toBe(2)

    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(result.current.index).toBe(2)
    expect(result.current.playing).toBe(false)
  })

  it('replays from the start when play is pressed at the end', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => usePlayer(steps))

    act(() => result.current.goTo(2))
    act(() => result.current.play())
    expect(result.current.index).toBe(0)
    expect(result.current.playing).toBe(true)
    act(() => result.current.pause())
  })

  it('pausing stops the timer from advancing', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => usePlayer(steps))

    act(() => result.current.toggle())
    act(() => result.current.pause())
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(result.current.index).toBe(0)
    expect(result.current.playing).toBe(false)
  })

  it('supports keyboard stepping and ignores handlers while typing', () => {
    const { result } = renderHook(() => usePlayer(steps))

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    })
    expect(result.current.index).toBe(1)

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
    })
    expect(result.current.index).toBe(0)

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    })
    const input = document.createElement('input')
    document.body.append(input)
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(result.current.index).toBe(1)
    input.remove()

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' }))
    })
    expect(result.current.index).toBe(0)
  })

  it('reports full progress for a single-step trace', () => {
    const { result } = renderHook(() => usePlayer([steps[0]!]))
    expect(result.current.progress).toBe(1)
    expect(result.current.canNext).toBe(false)
  })
})
