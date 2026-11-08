/**
 * HARDENED (2026-11): validación centralizada de URLs de Supabase Storage.
 *
 * Se usa en dos puntos que antes tenían allowlists distintas y por eso eran
 * inconsistentes entre sí:
 *   - `POST /v1/analyze` (antes de encolar el trabajo).
 *   - El worker que descarga el archivo (`safe-fetch.ts`).
 *
 * Reglas:
 *   - Producción: solo https y solo hosts de Supabase (el propio SUPABASE_URL
 *     o los dominios gestionados *.supabase.co / *.supabase.in /
 *     supabase.storage.googleapis.com).
 *   - Desarrollo / test: además se aceptan hosts locales (localhost, 127.0.0.1,
 *     ::1). Cuando el servicio corre en un contenedor, la signed URL se genera
 *     en el host y apunta a 127.0.0.1, que dentro del contenedor es el propio
 *     contenedor. En ese caso se reescribe el origen al SUPABASE_URL
 *     configurado para que la descarga funcione.
 *
 * La reescritura nunca permite hosts arbitrarios: solo sustituye un host
 * local por el Supabase configurado por el operador.
 */

const CLOUD_HOST_SUFFIXES = [
  '.supabase.co',
  '.supabase.in',
  'supabase.storage.googleapis.com',
]

export class InvalidFileUrlError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidFileUrlError'
  }
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

function isLocalHostname(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, '')
  return host === 'localhost' || host === '127.0.0.1' || host === '::1'
}

function isCloudHostname(hostname: string): boolean {
  return CLOUD_HOST_SUFFIXES.some(
    (suffix) => hostname === suffix.replace(/^\./, '') || hostname.endsWith(suffix),
  )
}

function configuredSupabase(): URL | null {
  const raw = process.env.SUPABASE_URL
  if (!raw) return null
  try {
    return new URL(raw)
  } catch {
    return null
  }
}

/**
 * Valida `raw` y devuelve la URL que este proceso puede descargar realmente.
 * Lanza `InvalidFileUrlError` si la URL no está permitida.
 */
export function resolveAllowedFileUrl(raw: string): URL {
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    throw new InvalidFileUrlError('URL de archivo inválida')
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new InvalidFileUrlError('La URL del archivo debe usar HTTP(S)')
  }

  const supabase = configuredSupabase()
  const supabaseHostname = supabase?.hostname ?? null
  const hostname = parsed.hostname

  if (isProduction()) {
    if (parsed.protocol !== 'https:') {
      throw new InvalidFileUrlError('La URL del archivo debe usar HTTPS')
    }
    if (hostname !== supabaseHostname && !isCloudHostname(hostname)) {
      throw new InvalidFileUrlError('Host de URL de archivo no permitido')
    }
    return parsed
  }

  // Desarrollo / test: hosts de Supabase o locales.
  const allowed =
    hostname === supabaseHostname ||
    isCloudHostname(hostname) ||
    isLocalHostname(hostname)

  if (!allowed) {
    throw new InvalidFileUrlError('Host de URL de archivo no permitido')
  }

  // Un host local generado en el host anfitrión no es alcanzable desde dentro
  // del contenedor: se sustituye por el Supabase configurado.
  if (isLocalHostname(hostname) && supabase && hostname !== supabaseHostname) {
    return new URL(`${supabase.origin}${parsed.pathname}${parsed.search}`)
  }

  return parsed
}
