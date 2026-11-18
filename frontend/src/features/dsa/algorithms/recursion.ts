import type { AlgorithmTrace, StepSnapshot } from './types'

/**
 * N-Queens via backtracking. The board is the whole recursive state: row is the
 * recursion depth, and each attempt either extends a partial solution or
 * backtracks. Steps stay under a few thousand for n ≤ 8.
 */
export function nQueens(size: number): AlgorithmTrace {
  const board = Array<number>(size).fill(-1)
  const steps: StepSnapshot[] = [
    {
      message: `Place ${size} queens so no two share a row, column, or diagonal. The board is the recursion state.`,
      board: { size, queens: [...board], highlightRow: 0 },
    },
  ]

  let solutions = 0
  let placements = 0
  let backtracks = 0

  const isSafe = (row: number, col: number): boolean => {
    for (let previousRow = 0; previousRow < row; previousRow += 1) {
      const previousCol = board[previousRow]!
      if (previousCol === col) return false
      if (Math.abs(previousCol - col) === Math.abs(previousRow - row)) return false
    }
    return true
  }

  const solve = (row: number) => {
    if (row === size) {
      solutions += 1
      steps.push({
        message: `Solution ${solutions} found — every row has a safe queen.`,
        board: { size, queens: [...board] },
      })
      return
    }

    for (let col = 0; col < size; col += 1) {
      const safe = isSafe(row, col)
      steps.push({
        message: safe
          ? `Row ${row}: column ${col} is safe — place a queen and recurse.`
          : `Row ${row}: column ${col} is attacked (same column or diagonal) — skip.`,
        board: { size, queens: [...board], highlightRow: row },
      })

      if (!safe) continue

      board[row] = col
      placements += 1
      steps.push({
        message: `Place queen at (${row}, ${col}). Depth is now ${row + 1}.`,
        board: { size, queens: [...board], highlightRow: row },
      })

      solve(row + 1)

      board[row] = -1
      backtracks += 1
      steps.push({
        message: `Backtrack: remove the queen at (${row}, ${col}) and try the next column.`,
        board: { size, queens: [...board], highlightRow: row },
      })
    }
  }

  solve(0)

  steps.push({
    message: `Search finished. ${solutions} solution(s), ${placements} placements, ${backtracks} backtracks.`,
    board: { size, queens: [...board] },
  })

  return {
    steps,
    complexity: {
      time: 'O(n!)',
      space: 'O(n)',
      summary: 'Worst case explores permutations; pruning cuts most branches early.',
    },
    edgeCases: [
      'n = 1 has a trivial solution; n = 2 and n = 3 have none.',
      'The diagonal check compares |Δrow| with |Δcol|.',
      'Every solution is a permutation of columns, so rows are never re-checked.',
    ],
  }
}

export function nQueensSolutionCount(size: number): number {
  const board = Array<number>(size).fill(-1)
  let count = 0
  const isSafe = (row: number, col: number) => {
    for (let r = 0; r < row; r += 1) {
      const c = board[r]!
      if (c === col || Math.abs(c - col) === Math.abs(r - row)) return false
    }
    return true
  }
  const solve = (row: number) => {
    if (row === size) {
      count += 1
      return
    }
    for (let col = 0; col < size; col += 1) {
      if (!isSafe(row, col)) continue
      board[row] = col
      solve(row + 1)
      board[row] = -1
    }
  }
  solve(0)
  return count
}
