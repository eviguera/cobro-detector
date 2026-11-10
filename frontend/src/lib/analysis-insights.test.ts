import {
  buildAnalysisInsights,
  buildFindingGroups,
  normalizeFinding,
  normalizeFindings,
} from './analysis-insights'

describe('normalizeFinding', () => {
  it('normaliza un hallazgo en camelCase desde el JSON de la DB', () => {
    const finding = normalizeFinding({
      type: 'duplicate_commission',
      severity: 'high',
      title: 'Comisión duplicada',
      description: 'Se cobró en cada cuota',
      detail: '12 cuotas',
      recoverableAmount: 150000,
      transactionRefs: ['tx-1', 'tx-2'],
    })

    expect(finding).not.toBeNull()
    expect(finding).toMatchObject({
      type: 'duplicate_commission',
      severity: 'high',
      amount: 150000,
      transactionRefs: ['tx-1', 'tx-2'],
    })
    // Severidad alta + refs + detalle + monto => confianza máxima del hallazgo.
    expect(finding?.confidence).toBe(100)
  })

  it('acepta snake_case de una respuesta de microservicio', () => {
    const finding = normalizeFinding({
      type: 'unknown_charge',
      severity: 'low',
      title: 'Cargo raro',
      recoverable_amount: '12.345',
      transaction_refs: ['tx-9'],
    })

    expect(finding?.amount).toBe(12345)
    expect(finding?.transactionRefs).toEqual(['tx-9'])
  })

  it('descarta entradas sin título ni monto', () => {
    expect(normalizeFinding({ severity: 'high' })).toBeNull()
    expect(normalizeFinding(null)).toBeNull()
    expect(normalizeFinding('texto')).toBeNull()
  })

  it('usa low como severidad por defecto y no rompe con datos inválidos', () => {
    const finding = normalizeFinding({ title: 'X', severity: 'critical', recoverableAmount: -500 })
    expect(finding?.severity).toBe('low')
    expect(finding?.amount).toBe(500)
  })
})

describe('normalizeFindings', () => {
  it('ordena por severidad y luego por monto descendente', () => {
    const findings = normalizeFindings([
      { title: 'bajo', severity: 'low', recoverableAmount: 90000 },
      { title: 'alto pequeño', severity: 'high', recoverableAmount: 1000 },
      { title: 'medio', severity: 'medium', recoverableAmount: 50000 },
      { title: 'alto grande', severity: 'high', recoverableAmount: 20000 },
    ])

    expect(findings.map((f) => f.title)).toEqual(['alto grande', 'alto pequeño', 'medio', 'bajo'])
  })

  it('retorna [] si el JSON no es un array', () => {
    expect(normalizeFindings(null)).toEqual([])
    expect(normalizeFindings({ title: 'x' })).toEqual([])
  })
})

describe('buildFindingGroups', () => {
  it('agrupa por tipo y calcula participación del monto', () => {
    const findings = normalizeFindings([
      { type: 'duplicate_commission', severity: 'high', title: 'A', recoverableAmount: 75000 },
      { type: 'duplicate_commission', severity: 'high', title: 'B', recoverableAmount: 25000 },
      { type: 'unknown_charge', severity: 'low', title: 'C', recoverableAmount: 10000 },
    ])

    const groups = buildFindingGroups(findings)

    expect(groups).toHaveLength(2)
    expect(groups[0]).toMatchObject({ type: 'duplicate_commission', count: 2, amount: 100000, share: 91 })
    expect(groups[1]).toMatchObject({ type: 'unknown_charge', count: 1, amount: 10000, share: 9 })
    expect(groups[0].severities.high).toBe(2)
  })
})

describe('buildAnalysisInsights', () => {
  it('sin hallazgos deja prioridad ninguna y acción de resguardo', () => {
    const insights = buildAnalysisInsights({
      anomalies: [],
      totalTransactions: 120,
      recoverableAmount: 0,
      bank: 'Santander',
      hasAiSummary: true,
    })

    expect(insights.counts.total).toBe(0)
    expect(insights.priority).toBe('ninguna')
    expect(insights.recoverable).toBe(0)
    expect(insights.actionPlan).toHaveLength(2)
    expect(insights.confidence).toBeGreaterThan(60)
    expect(insights.confidenceLabel).toBe('alta')
  })

  it('marca prioridad alta con un hallazgo high y calcula promedio', () => {
    const insights = buildAnalysisInsights({
      anomalies: [
        { type: 'duplicate_commission', severity: 'high', title: 'A', recoverableAmount: 60000, transactionRefs: ['t1'] },
        { type: 'incorrect_charge', severity: 'medium', title: 'B', recoverableAmount: 40000, transactionRefs: ['t2'] },
      ],
      totalTransactions: 80,
      recoverableAmount: 100000,
      bank: 'BCI',
      hasAiSummary: true,
    })

    expect(insights.priority).toBe('alta')
    expect(insights.average).toBe(50000)
    expect(insights.largest?.amount).toBe(60000)
    expect(insights.hasDiscrepancy).toBe(false)
    expect(insights.actionPlan.length).toBeGreaterThanOrEqual(4)
  })

  it('detecta discrepancia entre el monto guardado y la suma de hallazgos', () => {
    const insights = buildAnalysisInsights({
      anomalies: [{ type: 'unknown_charge', severity: 'low', title: 'A', recoverableAmount: 1000 }],
      totalTransactions: 10,
      recoverableAmount: 5000,
      bank: null,
    })

    expect(insights.hasDiscrepancy).toBe(true)
    // El monto oficial manda: no duplicamos dinero por la suma de hallazgos.
    expect(insights.recoverable).toBe(5000)
  })

  it('baja la confianza cuando no hay banco, resumen IA ni evidencia', () => {
    const insights = buildAnalysisInsights({
      anomalies: [{ type: 'unknown_charge', severity: 'low', title: 'A', recoverableAmount: 1000 }],
      totalTransactions: 3,
      recoverableAmount: 1000,
      bank: null,
      hasAiSummary: false,
    })

    expect(insights.confidenceLabel).toBe('baja')
    expect(insights.confidence).toBeLessThan(50)
  })
})
