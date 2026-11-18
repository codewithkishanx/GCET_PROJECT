import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { ThemeProvider, useTheme } from './theme-provider'

const STORAGE_KEY = 'dsa-arcade.theme'

type MediaListener = (event: { matches: boolean }) => void

/** A matchMedia stub whose listeners the test can fire. */
function installMatchMedia(initiallyDark: boolean) {
  const listeners = new Set<MediaListener>()
  let matches = initiallyDark

  window.matchMedia = ((query: string) => ({
    get matches() {
      return matches
    },
    media: query,
    onchange: null,
    addEventListener: (_type: string, listener: MediaListener) => listeners.add(listener),
    removeEventListener: (_type: string, listener: MediaListener) => listeners.delete(listener),
    addListener: (listener: MediaListener) => listeners.add(listener),
    removeListener: (listener: MediaListener) => listeners.delete(listener),
    dispatchEvent: () => true,
  })) as unknown as typeof window.matchMedia

  return {
    emit(next: boolean) {
      matches = next
      act(() => {
        for (const listener of listeners) listener({ matches: next })
      })
    },
  }
}

function Probe() {
  const { theme, toggleTheme } = useTheme()
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button type="button" onClick={toggleTheme}>
        toggle
      </button>
    </div>
  )
}

function renderProvider() {
  return render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
  )
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
  })

  it('does not persist anything on a first visit', () => {
    installMatchMedia(true)
    // The inline head script mirrors the OS preference onto <html> before React runs.
    document.documentElement.className = 'dark'
    renderProvider()

    expect(screen.getByTestId('theme')).toHaveTextContent('dark')
    expect(document.documentElement).toHaveClass('dark')
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('persists an explicit choice and updates the document', async () => {
    installMatchMedia(true)
    document.documentElement.className = 'dark'
    const user = userEvent.setup()
    renderProvider()

    await user.click(screen.getByRole('button', { name: 'toggle' }))

    expect(screen.getByTestId('theme')).toHaveTextContent('light')
    expect(document.documentElement).not.toHaveClass('dark')
    expect(localStorage.getItem(STORAGE_KEY)).toBe('light')
  })

  it('follows the operating system until the user chooses', () => {
    const media = installMatchMedia(false)
    renderProvider()
    expect(screen.getByTestId('theme')).toHaveTextContent('light')

    media.emit(true)
    expect(screen.getByTestId('theme')).toHaveTextContent('dark')
    expect(document.documentElement).toHaveClass('dark')
  })

  it('stops following the operating system after an explicit choice', async () => {
    const media = installMatchMedia(false)
    const user = userEvent.setup()
    renderProvider()

    await user.click(screen.getByRole('button', { name: 'toggle' }))
    expect(screen.getByTestId('theme')).toHaveTextContent('dark')

    media.emit(false)
    expect(screen.getByTestId('theme')).toHaveTextContent('dark')
  })

  it('starts from the stored choice rather than the OS', () => {
    localStorage.setItem(STORAGE_KEY, 'light')
    installMatchMedia(true)
    document.documentElement.className = 'dark'

    renderProvider()
    expect(screen.getByTestId('theme')).toHaveTextContent('light')
    expect(document.documentElement).not.toHaveClass('dark')
  })
})
