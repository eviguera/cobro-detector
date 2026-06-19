import { describe, it, expect, vi } from 'vitest'
import { PipelineService } from './pipeline.service'
import type { AiProvider, AiResult } from './ports/ai-provider.port'
import type { FileParser } from './ports/parser.port'
import type { ParsedTransaction, DetectedAnomaly } from './analysis-result.entity'

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
      summary: 'Resumen sin anomalías',
      ...overrides,
    }),
  }
}

function tx(overrides: Partial<ParsedTransaction> = {}): ParsedTransaction {
  return {
    id: 'tx-1',
    date: '2024-03-01',
    description: 'COMPRA MENSUAL',
    amount: -50000,
    type: 'debit',
    ...overrides,
  }
}

describe('PipelineService', () => {
  describe('run', () => {
    it('returns success with no anomalies for clean transactions', async () => {
      const parser = mockParser([tx()])
      const ai = mockAiProvider()
      const pipeline = new PipelineService(ai, parser)

      const result = await pipeline.run(Buffer.from(''), 'csv')

      expect(result.success).toBeUndefined()
      expect(result.error).toBeUndefined()
      expect(result.totalTransactions).toBe(1)
      expect(result.totalRecoverable).toBe(0)
      expect(result.anomalies).toHaveLength(0)
      expect(result.bank).toBe('Banco Test')
      expect(result.aiSummary).toBe('Resumen sin anomalías')
    })

    it('detects duplicate_commission anomalies via rules', async () => {
      const transactions = [
        tx({ id: 'tx-1', description: 'CARGO DUPLICADO MENSUAL', amount: -3000 }),
        tx({ id: 'tx-2', description: 'CARGO DUPLICADO MENSUAL', amount: -3000 }),
        tx({ id: 'tx-3', description: 'OTRO CARGO CUALQUIERA', amount: -1500 }),
      ]
      const parser = mockParser(transactions)
      const ai = mockAiProvider({ anomalies: [] })
      const pipeline = new PipelineService(ai, parser)

      const result = await pipeline.run(Buffer.from(''), 'csv')

      const dups = result.anomalies.filter(a => a.type === 'duplicate_commission')
      expect(dups).toHaveLength(1)
      expect(dups[0].severity).toBe('high')
      expect(dups[0].recoverableAmount).toBe(-3000)
      expect(dups[0].transactionRefs).toEqual(['tx-1', 'tx-2'])
    })

    it('detects labeled anomalies via keywords', async () => {
      const transactions = [
        tx({ id: 'tx-1', description: 'COBRO SEGuro vehiculo', amount: -25000 }),
        tx({ id: 'tx-2', description: 'Suscripcion premium', amount: -9900 }),
      ]
      const parser = mockParser(transactions)
      const ai = mockAiProvider({ anomalies: [] })
      const pipeline = new PipelineService(ai, parser)

      const result = await pipeline.run(Buffer.from(''), 'csv')

      const labeled = result.anomalies.filter(a => a.type === 'unknown_charge')
      expect(labeled).toHaveLength(2)
      expect(labeled[0].recoverableAmount).toBe(-25000)
      expect(labeled[1].recoverableAmount).toBe(-9900)
    })

    it('deduplicates identical anomalies from rules and AI', async () => {
      const transactions = [
        tx({ id: 'tx-1', description: 'CARGO DUPLICADO', amount: -5000 }),
        tx({ id: 'tx-2', description: 'CARGO DUPLICADO', amount: -5000 }),
      ]
      const parser = mockParser(transactions)
      const ai = mockAiProvider({
        anomalies: [
          {
            type: 'duplicate_commission',
            severity: 'high',
            title: 'Comisión duplicada',
            description: 'Coincide con regla',
            detail: 'AI also detected',
            recoverableAmount: -5000,
            transactionRefs: ['tx-1'],
          } as unknown as Record<string, unknown>,
        ],
      })
      const pipeline = new PipelineService(ai, parser)

      const result = await pipeline.run(Buffer.from(''), 'csv')

      const dups = result.anomalies.filter(a => a.type === 'duplicate_commission')
      expect(dups).toHaveLength(1)
      expect(dups[0].recoverableAmount).toBe(-10000)
      expect(dups[0].transactionRefs).toEqual(['tx-1', 'tx-2'])
    })

    it('returns a period based on transaction dates', async () => {
      const transactions = [
        tx({ id: 'tx-1', date: '2024-01-05', description: 'CARGO A', amount: -1000 }),
        tx({ id: 'tx-2', date: '2024-03-20', description: 'CARGO B', amount: -2000 }),
        tx({ id: 'tx-3', date: '2024-02-15', description: 'CARGO C', amount: -3000 }),
      ]
      const parser = mockParser(transactions)
      const ai = mockAiProvider()
      const pipeline = new PipelineService(ai, parser)

      const result = await pipeline.run(Buffer.from(''), 'csv')

      expect(result.period).toEqual({ start: '2024-01-05', end: '2024-03-20' })
    })

    it('omits period when there are no transactions', async () => {
      const parser = mockParser([])
      const ai = mockAiProvider()
      const pipeline = new PipelineService(ai, parser)

      const result = await pipeline.run(Buffer.from(''), 'csv')

      expect(result.period).toBeUndefined()
      expect(result.totalTransactions).toBe(0)
    })

    it('includes AI summary in the result', async () => {
      const parser = mockParser([tx()])
      const ai = mockAiProvider({ summary: 'Análisis completo: 2 anomalías detectadas' })
      const pipeline = new PipelineService(ai, parser)

      const result = await pipeline.run(Buffer.from(''), 'csv')

      expect(result.aiSummary).toBe('Análisis completo: 2 anomalías detectadas')
    })

    it('returns error result when parser throws', async () => {
      const parser: FileParser = {
        parseTransactions: vi.fn().mockRejectedValue(new Error('Archivo corrupto')),
        detectBank: vi.fn(),
      }
      const ai = mockAiProvider()
      const pipeline = new PipelineService(ai, parser)

      const result = await pipeline.run(Buffer.from(''), 'csv')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Archivo corrupto')
      expect(result.anomalies).toHaveLength(0)
      expect(result.totalTransactions).toBe(0)
    })

    it('returns error result when AI provider throws', async () => {
      const parser = mockParser([tx()])
      const ai: AiProvider = {
        analyze: vi.fn().mockRejectedValue(new Error('AI service unavailable')),
      }
      const pipeline = new PipelineService(ai, parser)

      const result = await pipeline.run(Buffer.from(''), 'csv')

      expect(result.success).toBe(false)
      expect(result.error).toBe('AI service unavailable')
    })

    it('computes totalRecoverable from all anomalies', async () => {
      const transactions = [
        tx({ id: 'tx-1', description: 'CARGO DUPLICADO A', amount: -2000 }),
        tx({ id: 'tx-2', description: 'CARGO DUPLICADO A', amount: -2000 }),
        tx({ id: 'tx-3', description: 'SEGURO VIDA', amount: -15000 }),
      ]
      const parser = mockParser(transactions)
      const ai = mockAiProvider({ anomalies: [] })
      const pipeline = new PipelineService(ai, parser)

      const result = await pipeline.run(Buffer.from(''), 'csv')

      // duplicate_commission: -2000 * (2-1) = -2000, unknown_charge: -15000
      expect(result.totalRecoverable).toBe(-17000)
    })

    it('handles unknown error (non-Error throw)', async () => {
      const parser: FileParser = {
        parseTransactions: vi.fn().mockRejectedValue('string error'),
        detectBank: vi.fn(),
      }
      const ai = mockAiProvider()
      const pipeline = new PipelineService(ai, parser)

      const result = await pipeline.run(Buffer.from(''), 'csv')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Error desconocido en pipeline')
    })
  })
})
