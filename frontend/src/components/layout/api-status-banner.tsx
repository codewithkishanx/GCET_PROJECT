import { AlertTriangle, RefreshCw } from 'lucide-react'
import { API_BASE_URL } from '@/lib/http'
import { useAuth } from '@/features/auth/auth-context'
import { Button } from '@/components/ui/button'

/**
 * One honest, global signal about backend reachability. It only appears when
 * the session probe actually failed to reach the API — never as decoration.
 */
export function ApiStatusBanner() {
  const { probeError, retryProbe } = useAuth()
  if (!probeError) return null

  return (
    <div className="border-b border-warning/40 bg-warning-soft">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 text-xs text-warning sm:px-6">
        <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
        <p className="min-w-0 flex-1">
          <span className="font-semibold">API unreachable.</span> Live data cannot load. The
          frontend is pointing at <code className="font-mono">{API_BASE_URL}</code> — start the
          backend or set <code className="font-mono">VITE_API_BASE_URL</code>.
        </p>
        <Button
          size="sm"
          variant="ghost"
          icon={RefreshCw}
          onClick={retryProbe}
          className="h-7 text-warning hover:bg-warning/10"
        >
          Retry
        </Button>
      </div>
    </div>
  )
}
