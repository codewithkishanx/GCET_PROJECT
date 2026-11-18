import type { AlgorithmTrace, StepSnapshot } from './types'

const copy = (values: number[]) => [...values]
const complexity = (best: string, worst: string, space: string, summary: string) => ({
  time: `best ${best} · worst ${worst}`,
  space,
  summary,
})

export function bubbleSort(values: number[]): AlgorithmTrace {
  const a = copy(values)
  const steps: StepSnapshot[] = [{ message: 'Compare neighbours and bubble the largest value to the right each pass.', array: copy(a) }]
  const settled: number[] = []

  for (let pass = 0; pass < a.length - 1; pass += 1) {
    let swapped = false
    for (let i = 0; i < a.length - 1 - pass; i += 1) {
      steps.push({
        message: `Pass ${pass + 1}: compare ${a[i]} and ${a[i + 1]}.`,
        array: copy(a),
        compare: [i, i + 1],
        settled: [...settled],
        pointers: [{ label: 'i', index: i }],
      })
      if (a[i]! > a[i + 1]!) {
        ;[a[i], a[i + 1]] = [a[i + 1]!, a[i]!]
        swapped = true
        steps.push({
          message: `${a[i + 1]} > ${a[i]} — swap them.`,
          array: copy(a),
          swap: [i, i + 1],
          settled: [...settled],
        })
      }
    }
    settled.push(a.length - 1 - pass)
    steps.push({
      message: `Largest remaining value settled at index ${a.length - 1 - pass}.`,
      array: copy(a),
      settled: [...settled],
    })
    if (!swapped) {
      steps.push({ message: 'No swaps in this pass, so the array is already sorted.', array: copy(a), settled: a.map((_, i) => i) })
      break
    }
  }

  return {
    steps,
    complexity: complexity('O(n)', 'O(n²)', 'O(1)', 'Repeated adjacent swaps; early-exits when a pass is clean.'),
    edgeCases: ['Already sorted: one pass.', 'Reverse sorted: worst case.', 'Duplicates are stable.'],
  }
}

export function selectionSort(values: number[]): AlgorithmTrace {
  const a = copy(values)
  const steps: StepSnapshot[] = [{ message: 'Each pass selects the smallest remaining value and places it.', array: copy(a) }]
  const settled: number[] = []

  for (let i = 0; i < a.length - 1; i += 1) {
    let minIndex = i
    steps.push({
      message: `Pass ${i + 1}: assume index ${i} (${a[i]}) is the minimum.`,
      array: copy(a),
      settled: [...settled],
      pointers: [{ label: 'min', index: minIndex }],
    })
    for (let j = i + 1; j < a.length; j += 1) {
      steps.push({
        message: `Compare ${a[j]} with current minimum ${a[minIndex]}.`,
        array: copy(a),
        compare: [j, minIndex],
        settled: [...settled],
        pointers: [
          { label: 'i', index: i },
          { label: 'min', index: minIndex },
          { label: 'j', index: j },
        ],
      })
      if (a[j]! < a[minIndex]!) {
        minIndex = j
        steps.push({
          message: `${a[j]} is smaller — the minimum moves to index ${j}.`,
          array: copy(a),
          settled: [...settled],
          pointers: [{ label: 'min', index: minIndex }],
        })
      }
    }
    if (minIndex !== i) {
      ;[a[i], a[minIndex]] = [a[minIndex]!, a[i]!]
      steps.push({
        message: `Swap ${a[minIndex]} into index ${i}.`,
        array: copy(a),
        swap: [i, minIndex],
        settled: [...settled],
      })
    }
    settled.push(i)
    steps.push({ message: `Index ${i} is now final.`, array: copy(a), settled: [...settled] })
  }

  return {
    steps,
    complexity: complexity('O(n²)', 'O(n²)', 'O(1)', 'Always n(n−1)/2 comparisons, regardless of input order.'),
    edgeCases: ['Never better than quadratic.', 'Exactly one swap per pass at most.', 'Not stable.'],
  }
}

export function insertionSort(values: number[]): AlgorithmTrace {
  const a = copy(values)
  const steps: StepSnapshot[] = [{ message: 'Grow a sorted prefix one element at a time.', array: copy(a) }]

  for (let i = 1; i < a.length; i += 1) {
    const key = a[i]!
    steps.push({
      message: `Take ${key} from index ${i} and find its place in the sorted prefix.`,
      array: copy(a),
      compare: [i, i],
      settled: Array.from({ length: i }, (_, index) => index),
      pointers: [{ label: 'key', index: i }],
    })
    let j = i - 1
    while (j >= 0 && a[j]! > key) {
      steps.push({
        message: `${a[j]} > ${key} — shift ${a[j]} one slot right.`,
        array: copy(a),
        compare: [j, j + 1],
        pointers: [{ label: 'key', index: j + 1 }],
      })
      a[j + 1] = a[j]!
      j -= 1
    }
    a[j + 1] = key
    steps.push({
      message: `Insert ${key} at index ${j + 1}. Prefix 0…${i} is sorted.`,
      array: copy(a),
      visited: [j + 1],
      settled: Array.from({ length: i + 1 }, (_, index) => index),
    })
  }

  return {
    steps,
    complexity: complexity('O(n)', 'O(n²)', 'O(1)', 'Excellent on nearly sorted data; shifts dominate on reversed input.'),
    edgeCases: ['Already sorted: one comparison per element.', 'Reversed: maximum shifts.', 'Stable.'],
  }
}

