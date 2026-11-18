import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/cn'

type ToastTone = 'success' | 'error' | 'info' | 'warning'

interface ToastItem {
  id: number
  title: string
  description?: string
  tone: ToastTone
}

interface ToastApi {
  toast: (input: { title: string; description?: string; tone?: ToastTone }) => void
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const tones: Record<ToastTone, { icon: typeof Info; classes: string }> = {
  success: { icon: CheckCircle2, classes: 'border-success/40 bg-success-soft text-success' },
  error: { icon: XCircle, classes: 'border-danger/40 bg-danger-soft text-danger' },
  warning: { icon: AlertTriangle, classes: 'border-warning/40 bg-warning-soft text-warning' },
  info: { icon: Info, classes: 'border-info/40 bg-info-soft text-info' },
}

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id))
  }, [])

  const toast = useCallback<ToastApi['toast']>(
    ({ title, description, tone = 'info' }) => {
      const id = nextId++
      setItems((current) => [...current.slice(-3), { id, title, description, tone }])
      window.setTimeout(() => dismiss(id), 6000)
    },
    [dismiss],
  )

  const api = useMemo(() => ({ toast, dismiss }), [toast, dismiss])

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div
          className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end"
          aria-live="polite"
          aria-atomic="false"
        >
          {items.map((item) => {
            const { icon: Icon, classes } = tones[item.tone]
            return (
              <div
                key={item.id}
                className={cn(
                  'animate-fade-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-3.5 py-3 shadow-lg',
                  classes,
                )}
              >
                <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{item.title}</p>
                  {item.description ? (
                    <p className="mt-0.5 text-xs text-foreground/80">{item.description}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(item.id)}
                  aria-label="Dismiss notification"
                  className="rounded p-0.5 opacity-70 hover:opacity-100"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            )
          })}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside <ToastProvider>')
  return context
}
