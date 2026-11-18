import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

export function TableWrap({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('card overflow-x-auto', className)}
      // Region so keyboards can reach the scrollable table on narrow screens.
      tabIndex={0}
      role="region"
      aria-label="Table"
      {...props}
    />
  )
}

export function Table({ className, ...props }: ComponentProps<'table'>) {
  return <table className={cn('w-full border-collapse text-sm', className)} {...props} />
}

export function Th({ className, ...props }: ComponentProps<'th'>) {
  return (
    <th
      scope="col"
      className={cn(
        'border-b border-border bg-surface-sunken px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}

export function Td({ className, ...props }: ComponentProps<'td'>) {
  return (
    <td
      className={cn('border-b border-border px-4 py-3 align-middle last:border-0', className)}
      {...props}
    />
  )
}
