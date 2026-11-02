import { Skeleton, StatCardSkeleton, TableRowSkeleton } from '@/components/skeleton'

export default function DashboardLoading() {
  return (
    <div className="animate-fade-in-up space-y-6" aria-busy="true" aria-label="Cargando panel">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-9 w-52" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-11 w-40 rounded-xl" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800/40 dark:bg-gray-900/60">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800/30 sm:px-6">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="divide-y divide-gray-50 dark:divide-gray-800/20">
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRowSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}
