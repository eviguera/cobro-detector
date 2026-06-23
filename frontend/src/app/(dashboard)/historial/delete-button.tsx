'use client'

import { Trash2, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  id: string
  fileName: string
}

export default function DeleteAnalysisButton({ id, fileName }: Props) {
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const router = useRouter()

  const handleClick = async () => {
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

      if (!error) {
        router.refresh()
      }
    } catch (err) {
      console.error('Error al eliminar análisis:', err)
      setLoading(false)
      setConfirming(false)
    }
  }

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirming(false)
  }

  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      {confirming && (
        <button
          onClick={handleCancel}
          className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-1.5 py-0.5 rounded transition-colors"
          title="Cancelar"
        >
          ✕
        </button>
      )}
      <button
        onClick={handleClick}
        disabled={loading}
        className={`p-1.5 rounded-lg transition-all duration-200 ${
          confirming
            ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
            : 'text-gray-400 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
        }`}
        title={confirming ? `Confirmar eliminación de "${fileName}"` : 'Eliminar análisis'}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Trash2 className="w-3.5 h-3.5" />
        )}
      </button>
    </div>
  )
}
