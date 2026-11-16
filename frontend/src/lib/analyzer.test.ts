import { deduplicateAnomalies, isAllowedStorageUrl } from '@/lib/analyzer'
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

describe('isAllowedStorageUrl', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://demo.supabase.co',
      NEXT_PUBLIC_STORAGE_DRIVER: 'supabase',
    }
    delete process.env.S3_ENDPOINT
    delete process.env.NEXT_PUBLIC_S3_ENDPOINT
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('acepta el prefijo público de Supabase Storage con el driver supabase', () => {
    expect(
      isAllowedStorageUrl('https://demo.supabase.co/storage/v1/object/public/analysis-files/u1/cartola.csv.enc')
    ).toBe(true)
  })

  it('rechaza otro bucket de Supabase', () => {
    expect(
      isAllowedStorageUrl('https://demo.supabase.co/storage/v1/object/public/otros/cartola.csv')
    ).toBe(false)
  })

  it('rechaza hosts que no son Supabase ni S3 con el driver supabase', () => {
    expect(isAllowedStorageUrl('https://evil.example/cartola.csv')).toBe(false)
    expect(
      isAllowedStorageUrl('https://bucket.s3.us-east-1.amazonaws.com/analysis-files/x.enc')
    ).toBe(false)
  })

  it('con el driver s3 acepta URLs prefirmadas de AWS', () => {
    process.env.NEXT_PUBLIC_STORAGE_DRIVER = 's3'
    expect(
      isAllowedStorageUrl(
        'https://cobro-detector.s3.us-east-1.amazonaws.com/analysis-files/u1/x.enc?X-Amz-Signature=abc'
      )
    ).toBe(true)
    expect(
      isAllowedStorageUrl('https://s3.us-east-1.amazonaws.com/cobro-detector/analysis-files/u1/x.enc')
    ).toBe(true)
    expect(
      isAllowedStorageUrl('https://s3.us-east-1.amazonaws.com.cn/bucket/x.enc')
    ).toBe(true)
  })

  it('con el driver s3 acepta Cloudflare R2', () => {
    process.env.NEXT_PUBLIC_STORAGE_DRIVER = 's3'
    expect(
      isAllowedStorageUrl('https://acc.r2.cloudflarestorage.com/bucket/analysis-files/u1/x.enc')
    ).toBe(true)
  })

  it('con el driver s3 acepta el host del S3_ENDPOINT configurado', () => {
    process.env.NEXT_PUBLIC_STORAGE_DRIVER = 's3'
    process.env.S3_ENDPOINT = 'http://127.0.0.1:9000'
    expect(
      isAllowedStorageUrl('http://127.0.0.1:9000/bucket/analysis-files/u1/x.enc')
    ).toBe(true)
  })

  it('rechaza lookalikes y protocolos no http(s) aunque el driver sea s3', () => {
    process.env.NEXT_PUBLIC_STORAGE_DRIVER = 's3'
    expect(
      isAllowedStorageUrl('https://s3.amazonaws.com.evil.example/bucket/x.enc')
    ).toBe(false)
    expect(
      isAllowedStorageUrl('https://s3evil.amazonaws.com/bucket/x.enc')
    ).toBe(false)
    expect(
      isAllowedStorageUrl('ftp://s3.us-east-1.amazonaws.com/bucket/x.enc')
    ).toBe(false)
    expect(isAllowedStorageUrl('no-es-una-url')).toBe(false)
  })

  it('rechaza traversal y URLs demasiado largas', () => {
    expect(
      isAllowedStorageUrl('https://demo.supabase.co/storage/v1/object/public/analysis-files/../../etc/passwd')
    ).toBe(false)
    expect(
      isAllowedStorageUrl(
        'https://demo.supabase.co/storage/v1/object/public/analysis-files/' + 'a'.repeat(2048)
      )
    ).toBe(false)
  })
})
