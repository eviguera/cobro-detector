/**
 * HARDENED (2026-11): descarga segura de archivos de análisis.
 *
 * `file_url` se persiste en la tabla `analyses` y antes se descargaba con un
 * fetch sin restricciones: un atacante con visibilidad sobre esa columna podía
 * hacer que el servidor descargue URLs internas (SSRF). Ahora:
 *   1. Solo se aceptan URLs cuyo host sea el propio Supabase (SUPABASE_URL o
 *      supabase.co/.supabase.in en producción).
 *   2. Se rechazan redirects (`redirect: 'error'`) para que un redirect no
 *      bypasee la allowlist.
 *   3. Timeout de descarga (AbortSignal) y límite de tamaño del archivo.
 *   4. Los mensajes de error son seguros para exponer al cliente (sin detalles
 *      internos de red); los detalles quedan en el log del servicio.
 */

const MAX_FILE_BYTES = 25 * 1024 * 1024 // 25 MB
const FETCH_TIMEOUT_MS = 15_000 // 15s

function resolveSupabaseHostname(): string {
  const supabaseUrl = process.env.SUPABASE_URL
  if (!supabaseUrl) throw new Error('File download configuration missing')
  try {
    return new URL(supabaseUrl).hostname
  } catch {
    throw new Error('File download configuration missing')
  }
}

function isAllowedHost(hostname: string): boolean {
  if (hostname === resolveSupabaseHostname()) return true
  // Hosts gestionados de Supabase en producción.
  return hostname.endsWith('.supabase.co') || hostname.endsWith('.supabase.in')
}

export async function fetchFileFromSupabase(fileUrl: string): Promise<Buffer> {
  let parsed: URL
  try {
    parsed = new URL(fileUrl)
  } catch {
    throw new Error('Invalid file URL')
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('File URL is not allowed')
  }
  if (!isAllowedHost(parsed.hostname)) {
    throw new Error('File URL is not allowed')
  }

  let response: Response
  try {
    response = await fetch(parsed.toString(), {
      redirect: 'error',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new Error('File download timed out')
    }
    throw new Error('Error downloading the file')
  }

  if (!response.ok) {
    throw new Error('Error downloading the file')
  }

  const declaredLength = Number(response.headers.get('content-length') ?? '0')
  if (Number.isFinite(declaredLength) && declaredLength > MAX_FILE_BYTES) {
    throw new Error('File exceeds the maximum allowed size')
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  if (buffer.byteLength > MAX_FILE_BYTES) {
    throw new Error('File exceeds the maximum allowed size')
  }

  return buffer
}
