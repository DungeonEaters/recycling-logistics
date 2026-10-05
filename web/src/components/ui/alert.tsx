import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export function Alert({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700', className)}
      {...props}
    />
  )
}
