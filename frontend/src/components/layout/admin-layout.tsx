import { Activity, ArrowLeft, FileText, Flag, LayoutDashboard, Users } from 'lucide-react'
import { Link, Outlet, ScrollRestoration } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/cn'
import { Page } from './public-layout'
import { SiteFooter, SiteHeader } from './site-shell'
import { SideNavLink } from './nav-link'

const nav = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/challenges', label: 'Challenges', icon: FileText },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/reports', label: 'Reports', icon: Flag },
  { to: '/admin/ops', label: 'Operations', icon: Activity },
]

export function AdminLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row">
        <aside className="lg:w-52 lg:shrink-0">
          <div className="lg:sticky lg:top-[4.75rem]">
            <div className="mb-3 flex items-center gap-2 px-1">
              <Badge tone="primary">Admin</Badge>
              <Link
                to="/dashboard"
                className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="size-3" aria-hidden="true" />
                Exit
              </Link>
            </div>
            <nav
              aria-label="Admin"
              className={cn('flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible')}
            >
              {nav.map((item) => (
                <SideNavLink key={item.to} to={item.to} icon={item.icon} end={item.end}>
                  {item.label}
                </SideNavLink>
              ))}
            </nav>
          </div>
        </aside>
        <main id="main" className="min-w-0 flex-1">
          <Page className="!p-0">{<Outlet />}</Page>
        </main>
      </div>
      <SiteFooter />
      <ScrollRestoration />
    </div>
  )
}
