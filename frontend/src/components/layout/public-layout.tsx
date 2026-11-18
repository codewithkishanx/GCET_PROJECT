import { Outlet, ScrollRestoration } from 'react-router-dom'
import { SiteFooter, SiteHeader } from './site-shell'

export function PublicLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
      <ScrollRestoration />
    </div>
  )
}

/** Shared page container with a consistent max width and vertical rhythm. */
export function Page({
  children,
  wide = false,
  className,
}: {
  children: React.ReactNode
  wide?: boolean
  className?: string
}) {
  return (
    <div
      className={
        (wide ? 'max-w-[1400px]' : 'max-w-7xl') +
        ' mx-auto px-4 py-6 sm:px-6 sm:py-8 ' +
        (className ?? '')
      }
    >
      {children}
    </div>
  )
}
