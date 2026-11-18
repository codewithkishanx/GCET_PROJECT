# DSA Arcade — Learn & Debug
## Product Requirements, Architecture, and Source-Code Implementation Guide

> **Purpose of this document:** Treat this file as the primary specification for building the DSA Arcade application. Read it before generating or modifying source code. Implement features in small, testable phases, and do not claim a feature is implemented until its code and tests exist.

---

## 1. Product overview

**DSA Arcade — Learn & Debug** is a web platform for learning data structures and algorithms through interactive visualizations, solving debugging challenges, competing through points and rankings, and publishing technical notes/articles.

The application has two roles:

1. **User** — learns DSA, runs debugging challenges, earns points, tracks progress, and publishes or reads community content.
2. **Admin** — monitors platform activity, manages learning content, moderates community posts, and handles user reports or restrictions.

### Product goals

- Make algorithms understandable through step-by-step, inspectable visual state.
- Teach debugging by asking users to repair intentionally buggy code.
- Support multiple programming languages through a controlled execution service.
- Reward successful learning without allowing users to manipulate points.
- Provide a community space for DSA notes, tutorials, and technical articles.
- Give administrators practical moderation and operational controls.

### Non-goals for the initial version

- Do not build a general-purpose online IDE.
- Do not execute submitted code inside the main web/API server process.
- Do not build microservices for every module.
- Do not require Kubernetes for local development.
- Do not reveal hidden test cases or reference solutions to normal users.
- Do not add social features that are not needed for the core learning loop.

---

## 2. Suggested technology stack

Use the following stack unless the repository already has a deliberate, working alternative.

### Frontend

- React
- TypeScript
- Vite
- React Router
- TanStack Query or a consistent API/data-fetching layer
- A consistent form-validation approach
- Monaco Editor for the code editor
- SVG or Canvas for visualizations; ordinary DOM elements are sufficient for simpler visualizers
- A lightweight charting library only where charts add real value

### Backend

- Node.js
- Express
- TypeScript if the repository supports it; otherwise use modern JavaScript consistently
- MongoDB
- Mongoose
- Zod or an equivalent request-schema validator
- A password-hashing library such as Argon2id or bcrypt
- A queue such as BullMQ with Redis for asynchronous code execution
- Socket.IO or Server-Sent Events for live submission status when needed

### Execution

- Docker images maintained by the application team for each supported language
- A separate execution worker/service
- Strict resource limits and isolation controls
- A bounded job queue
- A server-side test runner and verdict evaluator

### Development and testing

- ESLint and Prettier
- Vitest or Jest for unit tests
- Supertest for Express API integration tests
- React Testing Library for frontend tests
- Docker Compose for local dependencies where useful
- Environment variables managed through `.env` locally; never commit secrets

**Important:** Verify package versions and APIs against the actual repository. Do not blindly overwrite existing working configuration.

---

## 3. Core user journeys

### 3.1 Registration and login

1. A visitor registers with email, password, and a unique public username.
2. The backend normalizes the username consistently and enforces uniqueness in MongoDB with a unique index.
3. The password is hashed before persistence. Plaintext passwords are never stored or logged.
4. The user logs in with the configured credentials.
5. The backend issues a secure session or token according to the authentication design.
6. The client obtains the authenticated user's profile from the server.
7. The user can update permitted profile fields but cannot choose or elevate their own role.

A username is a public identity, not proof of identity. Do not authenticate users solely by entering a username.

### 3.2 Learn a DSA concept

1. The user opens a topic such as arrays, sorting, trees, stacks, queues, linked lists, heaps, hash maps, or graphs.
2. The user selects an algorithm or operation.
3. The visualizer displays the initial input and current state.
4. The user steps forward, steps backward, resets, or changes animation speed.
5. The interface highlights the active elements, indices, pointers, nodes, or edges.
6. The topic page explains the idea, time complexity, space complexity, and relevant edge cases.

### 3.3 Debug a challenge

