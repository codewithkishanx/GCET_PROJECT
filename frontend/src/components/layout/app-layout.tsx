import {
  BookOpen,
  Code2,
  History,
  LayoutDashboard,
  MessagesSquare,
  Shield,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { Outlet, ScrollRestoration } from 'react-router-dom'
import { useAuth } from '@/features/auth/auth-context'
import { formatNumber } from '@/lib/format'
import { SiteFooter, SiteHeader } from './site-shell'
import { SideNavLink } from './nav-link'

const primary = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/topics', label: 'Learn', icon: BookOpen },
  { to: '/challenges', label: 'Challenges', icon: Code2 },
  { to: '/submissions', label: 'Submissions', icon: History },
  { to: '/community', label: 'Community', icon: MessagesSquare },
  { to: '/profile', label: 'Profile', icon: UserRound },
]

export function AppLayout() {
  const { user, isAdmin } = useAuth()

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <div className="mx-auto flex w-full max-w-[1400px] flex-1 gap-6 px-4 py-6 sm:px-6">
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-[4.75rem] space-y-6">
            <nav aria-label="Workspace" className="space-y-0.5">
              {primary.map((item) => (
                <SideNavLink key={item.to} to={item.to} icon={item.icon} end={item.end}>
                  {item.label}
                </SideNavLink>
              ))}
            </nav>

            {isAdmin ? (
              <div>
                <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Administration
                </p>
                <SideNavLink to="/admin" icon={Shield} end>
                  Admin console
                </SideNavLink>
              </div>
            ) : null}

            {user ? (
              <div className="rounded-xl border border-border bg-surface p-3.5">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Sparkles className="size-3.5" aria-hidden="true" />
                  Your score
                </div>
                <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums">
                  {formatNumber(user.points)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(user.solvedCount)} challenge
                  {user.solvedCount === 1 ? '' : 's'} solved
                </p>
              </div>
            ) : null}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {/* Mobile navigation: horizontally scrollable, no hidden destinations. */}
          <nav
            aria-label="Workspace"
            className="mb-4 -mx-4 flex gap-1 overflow-x-auto px-4 pb-2 lg:hidden"
          >
            {primary.map((item) => (
              <SideNavLink key={item.to} to={item.to} icon={item.icon} end={item.end}>
                {item.label}
              </SideNavLink>
            ))}
            {isAdmin ? (
              <SideNavLink to="/admin" icon={Shield} end>
                Admin
              </SideNavLink>
            ) : null}
          </nav>
          <main id="main">
            <Outlet />
          </main>
        </div>
      </div>
      <SiteFooter />
      <ScrollRestoration />
    </div>
  )
}
