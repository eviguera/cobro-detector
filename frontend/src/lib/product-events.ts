'use client'

import { createClient } from '@/lib/supabase/client'

/**
 * Evento de producto best-effort.
 *
 * No debe romper ni bloquear el flujo del usuario: si falla la red o la
 * sesión, se ignora silenciosamente. Los eventos son la base del embudo
 * (activación, análisis completados, descargas, feedback).
 */
export async function trackEvent(
  eventType: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('product_events').insert({
      user_id: user.id,
      event_type: eventType,
      metadata: metadata ?? null,
    })
  } catch {
    // Telemetría no crítica: nunca interrumpir la experiencia del usuario.
  }
}
