/**
 * Reglas del recordatorio de reclamo.
 *
 * El banco tiene 10 días hábiles para responder. Si no responde, el usuario
 * puede escalar a la CMF; este recordatorio se envía una sola vez por reclamo.
 */

export function subtractBusinessDays(from: Date, days: number): Date {
  const result = new Date(from)
  let removed = 0
  while (removed < days) {
    result.setDate(result.getDate() - 1)
    const day = result.getDay()
    if (day !== 0 && day !== 6) removed++
  }
  return result
}

export function isReminderDue(sentAt: string | null, now = new Date()): boolean {
  if (!sentAt) return false
  const sent = new Date(sentAt)
  if (Number.isNaN(sent.getTime())) return false
  return sent <= subtractBusinessDays(now, 10)
}

export interface ClaimReminderEmail {
  subject: string
  html: string
}

export function buildClaimReminderEmail(params: {
  userName: string
  fileName: string
  bank: string | null
  analysisId: string
  appUrl?: string
}): ClaimReminderEmail {
  const appUrl = params.appUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const bank = params.bank || 'tu banco'
  const name = params.userName || 'hola'

  return {
    subject: `Han pasado 10 días hábiles: tu reclamo en ${bank}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111827;">
        <p style="font-size: 13px; color: #6b7280; margin: 0 0 8px;">CobroDetector</p>
        <h2 style="font-size: 22px; margin: 0 0 12px;">Tu reclamo en ${bank} ya debería tener respuesta</h2>
        <p style="font-size: 14px; line-height: 1.6;">Hola ${name},</p>
        <p style="font-size: 14px; line-height: 1.6;">
          Han pasado <strong>10 días hábiles</strong> desde que registraste el envío del reclamo por
          <strong>${params.fileName}</strong>. Si el banco no respondió o no te dio una solución,
          puedes escalar el caso a la CMF.
        </p>
        <p style="margin: 24px 0;">
          <a href="${appUrl}/historial/${params.analysisId}"
             style="background: #1f4ee0; color: white; padding: 12px 20px; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 14px; font-weight: 600;">
            Revisar mi reclamo
          </a>
        </p>
        <p style="font-size: 13px; line-height: 1.6; color: #374151;">
          La Comisión para el Mercado Financiero recibe reclamos en
          <a href="https://www.cmfchile.cl" style="color: #1f4ee0;">cmfchile.cl</a>.
          Adjunta el número de caso del banco y la carta que descargaste.
        </p>
        <p style="font-size: 11px; color: #9ca3af; margin-top: 32px;">
          Este recordatorio se envía una sola vez por reclamo. No es asesoría legal.
        </p>
      </div>
    `,
  }
}
