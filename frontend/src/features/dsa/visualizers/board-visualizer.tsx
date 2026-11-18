import { cn } from '@/lib/cn'
import type { StepSnapshot } from '../algorithms/types'

function attackedCells(size: number, queens: number[]): boolean[][] {
  const attacked = Array.from({ length: size }, () => Array<boolean>(size).fill(false))
  queens.forEach((col, row) => {
    if (col < 0) return
    for (let i = 0; i < size; i += 1) {
      attacked[row]![i] = true
      attacked[i]![col] = true
      const dr = i - row
      for (const dc of [dr, -dr]) {
        const c = col + dc
        if (c >= 0 && c < size) attacked[i]![c] = true
      }
    }
  })
  return attacked
}

export function BoardVisualizer({ step }: { step: StepSnapshot }) {
  const board = step.board
  if (!board) return null
  const { size, queens, highlightRow } = board
  const attacked = attackedCells(size, queens)
  const placed = queens.filter((col) => col >= 0).length

  return (
    <div className="space-y-3 py-2">
      <div
        className="mx-auto grid w-full max-w-sm gap-px overflow-hidden rounded-lg border border-border-strong bg-border"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
        role="grid"
        aria-label={`${size} by ${size} N-Queens board with ${placed} queen(s)`}
      >
        {Array.from({ length: size }).map((_, row) =>
          Array.from({ length: size }).map((__, col) => {
            const hasQueen = queens[row] === col
            const dark = (row + col) % 2 === 1
            const isAttacked = attacked[row]?.[col] ?? false
            return (
              <div
                key={`${row}-${col}`}
                role="gridcell"
                aria-label={`Row ${row + 1}, column ${col + 1}${hasQueen ? ', queen' : ''}`}
                className={cn(
                  'relative aspect-square',
                  dark ? 'bg-surface-sunken' : 'bg-surface',
                  row === highlightRow && 'ring-1 ring-inset ring-primary/40',
                )}
              >
                {hasQueen ? (
                  <span className="absolute inset-0 grid place-items-center text-lg text-foreground sm:text-xl">
                    ♛
                  </span>
                ) : isAttacked ? (
                  <span
                    className="absolute inset-0 bg-danger/10"
                    aria-hidden="true"
                    title="Attacked square"
                  />
                ) : null}
              </div>
            )
          }),
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-muted-foreground">
        <span>Queens placed: {placed}/{size}</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-danger/20" aria-hidden="true" />
          Attacked square
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm ring-1 ring-primary/50" aria-hidden="true" />
          Current row
        </span>
      </div>
    </div>
  )
}
