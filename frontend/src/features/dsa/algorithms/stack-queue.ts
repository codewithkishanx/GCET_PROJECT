import type { AlgorithmTrace, StepSnapshot } from './types'

export type LinearOp = { op: 'push' | 'pop' | 'peek'; value?: number } | { op: 'dequeue' | 'enqueue'; value?: number }

const view = (items: number[], kind: 'stack' | 'queue', message: string, highlight: number[] = []): StepSnapshot => ({
  message,
  linear: { items: [...items], kind, highlight },
})

export function stackTrace(values: number[], operations: LinearOp[]): AlgorithmTrace {
  const stack = [...values]
  const steps: StepSnapshot[] = [
    view(stack, 'stack', `Start with ${stack.length} item(s). The top is the last element.`, stack.length ? [stack.length - 1] : []),
  ]

  for (const operation of operations) {
    if (operation.op === 'push') {
      const value = operation.value ?? 0
      stack.push(value)
      steps.push(
        view(stack, 'stack', `push(${value}): place it on top. Top is now ${value}.`, [stack.length - 1]),
      )
    } else if (operation.op === 'pop') {
      if (stack.length === 0) {
        steps.push(view(stack, 'stack', 'pop() on an empty stack — underflow. Return an error, not undefined data.'))
        continue
      }
      const value = stack[stack.length - 1]!
      stack.pop()
      steps.push(view(stack, 'stack', `pop() → ${value}. The item below becomes the top.`, stack.length ? [stack.length - 1] : []))
    } else if (operation.op === 'peek') {
      steps.push(
        view(
          stack,
          'stack',
          stack.length ? `peek() → ${stack[stack.length - 1]}. Peeking does not remove it.` : 'peek() on an empty stack — underflow.',
          stack.length ? [stack.length - 1] : [],
        ),
      )
    }
  }

  return {
    steps,
    complexity: { time: 'O(1) per operation', space: 'O(n)', summary: 'Push, pop, and peek only touch the end of the array.' },
    edgeCases: ['Pop/peek on empty must be handled.', 'A stack is LIFO: last in, first out.'],
  }
}

export function queueTrace(values: number[], operations: LinearOp[]): AlgorithmTrace {
  const queue = [...values]
  const steps: StepSnapshot[] = [
    view(queue, 'queue', `Start with ${queue.length} item(s). The front is the first element.`, queue.length ? [0] : []),
  ]

  for (const operation of operations) {
    if (operation.op === 'enqueue') {
      const value = operation.value ?? 0
      queue.push(value)
      steps.push(
        view(queue, 'queue', `enqueue(${value}): join the back of the queue. Front is still ${queue[0] ?? 'empty'}.`, [queue.length - 1]),
      )
    } else if (operation.op === 'dequeue') {
      if (queue.length === 0) {
        steps.push(view(queue, 'queue', 'dequeue() on an empty queue — underflow.'))
        continue
      }
      const value = queue.shift()!
      steps.push(
        view(queue, 'queue', `dequeue() → ${value}. Front is now ${queue[0] ?? 'empty'}.`, queue.length ? [0] : []),
      )
    } else if (operation.op === 'peek') {
      steps.push(
        view(
          queue,
          'queue',
          queue.length ? `peek() → ${queue[0]}. The front stays in place.` : 'peek() on an empty queue — underflow.',
          queue.length ? [0] : [],
        ),
      )
    }
  }

  steps.push(
    view(queue, 'queue', 'A real queue avoids shift() cost with a ring buffer or two-stack trick.', queue.length ? [0] : []),
  )

  return {
    steps,
    complexity: { time: 'O(1) amortised', space: 'O(n)', summary: 'FIFO ordering; the naive array shift is O(n).' },
    edgeCases: ['Dequeue on empty must be handled.', 'Ring buffers need full/empty disambiguation.'],
  }
}

export function describeOps(ops: LinearOp[]): string {
  return ops
    .map((op) =>
      op.value === undefined ? `${op.op}()` : `${op.op}(${op.value})`,
    )
    .join(' · ')
}
