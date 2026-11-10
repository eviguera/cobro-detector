import { Skeleton, TableRowSkeleton } from '@/components/skeleton'

export default function HistorialLoading() {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-label="Cargando historial">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-3 w-72 max-w-full" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-border bg-card p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-7 w-28" />
          </div>
        ))}
      </div>

      <Skeleton className="h-11 w-full rounded-xl" />

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {Array.from({ length: 6 }).map((_, index) => (
          <TableRowSkeleton key={index} />
        ))}
      </div>
    </div>
  )
}
