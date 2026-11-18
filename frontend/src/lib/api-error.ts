export type ApiErrorKind =
  | 'NETWORK'
  | 'TIMEOUT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'RATE_LIMITED'
  | 'SERVER'
  | 'UNKNOWN'

export interface ApiErrorPayload {
  code?: string
  message?: string
  requestId?: string
  details?: Record<string, string[]>
}

/**
 * A single error shape for every failed request. Screens render `message`, and
 * use `kind` to decide between "retry", "sign in", and "you may not do this".
 */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly requestId?: string
  readonly details?: Record<string, string[]>
  readonly kind: ApiErrorKind

  constructor(options: {
    message: string
    status: number
    code?: string
    requestId?: string
    details?: Record<string, string[]>
    kind?: ApiErrorKind
  }) {
    super(options.message)
    this.name = 'ApiError'
    this.status = options.status
    this.code = options.code ?? kindToCode(options.status)
    this.requestId = options.requestId
    this.details = options.details
    this.kind = options.kind ?? statusToKind(options.status)
  }

  /** True when the request never reached the API (offline, DNS, CORS, refused). */
  get isNetworkError(): boolean {
    return this.kind === 'NETWORK' || this.kind === 'TIMEOUT'
  }
}

function kindToCode(status: number): string {
  switch (status) {
    case 0:
      return 'NETWORK_ERROR'
    case 400:
      return 'VALIDATION_ERROR'
    case 401:
      return 'UNAUTHORIZED'
    case 403:
      return 'FORBIDDEN'
    case 404:
      return 'NOT_FOUND'
    case 409:
      return 'CONFLICT'
    case 422:
      return 'VALIDATION_ERROR'
    case 429:
      return 'RATE_LIMITED'
    default:
      return status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_FAILED'
  }
}

export function statusToKind(status: number): ApiErrorKind {
  if (status === 0) return 'NETWORK'
  if (status === 401) return 'UNAUTHORIZED'
  if (status === 403) return 'FORBIDDEN'
  if (status === 404) return 'NOT_FOUND'
  if (status === 429) return 'RATE_LIMITED'
  if (status === 400 || status === 409 || status === 422) return 'VALIDATION'
  if (status >= 500) return 'SERVER'
  return 'UNKNOWN'
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

/** Human copy for the global banner and inline error states. */
export function describeError(error: unknown): string {
  if (isApiError(error)) {
    if (error.kind === 'NETWORK') {
      return 'The API is unreachable. Check that the server is running and the base URL is correct.'
    }
    if (error.kind === 'TIMEOUT') {
      return 'The API took too long to respond. Try again.'
    }
    return error.message
  }
  if (error instanceof Error) return error.message
  return 'Something went wrong.'
}
