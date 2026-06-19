import type { EmailSender, EmailPayload } from '../../domain/ports/email-sender.port.js'

const RESEND_API_URL = 'https://api.resend.com/emails'

const logger = {
  warn: (msg: string, data?: Record<string, unknown>) => console.warn(msg, data),
  error: (msg: string, data?: Record<string, unknown>) => console.error(msg, data),
}

export class ResendEmailAdapter implements EmailSender {
  async send({ to, subject, html }: EmailPayload): Promise<boolean> {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      logger.warn('RESEND_API_KEY no configurada. Email no enviado.')
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
          from: 'CobroDetector <notificaciones@cobrodetector.cl>',
          to,
          subject,
          html,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        logger.error('Error enviando email', { error: err?.message || res.statusText || `HTTP ${res.status}` })
        return false
      }

      return true
    } catch (error) {
      logger.error('Error enviando email', { error: error instanceof Error ? error.message : error })
      return false
    }
  }
}
