import type { ParsedTransaction } from '../analysis-result.entity'

export interface FileParser {
  parseTransactions(content: Buffer | ArrayBuffer, fileType: string): Promise<ParsedTransaction[]>
  detectBank(transactions: ParsedTransaction[]): string
}
