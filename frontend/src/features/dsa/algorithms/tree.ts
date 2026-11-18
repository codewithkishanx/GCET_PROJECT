import type { AlgorithmTrace, StepSnapshot, TreeNodeView } from './types'

interface BstNode {
  id: string
  value: number
  left: BstNode | null
  right: BstNode | null
}

let idCounter = 0
const nextId = () => `n${(idCounter += 1)}`

function makeNode(value: number): BstNode {
  return { id: nextId(), value, left: null, right: null }
}

function insertNode(root: BstNode | null, value: number): BstNode {
  if (!root) return makeNode(value)
  let current = root
  for (;;) {
    if (value < current.value) {
      if (!current.left) {
        current.left = makeNode(value)
        return root
      }
      current = current.left
    } else {
      if (!current.right) {
        current.right = makeNode(value)
        return root
      }
      current = current.right
    }
  }
}

export function buildTree(values: number[]): BstNode | null {
  let root: BstNode | null = null
  for (const value of values) root = insertNode(root, value)
  return root
}

/** In-order positions and depth, ready for the SVG renderer. */
export function layoutTree(root: BstNode | null): TreeNodeView[] {
  const nodes: TreeNodeView[] = []
  let order = 0
  const walk = (node: BstNode | null, depth: number, parentId: string | null) => {
    if (!node) return
    walk(node.left, depth + 1, node.id)
    nodes.push({ id: node.id, value: node.value, depth, order: order++, parentId })
    walk(node.right, depth + 1, node.id)
  }
  walk(root, 0, null)
  return nodes
}

function step(root: BstNode | null, message: string, extra: Partial<StepSnapshot['tree']> = {}): StepSnapshot {
  return { message, tree: { nodes: layoutTree(root), ...extra } }
}

export function treeFromList(values: number[]): { root: BstNode | null } {
  idCounter = 0
  return { root: buildTree(values) }
}

export function bstSearch(values: number[], target: number): AlgorithmTrace {
  idCounter = 0
  const root = buildTree(values)
  const steps: StepSnapshot[] = [step(root, `Search for ${target}. At each node, go left when smaller, right when larger.`)]
  const path: string[] = []
  let current = root
  let comparisons = 0

  while (current) {
    comparisons += 1
    path.push(current.id)
    const matched = current.value === target
    steps.push(
      step(root, matched ? `Node ${current.value} matches ${target} after ${comparisons} comparison(s).` : `Compare ${target} with node ${current.value} — go ${target < current.value ? 'left' : 'right'}.`, {
        visiting: current.id,
        highlight: [...path],
        path: [...path],
      }),
    )
    if (matched) {
      return {
        steps,
        complexity: { time: 'O(h)', space: 'O(1)', summary: 'Cost follows tree height h: log n when balanced, n when degenerate.' },
        edgeCases: ['Empty tree returns not-found.', 'A balanced tree is much shallower than a sorted insertion chain.'],
      }
    }
    current = target < current.value ? current.left : current.right
  }

  steps.push(step(root, `${target} is not present — the search fell off the tree after ${comparisons} comparisons.`, { highlight: path }))
  return {
    steps,
    complexity: { time: 'O(h)', space: 'O(1)', summary: 'Comparisons equal the depth of the search path.' },
    edgeCases: ['Sorted insert order creates a linked-list-shaped tree.', 'Duplicates follow the right branch in this implementation.'],
  }
}

export function bstInsert(values: number[], value: number): AlgorithmTrace {
  idCounter = 0
  const root = buildTree(values)
  const steps: StepSnapshot[] = [step(root, `Insert ${value} by searching for an empty child slot.`)]
  const path: string[] = []
  let current = root

  while (current) {
    path.push(current.id)
    const direction = value < current.value ? 'left' : 'right'
    steps.push(step(root, `At ${current.value}: ${value} ${value < current.value ? '<' : '≥'} ${current.value}, so descend ${direction}.`, { visiting: current.id, highlight: [...path], path: [...path] }))
    if (!(direction === 'left' ? current.left : current.right)) break
    current = direction === 'left' ? current.left : current.right
  }

  if (!root) {
    const newRoot = makeNode(value)
    steps.push(step(newRoot, `${value} becomes the root of the empty tree.`, { highlight: [newRoot.id] }))
    return insertTrace(steps)
  }

  const created = makeNode(value)
  if (value < current!.value) current!.left = created
  else current!.right = created

  steps.push(
    step(root, `Attach ${value} as the ${value < current!.value ? 'left' : 'right'} child of ${current!.value}.`, {
      highlight: [...path, created.id],
      visiting: created.id,
    }),
  )
  steps.push(step(root, `Tree now holds ${countNodes(root)} node(s). In-order traversal stays sorted.`, { highlight: [created.id] }))
  return insertTrace(steps)
}

function countNodes(node: BstNode | null): number {
  return node ? 1 + countNodes(node.left) + countNodes(node.right) : 0
}

function insertTrace(steps: StepSnapshot[]): AlgorithmTrace {
  return {
    steps,
    complexity: { time: 'O(h)', space: 'O(1)', summary: 'Insertion walks the same path a search would, then links one new node.' },
    edgeCases: ['Duplicate values must follow a documented rule.', 'Unbalanced insert order degrades height to n.', 'The root can change only when the tree was empty.'],
  }
}

