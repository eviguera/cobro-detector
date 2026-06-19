import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SendAnalysisNotificationUseCase } from './send-analysis-notification.use-case.js'
import type { EmailSender } from '../domain/ports/email-sender.port.js'

const defaultParams = {
  to: 'user@example.com',
  userName: 'Juan',
  analysisId: '123e4567-e89b-12d3-a456-426614174000',
  anomaliesCount: 5,
  recoverableAmount: 150000,
}

function createEmailSender(sendResult: boolean = true): EmailSender {
  return { send: vi.fn().mockResolvedValue(sendResult) }
}

describe('SendAnalysisNotificationUseCase', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('retorna true cuando el email se envía exitosamente', async () => {
    const emailSender = createEmailSender(true)
    const useCase = new SendAnalysisNotificationUseCase(emailSender)

    const result = await useCase.execute(defaultParams)

    expect(result).toBe(true)
  })

  it('llama a emailSender.send con los campos correctos', async () => {
    const emailSender = createEmailSender()
    const useCase = new SendAnalysisNotificationUseCase(emailSender)

    await useCase.execute(defaultParams)

    const callArgs = (emailSender.send as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArgs).toMatchObject({
      to: 'user@example.com',
      subject: expect.any(String),
      html: expect.any(String),
    })
  })

  it('incluye la URL del análisis en el HTML', async () => {
    const emailSender = createEmailSender()
    const useCase = new SendAnalysisNotificationUseCase(emailSender)

    await useCase.execute(defaultParams)

    const { html } = (emailSender.send as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(html).toContain('/historial/123e4567-e89b-12d3-a456-426614174000')
  })

  it('incluye el número de anomalías en el HTML', async () => {
    const emailSender = createEmailSender()
    const useCase = new SendAnalysisNotificationUseCase(emailSender)

    await useCase.execute(defaultParams)

    const { html } = (emailSender.send as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(html).toContain('5</strong> anomalias detectadas')
  })

  it('incluye el monto recuperable formateado en el HTML', async () => {
    const emailSender = createEmailSender()
    const useCase = new SendAnalysisNotificationUseCase(emailSender)

    await useCase.execute(defaultParams)

    const { html } = (emailSender.send as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(html).toContain('150.000')
  })

  it('usa el asunto correcto con el conteo de anomalías', async () => {
    const emailSender = createEmailSender()
    const useCase = new SendAnalysisNotificationUseCase(emailSender)

    await useCase.execute(defaultParams)

    const { subject } = (emailSender.send as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(subject).toBe('Analisis completado -- 5 anomalias detectadas')
  })

  it('retorna false si emailSender.send retorna false', async () => {
    const emailSender = createEmailSender(false)
    const useCase = new SendAnalysisNotificationUseCase(emailSender)

    const result = await useCase.execute(defaultParams)

    expect(result).toBe(false)
  })
})
