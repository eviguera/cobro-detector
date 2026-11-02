/**
 * Cifrado de archivos con AES-256-GCM usando Web Crypto API (navegador).
 *
 * Se usa para cifrar estados de cuenta bancarios (CSV/Excel/PDF) ANTES de
 * subirlos a Supabase Storage. Así, incluso si el bucket se expone, los
 * archivos son ilegibles sin la clave de descifrado.
 *
 * La clave se genera por cada subida y se pasa al microservicio de análisis
 * para que pueda descifrar, procesar y eliminar el archivo.
 */

const ENC_ALGORITHM = 'AES-GCM'
const ENC_KEY_BITS = 256
const IV_BITS = 96

/**
 * Genera una clave efímera de cifrado para un archivo.
 */
export async function generateFileEncryptionKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: ENC_ALGORITHM, length: ENC_KEY_BITS },
    true, // extractable (necesario para exportar la clave y pasarla al backend)
    ['encrypt', 'decrypt'],
  )
}

/**
 * Cifra un archivo con AES-256-GCM.
 * Devuelve los datos cifrados y el IV (vector de inicialización).
 */
export async function encryptFileAES256GCM(
  file: File,
  key: CryptoKey,
): Promise<{ encrypted: ArrayBuffer; iv: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BITS / 8))
  const buffer = await file.arrayBuffer()
  const encrypted = await crypto.subtle.encrypt(
    { name: ENC_ALGORITHM, iv: iv as BufferSource },
    key,
    buffer as BufferSource,
  )
  return { encrypted, iv }
}

/**
 * Descifra un archivo cifrado con AES-256-GCM.
 */
export async function decryptFileAES256GCM(
  encrypted: ArrayBuffer,
  key: CryptoKey,
  iv: Uint8Array,
): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt(
    { name: ENC_ALGORITHM, iv: iv as BufferSource },
    key,
    encrypted as BufferSource,
  )
}

/**
 * Exporta una clave CryptoKey a un array de bytes (para almacenamiento/transmisión).
 */
export async function exportKeyRaw(key: CryptoKey): Promise<Uint8Array> {
  const raw = await crypto.subtle.exportKey('raw', key)
  return new Uint8Array(raw)
}

/**
 * Importa una clave desde bytes crudos.
 */
export async function importKeyRaw(keyData: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    keyData as BufferSource,
    { name: ENC_ALGORITHM, length: ENC_KEY_BITS },
    true,
    ['encrypt', 'decrypt'],
  )
}

/**
 * Convierte Uint8Array a base64 (para almacenar en DB o enviar al backend).
 */
export function toBase64(data: Uint8Array | ArrayBuffer): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Convierte base64 a Uint8Array.
 */
export function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}
