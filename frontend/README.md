# DSA Arcade — Frontend

The browser client for **DSA Arcade — Learn & Debug**: interactive algorithm
visualisers, a coding-challenge judge UI, leaderboards, a community forum, and an
admin console.

This package is the **frontend only**. It talks to the API over HTTP and ships
without a mock server or fixture data — if the API is not running, API-backed
screens say so instead of inventing content.

- React 19 + TypeScript
- Vite 8
- React Router 7
- TanStack Query 5
- Tailwind CSS 4
- Monaco Editor (bundled locally)
- Zod + React Hook Form
- Vitest + Testing Library

## Requirements

- Node.js 20.19+ (developed on Node 24)
- npm 10+

## Getting started

```bash
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm run dev
```

The dev server runs at <http://localhost:5173>.

| Script              | What it does                                    |
| ------------------- | ----------------------------------------------- |
| `npm run dev`       | Vite dev server with HMR                        |
| `npm run build`     | Type-check (`tsc -b`) then build to `dist/`     |
| `npm run preview`   | Serve the production build locally              |
| `npm run typecheck` | Type-check only                                 |
| `npm run lint`      | Oxlint                                          |
| `npm test`          | Run the Vitest suite once                       |
| `npm run test:watch`| Run tests in watch mode                         |

## Configuration

A single environment variable is read at build time:

| Variable            | Default                          | Purpose                      |
| ------------------- | -------------------------------- | ---------------------------- |
| `VITE_API_BASE_URL` | `http://localhost:4000/api/v1`   | Base URL of the backend API  |

Copy `.env.example` to `.env` and change it if your API lives elsewhere. Trailing
slashes are stripped automatically.

Authentication is **cookie-based**: every request is sent with
`credentials: 'include'`, so the API and the frontend must be same-origin or the
API must be configured with CORS credentials for the frontend origin.

## What works without a backend

| Area                                         | Needs API? |
| -------------------------------------------- | ---------- |
| DSA topic/algorithm pages and visualisers    | No         |
| Playground (`/playground`) demo runner       | No         |
| Theme toggle, navigation, 404/403 pages      | No         |
| Challenge list/detail, submissions, judging  | Yes        |
| Login, register, profile, dashboard          | Yes        |
| Leaderboard, community, public profiles      | Yes        |
| Admin console                                | Yes        |

When the API is unreachable the app shows an "API unreachable" banner in the
header and renders explicit error states in each screen. It never falls back to
seed data, and it never shows fake numbers.

## API contract

All paths below are relative to `VITE_API_BASE_URL`. List endpoints return the
paginated envelope:

```ts
interface Paginated<T> {
  items: T[]
  nextCursor: string | null
}
```

Requests use `cursor` + `limit` query parameters; responses use `nextCursor`.

### Auth and users

| Method  | Path                              | Notes                                    |
| ------- | --------------------------------- | ---------------------------------------- |
| `GET`   | `/auth/me`                        | Current session; 401 when anonymous      |
| `POST`  | `/auth/login`                     | `{ email, password }` → `{ user }`       |
| `POST`  | `/auth/register`                  | `{ username, email, password }`          |
| `POST`  | `/auth/logout`                    | Clears the session cookie                |
| `PATCH` | `/users/me`                       | Profile update                           |
| `GET`   | `/users/:username`                | Public profile                           |
| `GET`   | `/users/:username/stats`          | Per-user solve/points stats              |

### Challenges and submissions

| Method | Path                                    | Notes                                                   |
| ------ | --------------------------------------- | ------------------------------------------------------- |
| `GET`  | `/challenges`                           | `topic`, `difficulty`, `language`, `search`, `cursor`, `limit` |
| `GET`  | `/challenges/:slug`                     | Detail; hidden tests and reference solutions must not be included |
| `POST` | `/challenges/:challengeId/submissions`  | `{ language, sourceCode }` → queued submission          |
| `GET`  | `/submissions/:id`                      | Poll target for verdict + per-test results              |
| `GET`  | `/users/me/submissions`                 | `cursor`, `limit`, optional `challengeId`               |

A submission moves through `queued → running → finished`. The detail page polls
`/submissions/:id` until it reaches a terminal state.

### Leaderboard

| Method | Path           | Notes                                       |
| ------ | -------------- | ------------------------------------------- |
| `GET`  | `/leaderboard` | Paginated entries with rank, points, solves |

### Community

