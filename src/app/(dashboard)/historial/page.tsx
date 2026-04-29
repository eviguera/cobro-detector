import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { FileSearch, ArrowRight, Plus } from 'lucide-react'
import { formatCLP, formatDate, getStatusLabel } from '@/lib/utils'

export default async function HistorialPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: analyses } = await supabase
    .from('analyses')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Mis análisis</h1>
          <p className="text-sm text-gray-500">{analyses?.length ?? 0} análisis realizados</p>
        </div>
        <Link href="/analisis" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          Nuevo análisis
        </Link>
      </div>

      {!analyses || analyses.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-20">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileSearch className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-900 mb-2">No tienes análisis aún</p>
          <p className="text-sm text-gray-500 mb-6">Sube tu estado de cuenta para comenzar</p>
          <Link href="/analisis" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" />
            Primer análisis gratis
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
          {analyses.map(analysis => (
            <Link key={analysis.id} href={`/historial/${analysis.id}`} className="flex items-center justify-between px-6 py-5 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileSearch className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">{analysis.file_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {analysis.bank ?? 'Banco no detectado'} · {formatDate(analysis.created_at)}
                    {analysis.period_start && ` · ${formatDate(analysis.period_start)} – ${formatDate(analysis.period_end!)}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-8">
                <div className="text-right">
                  <p className="text-xs text-gray-400">Transacciones</p>
                  <p className="text-sm font-medium text-gray-900">{analysis.total_transactions}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Anomalías</p>
                  <p className={`text-sm font-semibold ${analysis.anomalies_count > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {analysis.anomalies_count}
                  </p>
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
  )
}
