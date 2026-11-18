import { http } from '@/lib/http'
import type { AuthResponse, CurrentUser } from '@/types'

export interface RegisterInput {
  email: string
  username: string
  password: string
}

export interface LoginInput {
  identifier: string
  password: string
}

export const authApi = {
  me: (signal?: AbortSignal) => http.get<AuthResponse>('/auth/me', { signal }),
  login: (input: LoginInput) =>
    http.post<AuthResponse>('/auth/login', {
      identifier: input.identifier,
      usernameOrEmail: input.identifier,
      password: input.password,
    }),
  register: (input: RegisterInput) => http.post<AuthResponse>('/auth/register', input),
  logout: () => http.post<void>('/auth/logout'),
  updateProfile: (input: {
    displayName?: string
    bio?: string
    avatarUrl?: string
  }) => http.patch<{ user: CurrentUser }>('/users/me', input),
}
