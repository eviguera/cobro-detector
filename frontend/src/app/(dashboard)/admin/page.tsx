import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatCLP } from '@/lib/utils'
import Link from 'next/link'
import { ArrowLeft, Users, FileSearch, AlertTriangle, DollarSign, TrendingUp } from 'lucide-react'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) redirect('/dashboard')

  const { count: usersCount } = await supabase.from('profiles').select('id', { count: 'exact', head: true })
  const { count: analysesCount } = await supabase.from('analyses').select('id', { count: 'exact', head: true })
  const { count: anomaliesCount } = await supabase.from('anomalies').select('id', { count: 'exact', head: true })
  const { count: weekCount } = await supabase.from('analyses').select('id', { count: 'exact', head: true })
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

  const { data: orders } = await supabase.from('orders').select('amount_clp').eq('status', 'paid')
  const revenue = (orders || []).reduce((s, o) => s + (o.amount_clp || 0), 0)

  const { data: recentAnalyses } = await supabase.from('analyses')
    .select('id, file_name, bank, anomalies_count, recoverable_amount, status, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Panel de Administración</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Métricas globales del sistema</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900/60 rounded-2xl border p-5">
          <Users className="w-5 h-5 text-blue-500 mb-2" />
          <p className="text-2xl font-bold">{usersCount || 0}</p>
          <p className="text-xs text-gray-500">Usuarios</p>
        </div>
        <div className="bg-white dark:bg-gray-900/60 rounded-2xl border p-5">
          <FileSearch className="w-5 h-5 text-emerald-500 mb-2" />
          <p className="text-2xl font-bold">{analysesCount || 0}</p>
          <p className="text-xs text-gray-500">Análisis totales</p>
        </div>
        <div className="bg-white dark:bg-gray-900/60 rounded-2xl border p-5">
          <AlertTriangle className="w-5 h-5 text-amber-500 mb-2" />
          <p className="text-2xl font-bold">{anomaliesCount || 0}</p>
          <p className="text-xs text-gray-500">Anomalías detectadas</p>
        </div>
        <div className="bg-white dark:bg-gray-900/60 rounded-2xl border p-5">
          <DollarSign className="w-5 h-5 text-green-500 mb-2" />
          <p className="text-2xl font-bold">{formatCLP(revenue)}</p>
          <p className="text-xs text-gray-500">Ingresos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900/60 rounded-2xl border p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <h2 className="font-semibold">Actividad Reciente</h2>
          </div>
          <p className="text-3xl font-bold mb-1">{weekCount || 0}</p>
          <p className="text-sm text-gray-500">análisis en los últimos 7 días</p>
        </div>

        <div className="bg-white dark:bg-gray-900/60 rounded-2xl border p-6">
          <h2 className="font-semibold mb-3">Últimos Análisis</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {(recentAnalyses || []).map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-700 dark:text-gray-300">{a.file_name}</p>
                  <p className="text-xs text-gray-400">{a.bank || '—'} · {new Date(a.created_at).toLocaleDateString('es-CL')}</p>
                </div>
                <div className="text-right ml-3 flex-shrink-0">
                  <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${a.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : a.status === 'error' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                    {a.status}
                  </span>
                  {a.anomalies_count ? <p className="text-xs mt-0.5 text-gray-500">{a.anomalies_count} anomalías</p> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
