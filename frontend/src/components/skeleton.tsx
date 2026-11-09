import { cn } from '@/lib/utils'

/**
 * Skeletons reutilizables. Se usan en loading.tsx de cada ruta para evitar
 * saltos de layout mientras el server component resuelve datos.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-lg bg-muted', className)}
    />
  )
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-start justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-9 rounded-xl" />
      </div>
      <Skeleton className="mt-5 h-8 w-32" />
      <Skeleton className="mt-3 h-3 w-40" />
    </div>
  )
}

export function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 border-b border-border px-5 py-4 last:border-0">
      <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-3 w-2/5" />
        <Skeleton className="h-2.5 w-1/4" />
      </div>
      <Skeleton className="h-3 w-16" />
    </div>
  )
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-border bg-card p-6', className)}>
      <Skeleton className="h-3 w-28" />
      <Skeleton className="mt-3 h-7 w-40" />
      <Skeleton className="mt-6 h-40 w-full" />
    </div>
  )
}

export function PageHeaderSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-9 w-64 max-w-full" />
      <Skeleton className="h-3 w-80 max-w-full" />
    </div>
  )
}
