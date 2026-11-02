import crypto from 'node:crypto'
import type { FastifyReply, FastifyRequest } from 'fastify'

/**
 * Verificación de JWT de Supabase Auth (HS256) sin dependencias externas.
 *
 * - El endpoint envía: Authorization: Bearer <access_token>
 * - El secret viene de SUPABASE_JWT_SECRET (o JWT_SECRET). En Supabase local es
 *   el default conocido; en producción se setea explícito por env.
 * - Se acepta el secret tal cual y también decodificado desde base64, para
 *   cubrir las dos convenciones del dashboard de Supabase.
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

function candidateSecrets(rawSecret: string): Buffer[] {
  const candidates = [Buffer.from(rawSecret, 'utf8')]
  const decoded = Buffer.from(rawSecret, 'base64')
  if (!decoded.equals(candidates[0])) candidates.push(decoded)
  return candidates
}

/** Devuelve el usuario autenticado o null si el token es inválido/expirado. */
export function verifySupabaseJwt(token: string, rawSecret: string): AuthUser | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [headerB64, payloadB64, signatureB64] = parts

  try {
    const header = JSON.parse(
      Buffer.from(headerB64, 'base64url').toString('utf8'),
    ) as { alg?: string }
    if (header.alg !== 'HS256') return null

    const payload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8'),
    ) as { sub?: string; email?: string; role?: string; exp?: number }

    if (!payload.sub) return null
    if (typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()) return null

    const provided = Buffer.from(signatureB64, 'base64url')
    const signingInput = `${headerB64}.${payloadB64}`

    for (const secretKey of candidateSecrets(rawSecret)) {
      const expected = crypto.createHmac('sha256', secretKey).update(signingInput).digest()
      if (provided.length !== expected.length) continue
      if (crypto.timingSafeEqual(provided, expected)) {
        return { id: payload.sub!, email: payload.email ?? '', role: payload.role ?? 'authenticated' }
      }
    }
    return null
  } catch {
    return null
  }
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
  const user = token ? verifySupabaseJwt(token, getJwtSecret()) : null
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
