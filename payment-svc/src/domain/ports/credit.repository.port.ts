import type { Credit } from '../credit.entity'

export interface CreditRepository {
  getCredits(userId: string): Promise<Credit | null>
  addCredits(userId: string, amount: number): Promise<void>
}