| Method   | Path                       | Notes                                     |
| -------- | -------------------------- | ----------------------------------------- |
| `GET`    | `/posts`                   | `tag`, `author`, `search`, `status`, `cursor`, `limit` |
| `GET`    | `/posts/:slug`             | Post detail with body + engagement counts |
| `POST`   | `/posts`                   | Create                                    |
| `PATCH`  | `/posts/:id`               | Update (author or admin)                  |
| `DELETE` | `/posts/:id`               | Delete                                    |
| `POST`   | `/posts/:id/likes`         | Like; returns `{ likeCount, likedByMe }`  |
| `DELETE` | `/posts/:id/likes`         | Unlike                                    |
| `GET`    | `/posts/:postId/comments`  | Paginated comments                        |
| `POST`   | `/posts/:postId/comments`  | `{ body }`                                |
| `POST`   | `/reports`                 | `{ targetType, targetId, reason, details? }` |

### Admin (requires `role: admin`)

| Method  | Path                              | Notes                              |
| ------- | --------------------------------- | ---------------------------------- |
| `GET`   | `/admin/overview`                 | Aggregate counts for the dashboard |
| `GET`   | `/admin/users`                    | `search`, `status`, `cursor`       |
| `PATCH` | `/admin/users/:userId/status`     | `{ status }`                       |
| `GET`   | `/admin/reports`                  | `status`, `cursor`                 |
| `PATCH` | `/admin/reports/:reportId`        | `{ status, note? }`                |
| `POST`  | `/admin/challenges`               | Create a challenge                 |
| `PATCH` | `/admin/challenges/:id`           | Update a challenge                 |

### Errors

Errors are expected as:

```json
{ "error": { "code": "SLUG_TAKEN", "message": "That slug is taken", "requestId": "..." } }
```

`message` is shown to users when present. Anything unreadable falls back to
status-based copy. The client maps statuses to `UNAUTHORIZED`, `FORBIDDEN`,
`NOT_FOUND`, `VALIDATION`, `RATE_LIMITED`, `SERVER`, `NETWORK`, and `TIMEOUT`
so screens can respond appropriately (for example, a 401 redirects to login,
while a network failure shows a retry affordance rather than a login prompt).

## Submit vs. Demo Run

The challenge editor has two deliberately separate actions:

1. **Submit** sends `sourceCode` to the API. That is the only path that can award
   points, and its verdicts come from the real judge.
2. **Demo Run** executes the code in a local Web Worker against the sample tests
   that the challenge exposes. Results are labelled `local` and never call the
   API, never touch points, and never see hidden tests.

Demo Run limitations, by design:

- **JavaScript only.** It is a browser worker, not a sandbox for other
  languages.
- **Not a security boundary.** It limits runaway time and terminates the
  worker, but it is not a substitute for the real execution worker. Treat it as
  a convenience for iterating on sample cases.
- Sample tests only; the browser never receives hidden ones.

## Monaco Editor

Monaco is loaded from `node_modules` through Vite workers
(`src/components/editor/monaco-setup.ts`) — there is no CDN request at runtime,
so the app works on an air-gapped network.

`monaco-editor` is pinned to **`0.52.2`**. Version `0.57.0` introduced an
`exports` map (`"./*": "./esm/vs/*.js"`) that changes how `esm/vs/**` subpaths
resolve, which breaks the `?worker` imports used to build the editor and
TypeScript workers. Do not upgrade without rewriting those imports and
retesting a production build.

The editor is lazy-loaded, and Monaco, the Markdown renderer, and the app shell
are emitted as separate chunks.

## Tests

```bash
npm test
```

Coverage focuses on the parts where correctness matters and a browser is not
required:

- trace engines for every visualiser, including edge cases (empty input,
  duplicates, backtracks, heap property, BST deletion variants)
- the local runner's output normalisation, comparison, timeout, and cleanup
- the HTTP client's URL building, error mapping, cancellation, and 204 handling
- auth guards and redirects
- the step player (stepping, replay, keyboard shortcuts)
- the algorithm page (validation, re-rendering traces, visualiser switching)
- the app shell rendering with the API unreachable, and the theme provider's
  persistence rules

## Project layout

```
src/
  app/          router, providers, app shell
  components/   ui kit, layout, editor, feedback
  features/     admin, auth, challenges, community, dashboard,
                dsa, leaderboard, submissions
  hooks/        shared React hooks
  lib/          http client, errors, formatting, utilities
  services/     one module per API surface + query keys
  types/        DTOs and view models
  test/         Vitest setup and helpers
```

DSA content lives in `src/features/dsa/content/catalog.ts`; each algorithm's
trace engine lives in `src/features/dsa/algorithms/`. Trace engines emit a full
snapshot per step, which is what makes backward stepping a simple index change.

## Scope notes

- This repository contains the frontend only. The API, judge, and shared
  packages are separate.
- No hidden test cases or reference solutions are ever requested by, or stored
  in, the client.
- Screens are honest about missing data: empty, error, and "API unreachable"
  states are first-class, and no placeholder statistics are rendered.
