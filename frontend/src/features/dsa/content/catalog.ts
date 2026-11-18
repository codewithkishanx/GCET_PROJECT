import type { GraphData } from '../algorithms/graph'
import type { AlgorithmTrace } from '../algorithms/types'
import { binarySearch, deleteAt, insertAt, linearSearch, slidingWindow, traverse, twoPointers } from '../algorithms/arrays'
import { bubbleSort, insertionSort, mergeSort, quickSort, selectionSort } from '../algorithms/sorting'
import { listDelete, listInsert, listReverse, listTraverse } from '../algorithms/linked-list'
import { queueTrace, stackTrace, type LinearOp } from '../algorithms/stack-queue'
import { bstDelete, bstInsert, bstSearch, bstTraversal, type TraversalOrder } from '../algorithms/tree'
import { buildMaxHeap, extractMax } from '../algorithms/heap'
import { bfs, dfs } from '../algorithms/graph'
import { nQueens } from '../algorithms/recursion'
import { seededArray } from '../algorithms/types'

export type VisualizerKind = 'array' | 'list' | 'tree' | 'heap' | 'graph' | 'linear' | 'board'
export type ControlKind = 'values' | 'target' | 'index' | 'k' | 'order' | 'graph' | 'size'

export interface AlgorithmParams {
  values: number[]
  target: number
  index: number
  k: number
  size: number
  order: TraversalOrder
  graphId: string
  start: string
}

export interface AlgorithmMeta {
  slug: string
  title: string
  topic: string
  blurb: string
  idea: string
  code: string
  visualizer: VisualizerKind
  controls: ControlKind[]
  defaults: Partial<AlgorithmParams>
  run: (params: AlgorithmParams) => AlgorithmTrace
  time: string
  space: string
}

export interface TopicMeta {
  slug: string
  title: string
  blurb: string
  overview: string
  algorithmSlugs: string[]
}

/* ------------------------------- Datasets -------------------------------- */

export const graphDatasets: Record<string, { label: string; data: GraphData; start: string }> = {
  sample: {
    label: 'Sample network (8 nodes)',
    start: 'A',
    data: {
      nodes: [
        { id: 'A', label: 'A', x: 8, y: 50 },
        { id: 'B', label: 'B', x: 26, y: 22 },
        { id: 'C', label: 'C', x: 26, y: 78 },
        { id: 'D', label: 'D', x: 45, y: 8 },
        { id: 'E', label: 'E', x: 48, y: 50 },
        { id: 'F', label: 'F', x: 44, y: 92 },
        { id: 'G', label: 'G', x: 70, y: 28 },
        { id: 'H', label: 'H', x: 72, y: 72 },
      ],
      edges: [
        ['A', 'B'],
        ['A', 'C'],
        ['B', 'D'],
        ['B', 'E'],
        ['C', 'E'],
        ['C', 'F'],
        ['D', 'G'],
        ['E', 'G'],
        ['E', 'H'],
        ['F', 'H'],
      ],
    },
  },
  cycle: {
    label: 'Cycle (4 nodes)',
    start: '1',
    data: {
      nodes: [
        { id: '1', label: '1', x: 22, y: 26 },
        { id: '2', label: '2', x: 72, y: 26 },
        { id: '3', label: '3', x: 72, y: 76 },
        { id: '4', label: '4', x: 22, y: 76 },
      ],
      edges: [
        ['1', '2'],
        ['2', '3'],
        ['3', '4'],
        ['4', '1'],
      ],
    },
  },
  path: {
    label: 'Path with a branch (5 nodes)',
    start: 'P',
    data: {
      nodes: [
        { id: 'P', label: 'P', x: 8, y: 50 },
        { id: 'Q', label: 'Q', x: 30, y: 50 },
        { id: 'R', label: 'R', x: 52, y: 22 },
        { id: 'S', label: 'S', x: 52, y: 78 },
        { id: 'T', label: 'T', x: 78, y: 50 },
      ],
      edges: [
        ['P', 'Q'],
        ['Q', 'R'],
        ['Q', 'S'],
        ['R', 'T'],
        ['S', 'T'],
      ],
    },
  },
}

/* -------------------------------- Topics --------------------------------- */