1. The user opens a challenge with a description, constraints, examples, and starter code.
2. The user selects one of the languages enabled for that challenge.
3. The editor displays the intentionally buggy starter code.
4. The user edits the code and submits it.
5. The backend authenticates the user and validates the challenge, language, and request size.
6. A submission record is created and a job is enqueued.
7. An isolated worker compiles/runs the submission against server-controlled test cases.
8. The service records a verdict and execution metrics.
9. The client displays the result, such as Accepted, Wrong Answer, Compilation Error, Runtime Error, Time Limit Exceeded, or Memory Limit Exceeded.
10. Points are awarded only when the challenge's acceptance conditions are met, and the reward is idempotent.
11. The user's progress and leaderboard position update.

### 3.4 Publish a technical note/article

1. The authenticated user opens the editor.
2. The user writes a title, Markdown content, tags, and optional summary.
3. The user saves a draft or publishes it.
4. The backend validates the content and stores the author from the authenticated session—not from a trusted client-supplied author ID.
5. Published posts appear in the community feed and can be opened on a detail page.
6. Other users can like, comment, and report content.
7. Authors can edit or delete their own posts within policy; admins can moderate content.

### 3.5 Admin monitoring

1. An admin signs in through the same authentication system.
2. Server-side authorization verifies the admin role for every admin operation.
3. The admin dashboard displays aggregate counts and recent platform activity.
4. Admins can manage topics/challenges, moderate reported content, and suspend or restore accounts.
5. Important moderation and account actions are recorded in an audit log.

Hiding admin UI elements in the frontend is not authorization. Every protected backend route must enforce access control.

---

## 4. Functional requirements

### 4.1 Authentication and profiles

- Register, log in, log out, and retrieve the current profile.
- Unique, normalized usernames and unique normalized emails.
- Strong password hashing and generic login failure messages.
- Rate limiting on authentication and other abuse-prone endpoints.
- Server-side role enforcement.
- Profile fields may include display name, username, avatar URL, short bio, and public learning statistics.
- A user must not be able to set `role`, `points`, account status, or admin flags through ordinary profile updates.
- Apply request validation and output filtering.

### 4.2 DSA learning and visualization

Initial topics:

- Arrays: traversal, insertion, deletion, searching, two pointers, sliding window.
- Sorting: bubble, selection, insertion, merge, and quicksort.
- Linked lists: traversal, insertion, deletion, reversal.
- Stacks and queues.
- Trees: binary tree traversal, BST search/insertion/deletion.
- Heaps and priority queues.
- Hash maps and sets.
- Graphs: BFS, DFS, and later shortest-path algorithms.
- Recursion and backtracking.

Every visualizer should have:

- Input controls with validation.
- A deterministic sequence of algorithm states or events.
- Play/pause where animation is appropriate.
- Step forward and backward.
- Reset.
- Speed control.
- Clear visual indicators for comparisons, swaps, visits, and current pointers.
- A concise explanation of the current step.
- Complexity information and edge cases.
- Accessible labels and keyboard-friendly controls where feasible.

**Implementation rule:** Separate algorithm logic from rendering. Prefer a pure function that produces trace events/states, then let React render those states. This makes the algorithm testable without the UI and makes backward stepping reliable.

Example conceptual event shape:

```ts
type VisualizerEvent =
  | { type: "compare"; indices: [number, number]; message: string }
  | { type: "swap"; indices: [number, number]; message: string }
  | { type: "visit"; index: number; message: string }
  | { type: "write"; index: number; value: number; message: string };
```

Adapt event types to each algorithm. Do not force every tree or graph operation into an array-only schema.

### 4.3 Debugging challenges and code judge

Each challenge should include:

- Title, slug, description, topic, difficulty, constraints, and examples.
- Supported language identifiers.
- Starter/buggy code per supported language.
- Server-only test-case configuration.
- Server-only reference solution or trusted expected results.
- Time and memory limits.
- Point value and acceptance policy.
- Publication status and timestamps.

Submission records should include:

- User ID and challenge ID.
- Language identifier.
- Submitted source code or a protected reference to it.
- Status: queued, running, completed, or failed internally.
- Verdict.
- Passed/total test count where disclosure is allowed.
- Execution duration and memory usage when measured reliably.
- Safe compiler/runtime output with size limits.
- Created/started/completed timestamps.

