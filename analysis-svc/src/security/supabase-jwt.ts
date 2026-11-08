import crypto from 'node:crypto'
import type { FastifyReply, FastifyRequest } from 'fastify'

/**
 * Verificación de JWT de Supabase Auth sin dependencias externas.
 *
 * Supabase firma los access tokens con uno de dos esquemas:
 * - `HS256` con el secreto compartido del proyecto (proyectos viejos y algunos
 *   entornos locales). Se valida contra `SUPABASE_JWT_SECRET` / `JWT_SECRET`.
 * - `ES256` / `RS256` con una clave asimétrica publicada en el JWKS del
 *   proyecto (`{SUPABASE_URL}/auth/v1/.well-known/jwks.json`). Es el esquema
 *   por defecto de Supabase desde 2025 y el que usan los proyectos nuevos.
 *
 * El token trae el `kid` de la clave con la que fue firmado, así que se cachean
 * las claves públicas por `kid` y solo se refresca el JWKS cuando aparece un
 * `kid` desconocido (con un TTL de respaldo).
 */

export interface AuthUser {
  id: string
  email: string
  role: string
}

declare module 'fastify' {
  interface FastifyRequest {
    authUser: AuthUser
  }
}

interface JwtHeader {
  alg?: string
  kid?: string
  typ?: string
}

interface JwtPayload {
  sub?: string
  email?: string
  role?: string
  exp?: number
}

interface Jwk {
  kid?: string
  kty?: string
  alg?: string
  crv?: string
  n?: string
  e?: string
  x?: string
  y?: string
}

const JWKS_TTL_MS = 10 * 60 * 1000
const JWKS_FETCH_TIMEOUT_MS = 5000

interface JwksCache {
  keys: Map<string, crypto.KeyObject>
  fetchedAt: number
}

let jwksCache: JwksCache | null = null
let inflightFetch: Promise<JwksCache | null> | null = null

function candidateSecrets(rawSecret: string): Buffer[] {
  const candidates = [Buffer.from(rawSecret, 'utf8')]
  const decoded = Buffer.from(rawSecret, 'base64')
  if (!decoded.equals(candidates[0])) candidates.push(decoded)
  return candidates
}

function decodeSegment<T>(segment: string): T {
  return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8')) as T
}

function isExpired(payload: JwtPayload): boolean {
  return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()
}

function toAuthUser(payload: JwtPayload): AuthUser | null {
  if (!payload.sub) return null
  return { id: payload.sub, email: payload.email ?? '', role: payload.role ?? 'authenticated' }
}

function verifyHs256(
  signingInput: string,
  signature: Buffer,
  rawSecret: string,
): boolean {
  for (const secretKey of candidateSecrets(rawSecret)) {
    const expected = crypto.createHmac('sha256', secretKey).update(signingInput).digest()
    if (signature.length !== expected.length) continue
    if (crypto.timingSafeEqual(signature, expected)) return true
  }
  return false
}

function importJwk(jwk: Jwk): crypto.KeyObject | null {
  if (!jwk.kty) return null
  // `crypto.createPublicKey` acepta un JWK directamente cuando el objeto incluye
  // `kty` + los parámetros de la curva/módulo. Se descartan los campos que Node
  // no reconoce (`kid`, `alg`, `use`) para evitar errores de parseo.
  const material: Record<string, string> = { kty: jwk.kty }
  if (jwk.crv) material.crv = jwk.crv
  if (jwk.x) material.x = jwk.x
  if (jwk.y) material.y = jwk.y
  if (jwk.n) material.n = jwk.n
  if (jwk.e) material.e = jwk.e

  try {
    return crypto.createPublicKey({ key: material, format: 'jwk' })
  } catch {
    return null
  }
}

function jwksUrl(): string | null {
  const base = process.env.SUPABASE_URL
  if (!base) return null
  return `${base.replace(/\/+$/, '')}/auth/v1/.well-known/jwks.json`
}

