import type { EmailSender } from '../domain/ports/email-sender.port.js'

export class SendAnalysisNotificationUseCase {
  constructor(private emailSender: EmailSender) {}

  async execute(params: {
    to: string
    userName: string
    analysisId: string
    anomaliesCount: number
    recoverableAmount: number
  }): Promise<boolean> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">Analisis completado!</h2>
        <p>Hola ${params.userName},</p>
        <p>Tu analisis de estado de cuenta esta listo. Esto es lo que encontramos:</p>
        <ul>
          <li><strong>${params.anomaliesCount}</strong> anomalias detectadas</li>
          <li><strong>$${params.recoverableAmount.toLocaleString('es-CL')}</strong> recuperables</li>
        </ul>
        <p>
          <a href="${appUrl}/historial/${params.analysisId}"
             style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
            Ver resultados
          </a>
        </p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          CobroDetector.cl -- Detecta cobros injustificados en tu estado de cuenta
        </p>
      </div>
    `

    return this.emailSender.send({
      to: params.to,
      subject: `Analisis completado -- ${params.anomaliesCount} anomalias detectadas`,
      html,
    })
  }
}
