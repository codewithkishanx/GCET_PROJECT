import { ChevronDown, LayoutDashboard, LogOut, Shield, User as UserIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/features/auth/auth-context'
import { cn } from '@/lib/cn'
import { initials } from '@/lib/format'

export function UserMenu() {
  const { user, logout, isAdmin } = useAuth()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { toast } = useToast()

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (!user) return null

  const handleLogout = async () => {
    setPending(true)
    try {
      await logout()
      toast({ title: 'Signed out', tone: 'info' })
      navigate('/')
    } catch {
      toast({ title: 'Could not sign out', description: 'The API did not respond.', tone: 'error' })
    } finally {
      setPending(false)
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-lg border border-border bg-surface py-1 pl-1 pr-2 text-sm transition-colors hover:border-border-strong"
      >
        <span className="grid size-7 place-items-center overflow-hidden rounded-md bg-primary-soft text-xs font-semibold text-primary">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="size-full object-cover" />
          ) : (
            initials(user.displayName ?? user.username)
          )}
        </span>
        <span className="hidden max-w-28 truncate font-medium sm:block">
          {user.displayName ?? user.username}
        </span>
        <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Account"
          className="animate-fade-in absolute right-0 z-40 mt-2 w-52 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-xl"
        >
          <div className="border-b border-border px-3 py-2">
            <p className="truncate text-sm font-medium">@{user.username}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
          <MenuLink to="/dashboard" icon={LayoutDashboard} onClick={() => setOpen(false)}>
            Dashboard
          </MenuLink>
          <MenuLink to="/profile" icon={UserIcon} onClick={() => setOpen(false)}>
            Profile settings
          </MenuLink>
          {isAdmin ? (
            <MenuLink to="/admin" icon={Shield} onClick={() => setOpen(false)}>
              Admin
            </MenuLink>
          ) : null}
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            disabled={pending}
            className="mt-1 flex w-full items-center gap-2 border-t border-border px-3 py-2 text-left text-sm text-danger transition-colors hover:bg-danger-soft disabled:opacity-50"
          >
            <LogOut className="size-4" aria-hidden="true" />
            {pending ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      ) : null}
    </div>
  )
}

function MenuLink({
  to,
  icon: Icon,
  children,
  onClick,
}: {
  to: string
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <Link
      to={to}
      role="menuitem"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface-sunken',
      )}
    >
      <Icon className="size-4 text-muted-foreground" aria-hidden={true} />
      {children}
    </Link>
  )
}
