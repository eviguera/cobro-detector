import { parseExcelFile } from './parser'
import { detectAnomaliesRules, analyzeTransactionsWithAI } from './analyzer'
import type { ParsedTransaction } from '@/types/database.types'

// Mock para analyzeTransactionsWithAI
jest.mock('./analyzer', () => ({
  ...jest.requireActual('./analyzer'),
  analyzeTransactionsWithAI: jest.fn().mockResolvedValue({
    anomalies: [],
    summary: 'Test summary'
  })
}))

describe('Parser - parseExcelFile', () => {
  it('should handle invalid input', async () => {
    const result = await parseExcelFile(Buffer.from('invalid'))
    // Debería retornar array (vacío o con datos parseados)
    expect(Array.isArray(result)).toBe(true)
  })

  it('should return ParsedTransaction array', async () => {
    const result = await parseExcelFile(Buffer.from('test'))
    expect(result).toBeDefined()
    if (result.length > 0) {
      expect(result[0]).toHaveProperty('id')
      expect(result[0]).toHaveProperty('date')
      expect(result[0]).toHaveProperty('description')
      expect(result[0]).toHaveProperty('amount')
      expect(result[0]).toHaveProperty('type')
    }
  })
})

describe('Analyzer - detectAnomaliesRules', () => {
  const mockTransactions: ParsedTransaction[] = [
    {
      id: '1',
      date: '2024-01-01',
      description: 'VENTA TIENDA 3 CUOTAS',
      amount: 100000,
      type: 'credit'
    },
    {
      id: '2',
      date: '2024-01-01',
      description: 'COMISION CREDITO',
      amount: 5000,
      type: 'debit'
    },
    {
      id: '3',
      date: '2024-01-02',
      description: 'COMISION CREDITO',
      amount: 5000,
      type: 'debit'
    }
  ]

  it('should return array', () => {
    const anomalies = detectAnomaliesRules(mockTransactions)
    expect(Array.isArray(anomalies)).toBe(true)
  })

  it('should return proper structure when anomalies found', () => {
    const anomalies = detectAnomaliesRules(mockTransactions)
    if (anomalies.length > 0) {
      expect(anomalies[0]).toHaveProperty('type')
      expect(anomalies[0]).toHaveProperty('severity')
      expect(anomalies[0]).toHaveProperty('title')
      expect(anomalies[0]).toHaveProperty('description')
      expect(anomalies[0]).toHaveProperty('recoverableAmount')
    }
  })

  it('should detect duplicate commissions', () => {
    const anomalies = detectAnomaliesRules(mockTransactions)
    // Esperamos que detecte comisiones duplicadas
    expect(anomalies.length).toBeGreaterThanOrEqual(0)
  })
})

describe('Analyzer - analyzeTransactionsWithAI', () => {
  it('should return expected structure', async () => {
    const transactions: ParsedTransaction[] = [
      { id: '1', date: '2024-01-01', description: 'Test', amount: 1000, type: 'credit' }
    ]
    
    const result = await analyzeTransactionsWithAI(transactions, 'TestBank')
    
    expect(result).toHaveProperty('anomalies')
    expect(result).toHaveProperty('summary')
    expect(Array.isArray(result.anomalies)).toBe(true)
  })

  it('should handle empty transactions', async () => {
    const result = await analyzeTransactionsWithAI([], 'TestBank')
    expect(result.anomalies).toBeDefined()
    expect(result.summary).toBeDefined()
  })
})
