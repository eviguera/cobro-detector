'use client'

import { useState } from 'react'
import { Clipboard, Check } from 'lucide-react'

interface CopyReferralButtonProps {
  referralUrl: string
}

export function CopyReferralButton({ referralUrl }: CopyReferralButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback para navegadores sin permiso de clipboard.
      setCopied(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`flex items-center gap-1.5 px-4 py-3 text-white rounded-xl text-sm font-medium transition-colors shadow-sm ${
        copied
          ? 'bg-emerald-600 hover:bg-emerald-700'
          : 'bg-blue-600 hover:bg-blue-700'
      }`}
      aria-live="polite"
    >
      {copied ? <Check className="w-4 h-4" /> : <Clipboard className="w-4 h-4" />}
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  )
}
