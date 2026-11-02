'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  intervalMs?: number
}

/**
 * Refresca el server component periódicamente mientras un análisis sigue en
 * proceso. Se detiene solo al desmontarse (cuando el estado ya cambió).
 */
export default function AutoRefresh({ intervalMs = 5000 }: Props) {
  const router = useRouter()

  useEffect(() => {
    const timer = setInterval(() => router.refresh(), intervalMs)
    return () => clearInterval(timer)
  }, [router, intervalMs])

  return null
}
