'use client'

import { useState, useMemo } from 'react'
import { Search, Filter, X, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { formatCLP, formatDate } from '@/lib/utils'
import type { Analysis } from '@/types/database.types'

interface DashboardClientProps {
  analyses: Analysis[]
  emptyState: React.ReactNode
}

export function DashboardClient({ analyses, emptyState }: DashboardClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filteredAnalyses = useMemo(() => {
    return analyses.filter(a => {
      const matchesSearch = !searchQuery || a.file_name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === 'all' || a.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [analyses, searchQuery, statusFilter])

  const hasActiveFilter = searchQuery || statusFilter !== 'all'

  if (analyses.length === 0 && !hasActiveFilter) {
    return <>{emptyState}</>
  }

  const filterChips = [
    { value: 'all', label: 'Todos', icon: Filter },
    { value: 'completed', label: 'Completados', icon: CheckCircle2 },
    { value: 'processing', label: 'En proceso', icon: Clock },
    { value: 'error', label: 'Con error', icon: AlertTriangle },
  ]

  return (
    <>
      <div className="bg-white dark:bg-gray-900/60 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-gray-800/40 shadow-sm">
        <div className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre de archivo..."
                className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 dark:focus:border-blue-600 transition-all duration-200"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3">
            {filterChips.map(chip => (
              <button
                key={chip.value}
                onClick={() => setStatusFilter(chip.value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl transition-all duration-200 ${
                  statusFilter === chip.value
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <chip.icon className="w-3 h-3" />
                {chip.label}
              </button>
            ))}
            {hasActiveFilter && (
              <button
                onClick={() => { setSearchQuery(''); setStatusFilter('all') }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-3 h-3" />
                Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900/60 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-gray-800/40 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100 dark:border-gray-800/30">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse-subtle" />
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {filteredAnalyses.length === 1
                ? '1 análisis'
                : `${filteredAnalyses.length} análisis`}
            </p>
          </div>
        </div>

        {filteredAnalyses.length === 0 ? (
          <div className="text-center py-16 px-6">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center">
              <Search className="w-6 h-6 text-gray-400 dark:text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              Sin resultados
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Intenta con otros términos de búsqueda
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800/20">
            {filteredAnalyses.map((analysis, i) => {
              const isCompleted = analysis.status === 'completed'
              const isProcessing = analysis.status === 'processing'
              return (
                <Link
                  key={analysis.id}
                  href={`/historial/${analysis.id}`}
                  className="group flex items-center gap-4 px-5 sm:px-6 py-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-all duration-200"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                    isCompleted
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30'
                      : isProcessing
                        ? 'bg-blue-50 dark:bg-blue-900/20 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30'
                        : 'bg-gray-50 dark:bg-gray-800/50'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : isProcessing ? (
                      <div className="w-5 h-5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-gray-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {analysis.file_name}
                      </p>
                      {analysis.anomalies_count > 0 && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded-md">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          {analysis.anomalies_count}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-gray-400 dark:text-gray-500">{analysis.bank ?? 'Banco no detectado'}</span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-400">·</span>
                      <span className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(analysis.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="hidden sm:flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider">Anomalías</p>
                      <p className={`text-sm font-semibold tabular-nums mt-0.5 ${analysis.anomalies_count > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {analysis.anomalies_count}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider">Recuperable</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums mt-0.5">
                        {formatCLP(analysis.recoverable_amount)}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg ${
                      isCompleted ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' :
                      isProcessing ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' :
                      'bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400'
                    }`}>
                      {isCompleted ? 'Completado' : isProcessing ? 'Procesando' : 'Error'}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
