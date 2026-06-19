import { describe, it, expect } from 'vitest'
import { detectBank, parseCSVLine } from './parser'

describe('detectBank', () => {
  it('detects Santander by keyword in filename', () => {
    expect(detectBank('extracto_santander_marzo.pdf')).toBe('Banco Santander')
  })

  it('detects BCI by keyword in filename', () => {
    expect(detectBank('cartola_bci_2024.xlsx')).toBe('BCI')
  })

  it('detects Banco de Chile by keyword in filename', () => {
    expect(detectBank('movimientos_chile_ene.csv')).toBe('Banco de Chile')
  })

  it('detects BancoEstado by keyword in filename', () => {
    expect(detectBank('banco_estado_resumen.pdf')).toBe('BancoEstado')
  })

  it('detects Itaú with accented keyword', () => {
    expect(detectBank('itaú_cartola.csv')).toBe('Itaú')
  })

  it('detects Itaú without accent', () => {
    expect(detectBank('itau_cartola.csv')).toBe('Itaú')
  })

  it('detects Scotiabank by full name', () => {
    expect(detectBank('scotiabank_extracto.xlsx')).toBe('Scotiabank')
  })

  it('detects Scotiabank by short name', () => {
    expect(detectBank('scotia_cartola.pdf')).toBe('Scotiabank')
  })

  it('detects Banco Security', () => {
    expect(detectBank('security_cartola.csv')).toBe('Banco Security')
  })

  it('detects Banco Falabella', () => {
    expect(detectBank('falabella_extracto.pdf')).toBe('Banco Falabella')
  })

  it('detects Banco Ripley', () => {
    expect(detectBank('ripley_cartola.csv')).toBe('Banco Ripley')
  })

  it('returns desconocido for unmatched input', () => {
    expect(detectBank('archivo_sin_banco.pdf')).toBe('desconocido')
  })

  it('searches content string when filename does not match', () => {
    expect(detectBank('report.pdf', 'Este es un extracto del banco estado')).toBe('BancoEstado')
  })

  it('is case insensitive', () => {
    expect(detectBank('SANTANDER_CARTOLA.pdf')).toBe('Banco Santander')
    expect(detectBank('BCI_2024.csv')).toBe('BCI')
  })
})

describe('parseCSVLine', () => {
  it('splits a simple CSV line by commas', () => {
    expect(parseCSVLine('a,b,c')).toEqual(['a', 'b', 'c'])
  })

  it('handles quoted fields with commas inside', () => {
    expect(parseCSVLine('1,"text, with comma",3')).toEqual(['1', 'text, with comma', '3'])
  })

  it('handles escaped double quotes inside quoted fields', () => {
    expect(parseCSVLine('1,"text ""quoted"" here",3')).toEqual(['1', 'text "quoted" here', '3'])
  })

  it('handles empty fields at start', () => {
    expect(parseCSVLine(',b,c')).toEqual(['', 'b', 'c'])
  })

  it('handles empty fields at end', () => {
    expect(parseCSVLine('a,b,')).toEqual(['a', 'b', ''])
  })

  it('handles single field without comma', () => {
    expect(parseCSVLine('onlyfield')).toEqual(['onlyfield'])
  })

  it('handles empty line', () => {
    expect(parseCSVLine('')).toEqual([''])
  })

  it('handles quoted field with spaces outside quotes', () => {
    expect(parseCSVLine('a, "b", c')).toEqual(['a', ' b', ' c'])
  })

  it('handles multiple quoted fields', () => {
    expect(parseCSVLine('"hello","world, foo","bar"')).toEqual(['hello', 'world, foo', 'bar'])
  })

  it('handles conjoined quoted fields with no separator gaps', () => {
    expect(parseCSVLine('"a","b","c"')).toEqual(['a', 'b', 'c'])
  })
})
