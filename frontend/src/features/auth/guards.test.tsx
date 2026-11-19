import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api-error'
import type { CurrentUser } from '@/types'
import { RedirectIfAuthenticated, RequireAuth, RequireRole } from './guards'
import { useAuth } from './auth-context'

vi.mock('./auth-context', () => ({ useAuth: vi.fn() }))

type AuthState = {
  user: CurrentUser | null
  status: 'loading' | 'authenticated' | 'anonymous'
  probeError?: unknown
}

const anonymous: AuthState = { user: null, status: 'anonymous' }
const member: AuthState = {
  user: {
    id: 'u1',
    username: 'ada',
    email: 'ada@example.com',
    role: 'user',
    status: 'active',
    points: 10,
    solvedCount: 1,
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  status: 'authenticated',
}
const admin: AuthState = {
  ...member,
  user: { ...member.user!, role: 'admin' },
}

function mockAuth(state: AuthState) {
  vi.mocked(useAuth).mockReturnValue({
    ...state,
    isAdmin: state.user?.role === 'admin',
    probeError: state.probeError ?? null,
    retryProbe: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    setUser: vi.fn(),
  } as unknown as ReturnType<typeof useAuth>)
}

function renderAt(path: string, element: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<p>login screen</p>} />
        <Route path="/dashboard" element={<p>dashboard screen</p>} />
        <Route path="/forbidden" element={<p>forbidden screen</p>} />
        <Route path="/protected" element={element} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RequireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a session check while the probe is pending', () => {
    mockAuth({ user: null, status: 'loading' })
    renderAt('/protected', <RequireAuth>secret</RequireAuth>)
    expect(screen.getByText(/checking your session/i)).toBeInTheDocument()
    expect(screen.queryByText('secret')).not.toBeInTheDocument()
  })

  it('renders children for a signed-in user', () => {
    mockAuth(member)
    renderAt('/protected', <RequireAuth>secret</RequireAuth>)
    expect(screen.getByText('secret')).toBeInTheDocument()
  })

  it('redirects anonymous visitors to the login screen', () => {
    mockAuth(anonymous)
    renderAt('/protected', <RequireAuth>secret</RequireAuth>)
    expect(screen.getByText('login screen')).toBeInTheDocument()
    expect(screen.queryByText('secret')).not.toBeInTheDocument()
  })

  it('explains an unreachable API instead of pretending the user is signed out', () => {
    mockAuth({
      user: null,
      status: 'anonymous',
      probeError: new ApiError({ status: 0, kind: 'NETWORK', message: 'offline' }),
    })
    renderAt('/protected', <RequireAuth>secret</RequireAuth>)
    expect(screen.getByText('Backend not working')).toBeInTheDocument()
    expect(screen.queryByText('login screen')).not.toBeInTheDocument()
  })
})

describe('RequireRole', () => {
  it('allows an administrator through', () => {
    mockAuth(admin)
    renderAt(
      '/protected',
      <RequireRole role="admin">admin panel</RequireRole>,
    )
    expect(screen.getByText('admin panel')).toBeInTheDocument()
  })

  it('sends a non-admin to the forbidden page', () => {
    mockAuth(member)
    renderAt(
      '/protected',
      <RequireRole role="admin">admin panel</RequireRole>,
    )
    expect(screen.getByText('forbidden screen')).toBeInTheDocument()
    expect(screen.queryByText('admin panel')).not.toBeInTheDocument()
  })

  it('sends anonymous visitors to login', () => {
    mockAuth(anonymous)
    renderAt(
      '/protected',
      <RequireRole role="admin">admin panel</RequireRole>,
    )
    expect(screen.getByText('login screen')).toBeInTheDocument()
  })
})

describe('RedirectIfAuthenticated', () => {
  it('keeps signed-in users away from the login form', () => {
    mockAuth(member)
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/dashboard" element={<p>dashboard screen</p>} />
          <Route
            path="/login"
            element={
              <RedirectIfAuthenticated>
                <p>login form</p>
              </RedirectIfAuthenticated>
            }
          />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('dashboard screen')).toBeInTheDocument()
  })

  it('shows the form to anonymous visitors', () => {
    mockAuth(anonymous)
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route
            path="/login"
            element={
              <RedirectIfAuthenticated>
                <p>login form</p>
              </RedirectIfAuthenticated>
            }
          />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('login form')).toBeInTheDocument()
  })
})
