import type { AlgorithmTrace, StepSnapshot } from './types'

function trace(steps: StepSnapshot[], complexity: AlgorithmTrace['complexity'], edgeCases: string[]): AlgorithmTrace {
  return { steps, complexity, edgeCases }
}

const copy = (values: number[]) => [...values]

export function traverse(values: number[]): AlgorithmTrace {
  const steps: StepSnapshot[] = []
  const array = copy(values)
  steps.push({ message: `Start at index 0 of ${array.length} elements.`, array: copy(array), visited: [], pointers: [{ label: 'i', index: 0 }] })

  for (let i = 0; i < array.length; i += 1) {
    steps.push({
      message: `Visit index ${i} — value ${array[i]}.`,
      array: copy(array),
      visited: Array.from({ length: i + 1 }, (_, index) => index),
      pointers: [{ label: 'i', index: i }],
    })
  }

  steps.push({
    message: `Visited every element once. ${array.length} reads, no extra memory.`,
    array: copy(array),
    visited: array.map((_, index) => index),
  })

  return trace(
    steps,
    { time: 'O(n)', space: 'O(1)', summary: 'One pass over the array; nothing stored beyond the loop index.' },
    ['Empty array: the loop body never runs.', 'Traversal order depends on direction — reverse traversal is the same cost.'],
  )
}

export function linearSearch(values: number[], target: number): AlgorithmTrace {
  const array = copy(values)
  const steps: StepSnapshot[] = [
    {
      message: `Looking for ${target}. Check each element from the left.`,
      array: copy(array),
      visited: [],
      pointers: [{ label: 'target', index: 0 }],
    },
  ]

  for (let i = 0; i < array.length; i += 1) {
    const match = array[i] === target
    steps.push({
      message: match
        ? `Index ${i} holds ${target} — found it after ${i + 1} comparison${i === 0 ? '' : 's'}.`
        : `Compare index ${i}: ${array[i]} ≠ ${target}. Move on.`,
      array: copy(array),
      compare: [i, i],
      visited: Array.from({ length: i + 1 }, (_, index) => index),
      pointers: [{ label: 'i', index: i }],
    })
    if (match) {
      return trace(
        steps,
        { time: 'O(n)', space: 'O(1)', summary: 'Best case is the first element; worst case is absent.' },
        ['Absent target costs a full scan.', 'Duplicates return the first match only.'],
      )
    }
  }

  steps.push({
    message: `${target} is not in the array. All ${array.length} elements were checked.`,
    array: copy(array),
    visited: array.map((_, index) => index),
  })

  return trace(
    steps,
    { time: 'O(n)', space: 'O(1)', summary: 'Linear scan; the array does not need to be sorted.' },
    ['Empty array: immediate miss.', 'Works on unsorted data.'],
  )
}

export function binarySearch(values: number[], target: number): AlgorithmTrace {
  const array = copy(values).sort((a, b) => a - b)
  const steps: StepSnapshot[] = [
    {
      message: values.every((value, index) => index === 0 || values[index - 1]! <= value)
        ? `Sorted input. Search for ${target} by halving the range.`
        : 'Binary search needs sorted input — showing a sorted copy of your array.',
      array: copy(array),
      range: { start: 0, end: array.length - 1 },
    },
  ]

  let low = 0
  let high = array.length - 1
  let comparisons = 0

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    comparisons += 1
    const value = array[mid]!
    steps.push({
      message: `Range [${low}, ${high}]. Mid ${mid} holds ${value} (comparison ${comparisons}).`,
      array: copy(array),
      range: { start: low, end: high },
      compare: [mid, mid],
      pointers: [
        { label: 'low', index: low },
        { label: 'mid', index: mid },
        { label: 'high', index: Math.max(high, low) },
      ],
    })

    if (value === target) {
      steps.push({
        message: `Found ${target} at index ${mid} in ${comparisons} comparisons.`,
        array: copy(array),
        visited: [mid],
        range: { start: low, end: high },
        pointers: [{ label: 'found', index: mid }],
      })
      return trace(
        steps,
        { time: 'O(log n)', space: 'O(1)', summary: 'Each comparison halves the search space.' },
        ['Requires sorted input.', 'Empty array returns not-found without comparisons.'],
      )
    }

    if (value < target) {
      steps.push({
        message: `${value} < ${target}, so discard everything at or left of mid.`,
        array: copy(array),
        range: { start: mid + 1, end: high },
        settled: Array.from({ length: mid - low + 1 }, (_, index) => low + index),
      })
      low = mid + 1
    } else {
      steps.push({
        message: `${value} > ${target}, so discard everything at or right of mid.`,
        array: copy(array),
        range: { start: low, end: mid - 1 },
        settled: Array.from({ length: high - mid + 1 }, (_, index) => mid + index),
      })
      high = mid - 1
    }
  }

  steps.push({
    message: `Range is empty — ${target} is not present. ${comparisons} comparisons total.`,
    array: copy(array),
    range: { start: 0, end: -1 },
  })

  return trace(
    steps,
    { time: 'O(log n)', space: 'O(1)', summary: 'Halve and discard; ~log₂(n) comparisons.' },
    ['Unsorted input must be sorted first, costing O(n log n).', 'Duplicate values may return any matching index.'],
  )
}

