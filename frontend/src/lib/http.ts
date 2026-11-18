import { ApiError, type ApiErrorPayload } from './api-error'

/**
 * Base URL for the Express API. Nothing secret lives in a Vite env var — this
 * value is compiled into the bundle, so it may only ever be a public origin.
 */
export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:4000/api/v1'

export const REQUEST_TIMEOUT_MS = 15_000

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
  query?: Record<string, string | number | boolean | undefined | null>
  timeoutMs?: number
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue
      url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

async function parseError(response: Response): Promise<ApiError> {
  let payload: ApiErrorPayload = {}
  try {
    const text = await response.text()
    if (text) {
      const parsed: unknown = JSON.parse(text)
      if (parsed && typeof parsed === 'object') {
        const maybe = parsed as { error?: ApiErrorPayload } & ApiErrorPayload
        payload = maybe.error ?? maybe
      }
    }
  } catch {
    // Non-JSON error body: fall through to status-based copy.
  }

  return new ApiError({
    status: response.status,
    message: payload.message ?? defaultMessage(response.status),
    code: payload.code,
    requestId: payload.requestId,
    details: payload.details,
  })
}

function defaultMessage(status: number): string {
  switch (status) {
    case 400:
      return 'The request was invalid.'
    case 401:
      return 'You need to sign in to do that.'
    case 403:
      return 'You do not have permission to do that.'
    case 404:
      return 'We could not find what you asked for.'
    case 409:
      return 'That change conflicts with existing data.'
    case 429:
      return 'Too many requests. Please slow down and try again.'
    default:
      return status >= 500 ? 'The server ran into a problem.' : 'The request failed.'
  }
}

function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|;\s*)dsa_csrf=([^;]+)/)
  return match?.[1] ? decodeURIComponent(match[1]) : null
}

/**
 * Thin typed fetch wrapper. Credentials are always included because the API
 * uses http-only cookie sessions; CSRF is echoed on state-changing requests.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal, query, timeoutMs = REQUEST_TIMEOUT_MS } = options

  const timeoutController = new AbortController()
  const timeout = setTimeout(() => timeoutController.abort(), timeoutMs)
  const signals = signal
    ? [signal, timeoutController.signal]
    : [timeoutController.signal]

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (method !== 'GET') {
    const csrfToken = getCsrfToken()
    if (csrfToken) headers['X-CSRF-Token'] = csrfToken
  }

  let response: Response
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.any(signals),
    })
  } catch (error) {
    clearTimeout(timeout)
    const aborted = error instanceof DOMException && error.name === 'AbortError'
    const callerAborted = signal?.aborted ?? false
    if (callerAborted) {
      throw new ApiError({ status: 0, kind: 'NETWORK', message: 'Request cancelled.' })
    }
    throw new ApiError({
      status: 0,
      kind: aborted ? 'TIMEOUT' : 'NETWORK',
      message: aborted ? 'The request timed out.' : 'Could not reach the API.',
    })
  } finally {
    clearTimeout(timeout)
  }

  if (response.status === 204) return undefined as T

  if (!response.ok) throw await parseError(response)

  const text = await response.text()
  if (!text) return undefined as T
  try {
    return JSON.parse(text) as T
  } catch {
    throw new ApiError({
      status: response.status,
      code: 'INVALID_RESPONSE',
      message: 'The server returned a response we could not read.',
    })
  }
}

export const http = {
  get: <T,>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T,>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method'>) =>
    request<T>(path, { ...options, method: 'POST', body }),
  patch: <T,>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method'>) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T,>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'DELETE' }),
}
