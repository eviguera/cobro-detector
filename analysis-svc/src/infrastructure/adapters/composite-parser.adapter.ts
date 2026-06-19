import type { ParsedTransaction } from '../../domain/analysis-result.types.js'
import type { FileParser } from '../../domain/ports/parser.port.js'
import { parsePDFFile, parseExcelFile, detectBank } from './parser.js'

export class CompositeParserAdapter implements FileParser {
  async parseTransactions(content: Buffer | ArrayBuffer, fileType: string): Promise<ParsedTransaction[]> {
    if (fileType.includes('pdf')) {
      return parsePDFFile(content as Buffer)
    }
    if (fileType.includes('spreadsheet') || fileType.includes('excel') || fileType.includes('csv')) {
      return parseExcelFile(content as ArrayBuffer)
    }
    throw new Error(`Unsupported file type: ${fileType}`)
  }

  detectBank(transactions: ParsedTransaction[]): string {
    const text = transactions.map(tx => tx.description ?? '').join(' ')
    return detectBank('', text) ?? ''
  }
}
