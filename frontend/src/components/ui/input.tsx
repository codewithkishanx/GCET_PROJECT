import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

const controlClasses =
  'w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-foreground placeholder:text-muted-foreground/60 ' +
  'transition-all duration-150 ease-out hover:border-border-strong ' +
  'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ' +
  'disabled:cursor-not-allowed disabled:opacity-50 ' +
  'aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/20'

export function Input({
  className,
  invalid,
  ...props
}: ComponentProps<'input'> & { invalid?: boolean }) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(controlClasses, 'h-10', className)}
      {...props}
    />
  )
}

export function Textarea({
  className,
  invalid,
  ...props
}: ComponentProps<'textarea'> & { invalid?: boolean }) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={cn(controlClasses, 'min-h-28 py-2.5 leading-relaxed', className)}
      {...props}
    />
  )
}

export function Select({
  className,
  invalid,
  children,
  ...props
}: ComponentProps<'select'> & { invalid?: boolean }) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={cn(controlClasses, 'h-10 cursor-pointer pr-8', className)}
      {...props}
    >
      {children}
    </select>
  )
}

export function Checkbox({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      type="checkbox"
      className={cn(
        'size-4 cursor-pointer rounded-md border-border text-primary accent-[var(--primary)] transition-transform active:scale-95',
        className,
      )}
      {...props}
    />
  )
}
