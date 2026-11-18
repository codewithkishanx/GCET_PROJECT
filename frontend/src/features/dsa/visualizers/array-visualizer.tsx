import { cn } from '@/lib/cn'
import type { StepSnapshot } from '../algorithms/types'

/**
 * Bar renderer for array-shaped traces (arrays, sorting, heaps). Colour is
 * driven by the event flags in the snapshot, and every bar is labelled with its
 * value and index so the visualisation is readable without relying on colour.
 */
export function ArrayVisualizer({ step }: { step: StepSnapshot }) {
  const array = step.array ?? []
  if (array.length === 0) {
    return <p className="py-12 text-center text-xs text-muted-foreground">The array is empty.</p>
  }

  const min = Math.min(...array, 0)
  const max = Math.max(...array, 1)
  const span = max - min || 1

  const inWindow = (index: number) =>
    step.window ? index >= step.window.start && index <= step.window.end : false
  const inRange = (index: number) =>
    step.range ? index >= step.range.start && index <= step.range.end : false

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-full items-end justify-center gap-1.5 sm:gap-2">
          {array.map((value, index) => {
            const isCompare = step.compare?.includes(index) ?? false
            const isSwap = step.swap?.includes(index) ?? false
            const isVisited = step.visited?.includes(index) ?? false
            const isSettled = step.settled?.includes(index) ?? false
            const pointers = (step.pointers ?? []).filter((pointer) => pointer.index === index)

            const height = ((value - min) / span) * 100

            return (
              <div
                key={index}
                className="flex min-w-10 flex-1 flex-col items-center gap-1.5"
                aria-label={`Index ${index}, value ${value}${
                  isSwap ? ', being swapped' : isCompare ? ', being compared' : ''
                }`}
              >
                <div className="flex h-7 flex-col items-center justify-end gap-0.5">
                  {pointers.map((pointer) => (
                    <span
                      key={pointer.label}
                      className="rounded-full border border-primary/30 bg-primary-soft px-1.5 py-0.5 font-mono text-[9px] font-semibold tabular-nums leading-none text-primary"
                    >
                      {pointer.label}
                    </span>
                  ))}
                </div>

                <div
                  className={cn(
                    'relative h-44 w-full overflow-hidden rounded-t-xl border-b-2 transition-all duration-150 ease-out',
                    isSwap
                      ? 'border-danger bg-danger/25 text-danger'
                      : isCompare
                        ? 'border-warning bg-warning/25 text-warning'
                        : isVisited
                          ? 'border-success bg-success/25 text-success'
                          : isSettled
                            ? 'border-success/50 bg-success/15 text-success'
                            : 'border-primary/40 bg-primary/10 text-primary',
                    inWindow(index) && 'ring-2 ring-inset ring-info/60',
                    inRange(index) && 'opacity-100',
                    step.range && !inRange(index) && 'opacity-35',
                  )}
                >
                  <div
                    className="absolute inset-x-0 bottom-0 bg-current opacity-20 transition-all duration-150 ease-out"
                    style={{ height: `${Math.max(height, 5)}%` }}
                    aria-hidden="true"
                  />
                  <span className="absolute inset-x-0 top-1.5 text-center font-mono text-xs font-semibold tabular-nums text-foreground">
                    {value}
                  </span>
                </div>

                <span className="font-mono text-[10px] tabular-nums text-muted-foreground">{index}</span>
              </div>
            )
          })}
        </div>
      </div>

      {step.window ? (
        <p className="text-center font-mono text-xs tabular-nums text-info">
          window [{step.window.start}, {step.window.end}]
        </p>
      ) : null}
      {step.range ? (
        <p className="text-center font-mono text-xs tabular-nums text-muted-foreground">
          range [{step.range.start}, {step.range.end}]
        </p>
      ) : null}
    </div>
  )
}

export function ArrayLegend() {
  const items = [
    ['Compare', 'bg-warning/25 border-warning'],
    ['Swap', 'bg-danger/25 border-danger'],
    ['Visited', 'bg-success/25 border-success'],
    ['Window', 'bg-info/20 border-info'],
  ] as const
  return (
    <ul className="flex flex-wrap gap-4 text-xs text-muted-foreground">
      {items.map(([label, classes]) => (
        <li key={label} className="flex items-center gap-1.5">
          <span className={cn('size-2.5 rounded-full border', classes)} aria-hidden="true" />
          <span>{label}</span>
        </li>
      ))}
    </ul>
  )
}
