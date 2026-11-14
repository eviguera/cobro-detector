import 'server-only'
import crypto from 'node:crypto'

const PREFIX = 'v1'
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12

function getKek(): Buffer | null {
  const raw = process.env.ANALYSIS_KEY_ENCRYPTION_KEY?.trim()
  if (!raw) return null
  const key = Buffer.from(raw, 'base64')
  if (key.length !== 32) {
    throw new Error('ANALYSIS_KEY_ENCRYPTION_KEY debe ser 32 bytes en base64 (AES-256)')
  }
  return key
}

/**
 * Envuelve (cifra) la clave de cifrado de archivo con una KEK del servidor para
 * no almacenar la clave en texto plano en la base de datos.
 *
 * Si `ANALYSIS_KEY_ENCRYPTION_KEY` no está configurada, devuelve la clave tal
 * cual (modo legado/dev) para no romper entornos sin la variable.
 */
export function wrapDataKey(rawKeyBase64: string): string {
  const kek = getKek()
  if (!kek) return rawKeyBase64

  const dataKey = Buffer.from(rawKeyBase64, 'base64')
  if (dataKey.length !== 32) {
    throw new Error('La clave de archivo debe ser de 32 bytes en base64')
  }

  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, kek, iv)
  const ciphertext = Buffer.concat([cipher.update(dataKey), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${PREFIX}:${iv.toString('base64')}.${tag.toString('base64')}.${ciphertext.toString('base64')}`
}

/**
 * Desenvuelve una clave almacenada. Acepta formato envuelto `v1:<iv>.<tag>.<ct>`
 * y, por retrocompatibilidad, claves base64 en texto plano (filas antiguas).
 */
export function unwrapDataKey(stored: string): string {
  if (!stored.startsWith(`${PREFIX}:`)) return stored

  const kek = getKek()
  if (!kek) {
    throw new Error(
      'ANALYSIS_KEY_ENCRYPTION_KEY es requerida para descifrar claves envueltas',
    )
  }

  const payload = stored.slice(PREFIX.length + 1)
  const [ivB64, tagB64, ctB64] = payload.split('.')
  if (!ivB64 || !tagB64 || !ctB64) {
    throw new Error('Formato de clave envuelta inválido')
  }

  const iv = Buffer.from(ivB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')
  const ciphertext = Buffer.from(ctB64, 'base64')
  const decipher = crypto.createDecipheriv(ALGORITHM, kek, iv)
  decipher.setAuthTag(tag)
  const dataKey = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return dataKey.toString('base64')
}
