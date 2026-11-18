import type { AlgorithmTrace, GraphNodeView, StepSnapshot } from './types'

export interface GraphData {
  nodes: GraphNodeView[]
  edges: Array<[string, string]>
}

const SNAPSHOT_NODES = (graph: GraphData) => graph.nodes.map((node) => ({ ...node }))

function edgeViews(pairs: Array<[string, string]>) {
  return pairs.map(([from, to]) => ({ from, to }))
}

function adjacency(graph: GraphData): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const node of graph.nodes) map.set(node.id, [])
  for (const [a, b] of graph.edges) {
    map.get(a)?.push(b)
    map.get(b)?.push(a)
  }
  for (const list of map.values()) list.sort()
  return map
}

function step(
  graph: GraphData,
  message: string,
  extra: Partial<NonNullable<StepSnapshot['graph']>>,
): StepSnapshot {
  return {
    message,
    graph: {
      nodes: SNAPSHOT_NODES(graph),
      edges: edgeViews(graph.edges),
      ...extra,
    },
  }
}

export function bfs(graph: GraphData, startId: string): AlgorithmTrace {
  const adj = adjacency(graph)
  const steps: StepSnapshot[] = [
    step(graph, `Breadth-first from ${startId}: explore all neighbours, then their neighbours.`, {
      frontier: [startId],
      active: [startId],
    }),
  ]

  const visited: string[] = []
  const seen = new Set<string>([startId])
  const queue: string[] = [startId]

  while (queue.length) {
    const current = queue.shift()!
    visited.push(current)
    steps.push(
      step(graph, `Dequeue ${current}. It is ${visited.length} in discovery order.`, {
        visited: [...visited],
        active: [current],
        frontier: [...queue],
      }),
    )

    for (const neighbour of adj.get(current) ?? []) {
      if (seen.has(neighbour)) continue
      seen.add(neighbour)
      queue.push(neighbour)
      steps.push(
        step(graph, `${current} → ${neighbour}: first discovery, enqueue it.`, {
          visited: [...visited],
          active: [current, neighbour],
          activeEdges: edgeViews([[current, neighbour]]),
          frontier: [...queue],
        }),
      )
    }
  }

  steps.push(
    step(graph, `Queue empty. Visited ${visited.length} of ${graph.nodes.length} nodes in breadth-first order.`, {
      visited: [...visited],
    }),
  )

  return {
    steps,
    complexity: { time: 'O(V + E)', space: 'O(V)', summary: 'Each vertex and edge is inspected once; the queue holds the frontier.' },
    edgeCases: ['Disconnected graphs need a restart from another component.', 'A visited set prevents infinite loops on cycles.'],
  }
}

export function dfs(graph: GraphData, startId: string): AlgorithmTrace {
  const adj = adjacency(graph)
  const steps: StepSnapshot[] = [
    step(graph, `Depth-first from ${startId}: dive as deep as possible, then backtrack.`, {
      frontier: [startId],
      active: [startId],
    }),
  ]

  const visited: string[] = []
  const seen = new Set<string>()

  const walk = (node: string, path: string[]) => {
    seen.add(node)
    visited.push(node)
    steps.push(
      step(graph, `Visit ${node} at depth ${path.length}. Call stack: ${[...path, node].join(' → ')}.`, {
        visited: [...visited],
        active: [node],
        frontier: [...path, node],
      }),
    )

    for (const neighbour of adj.get(node) ?? []) {
      if (seen.has(neighbour)) continue
      steps.push(
        step(graph, `${node} → ${neighbour}: descend.`, {
          visited: [...visited],
          active: [node, neighbour],
          activeEdges: edgeViews([[node, neighbour]]),
          frontier: [...path, node],
        }),
      )
      walk(neighbour, [...path, node])
      steps.push(
        step(graph, `Backtrack to ${node}.`, {
          visited: [...visited],
          active: [node],
          frontier: [...path, node],
        }),
      )
    }
  }

  walk(startId, [])
  steps.push(
    step(graph, `Depth-first complete. Visited ${visited.length} of ${graph.nodes.length} nodes.`, {
      visited: [...visited],
    }),
  )

  return {
    steps,
    complexity: { time: 'O(V + E)', space: 'O(V)', summary: 'Recursion depth is bounded by the longest simple path.' },
    edgeCases: ['Recursion depth can overflow on very long paths — convert to an explicit stack.', 'Order depends on neighbour order.'],
  }
}
