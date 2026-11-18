import type { AlgorithmTrace, StepSnapshot } from './types'

const snapshot = (
  values: number[],
  message: string,
  extra: Partial<StepSnapshot['list']> = {},
): StepSnapshot => ({
  message,
  list: { values: [...values], ...extra },
})

export function listTraverse(values: number[]): AlgorithmTrace {
  const steps: StepSnapshot[] = [snapshot(values, 'Start at the head and follow next pointers.')]
  for (let i = 0; i < values.length; i += 1) {
    steps.push(
      snapshot(values, `Visit node ${i} — value ${values[i]}. Follow its next pointer.`, {
        cursor: i,
        highlight: [i],
      }),
    )
  }
  steps.push(snapshot(values, `Reached null after ${values.length} nodes. Traversal is O(n).`, {}))
  return {
    steps,
    complexity: { time: 'O(n)', space: 'O(1)', summary: 'One visit per node; no random access.' },
    edgeCases: ['Empty list: head is null immediately.', 'A cycle would loop forever without a visited set.'],
  }
}

export function listInsert(values: number[], index: number, value: number): AlgorithmTrace {
  const list = [...values]
  const steps: StepSnapshot[] = [snapshot(list, `Insert ${value} at position ${index}.`)]
  const clamped = Math.max(0, Math.min(index, list.length))

  if (clamped === 0) {
    steps.push(
      snapshot(list, `New node ${value} becomes the head; its next points at the old head.`, {
        cursor: 0,
        highlight: [],
      }),
    )
    list.unshift(value)
    steps.push(snapshot(list, `Head is now ${value}. Length ${list.length}.`, { cursor: 0, highlight: [0] }))
    return done(steps, 'O(1)', 'Inserting at the head only rewires one pointer.')
  }

  steps.push(
    snapshot(list, `Walk to position ${clamped - 1} — the node before the insertion point.`, { cursor: 0 }),
  )
  for (let i = 0; i < clamped - 1; i += 1) {
    steps.push(snapshot(list, `Move to node ${i + 1}.`, { cursor: i + 1 }))
  }

  list.splice(clamped, 0, value)
  steps.push(
    snapshot(list, `Point node ${clamped - 1} at the new node, then the new node at ${list[clamped + 1] ?? 'null'}.`, {
      cursor: clamped,
      highlight: [clamped],
    }),
  )
  steps.push(snapshot(list, `Inserted ${value}. Length ${list.length}.`, { highlight: [clamped] }))
  return done(steps, 'O(n)', 'Finding the predecessor is linear; the rewrite itself is constant time.')
}

export function listDelete(values: number[], index: number): AlgorithmTrace {
  const list = [...values]
  const steps: StepSnapshot[] = [snapshot(list, `Delete the node at position ${index}.`)]

  if (index < 0 || index >= list.length) {
    steps.push(snapshot(list, `Position ${index} is outside 0…${list.length - 1}. Nothing to delete.`))
    return done(steps, 'O(n)', 'Deletion is only valid for existing positions.')
  }

  if (index === 0) {
    steps.push(snapshot(list, `Detach the head (${list[0]}); the next node becomes head.`, { detached: [0] }))
    list.shift()
    steps.push(snapshot(list, `Head is now ${list[0] ?? 'null'}.`, { cursor: 0 }))
    return done(steps, 'O(1)', 'Deleting the head rewires one pointer.')
  }

  for (let i = 0; i < index - 1; i += 1) {
    steps.push(snapshot(list, `Walk to node ${i + 1}.`, { cursor: i + 1 }))
  }
  steps.push(snapshot(list, `Node ${index - 1} will skip node ${index} (${list[index]}).`, { cursor: index - 1, detached: [index] }))
  list.splice(index, 1)
  steps.push(snapshot(list, `Removed. Length ${list.length}.`, { cursor: Math.min(index - 1, list.length - 1) }))
  return done(steps, 'O(n)', 'You must find the predecessor before unlinking.')
}

export function listReverse(values: number[]): AlgorithmTrace {
  const list = [...values]
  const steps: StepSnapshot[] = [
    snapshot(list, 'Reverse in place with three pointers: prev, curr, next.', { highlight: [] }),
  ]

  let prev: number | null = null
  let curr = 0
  let guard = 0

  while (curr < list.length && guard <= list.length + 1) {
    guard += 1
    const next: number | null = curr + 1 < list.length ? curr + 1 : null
    steps.push(
      snapshot(
        list,
        `curr is ${list[curr]} (${curr}); prev is ${prev === null ? 'null' : list[prev]}; next is ${next === null ? 'null' : list[next]}.`,
        { cursor: curr, highlight: [prev, curr, next].filter((value): value is number => value !== null) },
      ),
    )
    if (prev !== null) {
      steps.push(snapshot(list, `Point ${list[curr]} back at ${list[prev]}.`, { cursor: curr, highlight: [prev, curr] }))
    } else {
      steps.push(snapshot(list, `${list[curr]} becomes the new tail; its next becomes null.`, { cursor: curr }))
    }
    prev = curr
    if (next === null) break
    curr = next
  }

  steps.push(
    snapshot(list, `Traversal finished. Head moves from ${list[0]} to ${list[list.length - 1]}. (The diagram shows the reordered chain.)`, {
      highlight: [list.length - 1],
    }),
  )

  return {
    steps,
    complexity: { time: 'O(n)', space: 'O(1)', summary: 'Rewire each next pointer exactly once.' },
    edgeCases: ['Empty list returns immediately.', 'Single node keeps its null next.', 'A cycle must be detected before reversing.'],
  }
}

function done(steps: StepSnapshot[], time: string, summary: string): AlgorithmTrace {
  return {
    steps,
    complexity: { time, space: 'O(1)', summary },
    edgeCases: ['Out-of-range positions must be rejected.', 'Head operations change what "position 0" means.', 'Empty lists have no predecessor.'],
  }
}
