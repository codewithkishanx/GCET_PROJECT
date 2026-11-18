/**
 * Seeds demo learning content.
 *
 * All seeded challenges are clearly marked as demo content in the README.
 * Points, verdicts and leaderboard values are never seeded.
 *
 * Run: npm run seed
 */
import { loadEnv, connectMongo, disconnectMongo, TopicModel, ChallengeModel } from "@dsa/shared";
import { loadConfig } from "../config/env";
import { createLogger } from "@dsa/shared";

const logger = createLogger("seed");

interface TopicSeed {
  slug: string;
  title: string;
  summary: string;
  order: number;
  algorithms: Array<{ slug: string; title: string; description: string; time: string; space: string }>;
  contentMarkdown: string;
}

const topics: TopicSeed[] = [
  {
    slug: "arrays",
    title: "Arrays",
    summary: "Contiguous storage, index arithmetic, two pointers and sliding windows.",
    order: 1,
    algorithms: [
      {
        slug: "traversal",
        title: "Traversal",
        description: "Visit every element once and build a running result.",
        time: "O(n)",
        space: "O(1)",
      },
      {
        slug: "two-pointers",
        title: "Two pointers",
        description: "Move two indices toward each other to avoid nested loops.",
        time: "O(n)",
        space: "O(1)",
      },
      {
        slug: "sliding-window",
        title: "Sliding window",
        description: "Maintain a window sum or count while expanding and shrinking.",
        time: "O(n)",
        space: "O(1)",
      },
      {
        slug: "bubble-sort",
        title: "Bubble sort",
        description: "Repeatedly swap adjacent out-of-order pairs.",
        time: "O(n^2)",
        space: "O(1)",
      },
    ],
    contentMarkdown: `## Arrays

An array stores elements in contiguous memory, so reading \`a[i]\` is a single
address computation.

### Core operations

| Operation | Cost |
| --- | --- |
| Access by index | O(1) |
| Search (unsorted) | O(n) |
| Insert at end | O(1) amortised |
| Insert/delete in the middle | O(n) |

### Edge cases

- empty array
- single element
- duplicate values
- integer overflow when summing
- index out of bounds (off-by-one)

### Debugging habits

1. Print the index and the value on every iteration.
2. Check the loop bound: \`i < n\` versus \`i <= n\`.
3. Confirm the returned value after the loop, not inside it.`,
  },
  {
    slug: "sorting",
    title: "Sorting",
    summary: "Comparison sorts, stability and the trade-offs between them.",
    order: 2,
    algorithms: [
      {
        slug: "bubble-sort",
        title: "Bubble sort",
        description: "Swap neighbours until no swaps remain.",
        time: "O(n^2)",
        space: "O(1)",
      },
      {
        slug: "selection-sort",
        title: "Selection sort",
        description: "Select the minimum of the unsorted suffix and place it.",
        time: "O(n^2)",
        space: "O(1)",
      },
      {
        slug: "insertion-sort",
        title: "Insertion sort",
        description: "Grow a sorted prefix by inserting each next element.",
        time: "O(n^2)",
        space: "O(1)",
      },
      {
        slug: "merge-sort",
        title: "Merge sort",
        description: "Divide, sort halves, merge with a temporary buffer.",
        time: "O(n log n)",
        space: "O(n)",
      },
      {
        slug: "quick-sort",
        title: "Quicksort",
        description: "Partition around a pivot and recurse on both sides.",
        time: "O(n log n) average, O(n^2) worst",
        space: "O(log n) average",
      },
    ],
    contentMarkdown: `## Sorting

Sorting is the classic debugging exercise: almost every bug is an off-by-one in
a loop bound or a comparison that should be \`<\` but is \`<=\`.

### Choosing an algorithm

- Nearly sorted input: insertion sort is fast and simple.
- Guaranteed worst case: merge sort or heapsort.
- In-place with good constants: quicksort with a random or median pivot.
- Stability required (equal keys keep order): merge sort or insertion sort.

### Common bugs

1. Inner loop starting at \`i\` instead of \`i + 1\`.
2. Forgetting to swap after finding a minimum.
3. Merge step dropping the remaining tail of one half.
4. Comparing the wrong indices after a swap.`,
  },
  {
    slug: "linked-lists",
    title: "Linked Lists",
    summary: "Nodes, pointers and the discipline of rewiring links safely.",
    order: 3,
    algorithms: [
      {
        slug: "traversal",
        title: "Traversal",
        description: "Walk next pointers until null.",
        time: "O(n)",
        space: "O(1)",
      },
      {
        slug: "reverse",
        title: "Reverse a list",
        description: "Flip each next pointer while tracking prev, curr and next.",
        time: "O(n)",
        space: "O(1)",
      },
      {
        slug: "delete-node",
        title: "Delete a node",
        description: "Find the predecessor and skip the target node.",
        time: "O(n)",
        space: "O(1)",
      },
    ],
    contentMarkdown: `## Linked lists

Each node holds a value and a reference to the next node. There is no index
arithmetic, so most operations scan from the head.

### Reverse in place

\`\`\`text
prev = null
curr = head
while curr:
    next = curr.next
    curr.next = prev
    prev = curr
    curr = next
return prev
\`\`\`

The temporary \`next\` is essential: without it the rest of the list is lost when
the pointer is overwritten.

### Edge cases

- empty list (\`head === null\`)
- one node
- deleting the head
- deleting the tail
- cycles (detect with fast/slow pointers)`,
  },
  {
    slug: "stacks-queues",
    title: "Stacks and Queues",
    summary: "LIFO and FIFO structures and the operations that reveal them.",
    order: 4,
    algorithms: [
      {
        slug: "stack",
        title: "Stack operations",
        description: "Push, pop and peek at the top of a LIFO structure.",
        time: "O(1) per operation",
        space: "O(n)",
      },
      {
        slug: "queue",
        title: "Queue operations",
        description: "Enqueue at the back and dequeue from the front.",
        time: "O(1) amortised",
        space: "O(n)",
      },
      {
        slug: "balanced-brackets",
        title: "Balanced brackets",
        description: "Push openers, match closers, verify the stack is empty.",
        time: "O(n)",
        space: "O(n)",
      },
    ],
    contentMarkdown: `## Stacks and queues

A stack removes the most recently added item; a queue removes the oldest.

### When they appear

- stacks: undo history, expression evaluation, DFS, bracket matching
- queues: BFS, task scheduling, rate limiting

### Debugging checkpoints

- Popping from an empty structure must be handled explicitly.
- A queue implemented with \`shift()\` on an array is O(n); prefer a ring buffer
  or a linked list for large inputs.
- After a bracket scan, the stack must be empty, not just never negative.`,
  },
  {
    slug: "trees",
    title: "Trees",
    summary: "Traversals, binary search trees and recursive structure.",
    order: 5,
    algorithms: [
      {
        slug: "inorder",
        title: "In-order traversal",
        description: "Left, node, right. Yields sorted values in a BST.",
        time: "O(n)",
        space: "O(h)",
      },
      {
        slug: "bfs",
        title: "Level-order traversal",
        description: "Visit nodes level by level with a queue.",
        time: "O(n)",
        space: "O(w)",
      },
      {
        slug: "bst-search",
        title: "BST search",
        description: "Compare and descend left or right.",
        time: "O(h)",
        space: "O(1)",
      },
    ],
    contentMarkdown: `## Trees

A tree is a connected acyclic graph with a designated root. Depth \`h\` matters:
balanced trees give \`h = log n\`, degenerate trees give \`h = n\`.

### Traversal orders

- pre-order: root, left, right
- in-order: left, root, right
- post-order: left, right, root
- level-order: breadth first with a queue

### BST invariant

For every node, all keys in the left subtree are smaller and all keys in the
right subtree are larger. Deletion has three cases: leaf, one child, two children
(replace with in-order successor).

### Edge cases

- empty tree
- duplicate keys (decide a policy)
- inserting into a degenerate chain`,
  },
  {
    slug: "heaps",
    title: "Heaps and Priority Queues",
    summary: "Array-backed binary heaps and their sift operations.",
    order: 6,
    algorithms: [
      {
        slug: "sift-up",
        title: "Sift up",
        description: "Restore heap order after inserting at the end.",
        time: "O(log n)",
        space: "O(1)",
      },
      {
        slug: "sift-down",
        title: "Sift down",
        description: "Restore heap order after replacing the root.",
        time: "O(log n)",
        space: "O(1)",
      },
    ],
    contentMarkdown: `## Heaps

A binary heap is a complete binary tree stored in an array:

\`\`\`text
parent(i) = (i - 1) / 2
left(i)   = 2i + 1
right(i)  = 2i + 2
\`\`\`

A min-heap keeps the smallest element at index 0. Inserting is sift-up;
extracting the minimum swaps the last element into the root and sifts down.

### Edge cases

- heap with one element
- duplicate keys
- sifting down with only a left child
- building a heap in O(n) with the bottom-up method`,
  },
  {
    slug: "hash-maps",
    title: "Hash Maps and Sets",
    summary: "Amortised O(1) lookup, collisions and iteration order.",
    order: 7,
    algorithms: [
      {
        slug: "lookup",
        title: "Insert and lookup",
        description: "Hash the key, resolve collisions, compare keys.",
        time: "O(1) average",
        space: "O(n)",
      },
      {
        slug: "frequency-count",
        title: "Frequency counting",
        description: "Accumulate counts in a map in a single pass.",
        time: "O(n)",
        space: "O(k)",
      },
    ],
    contentMarkdown: `## Hash maps and sets

A hash function maps a key to a bucket. Collisions are resolved by chaining or
open addressing.

### Guarantees

- average lookup, insert and delete are O(1)
- worst case is O(n) when everything collides
- iteration order is not sorted and is not a contract (except insertion order in
  some languages)

### Edge cases

- mutable keys (mutating a key after insertion makes it unreachable)
- numeric keys arriving as strings from input
- large key spaces and memory pressure`,
  },
  {
    slug: "graphs",
    title: "Graphs",
    summary: "Representations, BFS, DFS and weighted shortest paths.",
    order: 8,
    algorithms: [
      {
        slug: "bfs",
        title: "Breadth-first search",
        description: "Explore level by level with a queue; finds shortest unweighted paths.",
        time: "O(V + E)",
        space: "O(V)",
      },
      {
        slug: "dfs",
        title: "Depth-first search",
        description: "Explore as deep as possible before backtracking.",
        time: "O(V + E)",
        space: "O(V)",
      },
      {
        slug: "dijkstra",
        title: "Dijkstra",
        description: "Greedy relaxation with a priority queue for non-negative weights.",
        time: "O((V + E) log V)",
        space: "O(V)",
      },
    ],
    contentMarkdown: `## Graphs

Represent a graph as an adjacency list unless the graph is dense.

### Traversal skeleton

\`\`\`text
queue = [start]
visited = {start}
while queue:
    node = queue.pop_front()
    for neighbour in adj[node]:
        if neighbour not in visited:
            visited.add(neighbour)
            queue.push_back(neighbour)
\`\`\`

Forgetting the \`visited\` set is the most common bug: it turns a traversal into
an infinite loop on any cycle.

### Edge cases

- disconnected components
- self loops
- parallel edges
- negative weights (Dijkstra is invalid; use Bellman-Ford)
- recursion depth on large graphs`,
  },
  {
    slug: "recursion-backtracking",
    title: "Recursion and Backtracking",
    summary: "Base cases, call stacks and systematic search.",
    order: 9,
    algorithms: [
      {
        slug: "factorial",
        title: "Factorial",
        description: "Two-line recursion with a base case.",
        time: "O(n)",
        space: "O(n) stack",
      },
      {
        slug: "subsets",
        title: "Generate subsets",
        description: "Choose or skip each element, undo the choice on the way back.",
        time: "O(2^n)",
        space: "O(n)",
      },
    ],
    contentMarkdown: `## Recursion and backtracking

Every recursive function needs a base case and a smaller subproblem. If either is
wrong, the stack overflows.

### Backtracking template

\`\`\`text
def backtrack(state):
    if complete(state):
        record(state)
        return
    for choice in choices(state):
        apply(choice)
        backtrack(state)
        undo(choice)
\`\`\`

The undo step is what makes the search correct. Forgetting it leaks state between
branches, which produces duplicated or impossible results.

### Edge cases

- missing base case (infinite recursion)
- base case that is never reached
- shared mutable state between branches
- exponential output sizes`,
  },
];

