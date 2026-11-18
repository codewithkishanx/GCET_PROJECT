import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'
import { isApiError } from '@/lib/api-error'
import { authApi, type LoginInput, type RegisterInput } from '@/services/auth.api'
import { queryKeys } from '@/services/query-keys'
import type { CurrentUser } from '@/types'

type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

interface AuthContextValue {
  user: CurrentUser | null
  status: AuthStatus
  isAdmin: boolean
  /** Set when the session probe failed for a reason other than 401. */
  probeError: unknown
  retryProbe: () => void
  login: (input: LoginInput) => Promise<CurrentUser>
  register: (input: RegisterInput) => Promise<CurrentUser>
  logout: () => Promise<void>
  setUser: (user: CurrentUser | null) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()

  const meQuery = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: async ({ signal }) => {
      try {
        const response = await authApi.me(signal)
        return response.user
      } catch (error) {
        // A missing session is normal, not an error state.
        if (isApiError(error) && error.status === 401) return null
        throw error
      }
    },
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  const setUser = useCallback(
    (user: CurrentUser | null) => {
      queryClient.setQueryData(queryKeys.auth.me, user)
    },
    [queryClient],
  )

  const loginMutation = useMutation({
    mutationFn: (input: LoginInput) => authApi.login(input),
    onSuccess: (response) => setUser(response.user),
  })

  const registerMutation = useMutation({
    mutationFn: (input: RegisterInput) => authApi.register(input),
    onSuccess: (response) => setUser(response.user),
  })

  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      setUser(null)
      // Any cached resource may have been scoped to the previous user.
      queryClient.removeQueries({ queryKey: ['submissions'] })
      queryClient.removeQueries({ queryKey: ['admin'] })
      queryClient.removeQueries({ queryKey: ['posts'] })
    },
  })

  const value = useMemo<AuthContextValue>(() => {
    const user = meQuery.data ?? null
    return {
      user,
      status: meQuery.isPending ? 'loading' : user ? 'authenticated' : 'anonymous',
      isAdmin: user?.role === 'admin',
      probeError: meQuery.error,
      retryProbe: () => void meQuery.refetch(),
      login: async (input) => (await loginMutation.mutateAsync(input)).user,
      register: async (input) => (await registerMutation.mutateAsync(input)).user,
      logout: async () => {
        await logoutMutation.mutateAsync()
      },
      setUser,
    }
  }, [meQuery, loginMutation, registerMutation, logoutMutation, setUser])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}
