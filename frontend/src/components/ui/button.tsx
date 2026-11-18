import type { LucideIcon } from 'lucide-react'
import { Loader2 } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
type Size = 'sm' | 'md' | 'lg' | 'icon'

const variants: Record<Variant, string> = {
  primary:
    'bg-primary text-primary-foreground hover:brightness-105 active:scale-[0.975] shadow-sm disabled:opacity-45',
  secondary:
    'bg-surface text-foreground border border-border hover:bg-surface-sunken active:scale-[0.975] disabled:opacity-45',
  ghost: 'bg-transparent text-foreground hover:bg-surface-sunken active:scale-[0.975] disabled:opacity-45',
  danger: 'bg-danger text-white hover:brightness-105 active:scale-[0.975] disabled:opacity-45',
  success: 'bg-success text-white hover:brightness-105 active:scale-[0.975] disabled:opacity-45',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 gap-1.5 px-3 text-xs rounded-lg',
  md: 'h-9.5 gap-2 px-4 text-sm rounded-xl',
  lg: 'h-11 gap-2.5 px-5 text-sm rounded-xl font-medium',
  icon: 'h-9 w-9 justify-center rounded-xl',
}

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: LucideIcon
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex select-none items-center justify-center font-medium tracking-tight',
        'transition-[transform,background,opacity,box-shadow,border-color] duration-100 ease-out',
        'disabled:cursor-not-allowed disabled:transform-none',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
      ) : Icon ? (
        <Icon className="size-4 shrink-0" aria-hidden="true" />
      ) : null}
      {children}
    </button>
  )
}
