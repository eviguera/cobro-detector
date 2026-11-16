import { describe, expect, it } from 'vitest'
import {
  detectRuleAnomalies,
  isRecurringCadence,
  mergeAnomalies,
  normalizeAiAnomalies,
} from './anomaly-rules'
import type { DetectedAnomaly, ParsedTransaction } from './analysis-result.entity'

function tx(overrides: Partial<ParsedTransaction> = {}): ParsedTransaction {
  return {
    id: 'tx-1',
    date: '2026-01-01',
    description: 'COMPRA LIDER',
    amount: -10_000,
    type: 'debit',
    ...overrides,
  }
}

function anomaly(overrides: Partial<DetectedAnomaly> = {}): DetectedAnomaly {
  return {
    type: 'duplicate_charge',
    severity: 'high',
    title: 'Hallazgo',
    description: 'Descripción del hallazgo',
    recoverableAmount: 5_000,
    transactionRefs: ['tx-2'],
    confidence: 80,
    ...overrides,
  }
}

describe('isRecurringCadence', () => {
  it('acepta un ciclo mensual entre 25 y 35 días', () => {
    expect(isRecurringCadence('2026-01-01', '2026-01-31')).toBe(true) // 30
    expect(isRecurringCadence('2026-01-01', '2026-01-26')).toBe(true) // 25
    expect(isRecurringCadence('2026-02-01', '2026-03-08')).toBe(true) // 35
  })

  it('acepta múltiplos de mes (bimestral, trimestral, anual)', () => {
    expect(isRecurringCadence('2026-01-01', '2026-03-02')).toBe(true) // 60
    expect(isRecurringCadence('2026-01-01', '2026-04-01')).toBe(true) // 90
    expect(isRecurringCadence('2026-01-01', '2027-01-01')).toBe(true) // 365
  })

  it('rechaza cobros del mismo día, de la misma semana y huecos que no son múltiplos', () => {
    expect(isRecurringCadence('2026-01-01', '2026-01-01')).toBe(false)
    expect(isRecurringCadence('2026-01-01', '2026-01-04')).toBe(false) // 3 días
    expect(isRecurringCadence('2026-01-01', '2026-01-11')).toBe(false) // 10 días
    expect(isRecurringCadence('2026-01-01', '2026-02-15')).toBe(false) // 45 días
  })
})

