import { describe, it, expect, vi } from 'vitest'
import { PipelineService } from './pipeline.service'
import type { AiProvider, AiResult } from './ports/ai-provider.port'
import type { FileParser } from './ports/parser.port'
import type { ParsedTransaction } from './analysis-result.entity'

function mockParser(transactions: ParsedTransaction[], bank = 'Banco Test'): FileParser {
  return {
    parseTransactions: vi.fn().mockResolvedValue(transactions),
    detectBank: vi.fn().mockReturnValue(bank),
  }
}

function mockAiProvider(overrides?: Partial<AiResult>): AiProvider {
  return {
    analyze: vi.fn().mockResolvedValue({
      anomalies: [],
      summary: 'Resumen sin anomalías para este período analizado.',
      ...overrides,
    }),
  }
}

function tx(overrides: Partial<ParsedTransaction> = {}): ParsedTransaction {
  return {
    id: 'tx-1',
    date: '2026-03-01',
    description: 'COMPRA LIDER',
    amount: -50_000,
    type: 'debit',
    ...overrides,
  }
}

describe('PipelineService', () => {
  describe('run', () => {
    it('returns success with no anomalies for clean transactions', async () => {
      const pipeline = new PipelineService(
        mockAiProvider(),
        mockParser([tx(), tx({ id: 'tx-2', description: 'COMPRA SHELL', amount: -20_000 })]),
      )

      const result = await pipeline.run(Buffer.from(''), 'csv')

      expect(result.success).toBeUndefined()
      expect(result.error).toBeUndefined()
      expect(result.totalTransactions).toBe(2)
      expect(result.totalRecoverable).toBe(0)
      expect(result.anomalies).toHaveLength(0)
      expect(result.bank).toBe('Banco Test')
    })

    it('detects repeated credit commissions and only claims the extra charges', async () => {
      const transactions = [
        tx({ id: 'sale', description: 'VENTA TC RIPLEY 3 CUOTAS SIN INTERES', amount: -300_000 }),
        tx({ id: 'c1', description: 'COMISION CREDITO RIPLEY', amount: -45_000 }),
        tx({ id: 'c2', description: 'COMISION CREDITO RIPLEY', amount: -45_000 }),
        tx({ id: 'c3', description: 'COMISION CREDITO RIPLEY', amount: -45_000 }),
      ]

      const result = await new PipelineService(mockAiProvider(), mockParser(transactions)).run(
        Buffer.from(''),
        'csv',
      )

      const commissions = result.anomalies.filter((a) => a.type === 'duplicate_commission')
      expect(commissions).toHaveLength(1)
      expect(commissions[0].recoverableAmount).toBe(90_000)
      expect(commissions[0].transactionRefs).toEqual(['c2', 'c3'])
      expect(commissions[0].severity).toBe('high')
      expect(commissions[0].confidence).toBeGreaterThanOrEqual(90)
      expect(commissions[0].evidence?.count).toBe(3)
      expect(result.totalRecoverable).toBe(90_000)
    })

    it('does NOT flag a repeated normal sale as duplicate commission', async () => {
      const transactions = [
        tx({ id: 'tx-1', description: 'COMPRA LIDER EXPRESS', amount: -12_000 }),
        tx({ id: 'tx-2', description: 'COMPRA LIDER EXPRESS', amount: -12_000 }),
      ]

      const result = await new PipelineService(mockAiProvider(), mockParser(transactions)).run(
        Buffer.from(''),
        'csv',
      )

      expect(result.anomalies.filter((a) => a.type === 'duplicate_commission')).toHaveLength(0)
      expect(result.anomalies).toHaveLength(1)
      expect(result.anomalies[0].type).toBe('duplicate_charge')
      expect(result.totalRecoverable).toBe(12_000)
    })

    it('detects a true duplicate charge with the same merchant and amount on the same day', async () => {
      const transactions = [
        tx({ id: 'tx-1', description: 'COMPRA FARMACIA AHUMADA', amount: -15_990 }),
        tx({ id: 'tx-2', description: 'COMPRA FARMACIA AHUMADA', amount: -15_990 }),
        tx({ id: 'tx-3', description: 'COMPRA FARMACIA AHUMADA', amount: -15_990, date: '2026-04-15' }),
      ]

      const result = await new PipelineService(mockAiProvider(), mockParser(transactions)).run(
        Buffer.from(''),
        'csv',
      )

      const duplicate = result.anomalies.find((a) => a.title.includes('Cobro duplicado'))
      expect(duplicate).toBeDefined()
      // El cargo de abril no entra: es un mes distinto y > 10 días.
      expect(duplicate?.transactionRefs).toEqual(['tx-2'])
      expect(duplicate?.recoverableAmount).toBe(15_990)
    })

    it('detects interest charged on an installment sale', async () => {
      const transactions = [
        tx({ id: 'sale', description: 'VENTA TC FALABELLA 6 CUOTAS SIN INTERES', amount: -240_000 }),
        tx({ id: 'int-1', description: 'INTERES CORRIENTE FALABELLA', amount: -8_500 }),
      ]

      const result = await new PipelineService(mockAiProvider(), mockParser(transactions)).run(
        Buffer.from(''),
        'csv',
      )

      const installment = result.anomalies.find((a) => a.type === 'installment_error')
      expect(installment).toBeDefined()
      expect(installment?.recoverableAmount).toBe(8_500)
      expect(installment?.transactionRefs).toEqual(['int-1'])
    })

    it('flags generic charges as low confidence without flagging known fees', async () => {
      const transactions = [
        tx({ id: 'tx-1', description: 'COM 1234', amount: -3_000 }),
        tx({ id: 'tx-2', description: 'MANTENCION MENSUAL', amount: -9_900 }),
      ]

      const result = await new PipelineService(mockAiProvider(), mockParser(transactions)).run(
        Buffer.from(''),
        'csv',
      )

      const generic = result.anomalies.filter((a) => a.type === 'unknown_charge')
      expect(generic).toHaveLength(1)
      expect(generic[0].transactionRefs).toEqual(['tx-1'])
      expect(generic[0].severity).toBe('low')
      expect(generic[0].confidence).toBeLessThan(50)
    })

    it('uses labeled anomalies from the CSV with high confidence', async () => {
      const transactions = [
        tx({
          id: 'tx-1',
          description: 'COMPRA RIPLEY',
          amount: -30_000,
          tipoAnomalia: 'COBRO_DOBLE',
          idTransaccionReferencia: 'tx-2',
        }),
        tx({ id: 'tx-2', description: 'COMPRA RIPLEY', amount: -30_000 }),
      ]

      const result = await new PipelineService(mockAiProvider(), mockParser(transactions)).run(
        Buffer.from(''),
        'csv',
      )

      const labeled = result.anomalies.find((a) => a.type === 'duplicate_commission')
      expect(labeled).toBeDefined()
      expect(labeled?.confidence).toBe(98)
      expect(labeled?.recoverableAmount).toBe(30_000)
    })

    it('does not fail the analysis when the AI provider throws', async () => {
      const ai: AiProvider = {
        analyze: vi.fn().mockRejectedValue(new Error('AI service unavailable')),
      }
      const transactions = [
        tx({ id: 'c1', description: 'COMISION CREDITO', amount: -5_000 }),
        tx({ id: 'c2', description: 'COMISION CREDITO', amount: -5_000 }),
      ]

      const result = await new PipelineService(ai, mockParser(transactions)).run(Buffer.from(''), 'csv')

      expect(result.success).toBeUndefined()
      expect(result.anomalies).toHaveLength(1)
      expect(result.totalRecoverable).toBe(5_000)
      expect(result.aiSummary).toContain('Revisamos 2 movimientos')
    })

    it('drops AI anomalies without verifiable transaction references', async () => {
      const ai = mockAiProvider({
        anomalies: [
          {
            type: 'duplicate_commission',
            severity: 'high',
            title: 'Inventada',
            description: 'Sin refs',
            recoverableAmount: 999_999,
            transactionRefs: ['no-existe'],
          },
        ],
      })

      const result = await new PipelineService(ai, mockParser([tx()])).run(Buffer.from(''), 'csv')

      expect(result.anomalies).toHaveLength(0)
      expect(result.totalRecoverable).toBe(0)
    })

    it('caps AI anomalies at the sum of referenced transactions', async () => {
      const ai = mockAiProvider({
        anomalies: [
          {
            type: 'duplicate_commission',
            severity: 'high',
            title: 'Comisión repetida',
            description: 'Dos cobros',
            recoverableAmount: 999_999,
            transactionRefs: ['tx-2'],
          },
        ],
      })
      const transactions = [
        tx({ id: 'tx-1', description: 'COMISION CREDITO', amount: -5_000 }),
        tx({ id: 'tx-2', description: 'COMISION CREDITO', amount: -5_000 }),
      ]

      const result = await new PipelineService(ai, mockParser(transactions)).run(Buffer.from(''), 'csv')

      expect(result.totalRecoverable).toBe(5_000)
    })

    it('does not double count when rules and AI point to the same transaction', async () => {
      const ai = mockAiProvider({
        anomalies: [
          {
            type: 'duplicate_commission',
            severity: 'high',
            title: 'Comisión repetida por IA',
            description: 'Mismo hallazgo',
            recoverableAmount: 5_000,
            transactionRefs: ['tx-2'],
          },
        ],
      })
      const transactions = [
        tx({ id: 'tx-1', description: 'COMISION CREDITO', amount: -5_000 }),
        tx({ id: 'tx-2', description: 'COMISION CREDITO', amount: -5_000 }),
      ]

      const result = await new PipelineService(ai, mockParser(transactions)).run(Buffer.from(''), 'csv')

      expect(result.anomalies).toHaveLength(1)
      expect(result.totalRecoverable).toBe(5_000)
    })

    it('returns a period based on transaction dates', async () => {
      const transactions = [
        tx({ id: 'tx-1', date: '2026-01-05' }),
        tx({ id: 'tx-2', date: '2026-03-20' }),
        tx({ id: 'tx-3', date: '2026-02-15' }),
      ]

      const result = await new PipelineService(mockAiProvider(), mockParser(transactions)).run(
        Buffer.from(''),
        'csv',
      )

      expect(result.period).toEqual({ start: '2026-01-05', end: '2026-03-20' })
    })

    it('fails clearly when no transactions could be parsed', async () => {
      const result = await new PipelineService(mockAiProvider(), mockParser([])).run(
        Buffer.from(''),
        'csv',
      )

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/No pudimos detectar movimientos/i)
      expect(result.totalTransactions).toBe(0)
    })

    it('builds a deterministic summary when AI summary is empty', async () => {
      const result = await new PipelineService(
        mockAiProvider({ summary: '' }),
        mockParser([tx()]),
      ).run(Buffer.from(''), 'csv')

      expect(result.aiSummary).toContain('Revisamos 1 movimientos')
      expect(result.aiSummary).toContain('no encontramos')
    })

    it('returns error result when parser throws', async () => {
      const parser: FileParser = {
        parseTransactions: vi.fn().mockRejectedValue(new Error('Archivo corrupto')),
        detectBank: vi.fn(),
      }

      const result = await new PipelineService(mockAiProvider(), parser).run(Buffer.from(''), 'csv')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Archivo corrupto')
      expect(result.anomalies).toHaveLength(0)
      expect(result.totalTransactions).toBe(0)
    })

    it('handles unknown error (non-Error throw)', async () => {
      const parser: FileParser = {
        parseTransactions: vi.fn().mockRejectedValue('string error'),
        detectBank: vi.fn(),
      }

      const result = await new PipelineService(mockAiProvider(), parser).run(Buffer.from(''), 'csv')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Error desconocido en pipeline')
    })
  })
})