export function mergeSort(values: number[]): AlgorithmTrace {
  const a = copy(values)
  const steps: StepSnapshot[] = [{ message: 'Split to single elements, then merge sorted runs.', array: copy(a) }]

  const sort = (start: number, end: number, depth: number) => {
    if (start >= end) return
    const mid = Math.floor((start + end) / 2)
    steps.push({
      message: `Split [${start}, ${end}] into [${start}, ${mid}] and [${mid + 1}, ${end}].`,
      array: copy(a),
      range: { start, end },
    })
    sort(start, mid, depth + 1)
    sort(mid + 1, end, depth + 1)

    const left = a.slice(start, mid + 1)
    const right = a.slice(mid + 1, end + 1)
    let i = 0
    let j = 0
    let k = start

    while (i < left.length && j < right.length) {
      steps.push({
        message: `Merge: compare ${left[i]} and ${right[j]}.`,
        array: copy(a),
        compare: [start + i, mid + 1 + j],
        range: { start, end },
      })
      if (left[i]! <= right[j]!) {
        a[k] = left[i]!
        i += 1
      } else {
        a[k] = right[j]!
        j += 1
      }
      steps.push({
        message: `Write ${a[k]} at index ${k}.`,
        array: copy(a),
        visited: [k],
        range: { start, end },
      })
      k += 1
    }
    while (i < left.length) {
      a[k] = left[i]!
      steps.push({ message: `Copy remaining ${left[i]} to index ${k}.`, array: copy(a), visited: [k], range: { start, end } })
      i += 1
      k += 1
    }
    while (j < right.length) {
      a[k] = right[j]!
      steps.push({ message: `Copy remaining ${right[j]} to index ${k}.`, array: copy(a), visited: [k], range: { start, end } })
      j += 1
      k += 1
    }
    steps.push({
      message: `[${start}, ${end}] is merged and sorted.`,
      array: copy(a),
      range: { start, end },
      settled: Array.from({ length: end - start + 1 }, (_, index) => start + index),
    })
  }

  sort(0, a.length - 1, 0)
  steps.push({ message: 'All runs merged — array sorted.', array: copy(a), settled: a.map((_, i) => i) })

  return {
    steps,
    complexity: complexity('O(n log n)', 'O(n log n)', 'O(n)', 'Predictable log-depth recursion with linear merging.'),
    edgeCases: ['Stable sort.', 'Needs O(n) scratch space.', 'Empty and single-element arrays are already sorted.'],
  }
}

export function quickSort(values: number[]): AlgorithmTrace {
  const a = copy(values)
  const steps: StepSnapshot[] = [{ message: 'Partition around a pivot, then recurse on both sides.', array: copy(a) }]

  const sort = (low: number, high: number) => {
    if (low >= high) {
      if (low === high) {
        steps.push({ message: `Single element ${a[low]} at index ${low} is trivially sorted.`, array: copy(a), settled: [low] })
      }
      return
    }
    const pivot = a[high]!
    steps.push({
      message: `Partition [${low}, ${high}] around pivot ${pivot} (last element).`,
      array: copy(a),
      range: { start: low, end: high },
      pointers: [{ label: 'pivot', index: high }],
    })

    let boundary = low
    for (let j = low; j < high; j += 1) {
      steps.push({
        message: `Compare ${a[j]} with pivot ${pivot}.`,
        array: copy(a),
        compare: [j, high],
        range: { start: low, end: high },
        pointers: [
          { label: 'j', index: j },
          { label: 'pivot', index: high },
        ],
      })
      if (a[j]! < pivot) {
        if (boundary !== j) {
          ;[a[boundary], a[j]] = [a[j]!, a[boundary]!]
          steps.push({
            message: `${a[j]} < ${pivot} — swap it into the small partition at ${boundary}.`,
            array: copy(a),
            swap: [boundary, j],
            range: { start: low, end: high },
          })
        }
        boundary += 1
      }
    }

    ;[a[boundary], a[high]] = [a[high]!, a[boundary]!]
    steps.push({
      message: `Place pivot ${pivot} at index ${boundary} — everything left is smaller.`,
      array: copy(a),
      swap: [boundary, high],
      settled: [boundary],
      range: { start: low, end: high },
    })

    sort(low, boundary - 1)
    sort(boundary + 1, high)
  }

  sort(0, a.length - 1)
  steps.push({ message: 'All partitions resolved — array sorted.', array: copy(a), settled: a.map((_, i) => i) })

  return {
    steps,
    complexity: complexity('O(n log n)', 'O(n²)', 'O(log n)', 'Lomuto partition; worst case appears on already-sorted input with a last-element pivot.'),
    edgeCases: ['Sorted input with last-element pivot degrades to quadratic.', 'Duplicates cluster on one side.', 'Randomising the pivot avoids the worst case.'],
  }
}