describe('detectRuleAnomalies · suscripciones legítimas (2.6)', () => {
  it('no marca como duplicado una suscripción mensual de Spotify cobrada 3 veces', () => {
    const transactions = [
      tx({ id: 's1', date: '2026-01-01', description: 'PAGO AUTOMATICO SPOTIFY PREMIUM', amount: -4_990 }),
      tx({ id: 's2', date: '2026-02-01', description: 'PAGO AUTOMATICO SPOTIFY PREMIUM', amount: -4_990 }),
      tx({ id: 's3', date: '2026-03-01', description: 'PAGO AUTOMATICO SPOTIFY PREMIUM', amount: -4_990 }),
    ]

    expect(detectRuleAnomalies(transactions)).toHaveLength(0)
  })

  it('no marca como duplicado un seguro mensual cobrado 4 veces', () => {
    const transactions = [
      tx({ id: 'i1', date: '2026-01-05', description: 'SEGURO DE VIDA', amount: -12_500 }),
      tx({ id: 'i2', date: '2026-02-04', description: 'SEGURO DE VIDA', amount: -12_500 }),
      tx({ id: 'i3', date: '2026-03-06', description: 'SEGURO DE VIDA', amount: -12_500 }),
      tx({ id: 'i4', date: '2026-04-05', description: 'SEGURO DE VIDA', amount: -12_500 }),
    ]

    expect(detectRuleAnomalies(transactions)).toHaveLength(0)
  })

  it('no reporta un servicio mensual como cargo sin descripción', () => {
    const transactions = [
      tx({ id: 'm1', date: '2026-01-10', description: 'SERVICIO MENSUAL 4521', amount: -4_521 }),
      tx({ id: 'm2', date: '2026-02-10', description: 'SERVICIO MENSUAL 4521', amount: -4_521 }),
      tx({ id: 'm3', date: '2026-03-10', description: 'SERVICIO MENSUAL 4521', amount: -4_521 }),
    ]

    expect(detectRuleAnomalies(transactions).filter((a) => a.type === 'unknown_charge')).toHaveLength(0)
  })

  it('sigue detectando un duplicado real el mismo día', () => {
    const transactions = [
      tx({ id: 'd1', date: '2026-03-05', description: 'COMPRA FARMACIA AHUMADA', amount: -15_990 }),
      tx({ id: 'd2', date: '2026-03-05', description: 'COMPRA FARMACIA AHUMADA', amount: -15_990 }),
    ]

    const anomalies = detectRuleAnomalies(transactions)

    expect(anomalies).toHaveLength(1)
    expect(anomalies[0].type).toBe('duplicate_charge')
    expect(anomalies[0].recoverableAmount).toBe(15_990)
    expect(anomalies[0].transactionRefs).toEqual(['d2'])
    expect(anomalies[0].confidence).toBe(80)
  })

  it('sigue detectando dos cargos iguales separados por 3 días', () => {
    const transactions = [
      tx({ id: 'd1', date: '2026-03-01', description: 'COMPRA UBER TRIP', amount: -7_200 }),
      tx({ id: 'd2', date: '2026-03-04', description: 'COMPRA UBER TRIP', amount: -7_200 }),
    ]

    const anomalies = detectRuleAnomalies(transactions)

    expect(anomalies).toHaveLength(1)
    expect(anomalies[0].type).toBe('duplicate_charge')
    expect(anomalies[0].recoverableAmount).toBe(7_200)
    expect(anomalies[0].confidence).toBe(62)
  })

  it('la ventana corta manda incluso si la descripción declara suscripción', () => {
    const transactions = [
      tx({ id: 'd1', date: '2026-03-01', description: 'SUSCRIPCION MUSICA', amount: -4_990 }),
      tx({ id: 'd2', date: '2026-03-04', description: 'SUSCRIPCION MUSICA', amount: -4_990 }),
    ]

    const anomalies = detectRuleAnomalies(transactions)

    expect(anomalies).toHaveLength(1)
    expect(anomalies[0].type).toBe('duplicate_charge')
    expect(anomalies[0].transactionRefs).toEqual(['d2'])
  })

  it('una suscripción legítima y un duplicado real conviven sin silenciarse', () => {
    const transactions = [
      tx({ id: 's1', date: '2026-01-05', description: 'PAGO AUTOMATICO NETFLIX', amount: -8_990 }),
      tx({ id: 's2', date: '2026-02-05', description: 'PAGO AUTOMATICO NETFLIX', amount: -8_990 }),
      tx({ id: 's3', date: '2026-03-05', description: 'PAGO AUTOMATICO NETFLIX', amount: -8_990 }),
      tx({ id: 'd1', date: '2026-03-12', description: 'COMPRA FARMACIA AHUMADA', amount: -15_990 }),
      tx({ id: 'd2', date: '2026-03-12', description: 'COMPRA FARMACIA AHUMADA', amount: -15_990 }),
    ]

    const anomalies = detectRuleAnomalies(transactions)

    expect(anomalies).toHaveLength(1)
    expect(anomalies[0].type).toBe('duplicate_charge')
    expect(anomalies[0].transactionRefs).toEqual(['d2'])
    expect(anomalies[0].recoverableAmount).toBe(15_990)
  })
})

