import type { LucideIcon } from 'lucide-react'
import { useId, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface TabItem {
  id: string
  label: string
  icon?: LucideIcon
  disabled?: boolean
}

export function Tabs({
  items,
  value,
  onChange,
  children,
  className,
  panelClassName,
}: {
  items: TabItem[]
  value: string
  onChange: (id: string) => void
  children: ReactNode
  className?: string
  panelClassName?: string
}) {
  const baseId = useId()
  const listRef = useRef<HTMLDivElement>(null)

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const enabled = items.filter((item) => !item.disabled)
    if (enabled.length === 0) return
    const currentIndex = enabled.findIndex((item) => item.id === value)
    let nextIndex = currentIndex
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % enabled.length
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + enabled.length) % enabled.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = enabled.length - 1
    const next = enabled[nextIndex]
    if (!next) return
    onChange(next.id)
    requestAnimationFrame(() => {
      listRef.current?.querySelector<HTMLElement>(`#${CSS.escape(`${baseId}-tab-${next.id}`)}`)?.focus()
    })
  }

  return (
    <div className={className}>
      <div
        ref={listRef}
        role="tablist"
        aria-label="Sections"
        onKeyDown={onKeyDown}
        className="flex flex-wrap gap-1 border-b border-border"
      >
        {items.map((item) => {
          const selected = item.id === value
          const Icon = item.icon
          return (
            <button
              key={item.id}
              id={`${baseId}-tab-${item.id}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`${baseId}-panel`}
              tabIndex={selected ? 0 : -1}
              disabled={item.disabled}
              onClick={() => onChange(item.id)}
              className={cn(
                'relative -mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
                selected
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:border-border-strong hover:text-foreground',
                item.disabled && 'cursor-not-allowed opacity-40',
              )}
            >
              {Icon ? <Icon className="size-4" aria-hidden="true" /> : null}
              {item.label}
            </button>
          )
        })}
      </div>
      <div
        id={`${baseId}-panel`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${value}`}
        className={cn('pt-4', panelClassName)}
      >
        {children}
      </div>
    </div>
  )
}
