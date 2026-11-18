import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/cn'

export function TopNavLink({
  to,
  children,
  end,
}: {
  to: string
  children: React.ReactNode
  end?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'rounded-full px-3 py-1.5 text-xs font-medium tracking-tight transition-all duration-150 active:scale-[0.97]',
          isActive
            ? 'bg-foreground/[0.08] text-foreground font-semibold'
            : 'text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]',
        )
      }
    >
      {children}
    </NavLink>
  )
}

export function SideNavLink({
  to,
  children,
  icon: Icon,
  end,
  onNavigate,
}: {
  to: string
  children: React.ReactNode
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  end?: boolean
  onNavigate?: () => void
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium tracking-tight transition-all duration-150 active:scale-[0.98]',
          isActive
            ? 'bg-foreground/[0.08] text-foreground font-semibold'
            : 'text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]',
        )
      }
    >
      <Icon className="size-4 shrink-0" aria-hidden={true} />
      <span>{children}</span>
    </NavLink>
  )
}