Recommended verdicts:

- `ACCEPTED`
- `WRONG_ANSWER`
- `COMPILATION_ERROR`
- `RUNTIME_ERROR`
- `TIME_LIMIT_EXCEEDED`
- `MEMORY_LIMIT_EXCEEDED`
- `OUTPUT_LIMIT_EXCEEDED`
- `SYSTEM_ERROR`

Do not expose hidden input, expected output, reference code, or secret test-case details in API responses. Public examples may be shown, but hidden tests must remain server-side.

### 4.4 Points and leaderboard

- Points are awarded by the backend, never accepted from the client.
- Define the scoring rule per challenge.
- A user should not receive duplicate rewards for repeated requests or retried jobs.
- Record reward transactions with a unique idempotency key, such as one based on user, challenge, and the applicable reward policy.
- Define whether each challenge can be rewarded once per user or whether later policies permit additional rewards.
- Keep the leaderboard query deterministic. Use points descending and a documented tie-breaker.
- Display rank, username, points, and optionally solved count.
- Consider pagination or a top-N query.
- If points are cached on the user document, treat reward transactions as the auditable source of truth and implement reconciliation.

### 4.5 Community notes and posts

- Create, edit, save as draft, publish, and delete posts.
- Markdown support for headings, lists, links, quotes, and fenced code blocks.
- Sanitize rendered content and disallow unsafe HTML/script execution.
- Search and filter by tags, author, and publication date.
- Likes with a unique `(userId, postId)` constraint.
- Comments with length limits and authorization.
- Report posts/comments/users.
- Admin moderation actions: hide/unpublish, restore, or remove according to policy.
- Store publication state, author, timestamps, and edit metadata.
- Paginate feeds; do not return every post in one request.

### 4.6 Admin functionality

- View aggregate counts and recent activity.
- Create, edit, publish, archive, and delete/disable challenges.
- Configure supported languages and safe resource limits from trusted server configuration.
- Moderate posts, comments, and reports.
- Suspend or restore users.
- View execution-job health and system errors without exposing secrets.
- Audit important actions, including actor, action, target, timestamp, and safe metadata.

Do not let an admin create arbitrary Docker commands or unrestricted container configurations from a web form. Execution images and security settings must be controlled by trusted application configuration.

---

## 5. Recommended source structure

Adapt this structure to the repository rather than replacing existing files without inspection.

```text
dsa-arcade/
├── project.md
├── README.md
├── .env.example
├── .gitignore
├── docker-compose.yml
├── client/
│   ├── package.json
│   ├── index.html
│   └── src/
│       ├── app/
│       │   ├── App.tsx
│       │   ├── router.tsx
│       │   └── providers.tsx
│       ├── assets/
│       ├── components/
│       │   ├── layout/
│       │   ├── forms/
│       │   ├── feedback/
│       │   └── editor/
│       ├── features/
│       │   ├── auth/
│       │   ├── dashboard/
│       │   ├── dsa/
│       │   │   ├── components/
│       │   │   ├── algorithms/
│       │   │   └── visualizers/
│       │   ├── challenges/
│       │   ├── submissions/
│       │   ├── leaderboard/
│       │   ├── community/
│       │   └── admin/
│       ├── hooks/
│       ├── lib/
│       ├── services/
│       ├── types/
│       ├── utils/
│       └── main.tsx
├── server/
│   ├── package.json
│   └── src/
│       ├── app.ts
│       ├── server.ts
│       ├── config/
│       ├── db/
│       ├── models/
│       ├── modules/
│       │   ├── auth/
│       │   ├── users/
│       │   ├── dsa/
│       │   ├── challenges/
│       │   ├── submissions/
│       │   ├── leaderboard/
│       │   ├── community/
│       │   └── admin/
│       ├── middleware/
│       ├── validators/
│       ├── services/
│       ├── queues/
│       ├── utils/
│       └── tests/
└── execution-worker/
    ├── package.json
    ├── Dockerfile
    └── src/
        ├── worker.ts
        ├── runners/
        ├── sandbox/
        ├── judge/
        └── tests/
```