async function fetchJwks(): Promise<JwksCache | null> {
  const url = jwksUrl()
  if (!url) return null

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), JWKS_FETCH_TIMEOUT_MS)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) return null
    const body = (await response.json()) as { keys?: Jwk[] }
    if (!Array.isArray(body.keys)) return null

    const keys = new Map<string, crypto.KeyObject>()
    for (const jwk of body.keys) {
      const key = importJwk(jwk)
      if (!key) continue
      if (jwk.kid) keys.set(jwk.kid, key)
    }
    if (keys.size === 0) return null

    jwksCache = { keys, fetchedAt: Date.now() }
    return jwksCache
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** Devuelve el JWKS cacheado; refresca si está vencido o si falta el `kid`. */
async function getSigningKey(kid: string | undefined, forceRefresh: boolean): Promise<crypto.KeyObject | null> {
  const fresh = jwksCache && Date.now() - jwksCache.fetchedAt < JWKS_TTL_MS
  if (!forceRefresh && fresh) {
    const cached = kid ? jwksCache!.keys.get(kid) : undefined
    if (cached) return cached
    // Sin `kid` o con `kid` desconocido: puede ser una rotación de claves.
  }

  // Solo un fetch concurrente: si ya hay uno en curso, se reutiliza.
  if (!inflightFetch) {
    inflightFetch = fetchJwks().finally(() => {
      inflightFetch = null
    })
  }
  const cache = await inflightFetch
  if (!cache) return null

  if (kid) return cache.keys.get(kid) ?? null
  // Sin `kid` se prueban todas las claves publicadas.
  const first = cache.keys.values().next()
  return first.done ? null : first.value
}

function verifyAsymmetric(
  alg: string,
  signingInput: string,
  signature: Buffer,
  key: crypto.KeyObject,
): boolean {
  try {
    if (alg === 'ES256') {
      // JOSE usa firmas ECDSA en formato crudo r||s (IEEE P1363), no DER.
      return crypto.verify('sha256', Buffer.from(signingInput), { key, dsaEncoding: 'ieee-p1363' }, signature)
    }
    if (alg === 'RS256') {
      return crypto.verify('sha256', Buffer.from(signingInput), key, signature)
    }
    return false
  } catch {
    return false
  }
}

/**
 * Verifica un access token de Supabase. Acepta HS256 (secreto compartido) y
 * ES256/RS256 (JWKS del proyecto). Devuelve null si es inválido o expirado.
 */
export async function verifySupabaseJwt(token: string, rawSecret: string): Promise<AuthUser | null> {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [headerB64, payloadB64, signatureB64] = parts

  try {
    const header = decodeSegment<JwtHeader>(headerB64)
    const payload = decodeSegment<JwtPayload>(payloadB64)

    if (!payload.sub) return null
    if (isExpired(payload)) return null

    const signature = Buffer.from(signatureB64, 'base64url')
    const signingInput = `${headerB64}.${payloadB64}`

    if (header.alg === 'HS256') {
      return verifyHs256(signingInput, signature, rawSecret) ? toAuthUser(payload) : null
    }

    if (header.alg !== 'ES256' && header.alg !== 'RS256') return null

    const alg = header.alg
    let key = await getSigningKey(header.kid, false)
    if (!key && header.kid) {
      // Rotación de claves: reintenta con un JWKS fresco antes de rechazar.
      key = await getSigningKey(header.kid, true)
    }

    if (!key) return null
    return verifyAsymmetric(alg, signingInput, signature, key) ? toAuthUser(payload) : null
  } catch {
    return null
  }
}

/** Limpia la caché de claves (tests o rotación manual). */
export function clearJwksCache(): void {
  jwksCache = null
  inflightFetch = null
}

function getJwtSecret(): string {
  return (
    process.env.SUPABASE_JWT_SECRET ||
    process.env.JWT_SECRET ||
    'super-secret-jwt-token-with-at-least-32-characters-long'
  )
}

export function extractBearerToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization
  if (!header || !header.startsWith('Bearer ')) return null
  const token = header.slice(7).trim()
  return token.length > 0 ? token : null
}

/** Fastify preHandler: exige JWT Supabase válido; expone request.authUser. Genera reply 401 y retorna false si falla. */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
  const token = extractBearerToken(request)
  const user = token ? await verifySupabaseJwt(token, getJwtSecret()) : null
  if (!user) {
    await reply.status(401).send({ error: 'Unauthorized: missing or invalid bearer token' })
    return false
  }
  request.authUser = user
  return true
}

/** Idem requireAuth + exige que el JWT sea del propio dueño del recurso. */
export async function requireSelfOr403(
  request: FastifyRequest,
  reply: FastifyReply,
  ownerId: string,
): Promise<boolean> {
  await requireAuth(request, reply)
  if (reply.sent) return false
  if (request.authUser.id !== ownerId) {
    await reply.status(403).send({ error: 'Forbidden: resource belongs to another user' })
    return false
  }
  return true
}