const challenges = [
  {
    slug: "array-sum-off-by-one",
    title: "Fix the array sum",
    topic: "arrays",
    difficulty: "easy" as const,
    points: 50,
    description: `You are given an integer \`n\` followed by \`n\` integers. Return their sum.

The starter code compiles and runs but returns the wrong answer: it ignores the
last element. Find the boundary bug and fix it.

### Input

\`\`\`text
n
a1 a2 ... an
\`\`\`

### Output

A single integer: the sum of all \`n\` numbers.`,
    constraints: ["1 <= n <= 100000", "-10^9 <= ai <= 10^9", "The sum fits in a 64-bit integer"],
    examples: [
      { input: "5\n1 2 3 4 5\n", output: "15\n", explanation: "1+2+3+4+5 = 15" },
      { input: "1\n42\n", output: "42\n", explanation: "Single element" },
    ],
    starterCode: {
      python: `import sys

def main() -> None:
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    numbers = [int(value) for value in data[1:1 + n]]

    total = 0
    # BUG: this loop never visits the last element.
    for index in range(n - 1):
        total += numbers[index]

    print(total)

if __name__ == "__main__":
    main()
`,
      javascript: `const fs = require("node:fs");

const tokens = fs.readFileSync(0, "utf8").trim().split(/\\s+/).filter(Boolean);
if (tokens.length > 0) {
  const n = Number(tokens[0]);
  const numbers = tokens.slice(1, 1 + n).map(Number);

  let total = 0;
  // BUG: this loop never visits the last element.
  for (let index = 0; index < n - 1; index += 1) {
    total += numbers[index];
  }

  console.log(total);
}
`,
      cpp: `#include <iostream>
#include <vector>

int main() {
    int n = 0;
    if (!(std::cin >> n)) return 0;

    std::vector<long long> numbers(n);
    for (int i = 0; i < n; ++i) std::cin >> numbers[i];

    long long total = 0;
    // BUG: this loop never visits the last element.
    for (int i = 0; i < n - 1; ++i) total += numbers[i];

    std::cout << total << "\\n";
    return 0;
}
`,
    },
    hiddenTests: [
      { name: "single", stdin: "1\n42\n", expectedStdout: "42\n" },
      { name: "five", stdin: "5\n1 2 3 4 5\n", expectedStdout: "15\n" },
      { name: "negatives", stdin: "4\n-1 -2 3 4\n", expectedStdout: "4\n" },
      { name: "large", stdin: "3\n1000000000 1000000000 1000000000\n", expectedStdout: "3000000000\n" },
    ],
    referenceSolutions: {
      python: `import sys

def main() -> None:
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    numbers = [int(value) for value in data[1:1 + n]]
    print(sum(numbers))

if __name__ == "__main__":
    main()
`,
    },
  },
  {
    slug: "bubble-sort-bound",
    title: "Repair bubble sort",
    topic: "sorting",
    difficulty: "easy" as const,
    points: 75,
    description: `Read \`n\` followed by \`n\` integers and print them sorted in ascending order on one line, separated by single spaces.

The starter implementation is a bubble sort with a broken inner loop bound, so
the largest element never reaches the end of the array.

### Input

\`\`\`text
n
a1 a2 ... an
\`\`\`

### Output

The sorted numbers separated by single spaces, followed by a newline.`,
    constraints: ["1 <= n <= 5000", "-10^9 <= ai <= 10^9"],
    examples: [
      { input: "5\n5 1 4 2 3\n", output: "1 2 3 4 5\n", explanation: "Ascending order" },
      { input: "3\n2 2 1\n", output: "1 2 2\n", explanation: "Duplicates are kept" },
    ],
    starterCode: {
      python: `import sys

def main() -> None:
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    values = [int(value) for value in data[1:1 + n]]

    for i in range(n):
        # BUG: the last element of the unsorted range is never compared.
        for j in range(n - i - 2):
            if values[j] > values[j + 1]:
                values[j], values[j + 1] = values[j + 1], values[j]

    print(" ".join(str(value) for value in values))

if __name__ == "__main__":
    main()
`,
      javascript: `const fs = require("node:fs");

const tokens = fs.readFileSync(0, "utf8").trim().split(/\\s+/).filter(Boolean);
if (tokens.length > 0) {
  const n = Number(tokens[0]);
  const values = tokens.slice(1, 1 + n).map(Number);

  for (let i = 0; i < n; i += 1) {
    // BUG: the last element of the unsorted range is never compared.
    for (let j = 0; j < n - i - 2; j += 1) {
      if (values[j] > values[j + 1]) {
        const temp = values[j];
        values[j] = values[j + 1];
        values[j + 1] = temp;
      }
    }
  }

  console.log(values.join(" "));
}
`,
      cpp: `#include <iostream>
#include <vector>

int main() {
    int n = 0;
    if (!(std::cin >> n)) return 0;

    std::vector<long long> values(n);
    for (int i = 0; i < n; ++i) std::cin >> values[i];

    for (int i = 0; i < n; ++i) {
        // BUG: the last element of the unsorted range is never compared.
        for (int j = 0; j < n - i - 2; ++j) {
            if (values[j] > values[j + 1]) std::swap(values[j], values[j + 1]);
        }
    }

    for (int i = 0; i < n; ++i) {
        if (i > 0) std::cout << ' ';
        std::cout << values[i];
    }
    std::cout << "\\n";
    return 0;
}
`,
    },
    hiddenTests: [
      { name: "example", stdin: "5\n5 1 4 2 3\n", expectedStdout: "1 2 3 4 5\n" },
      { name: "already sorted", stdin: "4\n1 2 3 4\n", expectedStdout: "1 2 3 4\n" },
      { name: "reverse", stdin: "4\n4 3 2 1\n", expectedStdout: "1 2 3 4\n" },
      { name: "duplicates", stdin: "3\n2 2 1\n", expectedStdout: "1 2 2\n" },
      { name: "two elements", stdin: "2\n9 3\n", expectedStdout: "3 9\n" },
    ],
    referenceSolutions: {
      python: `import sys

def main() -> None:
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    values = sorted(int(value) for value in data[1:1 + n])
    print(" ".join(str(value) for value in values))

if __name__ == "__main__":
    main()
`,
    },
  },
  {
    slug: "two-sum-indices",
    title: "Two sum indices",
    topic: "arrays",
    difficulty: "medium" as const,
    points: 100,
    description: `Read \`n\`, a target, then \`n\` integers. Print the two 0-based indices
\`i j\` (\`i < j\`) that add up to the target, or \`-1\` if no such pair exists.

If several pairs exist, print the pair found first when scanning left-to-right (i.e. with the smallest second index).

The starter code uses a hash map but stores the current index before looking up
the complement, which makes it match the same element twice.

### Input

\`\`\`text
n target
a1 a2 ... an
\`\`\`

### Output

\`i j\` or \`-1\`.`,
    constraints: [
      "2 <= n <= 100000",
      "-10^9 <= ai, target <= 10^9",
      "Exactly one answer is printed, or -1",
    ],
    examples: [
      { input: "4 9\n2 7 11 15\n", output: "0 1\n", explanation: "2 + 7 = 9" },
      { input: "3 10\n1 2 3\n", output: "-1\n", explanation: "No pair sums to 10" },
    ],
    starterCode: {
      python: `import sys

def main() -> None:
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    target = int(data[1])
    values = [int(value) for value in data[2:2 + n]]

    seen = {}
    for index, value in enumerate(values):
        # BUG: the current index is stored before looking up the complement,
        # so the same element can be used twice.
        seen[value] = index
        complement = target - value
        if complement in seen:
            first = min(seen[complement], index)
            second = max(seen[complement], index)
            print(first, second)
            return

    print(-1)

if __name__ == "__main__":
    main()
`,
      javascript: `const fs = require("node:fs");

const tokens = fs.readFileSync(0, "utf8").trim().split(/\\s+/).filter(Boolean);
if (tokens.length > 0) {
  const n = Number(tokens[0]);
  const target = Number(tokens[1]);
  const values = tokens.slice(2, 2 + n).map(Number);

  const seen = new Map();
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    // BUG: the current index is stored before looking up the complement,
    // so the same element can be used twice.
    seen.set(value, index);
    const complement = target - value;
    if (seen.has(complement)) {
      const other = seen.get(complement);
      console.log(Math.min(other, index), Math.max(other, index));
      process.exit(0);
    }
  }

  console.log(-1);
}
`,
      cpp: `#include <iostream>
#include <unordered_map>
#include <vector>
#include <algorithm>

int main() {
    int n = 0;
    long long target = 0;
    if (!(std::cin >> n >> target)) return 0;

    std::vector<long long> values(n);
    for (int i = 0; i < n; ++i) std::cin >> values[i];

    std::unordered_map<long long, int> seen;
    for (int index = 0; index < n; ++index) {
        long long value = values[index];
        // BUG: the current index is stored before looking up the complement,
        // so the same element can be used twice.
        seen[value] = index;
        long long complement = target - value;
        auto it = seen.find(complement);
        if (it != seen.end()) {
            std::cout << std::min(it->second, index) << ' ' << std::max(it->second, index) << "\\n";
            return 0;
        }
    }

    std::cout << -1 << "\\n";
    return 0;
}
`,
    },
    hiddenTests: [
      { name: "example", stdin: "4 9\n2 7 11 15\n", expectedStdout: "0 1\n" },
      { name: "no pair", stdin: "3 10\n1 2 3\n", expectedStdout: "-1\n" },
      { name: "duplicates", stdin: "2 4\n2 2\n", expectedStdout: "0 1\n" },
      { name: "later pair", stdin: "5 5\n1 5 3 2 4\n", expectedStdout: "2 3\n" },
      { name: "half", stdin: "2 6\n3 3\n", expectedStdout: "0 1\n" },
    ],
    referenceSolutions: {
      python: `import sys

def main() -> None:
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    target = int(data[1])
    values = [int(value) for value in data[2:2 + n]]

    seen = {}
    for index, value in enumerate(values):
        complement = target - value
        if complement in seen:
            print(seen[complement], index)
            return
        seen[value] = index

    print(-1)

if __name__ == "__main__":
    main()
`,
    },
  },
];

