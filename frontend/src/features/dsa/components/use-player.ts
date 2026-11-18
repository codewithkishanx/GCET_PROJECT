import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { StepSnapshot } from '../algorithms/types'

export const SPEEDS = [0.5, 1, 2, 4] as const
export type Speed = (typeof SPEEDS)[number]

/**
 * Playback controller over a precomputed trace. Backward stepping is a simple
 * index decrement because every step holds a full snapshot.
 */
export function usePlayer(steps: StepSnapshot[]) {
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState<Speed>(1)
  const stepsRef = useRef(steps)

  const lastIndex = Math.max(0, steps.length - 1)

  useEffect(() => {
    stepsRef.current = steps
    setIndex(0)
    setPlaying(false)
  }, [steps])

  useEffect(() => {
    if (!playing) return
    if (index >= lastIndex) {
      setPlaying(false)
      return
    }
    const delay = 900 / speed
    const timer = window.setTimeout(() => {
      setIndex((current) => Math.min(current + 1, lastIndex))
    }, delay)
    return () => window.clearTimeout(timer)
  }, [playing, index, lastIndex, speed])

  const goTo = useCallback(
    (next: number) => {
      setIndex(Math.max(0, Math.min(next, lastIndex)))
    },
    [lastIndex],
  )

  const next = useCallback(() => {
    setPlaying(false)
    setIndex((current) => Math.min(current + 1, lastIndex))
  }, [lastIndex])

  const prev = useCallback(() => {
    setPlaying(false)
    setIndex((current) => Math.max(current - 1, 0))
  }, [])

  const reset = useCallback(() => {
    setPlaying(false)
    setIndex(0)
  }, [])

  const play = useCallback(() => {
    setIndex((current) => (current >= lastIndex ? 0 : current))
    setPlaying(true)
  }, [lastIndex])

  const pause = useCallback(() => setPlaying(false), [])
  const toggle = useCallback(() => {
    setPlaying((current) => {
      if (current) return false
      setIndex((value) => (value >= lastIndex ? 0 : value))
      return true
    })
  }, [lastIndex])

  // Keyboard control, skipped while the user is typing in a control.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
      if (target?.isContentEditable) return
      if (event.metaKey || event.ctrlKey || event.altKey) return

      if (event.code === 'Space') {
        event.preventDefault()
        toggle()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        next()
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        prev()
      } else if (event.key.toLowerCase() === 'r') {
        event.preventDefault()
        reset()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [toggle, next, prev, reset])

  const step = steps[index] ?? steps[0]

  return useMemo(
    () => ({
      index,
      lastIndex,
      step,
      playing,
      speed,
      setSpeed,
      play,
      pause,
      toggle,
      next,
      prev,
      reset,
      goTo,
      canPrev: index > 0,
      canNext: index < lastIndex,
      progress: steps.length <= 1 ? 1 : index / lastIndex,
    }),
    [index, lastIndex, step, playing, speed, play, pause, toggle, next, prev, reset, goTo, steps.length],
  )
}

export type Player = ReturnType<typeof usePlayer>
