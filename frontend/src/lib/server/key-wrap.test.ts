/** @jest-environment node */
import { unwrapDataKey, wrapDataKey } from './key-wrap'

const VALID_KEK = Buffer.alloc(32, 7).toString('base64')
const RAW_DATA_KEY = Buffer.alloc(32, 3).toString('base64')

describe('key-wrap (server envelope)', () => {
  const prev = process.env.ANALYSIS_KEY_ENCRYPTION_KEY

  afterEach(() => {
    if (prev === undefined) delete process.env.ANALYSIS_KEY_ENCRYPTION_KEY
    else process.env.ANALYSIS_KEY_ENCRYPTION_KEY = prev
  })

  it('en modo legado (sin KEK) wrap/unwrap devuelven la clave en claro', () => {
    delete process.env.ANALYSIS_KEY_ENCRYPTION_KEY
    const wrapped = wrapDataKey(RAW_DATA_KEY)
    expect(wrapped).toBe(RAW_DATA_KEY)
    expect(unwrapDataKey(wrapped)).toBe(RAW_DATA_KEY)
  })

  it('con KEK envuelve en v1 y desenvuelve correctamente', () => {
    process.env.ANALYSIS_KEY_ENCRYPTION_KEY = VALID_KEK
    const wrapped = wrapDataKey(RAW_DATA_KEY)
    expect(wrapped.startsWith('v1:')).toBe(true)
    expect(wrapped).not.toContain(RAW_DATA_KEY)
    expect(unwrapDataKey(wrapped)).toBe(RAW_DATA_KEY)
  })

  it('genera ciphertext distinto por llamada (IV aleatorio)', () => {
    process.env.ANALYSIS_KEY_ENCRYPTION_KEY = VALID_KEK
    const a = wrapDataKey(RAW_DATA_KEY)
    const b = wrapDataKey(RAW_DATA_KEY)
    expect(a).not.toBe(b)
    expect(unwrapDataKey(a)).toBe(RAW_DATA_KEY)
    expect(unwrapDataKey(b)).toBe(RAW_DATA_KEY)
  })

  it('acepta claves legadas en texto plano aunque haya KEK', () => {
    process.env.ANALYSIS_KEY_ENCRYPTION_KEY = VALID_KEK
    expect(unwrapDataKey(RAW_DATA_KEY)).toBe(RAW_DATA_KEY)
  })

  it('lanza si falta KEK para desenvuelve v1', () => {
    process.env.ANALYSIS_KEY_ENCRYPTION_KEY = VALID_KEK
    const wrapped = wrapDataKey(RAW_DATA_KEY)
    delete process.env.ANALYSIS_KEY_ENCRYPTION_KEY
    expect(() => unwrapDataKey(wrapped)).toThrow(/ANALYSIS_KEY_ENCRYPTION_KEY es requerida/)
  })

  it('rechaza KEK de longitud inválida', () => {
    process.env.ANALYSIS_KEY_ENCRYPTION_KEY = Buffer.alloc(16, 1).toString('base64')
    expect(() => wrapDataKey(RAW_DATA_KEY)).toThrow(/32 bytes/)
  })

  it('rechaza clave de archivo de longitud inválida', () => {
    process.env.ANALYSIS_KEY_ENCRYPTION_KEY = VALID_KEK
    expect(() => wrapDataKey(Buffer.alloc(16, 1).toString('base64'))).toThrow(/32 bytes/)
  })
})
