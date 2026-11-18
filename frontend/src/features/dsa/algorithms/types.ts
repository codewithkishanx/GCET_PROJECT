/* ---------------------------------------------------------------------------
 * Trace contract.
 *
 * Every algorithm is a pure function that returns an ordered list of steps.
 * A step carries a *complete* snapshot of what the renderer needs, so stepping
 * backward is just `index - 1` and never a re-simulation. Snapshots are small
 * (arrays of a few dozen elements), so completeness is cheap and correctness is
 * easy to test.
--------------------------------------------------------------------------- */

export interface Pointer {
  label: string
  index: number
}

export interface TreeNodeView {
  id: string
  value: number
  depth: number
  /** In-order position; the renderer scales it to the SVG width. */
  order: number
  parentId: string | null
}

export interface GraphNodeView {
  id: string
  label: string
  x: number
  y: number
}

export interface GraphEdgeView {
  from: string
  to: string
}

export interface StepSnapshot {
  /** Short, human sentence describing what just happened. */
  message: string

  /* Array-shaped algorithms (arrays, sorting, heap). */
  array?: number[]
  compare?: [number, number]
  swap?: [number, number]
  visited?: number[]
  settled?: number[]
  pointers?: Pointer[]
  window?: { start: number; end: number }
  range?: { start: number; end: number }

  /* Linked lists. */
  list?: {
    values: number[]
    /** Node ids are indices into `values`. */
    highlight?: number[]
    cursor?: number
    detached?: number[]
  }

  /* Trees (BST). */
  tree?: {
    nodes: TreeNodeView[]
    highlight?: string[]
    visiting?: string
    path?: string[]
  }

  /* Graphs. */
  graph?: {
    nodes: GraphNodeView[]
    edges: GraphEdgeView[]
    visited?: string[]
    active?: string[]
    activeEdges?: GraphEdgeView[]
    frontier?: string[]
  }

  /* Stack / queue. */
  linear?: {
    items: number[]
    kind: 'stack' | 'queue'
    highlight?: number[]
  }

  /* N-Queens board: queens[row] = column, -1 when empty. */
  board?: {
    size: number
    queens: number[]
    highlightRow?: number
  }
}

export interface Complexity {
  time: string
  space: string
  summary: string
}

export interface AlgorithmTrace {
  steps: StepSnapshot[]
  complexity: Complexity
  edgeCases: string[]
}

export const MAX_ARRAY_LENGTH = 16
export const MAX_VALUE = 999

/** Deterministic pseudo-random array for reproducible demo inputs. */
export function seededArray(length: number, seed = 7): number[] {
  let state = seed
  const next = () => {
    state = (state * 1103515245 + 12345) % 2 ** 31
    return state
  }
  return Array.from({ length }, () => (next() % 90) + 10)
}

export function parseNumberList(input: string): number[] | { error: string } {
  const parts = input
    .split(/[\s,]+/)
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length === 0) return { error: 'Enter at least one number.' }
  if (parts.length > MAX_ARRAY_LENGTH) {
    return { error: `Keep the input to ${MAX_ARRAY_LENGTH} values or fewer.` }
  }
  const values: number[] = []
  for (const part of parts) {
    if (!/^-?\d+$/.test(part)) return { error: `"${part}" is not a whole number.` }
    const value = Number(part)
    if (!Number.isSafeInteger(value) || Math.abs(value) > MAX_VALUE) {
      return { error: `Values must be between -${MAX_VALUE} and ${MAX_VALUE}.` }
    }
    values.push(value)
  }
  return values
}

export function parseInteger(
  input: string,
  { min, max, field }: { min: number; max: number; field: string },
): number | { error: string } {
  const trimmed = input.trim()
  if (!/^-?\d+$/.test(trimmed)) return { error: `${field} must be a whole number.` }
  const value = Number(trimmed)
  if (value < min || value > max) return { error: `${field} must be between ${min} and ${max}.` }
  return value
}
