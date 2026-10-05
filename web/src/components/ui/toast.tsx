import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface ToastItem {
  id: number
  title: string
  description?: string
  variant?: 'success' | 'error' | 'info'
}

interface ToastContextValue {
  toast: (input: Omit<ToastItem, 'id'>) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const toast = useCallback((input: Omit<ToastItem, 'id'>) => {
    const id = Date.now() + Math.random()
    setItems((current) => [...current, { id, ...input }])
    window.setTimeout(() => {
      setItems((current) => current.filter((item) => item.id !== id))
    }, 4000)
  }, [])

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-full max-w-sm flex-col gap-3">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              'rounded-2xl border px-4 py-3 shadow-lg pointer-events-auto',
              item.variant === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-800',
              item.variant === 'error' && 'border-rose-200 bg-rose-50 text-rose-800',
              (!item.variant || item.variant === 'info') && 'border-slate-200 bg-white text-slate-800',
            )}
          >
            <p className="font-semibold">{item.title}</p>
            {item.description ? <p className="mt-1 text-sm opacity-90">{item.description}</p> : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast debe usarse dentro de ToastProvider')
  }
  return context
}
