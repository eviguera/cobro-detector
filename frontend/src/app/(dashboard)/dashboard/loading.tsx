import { Skeleton, StatCardSkeleton, ChartSkeleton, TableRowSkeleton } from '@/components/skeleton'

export default function DashboardRouteLoading() {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-label="Cargando panel">
      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-52" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <StatCardSkeleton key={index} />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <div className="space-y-4">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {Array.from({ length: 4 }).map((_, index) => (
          <TableRowSkeleton key={index} />
        ))}
      </div>
    </div>
  )
}
