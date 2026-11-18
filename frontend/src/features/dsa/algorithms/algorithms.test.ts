import { describe, expect, it } from 'vitest'
import {
  deleteAt,
  insertAt,
  linearSearch,
  slidingWindow,
  traverse,
  twoPointers,
  binarySearch,
} from './arrays'
import {
  bubbleSort,
  insertionSort,
  mergeSort,
  quickSort,
  selectionSort,
} from './sorting'
import { listDelete, listInsert, listReverse, listTraverse } from './linked-list'
import { bstDelete, bstInsert, bstSearch, bstTraversal } from './tree'
import { buildMaxHeap, extractMax } from './heap'
import { bfs, dfs, type GraphData } from './graph'
import { nQueens, nQueensSolutionCount } from './recursion'
import { queueTrace, stackTrace } from './stack-queue'
import { parseInteger, parseNumberList, seededArray, MAX_ARRAY_LENGTH } from './types'
import type { AlgorithmTrace, StepSnapshot } from './types'

/** The final array of a trace built on the array visualiser. */
function finalArray(steps: StepSnapshot[]): number[] {
  return steps[steps.length - 1]?.array ?? []
}

const SORTS: Array<[string, (values: number[]) => AlgorithmTrace]> = [
  ['bubble', bubbleSort],
  ['selection', selectionSort],
  ['insertion', insertionSort],
  ['merge', mergeSort],
  ['quick', quickSort],
]

