'use client'

import { Trash2, Loader2, Check } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface Props {
  id: string
  fileName: string
}

export default function DeleteAnalysisButton({ id, fileName }: Props) {
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const router = useRouter()

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!confirming) {
      setConfirming(true)
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('analyses')
        .delete()
        .eq('id', id)

      if (error) {
        toast.error('No pudimos eliminar el análisis. Intenta de nuevo.')
        return
      }

      toast.success('Análisis eliminado')
      setConfirming(false)
      router.refresh()
    } catch (err) {
      console.error('Error al eliminar análisis:', err)
      toast.error('No pudimos eliminar el análisis. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setConfirming(false)
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
        <button
          type="button"
          onClick={handleClick}
          disabled={loading}
          aria-label={`Confirmar eliminación de ${fileName}`}
          className="inline-flex items-center gap-1 rounded-lg bg-red-100 px-2 py-1 text-[10px] font-semibold text-red-700 transition-colors hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50 disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          Eliminar
        </button>
        <button
          type="button"
          onClick={handleCancel}
          aria-label="Cancelar eliminación"
          className="rounded-lg px-1.5 py-1 text-[10px] font-medium text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      aria-label={`Eliminar análisis ${fileName}`}
      title="Eliminar análisis"
      className="rounded-lg p-1.5 text-gray-400 transition-all duration-200 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400 disabled:opacity-60"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
    </button>
  )
}
