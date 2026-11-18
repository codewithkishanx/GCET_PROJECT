import { ChevronDown } from 'lucide-react'
import { Button } from './button'
import { Spinner } from './skeleton'

/** Cursor pagination: append the next page instead of jumping to a number. */
export function LoadMore({
  hasMore,
  loading,
  onLoad,
  label = 'Load more',
}: {
  hasMore: boolean
  loading?: boolean
  onLoad: () => void
  label?: string
}) {
  if (!hasMore) return null
  return (
    <div className="flex justify-center pt-2">
      {loading ? (
        <Spinner label="Loading more…" />
      ) : (
        <Button variant="secondary" size="sm" icon={ChevronDown} onClick={onLoad}>
          {label}
        </Button>
      )}
    </div>
  )
}