describe('sorting algorithms', () => {
  const cases = [
    [[5, 1, 4, 2, 8], [1, 2, 4, 5, 8]],
    [[3, 3, 1, 2, 1], [1, 1, 2, 3, 3]],
    [[9], [9]],
    [[], []],
    [[-4, 10, 0, -1, 7], [-4, -1, 0, 7, 10]],
  ] as const

  for (const [name, sort] of SORTS) {
    for (const [input, expected] of cases) {
      it(`${name} sorts ${JSON.stringify(input)}`, () => {
        const trace = sort([...input])
        expect(finalArray(trace.steps)).toEqual(expected)
      })
    }

    it(`${name} produces complete snapshots for every step`, () => {
      const trace = sort([4, 1, 3, 2])
      expect(trace.steps.length).toBeGreaterThan(1)
      for (const step of trace.steps) {
        expect(typeof step.message).toBe('string')
        expect(step.message.length).toBeGreaterThan(0)
        expect(Array.isArray(step.array)).toBe(true)
      }
      expect(trace.complexity.time).toMatch(/O\(/)
      expect(trace.edgeCases.length).toBeGreaterThan(0)
    })
  }

  it('merge sort keeps duplicates and stability-relevant order', () => {
    expect(finalArray(mergeSort([2, 1, 2, 1]).steps)).toEqual([1, 1, 2, 2])
  })

  it('quicksort handles an already sorted array without losing elements', () => {
    expect(finalArray(quickSort([1, 2, 3, 4, 5]).steps)).toEqual([1, 2, 3, 4, 5])
  })
})

describe('array algorithms', () => {
  it('traversal visits every index in its final snapshot', () => {
    const trace = traverse([10, 20, 30])
    const last = trace.steps[trace.steps.length - 1]!
    expect(last.visited).toEqual([0, 1, 2])
    expect(last.array).toEqual([10, 20, 30])
  })

  it('linear search stops at the first match', () => {
    const trace = linearSearch([4, 8, 15, 16], 15)
    const last = trace.steps[trace.steps.length - 1]!
    expect(last.message).toContain('found')
    expect(last.message).toContain('Index 2 holds 15')
  })

  it('linear search reports a miss after scanning everything', () => {
    const trace = linearSearch([4, 8], 99)
    expect(trace.steps[trace.steps.length - 1]!.message).toContain('not in the array')
  })

  it('binary search sorts its input before searching', () => {
    const trace = binarySearch([9, 1, 5, 3], 5)
    expect(trace.steps[0]!.array).toEqual([1, 3, 5, 9])
    expect(trace.steps[trace.steps.length - 1]!.message).toContain('Found 5')
  })

  it('binary search reports a miss', () => {
    const trace = binarySearch([1, 3, 5], 4)
    expect(trace.steps[trace.steps.length - 1]!.message).toContain('not present')
  })

  it('insert shifts the tail and writes the value', () => {
    expect(finalArray(insertAt([1, 2, 4], 2, 3).steps)).toEqual([1, 2, 3, 4])
    expect(finalArray(insertAt([1, 2], 0, 0).steps)).toEqual([0, 1, 2])
    expect(finalArray(insertAt([1, 2], 2, 3).steps)).toEqual([1, 2, 3])
  })

  it('delete closes the gap and rejects out-of-range indices', () => {
    expect(finalArray(deleteAt([1, 2, 3], 1).steps)).toEqual([1, 3])
    const trace = deleteAt([1, 2], 5)
    expect(finalArray(trace.steps)).toEqual([1, 2])
    expect(trace.steps[trace.steps.length - 1]!.message).toContain('Nothing to delete')
  })

  it('two pointers finds a valid pair on sorted input', () => {
    const trace = twoPointers([7, 1, 5, 3], 8)
    const last = trace.steps[trace.steps.length - 1]!
    expect(last.message).toContain('pair found')
  })

  it('two pointers reports no pair', () => {
    const trace = twoPointers([1, 2, 3], 100)
    expect(trace.steps[trace.steps.length - 1]!.message).toContain('no pair')
  })

  it('sliding window tracks the best fixed-size window', () => {
    const trace = slidingWindow([1, 4, 2, 10, 23, 3, 1, 0, 20], 4)
    expect(trace.steps[trace.steps.length - 1]!.message).toContain('39')
  })

  it('sliding window rejects a window larger than the array', () => {
    const trace = slidingWindow([1, 2], 5)
    expect(trace.steps[trace.steps.length - 1]!.message).toContain('does not fit')
  })
})

describe('linked list algorithms', () => {
  it('traversal ends after visiting every node', () => {
    const trace = listTraverse([1, 2, 3])
    expect(trace.steps[trace.steps.length - 1]!.message).toContain('Reached null')
  })

  it('insertion at the head rewires the head', () => {
    const trace = listInsert([2, 3], 0, 1)
    expect(trace.steps[trace.steps.length - 1]!.list?.values).toEqual([1, 2, 3])
  })

  it('insertion in the middle preserves order', () => {
    const trace = listInsert([1, 3, 4], 1, 2)
    expect(trace.steps[trace.steps.length - 1]!.list?.values).toEqual([1, 2, 3, 4])
  })

  it('deletion unlinks a middle node', () => {
    const trace = listDelete([1, 2, 3], 1)
    expect(trace.steps[trace.steps.length - 1]!.list?.values).toEqual([1, 3])
  })

  it('deletion rejects an out-of-range position', () => {
    const trace = listDelete([1, 2], 9)
    expect(trace.steps[trace.steps.length - 1]!.message).toContain('Nothing to delete')
  })

  it('reversal walks pointers without throwing', () => {
    const trace = listReverse([1, 2, 3])
    expect(trace.steps.length).toBeGreaterThan(3)
    expect(trace.steps[trace.steps.length - 1]!.message).toContain('Traversal finished')
  })
})

describe('binary search tree algorithms', () => {
  const values = [50, 30, 70, 20, 40, 60, 80]

  it('search finds an existing value and reports comparisons', () => {
    const trace = bstSearch(values, 40)
    expect(trace.steps[trace.steps.length - 1]!.message).toContain('matches 40')
  })

  it('search reports a missing value', () => {
    const trace = bstSearch(values, 45)
    expect(trace.steps[trace.steps.length - 1]!.message).toContain('not present')
  })

  it('insert attaches a new leaf, keeping in-order sorted', () => {
    const trace = bstInsert(values, 45)
    const final = trace.steps[trace.steps.length - 1]!
    const nodeValues = final.tree!.nodes.map((node) => node.value)
    expect(nodeValues).toEqual([...nodeValues].sort((a, b) => a - b))
    expect(nodeValues).toContain(45)
  })

  it('delete handles a leaf', () => {
    const trace = bstDelete(values, 20)
    const nodeValues = trace.steps[trace.steps.length - 1]!.tree!.nodes.map((node) => node.value)
    expect(nodeValues).not.toContain(20)
    expect(nodeValues).toHaveLength(6)
  })

  it('delete handles a node with two children', () => {
    const trace = bstDelete(values, 30)
    const nodeValues = trace.steps[trace.steps.length - 1]!.tree!.nodes.map((node) => node.value)
    expect(nodeValues).not.toContain(30)
    expect(nodeValues).toHaveLength(6)
  })

  it('delete handles the root', () => {
    const trace = bstDelete(values, 50)
    const nodeValues = trace.steps[trace.steps.length - 1]!.tree!.nodes.map((node) => node.value)
    expect(nodeValues).not.toContain(50)
    expect(nodeValues).toHaveLength(6)
  })

  it('delete reports a missing value', () => {
    const trace = bstDelete(values, 999)
    expect(trace.steps[trace.steps.length - 1]!.message).toContain('not in the tree')
  })

  it('in-order traversal yields sorted values', () => {
    const trace = bstTraversal(values, 'inorder')
    const last = trace.steps[trace.steps.length - 1]!
    expect(last.message).toContain([20, 30, 40, 50, 60, 70, 80].join(', '))
  })

  it('level-order traversal starts at the root', () => {
    const trace = bstTraversal(values, 'levelorder')
    expect(trace.steps[1]!.message).toContain('Visit 50')
  })
})

describe('heap algorithms', () => {
  it('builds a max-heap where every parent dominates its children', () => {
    const trace = buildMaxHeap([23, 71, 12, 45, 88, 34, 59, 7])
    const heap = finalArray(trace.steps)
    heap.forEach((value, index) => {
      const left = index * 2 + 1
      const right = index * 2 + 2
      if (left < heap.length) expect(value).toBeGreaterThanOrEqual(heap[left]!)
      if (right < heap.length) expect(value).toBeGreaterThanOrEqual(heap[right]!)
    })
  })

  it('extract max removes the root and restores the heap', () => {
    const heap = [88, 71, 59, 45, 23, 34, 12, 7]
    const trace = extractMax(heap)
    expect(trace.steps.some((step) => step.message.includes('Maximum is 88'))).toBe(true)
    const after = finalArray(trace.steps)
    expect(after).toHaveLength(7)
    expect(after).not.toContain(88)
    after.forEach((value, index) => {
      const left = index * 2 + 1
      if (left < after.length) expect(value).toBeGreaterThanOrEqual(after[left]!)
    })
  })

  it('extract max handles an empty heap', () => {
    const trace = extractMax([])
    expect(trace.steps[trace.steps.length - 1]!.message).toContain('empty')
  })
})

describe('graph traversal', () => {
  const graph: GraphData = {
    nodes: [
      { id: 'A', label: 'A', x: 0, y: 0 },
      { id: 'B', label: 'B', x: 10, y: 0 },
      { id: 'C', label: 'C', x: 20, y: 0 },
    ],
    edges: [
      ['A', 'B'],
      ['B', 'C'],
    ],
  }

  it('BFS visits every reachable node breadth-first', () => {
    const trace = bfs(graph, 'A')
    const last = trace.steps[trace.steps.length - 1]!
    expect(last.graph?.visited).toEqual(['A', 'B', 'C'])
  })

  it('DFS visits every reachable node', () => {
    const trace = dfs(graph, 'A')
    const last = trace.steps[trace.steps.length - 1]!
    expect(last.graph?.visited).toHaveLength(3)
  })

  it('does not revisit nodes in a cycle', () => {
    const cycle: GraphData = {
      nodes: [
        { id: '1', label: '1', x: 0, y: 0 },
        { id: '2', label: '2', x: 5, y: 0 },
      ],
      edges: [['1', '2']],
    }
    const trace = bfs(cycle, '1')
    expect(trace.steps[trace.steps.length - 1]!.graph?.visited).toEqual(['1', '2'])
  })
})

describe('N-Queens', () => {
  it('finds the known solution counts', () => {
    expect(nQueensSolutionCount(1)).toBe(1)
    expect(nQueensSolutionCount(4)).toBe(2)
    expect(nQueensSolutionCount(5)).toBe(10)
    expect(nQueensSolutionCount(6)).toBe(4)
  })

  it('every recorded solution has one queen per row and no attacks', () => {
    const trace = nQueens(5)
    const solutions = trace.steps.filter((step) => step.message.includes('Solution'))
    expect(solutions.length).toBe(10)
    for (const solution of solutions) {
      const queens = solution.board!.queens
      expect(queens.filter((col) => col >= 0)).toHaveLength(5)
      for (let row = 0; row < queens.length; row += 1) {
        for (let other = row + 1; other < queens.length; other += 1) {
          expect(queens[row]).not.toBe(queens[other])
          expect(Math.abs(queens[row]! - queens[other]!)).not.toBe(other - row)
        }
      }
    }
  })

  it('shows backtracks for a solvable board', () => {
    const trace = nQueens(4)
    expect(trace.steps.some((step) => step.message.startsWith('Backtrack'))).toBe(true)
  })
})

describe('stack and queue traces', () => {
  it('stack honours LIFO order', () => {
    const trace = stackTrace([1, 2], [
      { op: 'push', value: 3 },
      { op: 'pop' },
    ])
    const last = trace.steps[trace.steps.length - 1]!
    expect(last.linear?.items).toEqual([1, 2])
  })

  it('stack pop on empty reports underflow', () => {
    const trace = stackTrace([], [{ op: 'pop' }])
    expect(trace.steps[trace.steps.length - 1]!.message).toContain('underflow')
  })

  it('queue honours FIFO order', () => {
    const trace = queueTrace([1, 2], [
      { op: 'enqueue', value: 3 },
      { op: 'dequeue' },
    ])
    const last = trace.steps[trace.steps.length - 1]!
    expect(last.linear?.items).toEqual([2, 3])
  })
})

describe('input parsing', () => {
  it('parses comma and whitespace separated numbers', () => {
    expect(parseNumberList('1, 2  3')).toEqual([1, 2, 3])
  })

  it('rejects empty input', () => {
    expect(parseNumberList('   ')).toEqual({ error: expect.any(String) })
  })

  it('rejects non-integers', () => {
    expect(parseNumberList('1.5')).toEqual({ error: expect.stringContaining('1.5') })
  })

  it('rejects values outside the safe range', () => {
    expect(parseNumberList('1000')).toEqual({ error: expect.any(String) })
    expect(parseNumberList('-1000')).toEqual({ error: expect.any(String) })
  })

  it(`rejects more than ${MAX_ARRAY_LENGTH} values`, () => {
    const input = Array.from({ length: MAX_ARRAY_LENGTH + 1 }, () => '1').join(',')
    expect(parseNumberList(input)).toEqual({ error: expect.any(String) })
  })

  it('parses bounded integers', () => {
    expect(parseInteger('5', { min: 0, max: 9, field: 'Index' })).toBe(5)
    expect(parseInteger('99', { min: 0, max: 9, field: 'Index' })).toEqual({
      error: expect.stringContaining('Index'),
    })
    expect(parseInteger('abc', { min: 0, max: 9, field: 'Index' })).toEqual({
      error: expect.any(String),
    })
  })

  it('seeded arrays are deterministic and bounded', () => {
    expect(seededArray(8, 7)).toEqual(seededArray(8, 7))
    for (const value of seededArray(8, 7)) {
      expect(value).toBeGreaterThanOrEqual(10)
      expect(value).toBeLessThan(100)
    }
  })
})
