/**
 * HARDENED (2026-11): validación centralizada de URLs de Storage.
 *
 * Se usa en dos puntos que antes tenían allowlists distintas y por eso eran
 * inconsistentes entre sí:
 *   - `POST /v1/analyze` (antes de encolar el trabajo).
 *   - El worker que descarga el archivo (`safe-fetch.ts`).
 *
 * Reglas:
 *   - Producción: solo https y solo hosts de Storage conocidos:
 *       · el propio SUPABASE_URL o dominios gestionados (*.supabase.co,
 *         *.supabase.in, supabase.storage.googleapis.com),
 *       · S3 (path-style o virtual-host: `s3.<region>.amazonaws.com`,
 *         `<bucket>.s3.<region>.amazonaws.com`, variantes `s3-<region>` y
 *         `.com.cn`), R2 (`.r2.cloudflarestorage.com`) y el host del
 *         `S3_ENDPOINT` configurado.
 *   - Desarrollo / test: además se aceptan hosts locales (localhost,
 *     127.0.0.1, ::1). Cuando el servicio corre en un contenedor, la signed URL
 *     de Supabase se genera en el host y apunta a 127.0.0.1, que dentro del
 *     contenedor es el propio contenedor. En ese caso se reescribe el origen al
 *     SUPABASE_URL configurado para que la descarga funcione.
 *
 * La reescritura nunca permite hosts arbitrarios y solo aplica a rutas de
 * Supabase Storage (`/storage/v1/object/...`): las URLs del emulador S3
 * (`https://127.0.0.1:9297/<bucket>/<key>`) se dejan intactas.
 */

const CLOUD_HOST_SUFFIXES = [
  '.supabase.co',
  '.supabase.in',
  'supabase.storage.googleapis.com',
]

/**
 * Hosts de S3/R2. Se aceptan subdominios de bucket (virtual-host) y variantes
 * regionales. Todos son dominios del proveedor, no infraestructura interna.
 */
const S3_HOST_PATTERN =
  /^(?:[a-z0-9][a-z0-9.-]*\.)?s3(?:[.-][a-z0-9-]+)*\.amazonaws\.com(?:\.cn)?$/i
const R2_HOST_SUFFIX = '.r2.cloudflarestorage.com'

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

/** Host del `S3_ENDPOINT` (MinIO, R2, emulador local, etc.), si está definido. */
function configuredS3Hostname(): string | null {
  const raw = process.env.S3_ENDPOINT
  if (!raw) return null
  try {
    return new URL(raw).hostname.toLowerCase()
  } catch {
    return null
  }
}

function isS3Hostname(hostname: string): boolean {
  const host = hostname.toLowerCase()
  if (S3_HOST_PATTERN.test(host) || host.endsWith(R2_HOST_SUFFIX)) return true

  const endpointHost = configuredS3Hostname()
  if (endpointHost && host === endpointHost) return true

  // Bucket en path-style sin endpoint explícito: `s3.<region>.amazonaws.com`.
  const bucket = process.env.S3_BUCKET?.trim().toLowerCase()
  if (bucket && host === `${bucket}.s3.amazonaws.com`) return true

  return false
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
    if (
      hostname !== supabaseHostname &&
      !isCloudHostname(hostname) &&
      !isS3Hostname(hostname)
    ) {
      throw new InvalidFileUrlError('Host de URL de archivo no permitido')
    }
    return parsed
  }

  // Desarrollo / test: hosts de Storage o locales.
  const allowed =
    hostname === supabaseHostname ||
    isCloudHostname(hostname) ||
    isS3Hostname(hostname) ||
    isLocalHostname(hostname)

  if (!allowed) {
    throw new InvalidFileUrlError('Host de URL de archivo no permitido')
  }

  // Un host local generado en el host anfitrión no es alcanzable desde dentro
  // del contenedor: se sustituye por el Supabase configurado. Solo aplica a
  // rutas de Supabase Storage; las URLs del emulador S3 se dejan intactas.
  const isSupabaseObjectPath = parsed.pathname.startsWith('/storage/v1/object/')
  if (
    isLocalHostname(hostname) &&
    supabase &&
    hostname !== supabaseHostname &&
    isSupabaseObjectPath
  ) {
    return new URL(`${supabase.origin}${parsed.pathname}${parsed.search}`)
  }

  return parsed
}