For a smaller MVP, `client`, `server`, and `execution-worker` may live in one repository with separate package manifests. The worker must remain a separate process and security boundary. Do not create empty files for every planned module up front; create files when implementing a feature.

---

## 6. Backend module conventions

For each Express module, use a consistent separation of responsibilities:

- **Route:** HTTP path and middleware wiring.
- **Controller:** HTTP request/response orchestration.
- **Service:** business rules and multi-model operations.
- **Model:** schema, indexes, and persistence constraints.
- **Validator:** request parameters, body, and query validation.
- **Tests:** unit and integration coverage.

Example module:

```text
modules/
└── challenges/
    ├── challenge.routes.ts
    ├── challenge.controller.ts
    ├── challenge.service.ts
    ├── challenge.validator.ts
    └── challenge.test.ts
```

Avoid putting all business logic into route callbacks or one giant controller. Do not create an abstraction for every one-line operation without a reason.

### Error handling

- Use a consistent JSON error format.
- Validate input at the boundary.
- Use centralized Express error middleware.
- Do not return stack traces or internal infrastructure details to clients in production.
- Log a correlation/request ID with errors.
- Do not log passwords, session tokens, secrets, or unrestricted submitted-code output.
- Distinguish client errors, authorization failures, rate limits, and internal failures.

