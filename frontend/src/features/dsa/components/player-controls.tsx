import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'
import { SPEEDS, type Player, type Speed } from './use-player'

export function PlayerControls({ player }: { player: Player }) {
  const { index, lastIndex, playing, speed, setSpeed, toggle, next, prev, reset, goTo } = player

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          variant="secondary"
          size="icon"
          onClick={() => goTo(0)}
          disabled={index === 0}
          aria-label="Jump to first step"
          title="First step"
        >
          <SkipBack className="size-4" aria-hidden="true" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={prev}
          disabled={index === 0}
          aria-label="Previous step"
          title="Previous step (←)"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Button>
        <Button
          size="md"
          onClick={toggle}
          icon={playing ? Pause : Play}
          className="min-w-24"
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? 'Pause' : index >= lastIndex ? 'Replay' : 'Play'}
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={next}
          disabled={index >= lastIndex}
          aria-label="Next step"
          title="Next step (→)"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={() => goTo(lastIndex)}
          disabled={index >= lastIndex}
          aria-label="Jump to last step"
          title="Last step"
        >
          <SkipForward className="size-4" aria-hidden="true" />
        </Button>
        <Button variant="ghost" size="icon" onClick={reset} aria-label="Reset" title="Reset (R)">
          <RotateCcw className="size-4" aria-hidden="true" />
        </Button>

        <div className="ml-auto flex items-center gap-1" role="group" aria-label="Playback speed">
          {SPEEDS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setSpeed(value as Speed)}
              aria-pressed={speed === value}
              className={cn(
                'rounded-full px-2.5 py-1 font-mono text-xs tabular-nums transition-all duration-120 active:scale-95',
                speed === value
                  ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                  : 'text-muted-foreground hover:bg-surface-sunken hover:text-foreground',
              )}
            >
              {value}×
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="w-24 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
          Step {index + 1}/{lastIndex + 1}
        </span>
        <input
          type="range"
          min={0}
          max={lastIndex}
          value={index}
          onChange={(event) => goTo(Number(event.target.value))}
          aria-label="Timeline position"
          className="h-1.5 w-full cursor-pointer rounded-full accent-[var(--primary)] transition-all duration-100"
        />
      </div>
    </div>
  )
}

export function StepExplainer({ message, index, total }: { message: string; index: number; total: number }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-sunken/60 p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-semibold text-primary tabular-nums">
          Step {index + 1} of {total}
        </span>
      </div>
      <p aria-live="polite" className="mt-1.5 text-sm leading-relaxed text-foreground">
        {message}
      </p>
    </div>
  )
}