export const topics: TopicMeta[] = [
  {
    slug: 'arrays',
    title: 'Arrays',
    blurb: 'Indexed storage, scanning, inserting, and the two-pointer and sliding-window patterns.',
    overview:
      'An array stores elements in contiguous memory, so reading index i is O(1) while inserting or deleting in the middle shifts everything after it. Most array interview patterns come from two ideas: keeping two indices and shrinking the candidate set, or maintaining a window and adjusting its edges.',
    algorithmSlugs: [
      'array-traversal',
      'linear-search',
      'binary-search',
      'array-insert',
      'array-delete',
      'two-pointers',
      'sliding-window',
    ],
  },
  {
    slug: 'sorting',
    title: 'Sorting',
    blurb: 'Five classic sorts compared by comparisons, swaps, stability, and worst-case behaviour.',
    overview:
      'Sorting algorithms differ in what they assume and what they cost. Quadratic sorts are simple and fast on tiny or nearly sorted inputs; merge sort guarantees O(n log n) with extra memory; quicksort is fast in practice but degrades on adversarial pivots. Watch how each algorithm moves data, not just the final order.',
    algorithmSlugs: ['bubble-sort', 'selection-sort', 'insertion-sort', 'merge-sort', 'quick-sort'],
  },
  {
    slug: 'linked-lists',
    title: 'Linked lists',
    blurb: 'Pointer surgery: traversing, inserting, deleting, and reversing a chain of nodes.',
    overview:
      'A linked list trades random access for cheap splicing. There is no index arithmetic: reaching position k costs k pointer hops, and every insertion or deletion is really a small rewiring of next pointers. Reversal is the canonical exercise because it forces you to track three references without losing the rest of the list.',
    algorithmSlugs: ['list-traversal', 'list-insert', 'list-delete', 'list-reverse'],
  },
  {
    slug: 'stacks-queues',
    title: 'Stacks & queues',
    blurb: 'LIFO and FIFO as the two primitive orders behind parsing, scheduling, and traversal.',
    overview:
      'A stack pushes and pops at one end, so the most recent item leaves first. A queue enqueues at the back and dequeues at the front. Both are O(1) when implemented with the right structure — and both have underflow cases that must be handled explicitly rather than silently returning bad data.',
    algorithmSlugs: ['stack-operations', 'queue-operations'],
  },
  {
    slug: 'trees',
    title: 'Trees & BSTs',
    blurb: 'Binary tree traversals and the search, insert, and delete rules of a binary search tree.',
    overview:
      'A binary search tree keeps every left descendant smaller and every right descendant larger. That invariant turns search into a single root-to-leaf walk — but only if the tree stays reasonably balanced. Traversals visit nodes in different orders, and only in-order traversal yields sorted output.',
    algorithmSlugs: [
      'bst-search',
      'bst-insert',
      'bst-delete',
      'inorder',
      'preorder',
      'postorder',
      'levelorder',
    ],
  },
  {
    slug: 'heaps',
    title: 'Heaps',
    blurb: 'Array-backed priority queues: build a heap, then extract the maximum in log time.',
    overview:
      'A binary heap is a complete binary tree stored in an array: children of index i live at 2i+1 and 2i+2. The only rule is that each parent dominates its children. That weak ordering is enough to make the maximum O(1) to read and O(log n) to remove, which is exactly what a priority queue needs.',
    algorithmSlugs: ['build-max-heap', 'extract-max'],
  },
  {
    slug: 'graphs',
    title: 'Graphs',
    blurb: 'Breadth-first and depth-first search over an explicit node and edge set.',
    overview:
      'Graph traversal is about order and memory. BFS uses a queue and explores in rings, which makes it the right base for shortest paths on unweighted graphs. DFS uses a stack (or recursion) and plunges down one branch before backtracking. Both need a visited set; without one, cycles never terminate.',
    algorithmSlugs: ['bfs', 'dfs'],
  },
  {
    slug: 'recursion',
    title: 'Recursion & backtracking',
    blurb: 'Explicit search trees with pruning, shown through the N-Queens problem.',
    overview:
      'Backtracking is recursion plus undo. At each level you make a choice, check whether it can still lead to a solution, recurse, then restore the state. Watching N-Queens makes the pattern concrete: placements, pruning, and the backtrack that erases a choice are all visible in the board.',
    algorithmSlugs: ['n-queens'],
  },
]