describe('normalizeAiAnomalies · segunda opinión IA (2.7)', () => {
  const transactions = [
    tx({ id: 'tx-1', description: 'COMISION CREDITO', amount: -5_000 }),
    tx({ id: 'tx-2', description: 'COMISION CREDITO', amount: -5_000 }),
  ]

  it('descarta un hallazgo que referencia transacciones inexistentes', () => {
    const normalized = normalizeAiAnomalies(
      [
        {
          type: 'duplicate_commission',
          title: 'Comisión inventada',
          recoverableAmount: 999_999,
          transactionRefs: ['no-existe'],
        },
      ],
      transactions,
    )

    expect(normalized).toHaveLength(0)
  })

  it('descarta el hallazgo completo si mezcla una referencia válida con una inventada', () => {
    const normalized = normalizeAiAnomalies(
      [
        {
          type: 'duplicate_commission',
          title: 'Comisión a medias',
          recoverableAmount: 5_000,
          transactionRefs: ['tx-2', 'no-existe'],
        },
      ],
      transactions,
    )

    expect(normalized).toHaveLength(0)
  })

  it('recorta un monto inflado al total de las transacciones referenciadas', () => {
    const normalized = normalizeAiAnomalies(
      [
        {
          type: 'duplicate_commission',
          title: 'Comisión repetida',
          recoverableAmount: 999_999,
          transactionRefs: ['tx-2'],
        },
      ],
      transactions,
    )

    expect(normalized).toHaveLength(1)
    expect(normalized[0].recoverableAmount).toBe(5_000)
    expect(normalized[0].confidence).toBe(58)
  })

  it('recorta un monto inflado a la suma de varias referencias', () => {
    const normalized = normalizeAiAnomalies(
      [
        {
          type: 'duplicate_commission',
          title: 'Comisión repetida',
          recoverableAmount: 999_999,
          transactionRefs: ['tx-1', 'tx-2'],
        },
      ],
      transactions,
    )

    expect(normalized).toHaveLength(1)
    expect(normalized[0].recoverableAmount).toBe(10_000)
  })
})

describe('mergeAnomalies · dedupe y jerarquía de confianza (2.7)', () => {
  it('fusiona en una sola entrada el mismo ref aunque la IA cambie el tipo', () => {
    const rules = [
      anomaly({
        type: 'duplicate_charge',
        title: 'Cobro duplicado',
        transactionRefs: ['tx-2'],
        confidence: 80,
      }),
    ]
    const ai = [
      anomaly({
        type: 'unknown_charge',
        title: 'Cargo sospechoso',
        transactionRefs: ['tx-2'],
        confidence: 58,
      }),
    ]

    const merged = mergeAnomalies(rules, ai)

    expect(merged).toHaveLength(1)
    expect(merged[0].type).toBe('duplicate_charge')
    expect(merged[0].title).toBe('Cobro duplicado')
    expect(merged[0].transactionRefs).toEqual(['tx-2'])
  })

  it('la confianza de la IA nunca supera la de la regla sobre las mismas transacciones', () => {
    const rules = [anomaly({ title: 'Regla', transactionRefs: ['tx-2'], confidence: 80 })]
    const ai = [
      anomaly({
        type: 'unknown_charge',
        title: 'IA',
        transactionRefs: ['tx-2'],
        confidence: 99,
      }),
    ]

    const merged = mergeAnomalies(rules, ai)

    expect(merged).toHaveLength(1)
    expect(merged[0].confidence).toBe(80)
    // Empate técnico tras el tope: sobrevive la representación determinística.
    expect(merged[0].title).toBe('Regla')
    expect(merged[0].type).toBe('duplicate_charge')
  })

  it('conserva la confianza de la IA cuando ninguna regla cubre sus refs', () => {
    const rules = [anomaly({ transactionRefs: ['tx-1'], confidence: 80 })]
    const ai = [
      anomaly({
        type: 'incorrect_charge',
        title: 'IA sin regla',
        transactionRefs: ['tx-3'],
        confidence: 99,
      }),
    ]

    const merged = mergeAnomalies(rules, ai)

    expect(merged).toHaveLength(2)
    const aiFinding = merged.find((item) => item.type === 'incorrect_charge')
    expect(aiFinding?.confidence).toBe(99)
  })

  it('no publica dos hallazgos que comparten una transacción', () => {
    const rules = [
      anomaly({ type: 'duplicate_charge', title: 'Regla A', transactionRefs: ['tx-2'], confidence: 80 }),
      anomaly({
        type: 'duplicate_commission',
        title: 'Regla B',
        transactionRefs: ['tx-3'],
        confidence: 80,
      }),
    ]
    const ai = [
      anomaly({
        type: 'incorrect_charge',
        title: 'IA bisagra',
        transactionRefs: ['tx-2', 'tx-3'],
        confidence: 58,
      }),
    ]

    const merged = mergeAnomalies(rules, ai)

    expect(merged).toHaveLength(1)
    expect(merged[0].transactionRefs.sort()).toEqual(['tx-2', 'tx-3'])
  })
})
