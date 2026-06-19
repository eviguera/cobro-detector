import type { Credit } from '../credit.entity'

export interface CreditRepository {
  getCredits(userId: string): Promise<Credit | null>
  consumeAtomic(userId: string): Promise<boolean>
  addCredits(userId: string, amount: number): Promise<void>
}
