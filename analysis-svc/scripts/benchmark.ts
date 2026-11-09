import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CompositeParserAdapter } from '../src/infrastructure/adapters/composite-parser.adapter.js'
import { PipelineService } from '../src/domain/pipeline.service.js'
import type { DetectedAnomaly } from '../src/domain/analysis-result.entity.js'
import type { AiProvider } from '../src/domain/ports/ai-provider.port.js'

/**
 * Benchmark de precisión del motor determinístico.
 *
 * Uso:
 *   npm run benchmark
 *   npm run benchmark -- --strict   # falla si precision < 0.9
 *
 * Cada caso vive en benchmarks/cartolas/*.csv y su verdad esperada en
 * benchmarks/cases.json. Se compara por (tipo, monto) porque el ID de
 * transacción lo genera el parser y no es estable entre corridas.
 */

interface ExpectedFinding {
  type: string
  amount: number
}

interface BenchmarkCase {
  file: string
  name: string
  bank?: string
  expected: ExpectedFinding[]
}

interface PredictedFinding {
  type: string
  amount: number
  title: string
  confidence?: number
}

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

const noAi: AiProvider = {
  async analyze() {
    return { anomalies: [], summary: '' }
  },
}

function keyOf(finding: { type: string; amount: number }): string {
  return `${finding.type}|${Math.round(Math.abs(finding.amount))}`
}

function toPredicted(anomalies: DetectedAnomaly[]): PredictedFinding[] {
  return anomalies.map((anomaly) => ({
    type: anomaly.type,
    amount: Math.round(Math.abs(anomaly.recoverableAmount)),
    title: anomaly.title,
    confidence: anomaly.confidence,
  }))
}

function match(
  expected: ExpectedFinding[],
  predicted: PredictedFinding[]
): { tp: number; fp: PredictedFinding[]; fn: ExpectedFinding[]; correctIndexes: Set<number> } {
  const available = new Map<string, number[]>()
  predicted.forEach((item, index) => {
    const key = keyOf(item)
    const indexes = available.get(key) ?? []
    indexes.push(index)
    available.set(key, indexes)
  })

  const fn: ExpectedFinding[] = []
  const correctIndexes = new Set<number>()
  let tp = 0

  for (const item of expected) {
    const indexes = available.get(keyOf(item)) ?? []
    if (indexes.length > 0) {
      const index = indexes.shift()!
      correctIndexes.add(index)
      tp++
    } else {
      fn.push(item)
    }
  }

  const fp = predicted.filter((_, index) => !correctIndexes.has(index))
  return { tp, fp, fn, correctIndexes }
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

async function main() {
  const cases: BenchmarkCase[] = JSON.parse(
    readFileSync(join(root, 'benchmarks', 'cases.json'), 'utf8')
  )
  const parser = new CompositeParserAdapter()
  const pipeline = new PipelineService(noAi, parser)

  let totalTp = 0
  let totalFp = 0
  let totalFn = 0
  let highConfidencePredicted = 0
  let highConfidenceCorrect = 0
  let failedCases = 0

  console.log('\nCobroDetector · benchmark del motor de análisis\n')

  for (const testCase of cases) {
    const buffer = readFileSync(join(root, 'benchmarks', 'cartolas', testCase.file))
    const result = await pipeline.run(buffer, 'csv', { fileName: testCase.file })

    if (result.success === false) {
      failedCases++
      console.log(`✗ ${testCase.name}`)
      console.log(`  error: ${result.error}`)
      continue
    }

    const predicted = toPredicted(result.anomalies)
    const { tp, fp, fn, correctIndexes } = match(testCase.expected, predicted)
    totalTp += tp
    totalFp += fp.length
    totalFn += fn.length

    predicted.forEach((item, index) => {
      if ((item.confidence ?? 0) >= 75) {
        highConfidencePredicted++
        if (correctIndexes.has(index)) highConfidenceCorrect++
      }
    })

    const ok = fp.length === 0 && fn.length === 0
    console.log(`${ok ? '✓' : '✗'} ${testCase.name}`)
    console.log(
      `  esperados=${testCase.expected.length} predichos=${predicted.length} TP=${tp} FP=${fp.length} FN=${fn.length}`
    )

    if (fp.length > 0) {
      for (const item of fp) {
        console.log(
          `    FP  ${item.type} $${item.amount.toLocaleString('es-CL')} · ${item.title} (confianza ${item.confidence ?? '—'}%)`
        )
      }
    }
    if (fn.length > 0) {
      for (const item of fn) {
        console.log(`    FN  ${item.type} $${item.amount.toLocaleString('es-CL')}`)
      }
    }
  }

  const precision = totalTp + totalFp > 0 ? totalTp / (totalTp + totalFp) : 1
  const recall = totalTp + totalFn > 0 ? totalTp / (totalTp + totalFn) : 1
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0
  const highConfidencePrecision =
    highConfidencePredicted > 0 ? highConfidenceCorrect / highConfidencePredicted : 1

  console.log('\n────────────────────────────────────────')
  console.log(`Casos:       ${cases.length} (fallidos: ${failedCases})`)
  console.log(`TP / FP / FN: ${totalTp} / ${totalFp} / ${totalFn}`)
  console.log(`Precision:   ${pct(precision)}`)
  console.log(`Recall:      ${pct(recall)}`)
  console.log(`F1:          ${pct(f1)}`)
  console.log(
    `Confianza ≥75: ${pct(highConfidencePrecision)} (${highConfidenceCorrect}/${highConfidencePredicted})`
  )
  console.log('────────────────────────────────────────\n')

  const strict = process.argv.includes('--strict')
  if (strict && (precision < 0.9 || recall < 0.9 || failedCases > 0)) {
    console.error('Benchmark por debajo del umbral (precision/recall >= 90%).')
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Error ejecutando benchmark:', error)
  process.exit(1)
})
