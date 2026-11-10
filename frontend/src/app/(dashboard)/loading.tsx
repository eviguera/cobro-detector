import { Skeleton, StatCardSkeleton, TableRowSkeleton } from '@/components/skeleton'

export default function DashboardLoading() {
  return (
    <div
      className="animate-fade-in-up space-y-6"
      role="status"
      aria-busy="true"
      aria-label="Cargando panel"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-9 w-52" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-11 w-40 rounded-xl" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <StatCardSkeleton key={index} />
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 5 }).map((_, index) => (
            <TableRowSkeleton key={index} />
          ))}
        </div>
      </div>
    </div>
  )
}
