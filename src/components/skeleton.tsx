export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-shimmer bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-800 dark:via-gray-700/50 dark:to-gray-800 rounded-xl ${className}`} />
  )
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900/60 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-gray-800/40 p-5 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 left-5 right-5 h-0.5 bg-gray-200 dark:bg-gray-700 rounded-full" />
      <Skeleton className="w-20 h-3 mb-3" />
      <Skeleton className="w-32 h-8 mb-2" />
      <Skeleton className="w-24 h-3" />
    </div>
  )
}

export function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-6 py-4">
      <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="w-48 h-4" />
        <Skeleton className="w-32 h-3" />
      </div>
      <div className="hidden sm:flex items-center gap-6">
        <Skeleton className="w-16 h-8" />
        <Skeleton className="w-24 h-8" />
        <Skeleton className="w-20 h-6 rounded-lg" />
      </div>
    </div>
  )
}

export function AnomalyCardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800/40 p-5 bg-white dark:bg-gray-900/60">
      <div className="flex items-start justify-between mb-3">
        <Skeleton className="w-32 h-6 rounded-full" />
        <Skeleton className="w-24 h-6" />
      </div>
      <Skeleton className="w-3/4 h-5 mb-2" />
      <Skeleton className="w-full h-4 mb-1" />
      <Skeleton className="w-2/3 h-4" />
    </div>
  )
}
