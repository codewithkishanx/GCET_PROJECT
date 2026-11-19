import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, describeError, isApiError, statusToKind } from '@/lib/api-error'
import { API_BASE_URL, http } from '@/lib/http'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('ApiError', () => {
  it('derives a kind from the status code', () => {
    expect(new ApiError({ status: 0, message: 'x' }).kind).toBe('NETWORK')
    expect(new ApiError({ status: 401, message: 'x' }).kind).toBe('UNAUTHORIZED')
    expect(new ApiError({ status: 403, message: 'x' }).kind).toBe('FORBIDDEN')
    expect(new ApiError({ status: 404, message: 'x' }).kind).toBe('NOT_FOUND')
    expect(new ApiError({ status: 422, message: 'x' }).kind).toBe('VALIDATION')
    expect(new ApiError({ status: 429, message: 'x' }).kind).toBe('RATE_LIMITED')
    expect(new ApiError({ status: 500, message: 'x' }).kind).toBe('SERVER')
  })

  it('flags network and timeout errors', () => {
    expect(new ApiError({ status: 0, kind: 'NETWORK', message: 'x' }).isNetworkError).toBe(true)
    expect(new ApiError({ status: 0, kind: 'TIMEOUT', message: 'x' }).isNetworkError).toBe(true)
    expect(new ApiError({ status: 500, message: 'x' }).isNetworkError).toBe(false)
  })

  it('maps statuses to kinds exhaustively enough for the UI', () => {
    expect(statusToKind(418)).toBe('UNKNOWN')
    expect(statusToKind(503)).toBe('SERVER')
  })

  it('explains network errors without leaking internals', () => {
    const message = describeError(new ApiError({ status: 0, kind: 'NETWORK', message: 'raw' }))
    expect(message).toContain('Backend not working')
    expect(message).not.toContain('raw')
  })

  it('passes through server-authored messages', () => {
    expect(describeError(new ApiError({ status: 409, message: 'Slug taken' }))).toBe('Slug taken')
  })

  it('narrows unknown errors', () => {
    expect(isApiError(new Error('x'))).toBe(false)
    expect(isApiError(new ApiError({ status: 500, message: 'x' }))).toBe(true)
  })
})

describe('http client', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('builds the URL from the configured base and skips empty query values', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }))
    await http.get('/challenges', {
      query: { difficulty: 'easy', search: '', cursor: undefined, limit: 20 },
    })

    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url.startsWith(API_BASE_URL)).toBe(true)
    expect(url).toContain('difficulty=easy')
    expect(url).toContain('limit=20')
    expect(url).not.toContain('search=')
    expect(url).not.toContain('cursor=')
  })

  it('sends JSON bodies with the right content type and credentials', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: '1' }))
    await http.post('/posts', { title: 'Hello' })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${API_BASE_URL}/posts`)
    expect(init.method).toBe('POST')
    expect(init.credentials).toBe('include')
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json')
    expect(init.body).toBe(JSON.stringify({ title: 'Hello' }))
  })

  it('returns undefined for 204 responses', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    await expect(http.delete('/posts/1')).resolves.toBeUndefined()
  })

  it('maps a JSON error envelope to ApiError', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        { error: { code: 'SLUG_TAKEN', message: 'That slug is taken', requestId: 'req-1' } },
        409,
      ),
    )

    const error = await http.post('/posts', {}).catch((caught: unknown) => caught)
    expect(isApiError(error)).toBe(true)
    if (!isApiError(error)) throw new Error('expected ApiError')
    expect(error.status).toBe(409)
    expect(error.code).toBe('SLUG_TAKEN')
    expect(error.message).toBe('That slug is taken')
    expect(error.requestId).toBe('req-1')
    expect(error.kind).toBe('VALIDATION')
  })

  it('falls back to status copy for non-JSON error bodies', async () => {
    fetchMock.mockResolvedValue(new Response('gateway down', { status: 502 }))
    const error = await http.get('/x').catch((caught: unknown) => caught)
    expect(isApiError(error) && error.message).toBe('The server ran into a problem.')
  })

  it('reports an unreadable success body instead of returning garbage', async () => {
    fetchMock.mockResolvedValue(new Response('not json', { status: 200 }))
    const error = await http.get('/x').catch((caught: unknown) => caught)
    expect(isApiError(error) && error.code).toBe('INVALID_RESPONSE')
  })

  it('turns a refused connection into a network error', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const error = await http.get('/x').catch((caught: unknown) => caught)
    expect(isApiError(error) && error.kind).toBe('NETWORK')
    expect(describeError(error)).toContain('Backend not working')
  })

  it('distinguishes caller cancellation from a timeout', async () => {
    const controller = new AbortController()
    controller.abort()
    fetchMock.mockImplementation(() => Promise.reject(new DOMException('aborted', 'AbortError')))

    const error = await http
      .get('/x', { signal: controller.signal })
      .catch((caught: unknown) => caught)
    expect(isApiError(error) && error.message).toBe('Request cancelled.')
  })
})
