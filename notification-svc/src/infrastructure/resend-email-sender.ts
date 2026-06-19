const RESEND_API_URL = 'https://api.resend.com/emails'
import type { EmailSender, EmailPayload } from '../domain/ports/email-sender.port'

export class ResendEmailSender implements EmailSender {
  async send({ to, subject, html }: EmailPayload): Promise<boolean> {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.warn('RESEND_API_KEY no configurada. Email no enviado.')
      return false
    }

    try {
      const res = await fetch(RESEND_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.FROM_EMAIL || 'CobroDetector <notificaciones@cobrodetector.cl>',
          to,
          subject,
          html,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        console.error('Error enviando email:', err?.message || res.statusText || `HTTP ${res.status}`)
        return false
      }

      return true
    } catch (error) {
      console.error('Error enviando email:', error instanceof Error ? error.message : error)
      return false
    }
  }
}