Example response shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request is invalid",
    "requestId": "server-generated-id"
  }
}
```

---

## 7. Data model guidance

Use Mongoose schemas with explicit validation, timestamps, and indexes. Exact schemas should be written and tested during implementation.

### User

Fields:

- `username`: required, normalized, unique index.
- `email`: required, normalized, unique index.
- `passwordHash`: required for password-based authentication; never return it in JSON.
- `role`: enum such as `user` and `admin`; default `user`.
- `status`: enum such as `active` and `suspended`.
- `displayName`, `avatarUrl`, `bio`: optional profile fields with limits.
- `points`: optional cached aggregate, updated only through trusted server logic.
- timestamps.

Security requirements:

- Never accept `role`, `passwordHash`, or arbitrary `points` in public registration/profile updates.
- A unique index is required; a pre-insert availability check alone does not prevent races.
- Handle MongoDB duplicate-key errors cleanly.
- Create admin accounts through a controlled seed/operations process, not public registration.

### Challenge

Fields:

- `title`, `slug`, `description`, `topic`, `difficulty`.
- `constraints` and public examples.
- language-specific starter code.
- server-only test-case references or embedded protected test data.
- server-only reference solutions where used.
- `timeLimitMs`, `memoryLimitMb`, and output limits.
- point value and publication state.
- timestamps.

Ensure normal public challenge queries explicitly omit hidden test data and reference solutions. Do not rely only on the frontend to hide them.

### Submission

Fields:

- `userId`, `challengeId`, `language`, `sourceCode`.
- execution status and verdict.
- test counts permitted for disclosure.
- execution duration and memory metrics.
- safe output/error summary.
- job ID and timestamps.

Add indexes based on actual query patterns, for example user history by newest date and challenge submissions by newest date. Do not store unnecessary duplicated payloads.

### Reward transaction

Fields:

- `userId`, `challengeId`, `submissionId`, `points`, `reason`, `idempotencyKey`.
- timestamp.

Create a unique index on the chosen idempotency key. Ensure the accepted-submission transition and reward operation are safe under retries and concurrent requests. MongoDB transactions may be appropriate when deployment topology supports them; otherwise use an explicit idempotent/reconciliation strategy.

### Post

Fields:

- `authorId`, `title`, `slug`, `summary`, `contentMarkdown`, `tags`.
- publication status and timestamps.
- optional counters only if maintained consistently.

Do not trust client-provided author IDs or like counts.

### Comment, Like, Report, AuditLog

- Comments reference the post and author.
- Likes have a unique compound index on user and post.
- Reports record reporter, target, reason, status, and moderation metadata.
- Audit logs record sensitive administrative actions without secrets.

---

## 8. API design

Use a versioned API prefix such as `/api/v1`. The exact routes can be adjusted, but maintain consistent naming, status codes, validation, and authorization.

### Authentication and users

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `PATCH /api/v1/users/me`
- `GET /api/v1/users/:username`

### Learning content

- `GET /api/v1/topics`
- `GET /api/v1/topics/:slug`
- `GET /api/v1/algorithms/:slug`

Pure algorithm traces may be generated on the client if they do not require protected data. Do not call the server for every animation frame.

### Challenges and submissions

- `GET /api/v1/challenges`
- `GET /api/v1/challenges/:slug`
- `POST /api/v1/challenges/:challengeId/submissions`
- `GET /api/v1/submissions/:submissionId`
- `GET /api/v1/users/me/submissions`

Submission creation returns a queued response and submission ID. The client polls or subscribes for status. Do not keep a normal HTTP request open indefinitely while untrusted code executes.

### Leaderboard

- `GET /api/v1/leaderboard?limit=50&cursor=...`
- `GET /api/v1/users/:username/stats`

Validate pagination bounds and define a stable sort order.

### Community

- `GET /api/v1/posts`
- `POST /api/v1/posts`
- `GET /api/v1/posts/:slug`
- `PATCH /api/v1/posts/:postId`
- `DELETE /api/v1/posts/:postId`
- `POST /api/v1/posts/:postId/likes`
- `DELETE /api/v1/posts/:postId/likes`
- `GET /api/v1/posts/:postId/comments`
- `POST /api/v1/posts/:postId/comments`
- `POST /api/v1/reports`

### Admin

- `GET /api/v1/admin/overview`
- `POST /api/v1/admin/challenges`
- `PATCH /api/v1/admin/challenges/:challengeId`
- `GET /api/v1/admin/reports`
- `PATCH /api/v1/admin/reports/:reportId`
- `PATCH /api/v1/admin/users/:userId/status`
- moderation endpoints for posts/comments.

Every admin route must use server-side authentication and role authorization. Add object-level authorization to ensure a user can only edit their own post, profile, or other permitted resources.

---

## 9. Secure code execution design

This is the highest-risk subsystem. Treat all submitted code as hostile.

### Required architecture

1. The API authenticates the user, validates the request, checks quotas, and creates a submission record.
2. The API places a small job payload on a bounded queue. Avoid putting large source files and secrets into queue metadata unnecessarily; use a controlled storage/reference strategy.
3. An execution worker claims a job.
4. The worker chooses a prebuilt, allowlisted image for the requested language.
5. The worker creates a short-lived sandbox with a unique workspace.
6. The source code is passed as data, never concatenated into a shell command.
7. Compilation/execution occurs with a fixed, allowlisted command and strict resource controls.
8. The judge compares program output to trusted expected results using a clearly defined normalization policy.
9. The worker persists the result and marks the job complete.
10. The worker destroys the container and temporary files in a `finally`-style cleanup path.
11. The client retrieves the result using an authorized submission endpoint.

### Minimum security controls

- Run as a non-root user.
- Never mount `/var/run/docker.sock` or the host Docker socket into a submitted-code container.
- Do not use privileged containers.
- Drop unnecessary Linux capabilities.
- Apply seccomp and AppArmor or equivalent restrictions.
- Set CPU, memory, PID/process-count, file-size, output-size, and wall-clock limits.
- Disable outbound network access unless a specific challenge requires it; the default should be no network.
- Use a read-only root filesystem where practical and a tightly scoped temporary writable workspace.
- Never mount host secrets, application environment files, database credentials, or production source code into the sandbox.
- Use prebuilt, pinned language images; do not let users select arbitrary images or commands.
- Avoid shell-string interpolation; pass arguments through a safe process-spawn API.
- Limit concurrent jobs, queue length, and per-user submissions.
- Clean up containers, processes, temporary files, and timed-out jobs even on worker crashes.
- Enforce request-body and source-code size limits.
- Treat compiler/runtime output as untrusted text and cap its size.
- Keep hidden test cases and reference solutions outside the sandbox and outside user-facing API responses.
- Monitor worker health, queue depth, timeout rates, and repeated abuse.
- Use stronger isolation, such as gVisor or Firecracker, if the threat model and deployment environment require it.

Docker containers alone do not guarantee complete isolation from a hostile host-kernel workload. For a public service, evaluate the sandbox threat model and isolate execution workers from the main API and database network.

### Language runner contract

Each language runner should implement a small interface, conceptually:

```ts
type RunRequest = {
  sourceCode: string;
  stdin: string;
  timeLimitMs: number;
  memoryLimitMb: number;
};

