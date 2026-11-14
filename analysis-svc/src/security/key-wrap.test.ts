import { afterEach, describe, expect, it } from 'vitest'
import { unwrapDataKey } from './key-wrap.js'

const VALID_KEK = Buffer.alloc(32, 7).toString('base64')
const RAW_DATA_KEY = Buffer.alloc(32, 3).toString('base64')

function wrapWithKek(rawKeyBase64: string, kekBase64: string): string {
  // Implementación espejo mínima para generar material de prueba determinista en formato v1.
  const crypto = require('node:crypto') as typeof import('node:crypto')
  const iv = Buffer.alloc(12, 5)
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(kekBase64, 'base64'), iv)
  const ct = Buffer.concat([cipher.update(Buffer.from(rawKeyBase64, 'base64')), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1:${iv.toString('base64')}.${tag.toString('base64')}.${ct.toString('base64')}`
}

describe('unwrapDataKey', () => {
  const prev = process.env.ANALYSIS_KEY_ENCRYPTION_KEY

  afterEach(() => {
    if (prev === undefined) delete process.env.ANALYSIS_KEY_ENCRYPTION_KEY
    else process.env.ANALYSIS_KEY_ENCRYPTION_KEY = prev
  })

  it('devuelve la clave en texto plano para filas legadas (sin prefijo v1)', () => {
    delete process.env.ANALYSIS_KEY_ENCRYPTION_KEY
    expect(unwrapDataKey(RAW_DATA_KEY)).toBe(RAW_DATA_KEY)
  })

  it('desenvuelve una clave v1 cuando la KEK está configurada', () => {
    process.env.ANALYSIS_KEY_ENCRYPTION_KEY = VALID_KEK
    const wrapped = wrapWithKek(RAW_DATA_KEY, VALID_KEK)
    expect(unwrapDataKey(wrapped)).toBe(RAW_DATA_KEY)
  })

  it('lanza si la clave está envuelta pero falta la KEK', () => {
    delete process.env.ANALYSIS_KEY_ENCRYPTION_KEY
    const wrapped = wrapWithKek(RAW_DATA_KEY, VALID_KEK)
    expect(() => unwrapDataKey(wrapped)).toThrow(/ANALYSIS_KEY_ENCRYPTION_KEY es requerida/)
  })

  it('lanza si la KEK configurada no es de 32 bytes', () => {
    process.env.ANALYSIS_KEY_ENCRYPTION_KEY = Buffer.alloc(16, 1).toString('base64')
    const wrapped = wrapWithKek(RAW_DATA_KEY, VALID_KEK)
    expect(() => unwrapDataKey(wrapped)).toThrow(/32 bytes/)
  })

  it('lanza si el formato envuelto es inválido', () => {
    process.env.ANALYSIS_KEY_ENCRYPTION_KEY = VALID_KEK
    expect(() => unwrapDataKey('v1:invalido')).toThrow(/Formato de clave envuelta inválido/)
  })
})
