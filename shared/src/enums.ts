export const ROLES = ["user", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const USER_STATUSES = ["active", "suspended"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const LANGUAGES = ["python", "javascript", "cpp"] as const;
export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<Language, string> = {
  python: "Python 3.12",
  javascript: "JavaScript (Node 24)",
  cpp: "C++17 (gcc 14)",
};

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const CHALLENGE_STATUSES = ["draft", "published", "archived"] as const;
export type ChallengeStatus = (typeof CHALLENGE_STATUSES)[number];

export const SUBMISSION_STATUSES = ["queued", "running", "completed", "failed"] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const VERDICTS = [
  "ACCEPTED",
  "WRONG_ANSWER",
  "COMPILATION_ERROR",
  "RUNTIME_ERROR",
  "TIME_LIMIT_EXCEEDED",
  "MEMORY_LIMIT_EXCEEDED",
  "OUTPUT_LIMIT_EXCEEDED",
  "SYSTEM_ERROR",
] as const;
export type Verdict = (typeof VERDICTS)[number];

export const POST_STATUSES = ["draft", "published", "hidden", "removed"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export const COMMENT_STATUSES = ["visible", "hidden", "removed"] as const;
export type CommentStatus = (typeof COMMENT_STATUSES)[number];

export const REPORT_TARGET_TYPES = ["post", "comment", "user"] as const;
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

export const REPORT_REASONS = ["spam", "harassment", "plagiarism", "incorrect", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_STATUSES = ["open", "reviewing", "resolved", "dismissed"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const TOPIC_STATUSES = ["draft", "published"] as const;
export type TopicStatus = (typeof TOPIC_STATUSES)[number];
