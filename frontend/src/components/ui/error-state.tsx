import { CloudOff, RotateCcw, ServerCrash, ShieldAlert } from 'lucide-react'
import { describeError, isApiError } from '@/lib/api-error'
import { Button } from './button'

export function ErrorState({
  error,
  onRetry,
  compact = false,
}: {
  error: unknown
  onRetry?: () => void
  compact?: boolean
}) {
  const apiError = isApiError(error) ? error : null
  const network = apiError?.isNetworkError ?? false
  const Icon = network ? CloudOff : apiError?.kind === 'FORBIDDEN' ? ShieldAlert : ServerCrash
  const title = network
    ? 'API unreachable'
    : apiError?.kind === 'FORBIDDEN'
      ? 'Not allowed'
      : 'Could not load this'

  return (
    <div
      role="alert"
      className={
        compact
          ? 'flex items-start gap-3 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm'
          : 'card flex flex-col items-center gap-3 px-6 py-12 text-center'
      }
    >
      <Icon
        className={compact ? 'mt-0.5 size-4 shrink-0 text-danger' : 'size-6 text-danger'}
        aria-hidden="true"
      />
      <div className={compact ? 'space-y-0.5' : 'space-y-1'}>
        <p className={compact ? 'font-medium text-danger' : 'text-sm font-semibold'}>{title}</p>
        <p className={compact ? 'text-danger/90' : 'mx-auto max-w-md text-sm text-muted-foreground'}>
          {describeError(error)}
        </p>
        {apiError?.requestId ? (
          <p className="font-mono text-[11px] text-muted-foreground">
            request {apiError.requestId}
          </p>
        ) : null}
      </div>
      {onRetry ? (
        <Button variant="secondary" size="sm" icon={RotateCcw} onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  )
}
