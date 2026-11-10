import { describe, it, expect } from 'vitest'
import {
  buildClaimReminderEmail,
  isReminderDue,
  subtractBusinessDays,
} from './claim-reminder.js'

describe('subtractBusinessDays', () => {
  it('salta fines de semana', () => {
    // Lunes 16 de marzo de 2026 - 10 días hábiles = lunes 2 de marzo.
    const result = subtractBusinessDays(new Date('2026-03-16T12:00:00Z'), 10)
    expect(result.toISOString().slice(0, 10)).toBe('2026-03-02')
  })

  it('no retrocede si days es 0', () => {
    const from = new Date('2026-03-16T12:00:00Z')
    expect(subtractBusinessDays(from, 0).toISOString()).toBe(from.toISOString())
  })
})

describe('isReminderDue', () => {
  it('marca vencido un reclamo enviado hace más de 10 días hábiles', () => {
    expect(isReminderDue('2026-03-01T12:00:00Z', new Date('2026-03-16T12:00:00Z'))).toBe(true)
  })

  it('no marca vencido un reclamo reciente', () => {
    expect(isReminderDue('2026-03-13T12:00:00Z', new Date('2026-03-16T12:00:00Z'))).toBe(false)
  })

  it('ignora fechas nulas o inválidas', () => {
    expect(isReminderDue(null)).toBe(false)
    expect(isReminderDue('no-es-fecha')).toBe(false)
  })
})

describe('buildClaimReminderEmail', () => {
  it('incluye banco, archivo y enlace al expediente', () => {
    const message = buildClaimReminderEmail({
      userName: 'Rodrigo',
      fileName: 'cartola-marzo.csv',
      bank: 'Santander',
      analysisId: 'abc-123',
      appUrl: 'https://cobrodetector.cl',
    })

    expect(message.subject).toContain('Santander')
    expect(message.html).toContain('cartola-marzo.csv')
    expect(message.html).toContain('https://cobrodetector.cl/historial/abc-123')
    expect(message.html).toContain('cmfchile.cl')
  })
})
