import { Skeleton } from '@/components/skeleton'

export default function AnalysisDetailLoading() {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-label="Cargando análisis">
      <div className="space-y-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-3 w-64 max-w-full" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
        <div className="rounded-2xl border border-border bg-card p-6">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="mt-3 h-11 w-64 max-w-full" />
          <div className="mt-6 grid grid-cols-3 gap-4 border-t border-border pt-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-2.5 w-20" />
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>

      <Skeleton className="h-10 w-72 max-w-full rounded-xl" />

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-border bg-card p-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-2 h-4 w-2/3" />
              <Skeleton className="mt-2 h-3 w-full" />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    </div>
  )
}
