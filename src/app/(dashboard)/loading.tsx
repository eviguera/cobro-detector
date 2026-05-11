import { Loader2 } from 'lucide-react'

export default function DashboardLoading() {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
        <p className="text-sm text-muted-foreground font-mono">Cargando...</p>
      </div>
    </div>
  )
}
