import type { StepSnapshot } from '../algorithms/types'

export function GraphVisualizer({ step }: { step: StepSnapshot }) {
  const graph = step.graph
  if (!graph) return null

  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]))
  const isActiveEdge = (from: string, to: string) =>
    (graph.activeEdges ?? []).some(
      (edge) =>
        (edge.from === from && edge.to === to) || (edge.from === to && edge.to === from),
    )

  return (
    <div className="space-y-2">
      <svg
        viewBox="0 0 100 100"
        className="mx-auto h-72 w-full max-w-2xl"
        role="img"
        aria-label={`Graph with ${graph.nodes.length} nodes and ${graph.edges.length} edges`}
      >
        {graph.edges.map((edge) => {
          const from = nodeById.get(edge.from)
          const to = nodeById.get(edge.to)
          if (!from || !to) return null
          const active = isActiveEdge(edge.from, edge.to)
          return (
            <line
              key={`${edge.from}-${edge.to}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={active ? 'var(--warning)' : 'var(--border-strong)'}
              strokeWidth={active ? 1.1 : 0.55}
            />
          )
        })}

        {graph.nodes.map((node) => {
          const visited = graph.visited?.includes(node.id) ?? false
          const active = graph.active?.includes(node.id) ?? false
          const frontier = graph.frontier?.includes(node.id) ?? false
          return (
            <g key={node.id}>
              <circle
                cx={node.x}
                cy={node.y}
                r={active ? 6 : 5.2}
                fill={
                  active
                    ? 'var(--warning)'
                    : visited
                      ? 'var(--success-soft)'
                      : frontier
                        ? 'var(--info-soft)'
                        : 'var(--surface)'
                }
                stroke={
                  active
                    ? 'var(--warning)'
                    : visited
                      ? 'var(--success)'
                      : frontier
                        ? 'var(--info)'
                        : 'var(--border-strong)'
                }
                strokeWidth={0.8}
              />
              <text
                x={node.x}
                y={node.y + 1.5}
                textAnchor="middle"
                fontSize={4}
                fontFamily="var(--font-mono)"
                fontWeight={600}
                fill={active ? 'var(--primary-foreground)' : 'var(--foreground)'}
              >
                {node.label}
              </text>
            </g>
          )
        })}
      </svg>

      <div className="flex flex-wrap justify-center gap-4 text-[11px] text-muted-foreground">
        <Legend swatch="var(--warning)" label="Active" />
        <Legend swatch="var(--success-soft)" label="Visited" border="var(--success)" />
        <Legend swatch="var(--info-soft)" label="In frontier" border="var(--info)" />
      </div>
    </div>
  )
}

function Legend({ swatch, label, border }: { swatch: string; label: string; border?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="size-2.5 rounded-full border"
        style={{ background: swatch, borderColor: border ?? swatch }}
        aria-hidden="true"
      />
      {label}
    </span>
  )
}
