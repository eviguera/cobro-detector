interface Notification {
  userId: string
  type: 'analysis_completed' | 'credits_low' | 'payment_received' | 'report_unlocked'
  data: Record<string, unknown>
  timestamp: string
}

interface EmailPayload {
  to: string
  subject: string
  html: string
}

const TITLES: Record<string, string> = {
  analysis_completed: 'Tu análisis está listo',
  credits_low: 'Te quedan pocos créditos',
  payment_received: 'Pago recibido — Créditos acreditados',
  report_unlocked: 'Tu reporte fue desbloqueado',
}

function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function buildNotificationEmail(
  notification: Notification,
  userEmail: string
): EmailPayload {
  const subject = TITLES[notification.type] || 'Notificación de CobroDetector'

  let html = ''
  const data = notification.data

  switch (notification.type) {
    case 'analysis_completed':
      html = `
        <h2>¡Tu análisis está listo!</h2>
        <p>Hemos completado el análisis de tu estado de cuenta <strong>${data.fileName || ''}</strong>.</p>
        <ul>
          <li>Transacciones analizadas: <strong>${data.totalTransactions || 0}</strong></li>
          <li>Anomalías detectadas: <strong>${data.anomaliesCount || 0}</strong></li>
          <li>Monto recuperable: <strong>${formatCLP((data.recoverableAmount as number) || 0)}</strong></li>
        </ul>
        <p>Ingresa a tu dashboard para ver el reporte completo y descargar la carta de reclamo.</p>
      `
      break
    case 'credits_low':
      html = `
        <h2>¡Créditos bajos!</h2>
        <p>Te quedan solo <strong>${data.creditsLeft || 0}</strong> créditos de <strong>${data.creditsTotal || 0}</strong>.</p>
        <p>Compra más créditos para seguir detectando cobros injustificados.</p>
      `
      break
    case 'payment_received':
      html = `
        <h2>¡Pago recibido!</h2>
        <p>Hemos acreditado <strong>${data.creditsAdded || 0}</strong> créditos a tu cuenta.</p>
        <p>Ahora tienes <strong>${data.creditsTotal || 0}</strong> créditos disponibles.</p>
      `
      break
    case 'report_unlocked':
      html = `
        <h2>¡Reporte desbloqueado!</h2>
        <p>Tu pago fue recibido. El reporte del análisis <strong>${data.fileName || ''}</strong> ya está disponible.</p>
        <p>Monto recuperable detectado: <strong>${formatCLP((data.recoverableAmount as number) || 0)}</strong></p>
      `
      break
    default:
      html = `<p>${JSON.stringify(data)}</p>`
  }

  html += `
    <hr>
    <p style="color: #666; font-size: 12px;">
      CobroDetector — Detecta cobros injustificados en tu estado de cuenta bancario<br>
      <a href="https://cobrodetector.cl">cobrodetector.cl</a>
    </p>
  `

  return { to: userEmail, subject, html }
}

export function getCreditsLowThreshold(): number {
  return 2
}