type RunResult = {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  memoryLimitExceeded: boolean;
  durationMs: number;
};
```

The actual runner must enforce limits outside the submitted process as well. A program's own report that it used little memory or finished quickly is not trustworthy.

### Judge correctness

- Compile Java/C++ where required; interpret or execute Python/JavaScript with their appropriate runtime.
- Separate compilation errors from runtime errors.
- Handle non-zero exit codes.
- Enforce timeout and output caps.
- Define exact output comparison rules, including whitespace and floating-point behavior if relevant.
- Do not leak hidden expected output in failure messages.
- Avoid running a reference solution on untrusted infrastructure without isolation.
- Ensure worker retries cannot grant points more than once.

---

## 10. Authentication and application security

- Use HTTPS in production.
- Use secure, HTTP-only cookies for sessions where appropriate, with correct `SameSite` and CSRF protections; or use a carefully designed token strategy.
- Never put long-lived secrets in frontend code or Vite environment variables exposed to the browser.
- Hash passwords with Argon2id or bcrypt using appropriate settings.
- Normalize email and username consistently.
- Use login/register rate limits and sensible account-lockout or abuse controls.
- Validate all request bodies, query parameters, and route parameters.
- Use secure headers, such as through Helmet.
- Configure CORS for known frontend origins rather than `*` with credentials.
- Limit JSON body sizes.
- Use safe Markdown rendering and sanitize user content.
- Prevent NoSQL operator injection by validating expected types and shapes.
- Use least-privilege database credentials.
- Do not expose raw Mongoose documents or internal fields by default.
- Add object-level authorization checks to every resource operation.
- Protect state-changing endpoints against CSRF when cookie authentication is used.
- Do not trust user IDs, roles, points, verdicts, or author IDs supplied by the browser.

---

## 11. UI and page requirements

### Public pages

- Landing page describing Learn, Debug, Compete, and Share.
- Login page.
- Registration page.
- Public community feed and published article pages.
- Public leaderboard if enabled.

### Authenticated user pages

- User dashboard with recent activity, progress, points, and recommended next topics.
- DSA topic index and topic detail pages.
- Visualization workspace.
- Challenge list with topic/difficulty/language filters.
- Challenge detail with problem statement, editor, language selector, submit button, and verdict panel.
- Submission history and submission detail.
- Leaderboard.
- Community feed, article editor, post detail, and user profile.

### Admin pages

- Overview dashboard.
- Challenge management.
- User list/detail and account status controls.
- Reports and moderation queue.
- Operational view for execution-job status and errors, with no secret exposure.

### UI quality requirements

- Responsive layouts for desktop and mobile.
- Clear loading, empty, error, and success states.
- Accessible contrast, keyboard navigation, and visible focus.
- Consistent spacing, typography, button behavior, and form validation.
- Avoid decorative complexity that obscures the editor or visualizer.
- Do not ship fake statistics, hardcoded leaderboard rankings, or buttons that do nothing.
- Seed/demo data must be clearly identified as demo data.

---

## 12. Environment variables

Create `.env.example` with names and safe placeholders only. Example:

```dotenv
NODE_ENV=development
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb://localhost:27017/dsa_arcade
SESSION_SECRET=replace-with-a-long-random-secret
REDIS_URL=redis://localhost:6379
EXECUTION_QUEUE_NAME=code-execution
EXECUTION_WORKER_CONCURRENCY=2
MAX_SOURCE_BYTES=50000
DEFAULT_TIME_LIMIT_MS=2000
DEFAULT_MEMORY_LIMIT_MB=128
```

Adapt these values to the chosen authentication and deployment setup. Never commit a real `.env` file or production credentials. Validate required environment variables at startup and fail fast when configuration is invalid.

Do not pass application secrets to execution containers. Do not expose server-only variables through frontend build-time environment prefixes.

---

## 13. Logging, observability, and reliability

- Use structured logs with timestamp, severity, service, request ID, and safe metadata.
- Track submission queue depth, job duration, failure rate, timeouts, worker restarts, and resource usage.
- Add health endpoints for the API and worker; do not expose detailed internals publicly.
- Make job processing idempotent.
- Implement bounded retries for transient infrastructure failures, not endless retries for user code failures.
- Use timeouts for database and external operations where applicable.
- Ensure container cleanup occurs after success, failure, timeout, or cancellation.
- Handle a worker crash after execution but before database update through safe retry/reconciliation.
- Keep administrative audit logs for moderation and user-status changes.
- Back up important database data and document restore procedures before production.

---

## 14. Testing strategy

### Unit tests

- Username/email normalization.
- Input validators.
- Algorithm implementations and trace generation.
- Verdict classification and output comparison.
- Scoring policy and idempotency rules.
- Authorization policy helpers.

### API integration tests

- Registration, login, logout, and current-user endpoint.
- Duplicate username/email handling, including unique-index errors.
- User cannot set their role or points.
- User cannot access admin endpoints.
- User cannot modify another user's post.
- Hidden test cases/reference solutions never appear in public challenge responses.
- Submission authorization and state transitions.
- Duplicate reward attempts do not increase points twice.
- Community create/edit/delete/like/report permissions.
- Pagination and malformed request handling.

### Execution-worker tests

- Valid accepted program.
- Wrong answer.
- Compilation error.
- Runtime exception.
- Infinite loop and wall-clock timeout.
- Memory exhaustion.
- Excessive stdout/stderr.
- Non-zero exit status.
- Network access denied.
- Workspace cleanup after failure.
- Worker restart and retry behavior.
- Concurrent jobs respect global and per-user limits.

### Frontend tests

- Forms show validation feedback.
- Protected routes behave correctly.
- Visualizer step, backward, reset, and speed controls work.
- Challenge submission displays queued/running/completed states.
- Verdict panels do not leak hidden data.
- Community editor and moderation states behave correctly.
- Loading, empty, and error states are handled.

---

## 15. Implementation milestones

Build and test each milestone before starting the next.

### Milestone 0 — Repository inspection

- Inspect existing files, package managers, scripts, and conventions.
- Identify what already works.
- Preserve useful code and dependencies.
- Write down the current architecture before restructuring.
- Confirm the selected frontend/backend language and module system.

**Exit criteria:** The app starts locally and existing behavior is understood.

### Milestone 1 — Application skeleton

- Create frontend and API entry points.
- Configure environment validation, database connection, central errors, logging, and health routes.
- Add a consistent layout and routing.
- Add linting and basic tests.

**Exit criteria:** Client and API start reliably; health and database connectivity are testable.

### Milestone 2 — Authentication and authorization

- Implement registration, login, logout, and current-user retrieval.
- Add user model, password hashing, unique indexes, and validation.
- Add role middleware and protected routes.
- Add tests for role escalation and object-level access.

**Exit criteria:** Authentication works and privilege escalation tests pass.

### Milestone 3 — DSA learning

- Add topic and algorithm pages.
- Implement array traversal and one sorting visualizer first.
- Separate algorithm traces from UI rendering.
- Add tests for algorithms, traces, and navigation.
- Add tree and graph visualizers after the pattern is stable.

**Exit criteria:** At least two visualizers support stepping, reset, and deterministic tests.

### Milestone 4 — Challenges without public execution

- Add challenge schema, admin CRUD, public challenge listing/detail, and starter code.
- Keep hidden tests and reference solutions server-only.
- Add validation and authorization tests.

**Exit criteria:** Challenge content can be managed securely and public responses omit secret fields.

### Milestone 5 — Execution service

- Implement one language runner first.
- Add a queue, worker, isolated Docker sandbox, resource limits, cleanup, and verdict evaluation.
- Test hostile inputs and infrastructure failures.
- Add more language runners only after the first is reliable.

**Exit criteria:** Correct verdicts are returned for accepted, wrong-answer, compile-error, runtime-error, and timeout cases; resource and isolation tests pass.

### Milestone 6 — Points and leaderboard

- Implement a server-side scoring policy and reward transactions.
- Make reward processing idempotent.
- Add leaderboard queries and user stats.
- Test retries and concurrent submissions.

**Exit criteria:** A successful challenge grants the correct reward once, even with duplicate job delivery.

### Milestone 7 — Community

- Implement Markdown posts, drafts, publishing, tags, comments, likes, reports, and pagination.
- Add content sanitization and ownership checks.
- Add admin moderation.

**Exit criteria:** Community flows and authorization tests pass.

### Milestone 8 — Hardening and deployment

- Add rate limits, secure headers, production CORS, monitoring, backups, and deployment configuration.
- Isolate execution workers from sensitive services.
- Review logs for secrets and user-code leakage.
- Run the full test suite and a security checklist.

**Exit criteria:** The system can be deployed reproducibly, with documented limitations and no known critical authorization or sandbox gaps.

---

## 16. Definition of done

A feature is done only when:

- Its expected behavior is specified.
- Input validation and authorization are implemented server-side where required.
- Loading, empty, success, and error states are handled.
- Important edge cases are tested.
- No secrets or protected data are exposed.
- No placeholder action is presented as working functionality.
- Logs do not expose credentials or sensitive data.
- The feature is documented where setup or operation is non-obvious.
- Existing tests and lint checks pass.
- The README accurately describes what is implemented and what remains planned.

---

## 17. Instructions for AI coding assistants

When using this specification to generate the source code:

1. Inspect the repository before writing files. Do not assume it is empty.
2. Identify the existing stack, package manager, naming conventions, and scripts.
3. Present a short implementation plan for the next milestone only.
4. Implement one coherent milestone at a time; avoid generating the entire platform in one unreviewable response.
5. Prefer maintainable, typed, modular code and explicit error handling.
6. Include tests for business rules, authorization, and edge cases.
7. Do not create fake integrations, mock success responses, hardcoded leaderboard results, or nonfunctional buttons in production paths.
8. Do not expose hidden tests, reference solutions, passwords, secrets, or admin capabilities.
9. Treat submitted source code as hostile. Do not implement execution with an unrestricted shell command or inside the API process.
10. After changes, summarize files changed, setup commands, environment variables, tests run, and known limitations.
11. If a requirement is ambiguous or conflicts with the existing code, explain the ambiguity and choose the safest minimal approach rather than silently inventing behavior.
12. Never claim tests passed unless they were actually run and passed.
13. Keep `project.md` updated when architecture or requirements materially change.
14. Prioritize a working vertical slice over a large number of incomplete modules.

---

## 18. MVP acceptance checklist

- [ ] Registration/login with unique username and secure password handling.
- [ ] User/admin roles enforced on the backend.
- [ ] At least two DSA visualizations with step-forward, step-back, and reset.
- [ ] Challenge listing/detail and intentionally buggy starter code.
- [ ] One language runs in an isolated, resource-limited sandbox.
- [ ] Server-side test evaluation and meaningful verdicts.
- [ ] Hidden tests and reference solutions are not exposed.
- [ ] Points are awarded once per accepted challenge according to policy.
- [ ] Leaderboard is based on trusted persisted data.
- [ ] Users can create and read Markdown technical posts.
- [ ] Ownership checks, content sanitization, and admin moderation exist.
- [ ] Automated tests cover important security and correctness rules.
- [ ] Setup and deployment instructions are accurate.

**Recommended first vertical slice:** Register/login → open an array or sorting visualization → open one debugging challenge → submit code in one language → receive a verdict from an isolated worker → receive points once → see the updated leaderboard. Once that path is reliable, expand to additional algorithms, languages, and community features.