async function main(): Promise<void> {
  loadEnv();
  const config = loadConfig();
  await connectMongo(config.mongoUri);
  logger.info("connected to MongoDB");

  for (const topic of topics) {
    await TopicModel.findOneAndUpdate(
      { slug: topic.slug },
      {
        $set: {
          title: topic.title,
          summary: topic.summary,
          order: topic.order,
          status: "published",
          contentMarkdown: topic.contentMarkdown,
          algorithms: topic.algorithms.map((algorithm) => ({
            slug: algorithm.slug,
            title: algorithm.title,
            description: algorithm.description,
            complexity: { time: algorithm.time, space: algorithm.space },
          })),
        },
      },
      { upsert: true },
    );
  }
  logger.info({ count: topics.length }, "topics seeded");

  for (const challenge of challenges) {
    await ChallengeModel.findOneAndUpdate(
      { slug: challenge.slug },
      {
        $set: {
          title: challenge.title,
          description: challenge.description,
          topic: challenge.topic,
          difficulty: challenge.difficulty,
          constraints: challenge.constraints,
          examples: challenge.examples.map((example) => ({
            input: example.input,
            output: example.output,
            explanation: example.explanation ?? null,
          })),
          starterCode: new Map(Object.entries(challenge.starterCode)),
          supportedLanguages: Object.keys(challenge.starterCode),
          hiddenTests: challenge.hiddenTests,
          referenceSolutions: new Map(Object.entries(challenge.referenceSolutions)),
          timeLimitMs: 2_000,
          memoryLimitMb: 128,
          outputLimitBytes: 64_000,
          points: challenge.points,
          rewardPolicyVersion: 1,
          status: "published",
        },
      },
      { upsert: true },
    );
  }
  logger.info({ count: challenges.length }, "demo challenges seeded");

  await disconnectMongo();
  logger.info("seed complete");
}

main().catch((error) => {
  logger.error({ err: error }, "seed failed");
  process.exit(1);
});
