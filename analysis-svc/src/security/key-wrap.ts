import crypto from 'node:crypto'

const PREFIX = 'v1'
const ALGORITHM = 'aes-256-gcm'

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
 * Desenvuelve la clave de cifrado del archivo. Soporta:
 * - `v1:<iv>.<tag>.<ct>`: clave envuelta con la KEK del servidor (requiere
 *   `ANALYSIS_KEY_ENCRYPTION_KEY`).
 * - base64 plano: retrocompatibilidad con filas anteriores al envelope.
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