export function insertAt(values: number[], index: number, value: number): AlgorithmTrace {
  const array = copy(values)
  const steps: StepSnapshot[] = [
    { message: `Insert ${value} at index ${index}. Positions at or after the index shift right.`, array: copy(array) },
  ]

  const clamped = Math.max(0, Math.min(index, array.length))
  steps.push({
    message: `Inserting at ${clamped}: shift ${array.length - clamped} element(s) one slot right.`,
    array: copy(array),
    range: { start: clamped, end: Math.max(clamped, array.length - 1) },
  })

  for (let i = array.length; i > clamped; i -= 1) {
    array[i] = array[i - 1]!
    steps.push({
      message: `Move ${array[i - 1]} from index ${i - 1} to ${i}.`,
      array: copy(array),
      compare: [i - 1, i],
      pointers: [{ label: 'i', index: i }],
    })
  }

  array[clamped] = value
  steps.push({
    message: `Write ${value} into index ${clamped}. Length is now ${array.length}.`,
    array: copy(array),
    visited: [clamped],
    pointers: [{ label: 'new', index: clamped }],
  })

  return trace(
    steps,
    { time: 'O(n)', space: 'O(1)', summary: 'Insertion shifts trailing elements, so it is linear.' },
    ['Inserting at the end needs no shifts.', 'Fixed-size arrays may need to grow or fail.'],
  )
}

export function deleteAt(values: number[], index: number): AlgorithmTrace {
  const array = copy(values)
  const steps: StepSnapshot[] = [
    { message: `Delete the element at index ${index}. Trailing elements close the gap.`, array: copy(array) },
  ]

  if (index < 0 || index >= array.length) {
    steps.push({ message: `Index ${index} is outside 0…${array.length - 1}. Nothing to delete.`, array: copy(array) })
    return trace(
      steps,
      { time: 'O(n)', space: 'O(1)', summary: 'Deletion shifts trailing elements left.' },
      ['Deleting from the end is O(1).', 'Out-of-range indices must be rejected.'],
    )
  }

  const removed = array[index]
  steps.push({
    message: `Remove ${removed} from index ${index}; now shift the rest left.`,
    array: copy(array),
    compare: [index, index],
    pointers: [{ label: 'removed', index }],
  })

  for (let i = index; i < array.length - 1; i += 1) {
    array[i] = array[i + 1]!
    steps.push({
      message: `Move ${array[i + 1]} from index ${i + 1} to ${i}.`,
      array: copy(array),
      compare: [i + 1, i],
      pointers: [{ label: 'i', index: i }],
    })
  }

  array.length -= 1
  steps.push({
    message: `Length is now ${array.length}. ${removed} is gone.`,
    array: copy(array),
    visited: array.map((_, i) => i),
  })

  return trace(
    steps,
    { time: 'O(n)', space: 'O(1)', summary: 'The shift dominates; removing the last element is constant time.' },
    ['Deleting the only element yields an empty array.', 'Deleting from the front shifts everything.'],
  )
}

