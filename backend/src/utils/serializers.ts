import type { Challenge, Comment, FailedTestInfo, Post, RefreshToken, Submission, User } from "@dsa/shared";
import { mapToRecord } from "@dsa/shared";

function iso(value: Date | null | undefined): string | null {
  return value ? new Date(value).toISOString() : null;
}

export interface PublicUserView {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  points: number;
  solvedCount: number;
  createdAt: string;
}

/** Public profile: never exposes email, role or account status. */
export function toPublicUser(user: User): PublicUserView {
  return {
    id: String(user._id),
    username: user.username,
    displayName: user.displayName ?? null,
    avatarUrl: user.avatarUrl ?? null,
    bio: user.bio ?? null,
    points: user.points,
    solvedCount: user.solvedCount,
    createdAt: iso(user.createdAt) ?? new Date(0).toISOString(),
  };
}

export interface SelfUserView extends PublicUserView {
  email: string;
  role: string;
  status: string;
}

export function toSelfUser(user: User): SelfUserView {
  return {
    ...toPublicUser(user),
    email: user.email,
    role: user.role,
    status: user.status,
  };
}

export interface AdminUserView extends SelfUserView {
  updatedAt: string | null;
}

export function toAdminUser(user: User): AdminUserView {
  return {
    ...toSelfUser(user),
    updatedAt: iso(user.updatedAt),
  };
}

function pickLanguages(
  record: Record<string, string>,
  languages: readonly string[],
): Record<string, string> {
  const picked: Record<string, string> = {};
  for (const language of languages) {
    const code = record[language];
    if (typeof code === "string") picked[language] = code;
  }
  return picked;
}

export interface PublicChallengeView {
  id: string;
  title: string;
  slug: string;
  description: string;
  topic: string;
  difficulty: string;
  constraints: string[];
  examples: Challenge["examples"];
  starterCode: Record<string, string>;
  supportedLanguages: string[];
  limits: { timeLimitMs: number; memoryLimitMb: number; outputLimitBytes: number };
  points: number;
  createdAt: string | null;
  updatedAt: string | null;
}

/**
 * Explicit allow-list projection. Hidden tests and reference solutions are not
 * part of this shape, so they cannot leak even if a query selects them.
 */
export function toPublicChallenge(challenge: Challenge): PublicChallengeView {
  return {
    id: String(challenge._id),
    title: challenge.title,
    slug: challenge.slug,
    description: challenge.description,
    topic: challenge.topic,
    difficulty: challenge.difficulty,
    constraints: challenge.constraints ?? [],
    examples: challenge.examples ?? [],
    starterCode: pickLanguages(mapToRecord(challenge.starterCode), challenge.supportedLanguages),
    supportedLanguages: challenge.supportedLanguages,
    limits: {
      timeLimitMs: challenge.timeLimitMs,
      memoryLimitMb: challenge.memoryLimitMb,
      outputLimitBytes: challenge.outputLimitBytes,
    },
    points: challenge.points,
    createdAt: iso(challenge.createdAt),
    updatedAt: iso(challenge.updatedAt),
  };
}

export interface AdminChallengeView extends PublicChallengeView {
  status: string;
  rewardPolicyVersion: number;
  hiddenTests: Array<{ name: string | null; stdin: string; expectedStdout: string }>;
  referenceSolutions: Record<string, string>;
}

/** Admin-only view. Requires an explicit `+hiddenTests +referenceSolutions` query. */
export function toAdminChallenge(challenge: Challenge): AdminChallengeView {
  return {
    ...toPublicChallenge(challenge),
    status: challenge.status,
    rewardPolicyVersion: challenge.rewardPolicyVersion,
    hiddenTests: (challenge.hiddenTests ?? []).map((test) => ({
      name: test.name ?? null,
      stdin: test.stdin,
      expectedStdout: test.expectedStdout,
    })),
    referenceSolutions: mapToRecord(challenge.referenceSolutions),
  };
}

export interface SubmissionView {
  id: string;
  challengeId: string;
  userId: string;
  language: string;
  status: string;
  verdict: string | null;
  passedTests: number;
  totalTests: number;
  durationMs: number | null;
  memoryKb: number | null;
  outputPreview: string | null;
  output?: string | null;
  failedTest?: FailedTestInfo | null;
  message: string | null;
  errorMessage?: string | null;
  pointsAwarded: number;
  createdAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  sourceCode?: string;
}

export function toSubmissionView(
  submission: Submission,
  options: { includeSource?: boolean } = {},
): SubmissionView {
  return {
    id: String(submission._id),
    challengeId: String(submission.challengeId),
    userId: String(submission.userId),
    language: submission.language,
    status: submission.status,
    verdict: submission.verdict,
    passedTests: submission.passedTests,
    totalTests: submission.totalTests,
    durationMs: submission.durationMs,
    memoryKb: submission.memoryKb,
    outputPreview: submission.outputPreview,
    output: submission.outputPreview,
    failedTest: submission.failedTest ?? null,
    message: submission.message,
    errorMessage: submission.message,
    pointsAwarded: submission.pointsAwarded,
    createdAt: iso(submission.createdAt),
    startedAt: iso(submission.startedAt),
    completedAt: iso(submission.completedAt),
    ...(options.includeSource && typeof submission.sourceCode === "string"
      ? { sourceCode: submission.sourceCode }
      : {}),
  };
}

export interface PostAuthorView {
  id: string;
  username: string;
  displayName: string | null;
}

export interface PostView {
  id: string;
  title: string;
  slug: string;
  summary: string;
  tags: string[];
  status: string;
  likeCount: number;
  commentCount: number;
  isDemo: boolean;
  publishedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  author: PostAuthorView | null;
  contentMarkdown?: string;
  contentHtml?: string;
}

export function toPostView(
  post: Post,
  author: PostAuthorView | null,
  options: { includeContent?: boolean; contentHtml?: string } = {},
): PostView {
  return {
    id: String(post._id),
    title: post.title,
    slug: post.slug,
    summary: post.summary,
    tags: post.tags ?? [],
    status: post.status,
    likeCount: post.likeCount,
    commentCount: post.commentCount,
    isDemo: post.isDemo,
    publishedAt: iso(post.publishedAt),
    createdAt: iso(post.createdAt),
    updatedAt: iso(post.updatedAt),
    author,
    ...(options.includeContent
      ? {
          contentMarkdown: post.contentMarkdown,
          ...(options.contentHtml ? { contentHtml: options.contentHtml } : {}),
        }
      : {}),
  };
}

export function toCommentView(
  comment: Comment,
  author: PostAuthorView | null,
): {
  id: string;
  postId: string;
  body: string;
  status: string;
  createdAt: string | null;
  author: PostAuthorView | null;
} {
  return {
    id: String(comment._id),
    postId: String(comment.postId),
    body: comment.body,
    status: comment.status,
    createdAt: iso(comment.createdAt),
    author,
  };
}

export function toSessionView(session: RefreshToken): {
  id: string;
  userAgent: string | null;
  ip: string | null;
  createdAt: string | null;
  expiresAt: string | null;
} {
  return {
    id: String(session._id),
    userAgent: session.userAgent ?? null,
    ip: session.ip ?? null,
    createdAt: iso(session.createdAt),
    expiresAt: iso(session.expiresAt),
  };
}
