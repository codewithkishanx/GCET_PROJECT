import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/app/theme-provider'
import { cn } from '@/lib/cn'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const Icon = isDark ? Moon : Sun

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      className={cn(
        'inline-flex size-9 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground',
        className,
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  )
}

/** Small inline hint for docs pages that describe theme behaviour. */
export function ThemeHint() {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Monitor className="size-3.5" aria-hidden="true" />
      Follows your system theme until you toggle it.
    </span>
  )
}
