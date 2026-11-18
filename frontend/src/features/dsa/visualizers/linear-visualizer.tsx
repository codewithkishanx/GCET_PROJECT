import { cn } from '@/lib/cn'
import type { StepSnapshot } from '../algorithms/types'

export function LinearVisualizer({ step }: { step: StepSnapshot }) {
  const linear = step.linear
  if (!linear) return null
  const { items, kind, highlight = [] } = linear

  if (kind === 'stack') {
    return (
      <div className="flex flex-col items-center gap-2 py-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          top
        </span>
        <div className="flex w-32 flex-col gap-1">
          {items.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border-strong py-6 text-center font-mono text-xs text-muted-foreground">
              empty
            </p>
          ) : (
            [...items].reverse().map((value, reverseIndex) => {
              const index = items.length - 1 - reverseIndex
              const active = highlight.includes(index)
              return (
                <div
                  key={index}
                  className={cn(
                    'flex items-center justify-between rounded-md border px-3 py-2 font-mono text-sm transition-colors',
                    active
                      ? 'border-warning bg-warning/20 text-warning'
                      : 'border-border-strong bg-surface',
                  )}
                >
                  <span className="tabular-nums">{value}</span>
                  <span className="text-[10px] text-muted-foreground">[{index}]</span>
                </div>
              )
            })
          )}
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          bottom
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-2 py-6">
      <div className="flex items-center justify-center gap-1 overflow-x-auto">
        <span className="mr-1 rounded border border-info/40 bg-info-soft px-1.5 py-0.5 font-mono text-[10px] text-info">
          front
        </span>
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border-strong px-6 py-2 font-mono text-xs text-muted-foreground">
            empty
          </p>
        ) : (
          items.map((value, index) => {
            const active = highlight.includes(index)
            return (
              <div
                key={index}
                className={cn(
                  'flex min-w-12 flex-col items-center rounded-md border px-3 py-2 transition-colors',
                  active
                    ? 'border-warning bg-warning/20 text-warning'
                    : 'border-border-strong bg-surface',
                )}
              >
                <span className="font-mono text-sm font-semibold tabular-nums">{value}</span>
                <span className="font-mono text-[10px] text-muted-foreground">[{index}]</span>
              </div>
            )
          })
        )}
        <span className="ml-1 rounded border border-border-strong px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          back
        </span>
      </div>
    </div>
  )
}
