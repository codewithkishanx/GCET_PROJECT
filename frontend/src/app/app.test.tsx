import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { Providers } from './providers'

/**
 * End-to-end-ish shell check: the real providers, the real router and the real
 * landing page, with the API unreachable. This is the state a reviewer sees when
 * the backend is not running, so it must render without throwing and must not
 * invent content.
 */
describe('App shell without an API', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the landing page from local content', async () => {
    render(
      <Providers>
        <App />
      </Providers>,
    )

    expect(
      await screen.findByRole('heading', { name: /see the algorithm/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /start learning/i })).toBeInTheDocument()
    expect(screen.getByText(/\d+ algorithms · \d+ visualiser modes · \d+ topics/)).toBeInTheDocument()
  })

  it('explains that the API is unreachable instead of showing fake data', async () => {
    render(
      <Providers>
        <App />
      </Providers>,
    )

    expect(await screen.findAllByText(/api unreachable/i)).not.toHaveLength(0)
  })
})
