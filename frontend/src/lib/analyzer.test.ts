import { deduplicateAnomalies } from '@/lib/analyzer'
import type { DetectedAnomaly } from '@/types/database.types'

function anomaly(overrides: Partial<DetectedAnomaly> = {}): DetectedAnomaly {
  return {
    type: 'duplicate_commission',
    severity: 'high',
    title: 'Comisión duplicada',
    description: 'Comisión cobrada dos veces',
    recoverableAmount: 50000,
    transactionRefs: ['tx-001', 'tx-002'],
    ...overrides,
  }
}

describe('deduplicateAnomalies', () => {
  it('returns empty array for empty input', () => {
    expect(deduplicateAnomalies([])).toEqual([])
  })

  it('returns single anomaly unchanged', () => {
    const input = [anomaly()]
    expect(deduplicateAnomalies(input)).toEqual(input)
  })

  it('returns unrelated anomalies unchanged', () => {
    const input = [
      anomaly({ transactionRefs: ['tx-001', 'tx-002'] }),
      anomaly({ transactionRefs: ['tx-003', 'tx-004'] }),
    ]
    expect(deduplicateAnomalies(input)).toEqual(input)
  })

  it('merges anomalies sharing a transaction reference', () => {
    const input = [
      anomaly({ transactionRefs: ['tx-001', 'tx-002'], description: 'Desc corta de reglas' }),
      anomaly({ transactionRefs: ['tx-002', 'tx-003'], description: 'Descripción detallada de IA con más de 80 caracteres explicando el patrón encontrado en las transacciones del estado de cuenta' }),
    ]

    const result = deduplicateAnomalies(input)
    expect(result).toHaveLength(1)
    expect(result[0].description).toContain('IA')
    expect(result[0].transactionRefs).toHaveLength(3)
    expect(result[0].recoverableAmount).toBe(50000)
  })

  it('merges three anomalies from different sources', () => {
    const input = [
      anomaly({
        transactionRefs: ['tx-001', 'tx-002'],
        description: 'Regla determinística: comisión duplicada',
        title: 'Comisión duplicada',
      }),
      anomaly({
        transactionRefs: ['tx-002'],
        title: 'COBRO_DOBLE detectado',
        description: 'Cobro doble identificado en CSV',
      }),
      anomaly({
        transactionRefs: ['tx-001'],
        description: 'Análisis detallado de IA: se detectó una comisión de crédito duplicada en la transacción de venta con tarjeta de crédito a 6 cuotas sin interés del comercio',
        title: 'Comisión crédito duplicada detectada por IA',
      }),
    ]

    const result = deduplicateAnomalies(input)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('COBRO_DOBLE detectado')
    expect(result[0].description).toContain('IA')
    expect(result[0].transactionRefs).toHaveLength(2)
  })

  it('uses highest severity from merged group', () => {
    const input = [
      anomaly({ transactionRefs: ['tx-001'], severity: 'low' }),
      anomaly({ transactionRefs: ['tx-001'], severity: 'high' }),
    ]

    const result = deduplicateAnomalies(input)
    expect(result[0].severity).toBe('high')
  })

  it('uses max recoverableAmount from merged group', () => {
    const input = [
      anomaly({ transactionRefs: ['tx-001'], recoverableAmount: 10000 }),
      anomaly({ transactionRefs: ['tx-001'], recoverableAmount: 75000 }),
    ]

    const result = deduplicateAnomalies(input)
    expect(result[0].recoverableAmount).toBe(75000)
  })

  it('handles anomalies with no overlapping refs separately', () => {
    const input = [
      anomaly({ transactionRefs: ['tx-001'] }),
      anomaly({ transactionRefs: ['tx-002'] }),
      anomaly({ transactionRefs: ['tx-003'] }),
    ]

    expect(deduplicateAnomalies(input)).toHaveLength(3)
  })

  it('does not merge anomalies without transaction refs', () => {
    const input = [
      anomaly({ transactionRefs: [] }),
      anomaly({ transactionRefs: [] }),
    ]

    expect(deduplicateAnomalies(input)).toHaveLength(2)
  })

  it('concatenates detail fields from merged anomalies', () => {
    const input = [
      anomaly({ transactionRefs: ['tx-001'], detail: 'Detalle 1' }),
      anomaly({ transactionRefs: ['tx-001'], detail: 'Detalle 2' }),
    ]

    const result = deduplicateAnomalies(input)
    expect(result[0].detail).toContain('Detalle 1')
    expect(result[0].detail).toContain('Detalle 2')
  })

  it('handles multi-group deduplication', () => {
    const input = [
      anomaly({ transactionRefs: ['tx-A', 'tx-B'], type: 'duplicate_commission' }),
      anomaly({ transactionRefs: ['tx-B', 'tx-C'], type: 'duplicate_commission' }),
      anomaly({ transactionRefs: ['tx-X', 'tx-Y'], type: 'incorrect_charge' }),
      anomaly({ transactionRefs: ['tx-Y'], type: 'incorrect_charge' }),
    ]

    const result = deduplicateAnomalies(input)
    expect(result).toHaveLength(2)
    expect(result[0].transactionRefs).toContain('tx-A')
    expect(result[0].transactionRefs).toContain('tx-C')
    expect(result[1].transactionRefs).toContain('tx-X')
  })
})
