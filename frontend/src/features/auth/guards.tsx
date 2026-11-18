import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { ErrorState } from '@/components/ui/error-state'
import { Spinner } from '@/components/ui/skeleton'
import { useAuth } from './auth-context'

function AuthLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner label="Checking your session…" />
    </div>
  )
}

/**
 * Route guard. Client-side guards are a UX affordance only — every protected
 * API call is still authorized server-side.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, user, probeError, retryProbe } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <AuthLoading />
  if (!user && probeError) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <ErrorState error={probeError} onRetry={retryProbe} />
      </div>
    )
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
  }
  return <>{children}</>
}

export function RequireRole({
  role,
  children,
}: {
  role: 'admin'
  children: ReactNode
}) {
  const { user, status, probeError, retryProbe } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <AuthLoading />
  if (!user && probeError) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <ErrorState error={probeError} onRetry={retryProbe} />
      </div>
    )
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (user.role !== role) return <Navigate to="/forbidden" replace />
  return <>{children}</>
}

/** Redirects signed-in users away from login/register. */
export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const { user, status } = useAuth()
  if (status === 'loading') return <AuthLoading />
  if (user) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}