/* ------------------------------ Algorithms -------------------------------- */

const arrayDefaults = seededArray(8, 11)

export const algorithms: AlgorithmMeta[] = [
  /* Arrays */
  {
    slug: 'array-traversal',
    title: 'Array traversal',
    topic: 'arrays',
    blurb: 'Read every element exactly once while tracking the cursor.',
    idea: 'Traversal is the base case of every array algorithm: a single index moves from 0 to n−1 and the loop body reads or transforms one element per step. The cost is linear in the number of elements, and no auxiliary structure is required.',
    code: `for (let i = 0; i < array.length; i++) {
  visit(array[i])   // one read per index
}`,
    visualizer: 'array',
    controls: ['values'],
    defaults: { values: arrayDefaults },
    run: ({ values }) => traverse(values),
    time: 'O(n)',
    space: 'O(1)',
  },
  {
    slug: 'linear-search',
    title: 'Linear search',
    topic: 'arrays',
    blurb: 'Scan until the target appears, then stop early.',
    idea: 'Linear search compares the target with each element in order. It makes no assumption about ordering, so it works on any array. Best case is one comparison; worst and average cases are proportional to n when the value is missing or last.',
    code: `for (let i = 0; i < a.length; i++)
  if (a[i] === target) return i
return -1`,
    visualizer: 'array',
    controls: ['values', 'target'],
    defaults: { values: arrayDefaults, target: 42 },
    run: ({ values, target }) => linearSearch(values, target),
    time: 'O(n)',
    space: 'O(1)',
  },
  {
    slug: 'binary-search',
    title: 'Binary search',
    topic: 'arrays',
    blurb: 'Halve a sorted range with low, mid, and high pointers.',
    idea: 'Binary search compares the target with the middle element and discards one half of the remaining range. Each comparison halves the candidates, so n elements need about log₂(n) comparisons. The precondition — sorted input — is the part people forget.',
    code: `let low = 0, high = a.length - 1
while (low <= high) {
  const mid = Math.floor((low + high) / 2)
  if (a[mid] === target) return mid
  if (a[mid] < target) low = mid + 1
  else high = mid - 1
}
return -1`,
    visualizer: 'array',
    controls: ['values', 'target'],
    defaults: { values: seededArray(12, 4).sort((a, b) => a - b), target: 42 },
    run: ({ values, target }) => binarySearch(values, target),
    time: 'O(log n)',
    space: 'O(1)',
  },
  {
    slug: 'array-insert',
    title: 'Insert at index',
    topic: 'arrays',
    blurb: 'Shift the tail right, then write the new value into the gap.',
    idea: 'Contiguous storage means an insertion in the middle must move every later element one slot right. The shift is what costs O(n); writing the value itself is O(1). Inserting at the end skips the shift entirely.',
    code: `for (let i = n; i > index; i--)
  a[i] = a[i - 1]
a[index] = value
n++`,
    visualizer: 'array',
    controls: ['values', 'index', 'target'],
    defaults: { values: arrayDefaults, index: 3, target: 55 },
    run: ({ values, index, target }) => insertAt(values, index, target),
    time: 'O(n)',
    space: 'O(1)',
  },
  {
    slug: 'array-delete',
    title: 'Delete at index',
    topic: 'arrays',
    blurb: 'Remove the element and close the gap by shifting left.',
    idea: 'Deletion has the same shifting cost as insertion, in the opposite direction. The array length shrinks by one, and elements after the removed index move left. Deleting the last element is O(1).',
    code: `for (let i = index; i < n - 1; i++)
  a[i] = a[i + 1]
n--`,
    visualizer: 'array',
    controls: ['values', 'index'],
    defaults: { values: arrayDefaults, index: 2 },
    run: ({ values, index }) => deleteAt(values, index),
    time: 'O(n)',
    space: 'O(1)',
  },
  {
    slug: 'two-pointers',
    title: 'Two pointers',
    topic: 'arrays',
    blurb: 'Find a pair summing to a target by moving inward from both ends.',
    idea: 'On sorted data, the smallest element pairs with the largest. If that sum is too small, no partner for the left element can work, so advance the left pointer. If it is too large, move the right pointer. Each step removes one candidate, giving a single linear pass.',
    code: `let l = 0, r = a.length - 1
while (l < r) {
  const sum = a[l] + a[r]
  if (sum === target) return [l, r]
  if (sum < target) l++
  else r--
}`,
    visualizer: 'array',
    controls: ['values', 'target'],
    defaults: { values: [3, 8, 12, 15, 21, 27, 34], target: 39 },
    run: ({ values, target }) => twoPointers(values, target),
    time: 'O(n)',
    space: 'O(1)',
  },
  {
    slug: 'sliding-window',
    title: 'Sliding window',
    topic: 'arrays',
    blurb: 'Maintain a fixed-size window sum by subtracting the leaver and adding the entrant.',
    idea: 'Instead of recomputing a window sum from scratch, keep the running sum and update it by removing the element that leaves and adding the one that enters. The window slides once across the array, so the total work is linear rather than n·k.',
    code: `let sum = 0
for (let i = 0; i < k; i++) sum += a[i]
let best = sum
for (let i = k; i < a.length; i++) {
  sum += a[i] - a[i - k]
  best = Math.max(best, sum)
}`,
    visualizer: 'array',
    controls: ['values', 'k'],
    defaults: { values: [4, 2, 9, 7, 5, 11, 3, 8], k: 3 },
    run: ({ values, k }) => slidingWindow(values, k),
    time: 'O(n)',
    space: 'O(1)',
  },

  /* Sorting */
  {
    slug: 'bubble-sort',
    title: 'Bubble sort',
    topic: 'sorting',
    blurb: 'Swap adjacent out-of-order pairs until a pass makes no swaps.',
    idea: 'Each pass pushes the largest unsorted value to its final position by repeatedly swapping neighbours. A pass with zero swaps proves the array is sorted, which gives the best case of O(n) on already-sorted input.',
    code: `for (let pass = 0; pass < n - 1; pass++) {
  let swapped = false
  for (let i = 0; i < n - 1 - pass; i++)
    if (a[i] > a[i + 1]) {
      [a[i], a[i + 1]] = [a[i + 1], a[i]]
      swapped = true
    }
  if (!swapped) break
}`,
    visualizer: 'array',
    controls: ['values'],
    defaults: { values: [42, 17, 63, 8, 55, 31, 70, 24] },
    run: ({ values }) => bubbleSort(values),
    time: 'O(n²)',
    space: 'O(1)',
  },
  {
    slug: 'selection-sort',
    title: 'Selection sort',
    topic: 'sorting',
    blurb: 'Repeatedly select the minimum of the unsorted suffix and swap it into place.',
    idea: 'Selection sort separates the array into a sorted prefix and an unsorted suffix. Each pass scans the suffix for its minimum and swaps it to the boundary. Comparisons are always quadratic, but the number of swaps is at most n−1.',
    code: `for (let i = 0; i < n - 1; i++) {
  let min = i
  for (let j = i + 1; j < n; j++)
    if (a[j] < a[min]) min = j
  if (min !== i) [a[i], a[min]] = [a[min], a[i]]
}`,
    visualizer: 'array',
    controls: ['values'],
    defaults: { values: [29, 64, 12, 47, 33, 8, 51, 22] },
    run: ({ values }) => selectionSort(values),
    time: 'O(n²)',
    space: 'O(1)',
  },
  {
    slug: 'insertion-sort',
    title: 'Insertion sort',
    topic: 'sorting',
    blurb: 'Insert each new element into the sorted prefix by shifting larger values right.',
    idea: 'Insertion sort is how people sort cards: take the next element, shift larger elements right, and drop it into the gap. It is quadratic in general but linear when the input is nearly sorted, which is why hybrid sorts switch to it for small ranges.',
    code: `for (let i = 1; i < n; i++) {
  const key = a[i]
  let j = i - 1
  while (j >= 0 && a[j] > key) {
    a[j + 1] = a[j]
    j--
  }
  a[j + 1] = key
}`,
    visualizer: 'array',
    controls: ['values'],
    defaults: { values: [18, 9, 33, 26, 41, 7, 52, 30] },
    run: ({ values }) => insertionSort(values),
    time: 'O(n²)',
    space: 'O(1)',
  },
  {
    slug: 'merge-sort',
    title: 'Merge sort',
    topic: 'sorting',
    blurb: 'Split to single elements, then merge sorted runs with two cursors.',
    idea: 'Merge sort divides the array in half, sorts each half, and merges them by repeatedly taking the smaller head of the two runs. The recursion is log n deep and each level merges n elements, giving O(n log n) time and O(n) scratch space. It is stable.',
    code: `function sort(lo, hi) {
  if (lo >= hi) return
  const mid = (lo + hi) >> 1
  sort(lo, mid); sort(mid + 1, hi)
  merge(lo, mid, hi)
}`,
    visualizer: 'array',
    controls: ['values'],
    defaults: { values: [38, 12, 57, 24, 45, 6, 33, 50] },
    run: ({ values }) => mergeSort(values),
    time: 'O(n log n)',
    space: 'O(n)',
  },
  {
    slug: 'quick-sort',
    title: 'Quicksort',
    topic: 'sorting',
    blurb: 'Partition around a pivot, then recurse on the two sides.',
    idea: 'Quicksort picks a pivot, rearranges the range so smaller elements precede it, then recurses. Average time is O(n log n) with small constants; the worst case is quadratic when the pivot is consistently extreme, as with a last-element pivot on sorted input.',
    code: `function sort(lo, hi) {
  if (lo >= hi) return
  const p = partition(lo, hi)
  sort(lo, p - 1); sort(p + 1, hi)
}`,
    visualizer: 'array',
    controls: ['values'],
    defaults: { values: [44, 19, 62, 31, 8, 53, 27, 40] },
    run: ({ values }) => quickSort(values),
    time: 'O(n log n) avg',
    space: 'O(log n)',
  },

  /* Linked lists */
  {
    slug: 'list-traversal',
    title: 'List traversal',
    topic: 'linked-lists',
    blurb: 'Walk next pointers from the head to null.',
    idea: 'A linked list has no index arithmetic. Traversal keeps a single cursor and follows next until it reaches null, which is O(n) with O(1) extra space. You cannot jump to the middle without walking there first.',
    code: `let node = head
while (node !== null) {
  visit(node.value)
  node = node.next
}`,
    visualizer: 'list',
    controls: ['values'],
    defaults: { values: [12, 27, 41, 58, 63] },
    run: ({ values }) => listTraverse(values),
    time: 'O(n)',
    space: 'O(1)',
  },
  {
    slug: 'list-insert',
    title: 'List insertion',
    topic: 'linked-lists',
    blurb: 'Find the predecessor, then splice a new node into the chain.',
    idea: 'Insertion itself is constant time, but finding the node before the insertion point costs O(k) pointer hops. At the head there is no predecessor, which is why head insertion is a special case that only rewires one pointer.',
    code: `const node = new Node(value)
node.next = prev.next
prev.next = node`,
    visualizer: 'list',
    controls: ['values', 'index', 'target'],
    defaults: { values: [12, 27, 41, 58, 63], index: 2, target: 34 },
    run: ({ values, index, target }) => listInsert(values, index, target),
    time: 'O(n)',
    space: 'O(1)',
  },
  {
    slug: 'list-delete',
    title: 'List deletion',
    topic: 'linked-lists',
    blurb: 'Unlink a node by pointing its predecessor past it.',
    idea: 'Deleting a node requires a reference to its predecessor so the chain can skip it. With only the node itself, you would need to copy the next value backwards. Deleting the head updates the head reference instead.',
    code: `prev.next = target.next
target.next = null`,
    visualizer: 'list',
    controls: ['values', 'index'],
    defaults: { values: [12, 27, 41, 58, 63], index: 2 },
    run: ({ values, index }) => listDelete(values, index),
    time: 'O(n)',
    space: 'O(1)',
  },
  {
    slug: 'list-reverse',
    title: 'List reversal',
    topic: 'linked-lists',
    blurb: 'Reverse next pointers in place with prev, curr, and next.',
    idea: 'Reversal walks the list once, flipping each next pointer to face backwards. Three references are enough: prev (already reversed), curr (being flipped), and next (saved before the flip). The old tail becomes the new head.',
    code: `let prev = null, curr = head
while (curr) {
  const next = curr.next
  curr.next = prev
  prev = curr
  curr = next
}
return prev`,
    visualizer: 'list',
    controls: ['values'],
    defaults: { values: [12, 27, 41, 58, 63] },
    run: ({ values }) => listReverse(values),
    time: 'O(n)',
    space: 'O(1)',
  },

  /* Stacks & queues */
  {
    slug: 'stack-operations',
    title: 'Stack operations',
    topic: 'stacks-queues',
    blurb: 'Push, pop, and peek at the top of a LIFO structure.',
    idea: 'A stack only allows access at one end. Push adds to the top, pop removes and returns the top, and peek reads it without removing. All three are O(1) with an array or a linked head, and pop/peek on an empty stack is underflow that must be handled.',
    code: `stack.push(x)
const top = stack.peek()
const value = stack.pop()`,
    visualizer: 'linear',
    controls: ['values'],
    defaults: { values: [14, 28, 33] },
    run: ({ values }) => {
      const ops: LinearOp[] = [
        { op: 'peek' },
        { op: 'push', value: 47 },
        { op: 'pop' },
        { op: 'push', value: 51 },
        { op: 'pop' },
        { op: 'pop' },
      ]
      return stackTrace(values, ops)
    },
    time: 'O(1) per op',
    space: 'O(n)',
  },
  {
    slug: 'queue-operations',
    title: 'Queue operations',
    topic: 'stacks-queues',
    blurb: 'Enqueue at the back and dequeue from the front, first in first out.',
    idea: 'A queue preserves arrival order. Enqueue appends at the back and dequeue removes from the front; peeking shows the next item without removing it. A naive array shift is O(n), so real implementations use a ring buffer or two stacks.',
    code: `queue.enqueue(x)
const front = queue.peek()
const value = queue.dequeue()`,
    visualizer: 'linear',
    controls: ['values'],
    defaults: { values: [21, 35, 49] },
    run: ({ values }) => {
      const ops: LinearOp[] = [
        { op: 'enqueue', value: 62 },
        { op: 'peek' },
        { op: 'dequeue' },
        { op: 'enqueue', value: 74 },
        { op: 'dequeue' },
        { op: 'dequeue' },
      ]
      return queueTrace(values, ops)
    },
    time: 'O(1) amortised',
    space: 'O(n)',
  },

  /* Trees */
  {
    slug: 'bst-search',
    title: 'BST search',
    topic: 'trees',
    blurb: 'Follow one root-to-leaf path using the ordering invariant.',
    idea: 'At each node, compare the target with the node value. Smaller goes left, larger goes right, equal is a hit. Only one path is explored, so the cost is the height of the tree: logarithmic when balanced, linear in the worst case.',
    code: `let node = root
while (node) {
  if (key === node.value) return node
  node = key < node.value ? node.left : node.right
}
return null`,
    visualizer: 'tree',
    controls: ['values', 'target'],
    defaults: { values: [50, 30, 70, 20, 40, 60, 80, 35, 65], target: 65 },
    run: ({ values, target }) => bstSearch(values, target),
    time: 'O(h)',
    space: 'O(1)',
  },
  {
    slug: 'bst-insert',
    title: 'BST insertion',
    topic: 'trees',
    blurb: 'Search for the empty child slot and attach a new leaf.',
    idea: 'Insertion follows exactly the path a search would take, then links a new leaf where the search fell off. The tree shape depends on insertion order: sorted input produces a chain, while mixed input stays bushy.',
    code: `if (!root) return new Node(value)
let node = root
while (true) {
  if (value < node.value) {
    if (!node.left) { node.left = new Node(value); return }
    node = node.left
  } else {
    if (!node.right) { node.right = new Node(value); return }
    node = node.right
  }
}`,
    visualizer: 'tree',
    controls: ['values', 'target'],
    defaults: { values: [50, 30, 70, 20, 40, 60, 80], target: 45 },
    run: ({ values, target }) => bstInsert(values, target),
    time: 'O(h)',
    space: 'O(1)',
  },
  {
    slug: 'bst-delete',
    title: 'BST deletion',
    topic: 'trees',
    blurb: 'Handle the leaf, one-child, and two-child cases.',
    idea: 'Deletion has three cases. A leaf is simply detached. A node with one child is replaced by that child. A node with two children is overwritten with its in-order successor (the smallest value in the right subtree), and the successor node is removed instead.',
    code: `if (!node.left) return node.right
if (!node.right) return node.left
let succ = node.right
while (succ.left) succ = succ.left
node.value = succ.value
node.right = delete(node.right, succ.value)
return node`,
    visualizer: 'tree',
    controls: ['values', 'target'],
    defaults: { values: [50, 30, 70, 20, 40, 60, 80, 35, 65], target: 30 },
    run: ({ values, target }) => bstDelete(values, target),
    time: 'O(h)',
    space: 'O(1)',
  },
  ...(
    [
      ['inorder', 'In-order traversal', 'Left, node, right — sorted output for a BST.'],
      ['preorder', 'Pre-order traversal', 'Node, left, right — useful for copying a tree.'],
      ['postorder', 'Post-order traversal', 'Left, right, node — children before parents.'],
      ['levelorder', 'Level-order traversal', 'Breadth-first with a queue, one level at a time.'],
    ] as const
  ).map<AlgorithmMeta>(([order, title, blurb]) => ({
    slug: order,
    title,
    topic: 'trees',
    blurb,
    idea:
      order === 'inorder'
        ? 'In-order traversal visits the left subtree, then the node, then the right subtree. On a BST this produces values in ascending order, which is why it doubles as a validity check.'
        : order === 'preorder'
          ? 'Pre-order visits the node before its children. Serialising a tree with pre-order plus null markers lets you rebuild its exact shape.'
          : order === 'postorder'
            ? 'Post-order visits both children before the node. It is the natural order for deleting a tree or evaluating an expression tree, because children are finished before the parent.'
            : 'Level-order uses a queue: enqueue the root, then repeatedly dequeue a node and enqueue its children. Memory is bounded by the widest level rather than the height.',
    code:
      order === 'inorder'
        ? `function walk(node) {
  if (!node) return
  walk(node.left)
  visit(node)
  walk(node.right)
}`
        : order === 'preorder'
          ? `function walk(node) {
  if (!node) return
  visit(node)
  walk(node.left)
  walk(node.right)
}`
          : order === 'postorder'
            ? `function walk(node) {
  if (!node) return
  walk(node.left)
  walk(node.right)
  visit(node)
}`
            : `const queue = [root]
while (queue.length) {
  const node = queue.shift()
  visit(node)
  if (node.left) queue.push(node.left)
  if (node.right) queue.push(node.right)
}`,
    visualizer: 'tree',
    controls: ['values'],
    defaults: { values: [50, 30, 70, 20, 40, 60, 80] },
    run: ({ values }) => bstTraversal(values, order),
    time: 'O(n)',
    space: order === 'levelorder' ? 'O(w)' : 'O(h)',
  })),

  /* Heaps */
  {
    slug: 'build-max-heap',
    title: 'Build a max-heap',
    topic: 'heaps',
    blurb: 'Sift down from the last internal node to the root.',
    idea: 'Leaves already satisfy the heap property, so building only needs to fix internal nodes, from the last one back to the root. Counter-intuitively this is O(n), not O(n log n), because most nodes sit near the bottom where sift-down is short.',
    code: `for (let i = (n >> 1) - 1; i >= 0; i--)
  siftDown(i)
// parent ≥ children everywhere`,
    visualizer: 'heap',
    controls: ['values'],
    defaults: { values: [23, 71, 12, 45, 88, 34, 59, 7] },
    run: ({ values }) => buildMaxHeap(values),
    time: 'O(n)',
    space: 'O(1)',
  },
  {
    slug: 'extract-max',
    title: 'Extract the maximum',
    topic: 'heaps',
    blurb: 'Remove the root, move the last leaf up, and sift it down.',
    idea: 'The maximum always lives at index 0. Removing it leaves a hole at the root, which is filled with the last leaf. That leaf is probably too small, so it sifts down along the larger child until the heap property is restored — at most one path of length log n.',
    code: `const max = heap[0]
heap[0] = heap.pop()
siftDown(0)
return max`,
    visualizer: 'heap',
    controls: ['values'],
    defaults: { values: [88, 71, 59, 45, 23, 34, 12, 7] },
    run: ({ values }) => {
      const heap = [...values].sort((a, b) => b - a)
      return extractMax(heap)
    },
    time: 'O(log n)',
    space: 'O(1)',
  },

  /* Graphs */
  {
    slug: 'bfs',
    title: 'Breadth-first search',
    topic: 'graphs',
    blurb: 'Explore in rings with a queue and a visited set.',
    idea: 'BFS starts at a source, marks it, and enqueues its unvisited neighbours. Because the queue is FIFO, nodes are visited in non-decreasing distance from the source — which is why BFS finds shortest paths on unweighted graphs. Each vertex enters the queue at most once.',
    code: `const seen = new Set([start])
const queue = [start]
while (queue.length) {
  const node = queue.shift()
  visit(node)
  for (const next of adj[node])
    if (!seen.has(next)) { seen.add(next); queue.push(next) }
}`,
    visualizer: 'graph',
    controls: ['graph'],
    defaults: { graphId: 'sample', start: 'A' },
    run: ({ graphId, start }) => bfs(graphDatasets[graphId]?.data ?? graphDatasets.sample!.data, start),
    time: 'O(V + E)',
    space: 'O(V)',
  },
  {
    slug: 'dfs',
    title: 'Depth-first search',
    topic: 'graphs',
    blurb: 'Dive along one branch, then backtrack.',
    idea: 'DFS follows one neighbour as far as possible before returning. The call stack (or an explicit stack) defines the current path, and the visited set prevents revisiting. It is the basis for cycle detection, topological sorting, and connected components.',
    code: `function dfs(node, seen) {
  seen.add(node); visit(node)
  for (const next of adj[node])
    if (!seen.has(next)) dfs(next, seen)
}`,
    visualizer: 'graph',
    controls: ['graph'],
    defaults: { graphId: 'sample', start: 'A' },
    run: ({ graphId, start }) => dfs(graphDatasets[graphId]?.data ?? graphDatasets.sample!.data, start),
    time: 'O(V + E)',
    space: 'O(V)',
  },

  /* Recursion */
  {
    slug: 'n-queens',
    title: 'N-Queens',
    topic: 'recursion',
    blurb: 'Place one queen per row while pruning attacked columns.',
    idea: 'The recursion depth is the row being filled, so rows never conflict by construction. At each row you try every column, reject columns and diagonals already occupied, place, and recurse. When a row has no safe column, the previous placement is undone — that is the backtrack.',
    code: `function solve(row) {
  if (row === n) return record()
  for (let col = 0; col < n; col++) {
    if (!isSafe(row, col)) continue
    board[row] = col
    solve(row + 1)
    board[row] = -1   // backtrack
  }
}`,
    visualizer: 'board',
    controls: ['size'],
    defaults: { size: 6 },
    run: ({ size }) => nQueens(Math.max(4, Math.min(8, size))),
    time: 'O(n!) worst',
    space: 'O(n)',
  },
]

export const algorithmBySlug = new Map(algorithms.map((algorithm) => [algorithm.slug, algorithm]))
export const topicBySlug = new Map(topics.map((topic) => [topic.slug, topic]))

export function algorithmsForTopic(topicSlug: string): AlgorithmMeta[] {
  const topic = topicBySlug.get(topicSlug)
  if (!topic) return []
  return topic.algorithmSlugs
    .map((slug) => algorithmBySlug.get(slug))
    .filter((value): value is AlgorithmMeta => Boolean(value))
}

export function defaultParams(algorithm: AlgorithmMeta): AlgorithmParams {
  return {
    values: seededArray(8, 11),
    target: 40,
    index: 2,
    k: 3,
    size: 6,
    order: 'inorder',
    graphId: 'sample',
    start: 'A',
    ...algorithm.defaults,
  }
}
