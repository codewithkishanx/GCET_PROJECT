import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { ApiStatusBanner } from './api-status-banner'
import { Logo } from './logo'
import { TopNavLink } from './nav-link'
import { ThemeToggle } from './theme-toggle'
import { UserMenu } from './user-menu'

const links = [
  { to: '/topics', label: 'Learn' },
  { to: '/challenges', label: 'Challenges' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/community', label: 'Community' },
]

export function SiteHeader() {
  const { user } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="glass-header sticky top-0 z-30">
      <ApiStatusBanner />
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Logo />

        <nav aria-label="Main" className="ml-6 hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <TopNavLink key={link.to} to={link.to}>
              {link.label}
            </TopNavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <UserMenu />
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link
                to="/login"
                className="rounded-full px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-all duration-150 hover:bg-foreground/[0.04] hover:text-foreground active:scale-[0.97]"
              >
                Sign in
              </Link>
              <Link to="/register">
                <Button size="sm">Create account</Button>
              </Link>
            </div>
          )}
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            className="inline-flex size-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition-transform active:scale-[0.96] md:hidden"
          >
            {mobileOpen ? (
              <X className="size-4" aria-hidden="true" />
            ) : (
              <Menu className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-border bg-background/95 px-4 py-3 backdrop-blur-xl md:hidden">
          <nav aria-label="Mobile" className="flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-sunken"
              >
                {link.label}
              </Link>
            ))}
            {!user ? (
              <div className="mt-2 flex gap-2 border-t border-border pt-3">
                <Link to="/login" className="flex-1" onClick={() => setMobileOpen(false)}>
                  <Button variant="secondary" className="w-full">
                    Sign in
                  </Button>
                </Link>
                <Link to="/register" className="flex-1" onClick={() => setMobileOpen(false)}>
                  <Button className="w-full">Create account</Button>
                </Link>
              </div>
            ) : null}
          </nav>
        </div>
      ) : null}
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-10 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <Logo compact />
          <span className="text-muted-foreground">
            Step through data structures deterministically, verify logic in sandbox, explain your craft.
          </span>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-5 text-xs">
          <Link to="/topics" className="transition-colors hover:text-foreground">
            Learn
          </Link>
          <Link to="/challenges" className="transition-colors hover:text-foreground">
            Challenges
          </Link>
          <Link to="/leaderboard" className="transition-colors hover:text-foreground">
            Leaderboard
          </Link>
          <Link to="/community" className="transition-colors hover:text-foreground">
            Community
          </Link>
          <span className="font-mono text-[11px] text-muted-foreground/60">v1.0</span>
        </nav>
      </div>
    </footer>
  )
}
