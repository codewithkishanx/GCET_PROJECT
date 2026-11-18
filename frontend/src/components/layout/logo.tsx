import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link
      to="/"
      className={cn('group inline-flex items-center gap-2.5 rounded-xl transition-transform active:scale-[0.98]', className)}
      aria-label="DSA Arcade home"
    >
      <span className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <svg viewBox="0 0 24 24" className="size-4.5" aria-hidden="true" fill="none">
          <path
            d="M4 17.5 9 7l4 7 3-4.5 4 8"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="9" cy="7" r="1.9" fill="currentColor" />
        </svg>
      </span>
      {compact ? null : (
        <span className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight">DSA Arcade</span>
          <span className="text-[11px] text-muted-foreground">
            Interactive algorithms
          </span>
        </span>
      )}
    </Link>
  )
}
