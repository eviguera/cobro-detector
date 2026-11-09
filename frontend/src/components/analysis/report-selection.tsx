'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

interface ReportSelectionContextValue {
  selectedKeys: Set<string>
  isSelected: (key: string) => boolean
  toggle: (key: string) => void
  selectAll: () => void
  selectNone: () => void
  selectedCount: number
  totalCount: number
}

const ReportSelectionContext = createContext<ReportSelectionContextValue | null>(null)

interface ReportSelectionProviderProps {
  analysisId: string
  keys: string[]
  children: React.ReactNode
}

export function ReportSelectionProvider({ analysisId, keys, children }: ReportSelectionProviderProps) {
  const allKeys = useMemo(() => Array.from(new Set(keys)), [keys])
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set(allKeys))

  // Restaurar selección previa (si existe) sin romper la hidratación.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`cd:report-selection:${analysisId}`)
      if (!raw) return
      const saved = JSON.parse(raw) as string[]
      const valid = saved.filter((key) => allKeys.includes(key))
      if (valid.length > 0) setSelectedKeys(new Set(valid))
    } catch {
      // localStorage no disponible o JSON inválido: mantener "todos".
    }
  }, [analysisId, allKeys])

  useEffect(() => {
    try {
      localStorage.setItem(
        `cd:report-selection:${analysisId}`,
        JSON.stringify(Array.from(selectedKeys))
      )
    } catch {
      // Best effort.
    }
  }, [analysisId, selectedKeys])

  const toggle = useCallback((key: string) => {
    setSelectedKeys((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const selectAll = useCallback(() => setSelectedKeys(new Set(allKeys)), [allKeys])
  const selectNone = useCallback(() => setSelectedKeys(new Set()), [])

  const value = useMemo<ReportSelectionContextValue>(
    () => ({
      selectedKeys,
      isSelected: (key: string) => selectedKeys.has(key),
      toggle,
      selectAll,
      selectNone,
      selectedCount: selectedKeys.size,
      totalCount: allKeys.length,
    }),
    [selectedKeys, allKeys.length, toggle, selectAll, selectNone]
  )

  return <ReportSelectionContext.Provider value={value}>{children}</ReportSelectionContext.Provider>
}

export function useReportSelection(): ReportSelectionContextValue {
  const context = useContext(ReportSelectionContext)
  if (!context) {
    throw new Error('useReportSelection debe usarse dentro de ReportSelectionProvider')
  }
  return context
}