export function bstDelete(values: number[], target: number): AlgorithmTrace {
  idCounter = 0
  const initial = buildTree(values)
  const holder: { root: BstNode | null } = { root: initial }
  const steps: StepSnapshot[] = [step(holder.root, `Delete ${target}. Find it first, then handle its children.`)]

  const path: string[] = []
  let current: BstNode | null = holder.root
  while (current && current.value !== target) {
    path.push(current.id)
    steps.push(step(holder.root, `${target} ≠ ${current.value} — go ${target < current.value ? 'left' : 'right'}.`, { visiting: current.id, highlight: [...path] }))
    current = target < current.value ? current.left : current.right
  }

  if (!current) {
    steps.push(step(holder.root, `${target} is not in the tree. Nothing to delete.`, { highlight: path }))
    return deleteTrace(steps)
  }

  path.push(current.id)
  steps.push(step(holder.root, `Found ${target} at node ${current.value}.`, { visiting: current.id, highlight: [...path] }))

  const childCount = Number(Boolean(current.left)) + Number(Boolean(current.right))
  if (childCount === 0) {
    steps.push(step(holder.root, `Node ${target} is a leaf — detach it.`, { highlight: [current.id] }))
    detach(holder, current, null)
  } else if (childCount === 1) {
    const child = current.left ?? current.right
    steps.push(step(holder.root, `Node ${target} has one child (${child?.value}) — promote it into the gap.`, { highlight: [current.id, ...(child ? [child.id] : [])] }))
    detach(holder, current, child)
  } else {
    let successor = current.right!
    steps.push(step(holder.root, `Node ${target} has two children — find the smallest value in its right subtree.`, { visiting: current.id, highlight: [current.id] }))
    while (successor.left) {
      steps.push(step(holder.root, `Descend left: ${successor.value} → ${successor.left.value}.`, { visiting: successor.left.id, highlight: [successor.left.id] }))
      successor = successor.left
    }
    steps.push(step(holder.root, `Successor is ${successor.value}. Copy it into the deleted node, then remove the successor node.`, { visiting: successor.id, highlight: [current.id, successor.id] }))
    current.value = successor.value
    detach(holder, successor, successor.right)
    steps.push(step(holder.root, `Value copied and successor unlinked. In-order order still holds.`, { highlight: [] }))
  }

  steps.push(step(holder.root, `Deleted ${target}. ${countNodes(holder.root)} node(s) remain.`, {}))
  return deleteTrace(steps)
}

/** Unlink `node` from the tree, including when it is the root. */
function detach(
  holder: { root: BstNode | null },
  node: BstNode,
  replacement: BstNode | null,
) {
  if (holder.root === node) {
    holder.root = replacement
    return
  }
  const stack: BstNode[] = holder.root ? [holder.root] : []
  while (stack.length) {
    const parent = stack.pop()!
    if (parent.left === node) {
      parent.left = replacement
      return
    }
    if (parent.right === node) {
      parent.right = replacement
      return
    }
    if (parent.left) stack.push(parent.left)
    if (parent.right) stack.push(parent.right)
  }
}

function deleteTrace(steps: StepSnapshot[]): AlgorithmTrace {
  return {
    steps,
    complexity: { time: 'O(h)', space: 'O(1)', summary: 'Search, then splice; two-child deletion adds a successor hunt.' },
    edgeCases: ['Leaf: detach.', 'One child: promote it.', 'Two children: copy in-order successor, delete it instead.'],
  }
}

export type TraversalOrder = 'preorder' | 'inorder' | 'postorder' | 'levelorder'

export function bstTraversal(values: number[], order: TraversalOrder): AlgorithmTrace {
  idCounter = 0
  const root = buildTree(values)
  const steps: StepSnapshot[] = [step(root, `${labelFor(order)} on a tree of ${countNodes(root)} nodes.`)]
  const visited: string[] = []

  const visit = (node: BstNode) => {
    visited.push(node.id)
    steps.push(
      step(root, `Visit ${node.value}. Order so far: ${visited.map((id) => findValue(root, id)).join(' → ')}.`, {
        visiting: node.id,
        highlight: [...visited],
      }),
    )
  }

  const walkPre = (node: BstNode | null) => {
    if (!node) return
    visit(node)
    walkPre(node.left)
    walkPre(node.right)
  }
  const walkIn = (node: BstNode | null) => {
    if (!node) return
    walkIn(node.left)
    visit(node)
    walkIn(node.right)
  }
  const walkPost = (node: BstNode | null) => {
    if (!node) return
    walkPost(node.left)
    walkPost(node.right)
    visit(node)
  }
  const walkLevel = (start: BstNode | null) => {
    const queue: BstNode[] = start ? [start] : []
    while (queue.length) {
      const node = queue.shift()!
      visit(node)
      if (node.left) queue.push(node.left)
      if (node.right) queue.push(node.right)
    }
  }

  if (order === 'preorder') walkPre(root)
  if (order === 'inorder') walkIn(root)
  if (order === 'postorder') walkPost(root)
  if (order === 'levelorder') walkLevel(root)

  steps.push(
    step(root, `Traversal complete: ${visited.map((id) => findValue(root, id)).join(', ')}.`, { highlight: visited }),
  )

  return {
    steps,
    complexity: {
      time: 'O(n)',
      space: order === 'levelorder' ? 'O(w)' : 'O(h)',
      summary:
        order === 'levelorder'
          ? 'Breadth-first uses a queue sized by the widest level.'
          : 'Depth-first uses the call stack, sized by tree height.',
    },
    edgeCases: ['Pre-order: root first.', 'In-order: sorted for a BST.', 'Post-order: children before parent.', 'Level-order: widest level bounds queue memory.'],
  }
}

function labelFor(order: TraversalOrder): string {
  if (order === 'preorder') return 'Pre-order traversal (node → left → right)'
  if (order === 'inorder') return 'In-order traversal (left → node → right)'
  if (order === 'postorder') return 'Post-order traversal (left → right → node)'
  return 'Level-order traversal (breadth first)'
}

function findValue(root: BstNode | null, id: string): number | undefined {
  if (!root) return undefined
  if (root.id === id) return root.value
  return findValue(root.left, id) ?? findValue(root.right, id)
}
