import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { FileSearch, TrendingDown, AlertTriangle, CheckCircle2, ArrowRight, Plus } from 'lucide-react'
import { formatCLP, formatDate, getStatusLabel } from '@/lib/utils'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: analyses }, { data: credits }] = await Promise.all([
    supabase.from('analyses').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('credits').select('*').eq('user_id', user!.id).single(),
  ])

  const totalRecoverable = analyses?.reduce((sum, a) => sum + (a.recoverable_amount ?? 0), 0) ?? 0
  const totalAnomalies = analyses?.reduce((sum, a) => sum + (a.anomalies_count ?? 0), 0) ?? 0
  const creditsLeft = (credits?.total ?? 0) - (credits?.used ?? 0)

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Resumen de tus análisis y anomalías detectadas</p>
        </div>
        <Link
          href="/analisis"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo análisis
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          {
            label: 'Créditos disponibles',
            value: creditsLeft,
            icon: FileSearch,
            color: 'blue',
            sub: creditsLeft === 0 ? 'Comprar más' : `de ${credits?.total ?? 0} totales`,
            subLink: creditsLeft === 0 ? '/precios' : undefined,
          },
          {
            label: 'Análisis realizados',
            value: analyses?.length ?? 0,
            icon: CheckCircle2,
            color: 'green',
            sub: 'estados de cuenta',
          },
          {
            label: 'Anomalías detectadas',
            value: totalAnomalies,
            icon: AlertTriangle,
            color: 'amber',
            sub: 'cobros incorrectos',
          },
          {
            label: 'Monto recuperable',
            value: formatCLP(totalRecoverable),
            icon: TrendingDown,
            color: 'red',
            sub: 'en total detectado',
            large: true,
          },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${
              stat.color === 'blue' ? 'bg-blue-50' :
              stat.color === 'green' ? 'bg-green-50' :
              stat.color === 'amber' ? 'bg-amber-50' : 'bg-red-50'
            }`}>
              <stat.icon className={`w-4 h-4 ${
                stat.color === 'blue' ? 'text-blue-600' :
                stat.color === 'green' ? 'text-green-600' :
                stat.color === 'amber' ? 'text-amber-600' : 'text-red-600'
              }`} />
            </div>
            <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
            <p className={`font-bold text-gray-900 ${stat.large ? 'text-xl' : 'text-2xl'}`}>{stat.value}</p>
            {stat.subLink ? (
              <Link href={stat.subLink} className="text-xs text-blue-600 hover:underline">{stat.sub}</Link>
            ) : (
              <p className="text-xs text-gray-400 mt-0.5">{stat.sub}</p>
            )}
          </div>
        ))}
      </div>

      {/* Análisis recientes */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">Análisis recientes</h2>
          <Link href="/historial" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
            Ver todos <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {!analyses || analyses.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileSearch className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900 mb-2">Aún no tienes análisis</p>
            <p className="text-sm text-gray-500 mb-6">Sube tu primer estado de cuenta y descubre si te cobran de más</p>
            <Link href="/analisis" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" />
              Hacer mi primer análisis gratis
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {analyses.map(analysis => (
              <Link key={analysis.id} href={`/historial/${analysis.id}`} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileSearch className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{analysis.file_name}</p>
                    <p className="text-xs text-gray-400">{analysis.bank ?? 'Banco desconocido'} · {formatDate(analysis.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Anomalías</p>
                    <p className="text-sm font-semibold text-red-600">{analysis.anomalies_count}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Recuperable</p>
                    <p className="text-sm font-semibold text-gray-900">{formatCLP(analysis.recoverable_amount)}</p>
                  </div>
                  <div className={`text-xs px-2 py-1 rounded-full font-medium ${
                    analysis.status === 'completed' ? 'bg-green-50 text-green-700' :
                    analysis.status === 'processing' ? 'bg-blue-50 text-blue-700' :
                    'bg-red-50 text-red-700'
                  }`}>
                    {getStatusLabel(analysis.status)}
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