export function twoPointers(values: number[], target: number): AlgorithmTrace {
  const array = copy(values).sort((a, b) => a - b)
  const steps: StepSnapshot[] = [
    {
      message: `Find two values summing to ${target} by squeezing from both ends. (Input sorted for the pointer walk.)`,
      array: copy(array),
      pointers: [
        { label: 'L', index: 0 },
        { label: 'R', index: array.length - 1 },
      ],
    },
  ]

  let left = 0
  let right = array.length - 1

  while (left < right) {
    const sum = array[left]! + array[right]!
    steps.push({
      message: `array[${left}] + array[${right}] = ${array[left]} + ${array[right]} = ${sum}.`,
      array: copy(array),
      compare: [left, right],
      pointers: [
        { label: 'L', index: left },
        { label: 'R', index: right },
      ],
    })

    if (sum === target) {
      steps.push({
        message: `Sum equals ${target} — pair found at indices ${left} and ${right}.`,
        array: copy(array),
        visited: [left, right],
        pointers: [
          { label: 'L', index: left },
          { label: 'R', index: right },
        ],
      })
      return trace(
        steps,
        { time: 'O(n)', space: 'O(1)', summary: 'One pass with two indices; sorting, if needed, costs O(n log n).' },
        ['Needs sorted input.', 'Same element cannot be used twice.', 'Multiple valid pairs exist.'],
      )
    }

    if (sum < target) {
      steps.push({
        message: `Sum too small (${sum} < ${target}) — move L right to increase it.`,
        array: copy(array),
        settled: [left],
        pointers: [{ label: 'L', index: left + 1 }, { label: 'R', index: right }],
      })
      left += 1
    } else {
      steps.push({
        message: `Sum too large (${sum} > ${target}) — move R left to decrease it.`,
        array: copy(array),
        settled: [right],
        pointers: [{ label: 'L', index: left }, { label: 'R', index: right - 1 }],
      })
      right -= 1
    }
  }

  steps.push({
    message: 'Pointers met without a match — no pair sums to the target.',
    array: copy(array),
    pointers: [{ label: 'L', index: left }, { label: 'R', index: right }],
  })

  return trace(
    steps,
    { time: 'O(n)', space: 'O(1)', summary: 'Each step discards one candidate, so at most n steps.' },
    ['Pointers crossing means no pair exists.', 'Negative numbers are fine on sorted input.'],
  )
}

export function slidingWindow(values: number[], k: number): AlgorithmTrace {
  const array = copy(values)
  const steps: StepSnapshot[] = [
    {
      message: `Find the largest sum of ${k} consecutive elements.`,
      array: copy(array),
      window: { start: 0, end: Math.min(k - 1, array.length - 1) },
    },
  ]

  if (k <= 0 || k > array.length) {
    steps.push({ message: `Window size ${k} does not fit an array of length ${array.length}.`, array: copy(array) })
    return trace(
      steps,
      { time: 'O(n)', space: 'O(1)', summary: 'Slide the window, adding the entrant and removing the leaver.' },
      ['k must be between 1 and n.', 'All-negative arrays still work.'],
    )
  }

  let sum = 0
  for (let i = 0; i < k; i += 1) sum += array[i]!
  let best = sum
  let bestStart = 0
  steps.push({
    message: `Initial window [0, ${k - 1}] sums to ${sum}.`,
    array: copy(array),
    window: { start: 0, end: k - 1 },
    visited: Array.from({ length: k }, (_, index) => index),
  })

  for (let start = 1; start <= array.length - k; start += 1) {
    const end = start + k - 1
    const leaving = array[start - 1]!
    const entering = array[end]!
    sum = sum - leaving + entering
    const isBest = sum > best
    if (isBest) {
      best = sum
      bestStart = start
    }
    steps.push({
      message: `Slide to [${start}, ${end}]: −${leaving} +${entering} → ${sum}${isBest ? ` (new best)` : ''}.`,
      array: copy(array),
      window: { start, end },
      compare: [start - 1, end],
      visited: Array.from({ length: k }, (_, index) => start + index),
    })
  }

  steps.push({
    message: `Best window starts at ${bestStart} with sum ${best}.`,
    array: copy(array),
    window: { start: bestStart, end: bestStart + k - 1 },
    visited: Array.from({ length: k }, (_, index) => bestStart + index),
  })

  return trace(
    steps,
    { time: 'O(n)', space: 'O(1)', summary: 'Each element enters and leaves the window once.' },
    ['k = n means a single window.', 'Recomputing each window from scratch would be O(n·k).'],
  )
}
