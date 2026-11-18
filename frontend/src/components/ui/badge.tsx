import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info'

const tones: Record<Tone, string> = {
  neutral: 'bg-surface-sunken text-muted-foreground border-border',
  primary: 'bg-primary-soft text-primary border-primary/25',
  success: 'bg-success-soft text-success border-success/25',
  warning: 'bg-warning-soft text-warning border-warning/25',
  danger: 'bg-danger-soft text-danger border-danger/25',
  info: 'bg-info-soft text-info border-info/25',
}

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: ComponentProps<'span'> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-tight',
        tones[tone],
        className,
      )}
      {...props}
    />
  )
}
