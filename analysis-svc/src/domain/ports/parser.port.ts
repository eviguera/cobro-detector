import type { ParsedTransaction } from '../analysis-result.entity.js'

export interface FileParser {
  parseTransactions(content: Buffer | ArrayBuffer, fileType: string): Promise<ParsedTransaction[]>
  detectBank(transactions: ParsedTransaction[]): string
}
