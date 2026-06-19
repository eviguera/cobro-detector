import type { ParsedTransaction } from '../../domain/analysis-result.types.js'
import type { AiResult, AiProvider } from '../../domain/ports/ai-provider.port.js'

const STATE_KEY = 'groq'
const MAX_FAILURES = 3
const COOLDOWN_MS = 30_000

interface CircuitState {
  failures: number
  lastFailure: number
  isOpen: boolean
}

const state: CircuitState = { failures: 0, lastFailure: 0, isOpen: false }

export class CircuitBreakerAiAdapter implements AiProvider {
  constructor(private readonly inner: AiProvider) {}

  async analyze(transactions: ParsedTransaction[], bank: string): Promise<AiResult> {
    if (this.isOpen()) {
      const elapsed = Date.now() - state.lastFailure
      if (elapsed < COOLDOWN_MS) {
        return { anomalies: [], summary: '', degraded: true }
      }
      state.isOpen = false
    }

    try {
      const result = await this.inner.analyze(transactions, bank)
      if (result.degraded) {
        this.recordFailure()
      } else {
        this.recordSuccess()
      }
      return result
    } catch {
      this.recordFailure()
      return { anomalies: [], summary: '', degraded: true }
    }
  }

  private isOpen(): boolean {
    return state.failures >= MAX_FAILURES && state.isOpen
  }

  private recordFailure(): void {
    state.failures++
    state.lastFailure = Date.now()
    if (state.failures >= MAX_FAILURES) {
      state.isOpen = true
    }
  }

  private recordSuccess(): void {
    state.failures = 0
    state.isOpen = false
  }
}
