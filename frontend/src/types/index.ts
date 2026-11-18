/* ---------------------------------------------------------------------------
 * API contracts. These mirror the documented `/api/v1` surface. Anything the
 * server is expected to keep private (hidden tests, reference solutions) has no
 * type here on purpose: the client cannot render data it never receives.
--------------------------------------------------------------------------- */

export type Role = 'user' | 'admin'
export type UserStatus = 'active' | 'suspended'

export interface PublicUser {
  id: string
  username: string
  displayName?: string
  avatarUrl?: string
  bio?: string
  role: Role
  points: number
  solvedCount: number
  createdAt: string
}

export interface CurrentUser extends PublicUser {
  email: string
  status: UserStatus
}

export interface AuthResponse {
  user: CurrentUser
}

export interface Paginated<T> {
  items: T[]
  nextCursor: string | null
}

/* ------------------------------- Learning -------------------------------- */

export interface TopicSummary {
  slug: string
  title: string
  blurb: string
  algorithmSlugs: string[]
}

export type Difficulty = 'easy' | 'medium' | 'hard'

export type Language = 'javascript' | 'python' | 'java' | 'cpp'

export interface ChallengeExample {
  input: string
  output: string
  explanation?: string
}

export interface ChallengeSummary {
  id: string
  slug: string
  title: string
  topic: string
  difficulty: Difficulty
  pointValue: number
  supportedLanguages: Language[]
  solved?: boolean
}

export interface ChallengeDetail extends ChallengeSummary {
  description: string
  constraints: string[]
  examples: ChallengeExample[]
  starterCode: Partial<Record<Language, string>>
  timeLimitMs: number
  memoryLimitMb: number
  maxSourceBytes: number
  publishedAt?: string
  createdAt: string
}

export interface ChallengeListQuery {
  topic?: string
  difficulty?: Difficulty | 'all'
  language?: Language | 'all'
  search?: string
  cursor?: string | null
  limit?: number
}

/* ------------------------------ Submissions ------------------------------- */

export type Verdict =
  | 'ACCEPTED'
  | 'WRONG_ANSWER'
  | 'COMPILATION_ERROR'
  | 'RUNTIME_ERROR'
  | 'TIME_LIMIT_EXCEEDED'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'OUTPUT_LIMIT_EXCEEDED'
  | 'SYSTEM_ERROR'

export type SubmissionStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED'

export interface SubmissionSummary {
  id: string
  challengeId: string
  challengeSlug?: string
  challengeTitle?: string
  language: Language
  status: SubmissionStatus
  verdict: Verdict | null
  passedTests: number | null
  totalTests: number | null
  durationMs: number | null
  memoryKb: number | null
  pointsAwarded: number | null
  failedTest?: {
    index: number
    input: string
    expectedOutput: string
    actualOutput?: string | null
  } | null
  createdAt: string
  completedAt: string | null
}

export interface SubmissionDetail extends SubmissionSummary {
  sourceCode: string
  /** Compiler/runtime text, already truncated by the server. */
  output: string | null
  errorMessage: string | null
  startedAt: string | null
}

export interface CreateSubmissionInput {
  challengeId: string
  language: Language
  sourceCode: string
}

/* ------------------------------ Leaderboard ------------------------------- */

export interface LeaderboardEntry {
  rank: number
  userId: string
  username: string
  displayName?: string
  avatarUrl?: string
  points: number
  solvedCount: number
}

export interface UserStats {
  user: PublicUser
  acceptedCount: number
  submissionCount: number
  languageBreakdown: Array<{ language: Language; accepted: number }>
  recentAccepted: Array<{ challengeSlug: string; challengeTitle: string; points: number; at: string }>
}

/* ------------------------------- Community -------------------------------- */

export type PostStatus = 'draft' | 'published' | 'hidden'

export interface PostAuthor {
  id: string
  username: string
  displayName?: string
  avatarUrl?: string
}

export interface PostSummary {
  id: string
  slug: string
  title: string
  summary: string
  tags: string[]
  status: PostStatus
  author: PostAuthor
  likeCount: number
  commentCount: number
  likedByMe: boolean
  isMine?: boolean
  publishedAt: string | null
  updatedAt: string
}

export interface PostDetail extends PostSummary {
  contentMarkdown: string
  createdAt: string
  isMine: boolean
}

export interface Comment {
  id: string
  postId: string
  author: PostAuthor
  body: string
  createdAt: string
  isMine: boolean
}

export interface PostListQuery {
  tag?: string
  author?: string
  search?: string
  status?: 'published' | 'draft' | 'all'
  cursor?: string | null
  limit?: number
}

export interface PostInput {
  title: string
  summary: string
  contentMarkdown: string
  tags: string[]
  status: 'draft' | 'published'
}

/* -------------------------------- Reports --------------------------------- */

export type ReportTargetType = 'post' | 'comment' | 'user'
export type ReportStatus = 'open' | 'resolved' | 'dismissed'

export interface Report {
  id: string
  targetType: ReportTargetType
  targetId: string
  targetLabel: string
  reason: string
  details?: string
  status: ReportStatus
  reporter: { id: string; username: string }
  createdAt: string
  resolvedAt?: string | null
  resolutionNote?: string | null
}

/* --------------------------------- Admin ---------------------------------- */

export interface AdminOverview {
  counts: {
    users: number
    activeUsers: number
    suspendedUsers: number
    challenges: number
    publishedChallenges: number
    posts: number
    openReports: number
    acceptedSubmissions: number
    submissionsLast24h: number
  }
  queue: {
    waiting: number
    active: number
    failedLast24h: number
  }
  recentActivity: Array<{
    id: string
    type: string
    summary: string
    actor: string
    at: string
  }>
}

export interface AdminUserRow {
  id: string
  username: string
  email: string
  role: Role
  status: UserStatus
  points: number
  createdAt: string
  lastSeenAt: string | null
}

export interface AdminChallengeInput {
  title: string
  slug: string
  topic: string
  difficulty: Difficulty
  description: string
  constraints: string[]
  pointValue: number
  timeLimitMs: number
  memoryLimitMb: number
  supportedLanguages: Language[]
  starterCode: Partial<Record<Language, string>>
  status: 'draft' | 'published' | 'archived'
}
