import { AlertTriangle, ArrowLeft, Home, ShieldX } from 'lucide-react'
import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Page } from '@/components/layout/public-layout'

export function NotFoundPage() {
  return (
    <Page className="!max-w-xl">
      <div className="card mt-10 flex flex-col items-center gap-3 p-10 text-center">
        <span className="font-mono text-4xl font-bold text-muted-foreground">404</span>
        <h1 className="text-lg font-semibold">This page does not exist</h1>
        <p className="text-sm text-muted-foreground">
          The link may be outdated, or the resource was removed. Try the topic index or the
          challenge catalogue.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Link to="/">
            <Button icon={Home}>Home</Button>
          </Link>
          <Link to="/topics">
            <Button variant="secondary">Browse topics</Button>
          </Link>
        </div>
      </div>
    </Page>
  )
}

export function ForbiddenPage() {
  return (
    <Page className="!max-w-xl">
      <div className="card mt-10 flex flex-col items-center gap-3 p-10 text-center">
        <ShieldX className="size-8 text-danger" aria-hidden="true" />
        <h1 className="text-lg font-semibold">You do not have access</h1>
        <p className="text-sm text-muted-foreground">
          This area requires an administrator role. Hiding navigation is not security — the API
          rejects unauthorised requests regardless of what the browser shows.
        </p>
        <Link to="/dashboard" className="mt-2">
          <Button variant="secondary" icon={ArrowLeft}>
            Back to dashboard
          </Button>
        </Link>
      </div>
    </Page>
  )
}

export function RouteErrorPage() {
  const error = useRouteError()
  const status = isRouteErrorResponse(error) ? error.status : null
  const message = isRouteErrorResponse(error)
    ? error.statusText || error.data
    : error instanceof Error
      ? error.message
      : 'An unexpected error occurred.'

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="card w-full max-w-lg p-8 text-center">
        <AlertTriangle className="mx-auto size-7 text-danger" aria-hidden="true" />
        <h1 className="mt-3 text-lg font-semibold">
          {status ? `Error ${status}` : 'Something broke while rendering'}
        </h1>
        <p className="mt-1 break-words text-sm text-muted-foreground">
          {typeof message === 'string' ? message : 'An unexpected error occurred.'}
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Reload
          </Button>
          <Link to="/">
            <Button>Home</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
