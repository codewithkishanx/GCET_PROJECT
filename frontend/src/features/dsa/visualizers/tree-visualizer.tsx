import type { StepSnapshot } from '../algorithms/types'

export function TreeVisualizer({ step }: { step: StepSnapshot }) {
  const tree = step.tree
  if (!tree || tree.nodes.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">The tree is empty.</p>
  }

  const maxDepth = Math.max(...tree.nodes.map((node) => node.depth))
  const levelHeight = maxDepth === 0 ? 0 : 74 / maxDepth
  const byId = new Map(tree.nodes.map((node) => [node.id, node]))

  const position = (node: (typeof tree.nodes)[number]) => ({
    x: tree.nodes.length === 1 ? 50 : 6 + (node.order / (tree.nodes.length - 1)) * 88,
    y: 12 + node.depth * levelHeight,
  })

  return (
    <div className="space-y-2">
      <svg
        viewBox="0 0 100 100"
        className="mx-auto h-72 w-full max-w-2xl"
        role="img"
        aria-label={`Binary search tree with ${tree.nodes.length} nodes`}
      >
        {tree.nodes.map((node) => {
          if (!node.parentId) return null
          const parent = byId.get(node.parentId)
          if (!parent) return null
          const from = position(parent)
          const to = position(node)
          return (
            <line
              key={`edge-${node.id}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="var(--border-strong)"
              strokeWidth={0.5}
            />
          )
        })}

        {tree.nodes.map((node) => {
          const { x, y } = position(node)
          const highlighted = tree.highlight?.includes(node.id) ?? false
          const visiting = tree.visiting === node.id
          return (
            <g key={node.id}>
              <circle
                cx={x}
                cy={y}
                r={4.6}
                fill={
                  visiting
                    ? 'var(--warning)'
                    : highlighted
                      ? 'var(--success-soft)'
                      : 'var(--surface)'
                }
                stroke={visiting ? 'var(--warning)' : highlighted ? 'var(--success)' : 'var(--border-strong)'}
                strokeWidth={0.6}
              />
              <text
                x={x}
                y={y + 1.4}
                textAnchor="middle"
                fontSize={3.4}
                fontFamily="var(--font-mono)"
                fontWeight={600}
                fill={visiting ? 'var(--primary-foreground)' : 'var(--foreground)'}
              >
                {node.value}
              </text>
            </g>
          )
        })}
      </svg>
      <p className="text-center text-[11px] text-muted-foreground">
        In-order position on the horizontal axis · depth on the vertical axis
      </p>
    </div>
  )
}
