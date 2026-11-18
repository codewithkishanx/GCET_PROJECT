import type { AlgorithmTrace, StepSnapshot } from './types'

const copy = (values: number[]) => [...values]

function heapStep(
  array: number[],
  message: string,
  extra: Partial<StepSnapshot> = {},
): StepSnapshot {
  return { message, array: copy(array), ...extra }
}

export function buildMaxHeap(values: number[]): AlgorithmTrace {
  const a = copy(values)
  const steps: StepSnapshot[] = [
    heapStep(a, 'A max-heap stores each parent ≥ its children. Build it bottom-up with sift-down.'),
  ]

  const siftDown = (start: number, size: number) => {
    let parent = start
    for (;;) {
      const left = parent * 2 + 1
      const right = parent * 2 + 2
      let largest = parent

      if (left < size) {
        steps.push(
          heapStep(a, `Compare parent ${a[parent]} (index ${parent}) with left child ${a[left]} (index ${left}).`, {
            compare: [parent, left],
            pointers: [{ label: 'parent', index: parent }],
          }),
        )
        if (a[left]! > a[largest]!) largest = left
      }
      if (right < size) {
        steps.push(
          heapStep(a, `Compare current largest ${a[largest]} with right child ${a[right]} (index ${right}).`, {
            compare: [largest, right],
            pointers: [{ label: 'parent', index: parent }],
          }),
        )
        if (a[right]! > a[largest]!) largest = right
      }

      if (largest === parent) {
        steps.push(heapStep(a, `Index ${parent} already dominates its children — stop sifting.`, { visited: [parent] }))
        return
      }

      ;[a[parent], a[largest]] = [a[largest]!, a[parent]!]
      steps.push(
        heapStep(a, `${a[largest]} was larger — swap it up into index ${parent}.`, {
          swap: [parent, largest],
          pointers: [{ label: 'parent', index: largest }],
        }),
      )
      parent = largest
    }
  }

  for (let i = Math.floor(a.length / 2) - 1; i >= 0; i -= 1) {
    steps.push(heapStep(a, `Sift down from index ${i} (value ${a[i]}).`, { pointers: [{ label: 'start', index: i }] }))
    siftDown(i, a.length)
  }

  steps.push(heapStep(a, 'Heap property holds: every parent ≥ its children. The maximum is at index 0.', { visited: [0] }))

  return {
    steps,
    complexity: { time: 'O(n)', space: 'O(1)', summary: 'Sifting from the last internal node upward is linear, not O(n log n).' },
    edgeCases: ['Empty array is a valid heap.', 'Single element needs no sift.', 'Equal children need no swap.'],
  }
}

export function extractMax(values: number[]): AlgorithmTrace {
  const a = copy(values)
  const steps: StepSnapshot[] = [heapStep(a, 'Extract the maximum: take index 0, move the last element there, then sift down.')]

  if (a.length === 0) {
    steps.push(heapStep(a, 'The heap is empty — extraction must fail explicitly.'))
    return {
      steps,
      complexity: { time: 'O(log n)', space: 'O(1)', summary: 'Removing the root requires one sift-down.' },
      edgeCases: ['Empty heap underflow.', 'Single element returns immediately.'],
    }
  }

  const max = a[0]!
  steps.push(heapStep(a, `Maximum is ${max} at index 0.`, { visited: [0] }))

  const last = a.pop()!
  if (a.length === 0) {
    steps.push(heapStep(a, `Removed ${max}. The heap is now empty.`))
    return {
      steps,
      complexity: { time: 'O(log n)', space: 'O(1)', summary: 'Root removal plus one sift-down.' },
      edgeCases: ['Empty heap underflow.', 'Single element returns immediately.'],
    }
  }

  a[0] = last
  steps.push(heapStep(a, `Move last element ${last} to the root. Heap property is likely broken.`, { pointers: [{ label: 'root', index: 0 }] }))

  const siftDown = (start: number) => {
    let parent = start
    for (;;) {
      const left = parent * 2 + 1
      const right = parent * 2 + 2
      let largest = parent
      if (left < a.length && a[left]! > a[largest]!) largest = left
      if (right < a.length && a[right]! > a[largest]!) largest = right
      if (largest === parent) {
        steps.push(heapStep(a, `Index ${parent} dominates its children — heap restored after removing ${max}.`, { visited: Array.from({ length: a.length }, (_, i) => i) }))
        return
      }
      steps.push(
        heapStep(a, `Child ${a[largest]} (index ${largest}) is larger than ${a[parent]} — swap.`, {
          compare: [parent, largest],
        }),
      )
      ;[a[parent], a[largest]] = [a[largest]!, a[parent]!]
      steps.push(heapStep(a, `Swapped; continue sifting from index ${largest}.`, { swap: [parent, largest] }))
      parent = largest
    }
  }

  siftDown(0)

  return {
    steps,
    complexity: { time: 'O(log n)', space: 'O(1)', summary: 'The root leaves, the last element sifts down one path to a leaf.' },
    edgeCases: ['Empty heap underflow.', 'Removing the only element empties the heap.', 'Sift-down follows a single path.'],
  }
}
