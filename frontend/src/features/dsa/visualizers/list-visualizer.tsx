import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { StepSnapshot } from '../algorithms/types'

export function ListVisualizer({ step }: { step: StepSnapshot }) {
  const list = step.list
  if (!list || list.values.length === 0) {
    return (
      <p className="py-10 text-center font-mono text-sm text-muted-foreground">
        head → null
      </p>
    )
  }

  return (
    <div className="overflow-x-auto py-4">
      <div className="flex min-w-max items-center gap-1 px-1">
        <span className="mr-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          head
        </span>

        {list.values.map((value, index) => {
          const highlighted = list.highlight?.includes(index) ?? false
          const isCursor = list.cursor === index
          return (
            <div key={index} className="flex items-center">
              <div
                className={cn(
                  'flex flex-col items-center gap-1 rounded-lg border-2 px-3 py-2 transition-colors',
                  highlighted
                    ? 'border-success bg-success/20'
                    : isCursor
                      ? 'border-warning bg-warning/20'
                      : 'border-border-strong bg-surface',
                )}
              >
                <span className="font-mono text-sm font-semibold tabular-nums">{value}</span>
                <span className="font-mono text-[9px] text-muted-foreground">
                  node {index}
                </span>
              </div>
              {index < list.values.length - 1 ? (
                <ArrowRight className="mx-1 size-4 text-muted-foreground" aria-hidden="true" />
              ) : (
                <>
                  <ArrowRight className="mx-1 size-4 text-muted-foreground" aria-hidden="true" />
                  <span className="rounded border border-dashed border-border-strong px-2 py-1 font-mono text-[10px] text-muted-foreground">
                    null
                  </span>
                </>
              )}
            </div>
          )
        })}
      </div>

      {list.detached && list.detached.length > 0 ? (
        <p className="mt-3 px-1 text-[11px] text-danger">
          Detached node position(s): {list.detached.join(', ')}
        </p>
      ) : null}
    </div>
  )
}
