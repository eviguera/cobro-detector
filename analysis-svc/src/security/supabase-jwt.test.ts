import crypto from 'node:crypto'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { clearJwksCache, requireAuth, verifySupabaseJwt } from './supabase-jwt.js'

const HS256_SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long'
const KID_ES256 = 'kid-es256-test'
const KID_RS256 = 'kid-rs256-test'

function b64url(value: Buffer | string): string {
  return Buffer.from(value).toString('base64url')
}

function signHs256(payload: Record<string, unknown>, secret = HS256_SECRET): string {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = b64url(JSON.stringify(payload))
  const signingInput = `${header}.${body}`
  const signature = crypto.createHmac('sha256', Buffer.from(secret, 'utf8')).update(signingInput).digest()
  return `${signingInput}.${b64url(signature)}`
}

interface AsymSigner {
  kid: string
  alg: 'ES256' | 'RS256'
  privateKey: crypto.KeyObject
}

function signAsymmetric(
  signer: AsymSigner,
  payload: Record<string, unknown>,
  overrideKid?: string,
): string {
  const header = b64url(JSON.stringify({ alg: signer.alg, kid: overrideKid ?? signer.kid, typ: 'JWT' }))
  const body = b64url(JSON.stringify(payload))
  const signingInput = `${header}.${body}`
  const signature = crypto.sign('sha256', Buffer.from(signingInput), {
    key: signer.privateKey,
    dsaEncoding: signer.alg === 'ES256' ? 'ieee-p1363' : undefined,
  })
  return `${signingInput}.${b64url(signature)}`
}

function publicJwk(signer: AsymSigner): Record<string, unknown> {
  const jwk = crypto.createPublicKey(signer.privateKey).export({ format: 'jwk' }) as Record<string, unknown>
  return { ...jwk, kid: signer.kid, alg: signer.alg, use: 'sig' }
}

function validPayload(): Record<string, unknown> {
  return {
    sub: 'b844c5c2-0000-4000-8000-000000000000',
    email: 'test-e2e@cobrodetector.com',
    role: 'authenticated',
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 3600,
  }
}

describe('verifySupabaseJwt', () => {
  const originalEnv = { ...process.env }
  let server: http.Server
  let es256: AsymSigner
  let rs256: AsymSigner
  let jwksKeys: Record<string, unknown>[] = []
  let jwksRequests = 0

  beforeAll(async () => {
    es256 = {
      kid: KID_ES256,
      alg: 'ES256',
      privateKey: crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' }).privateKey,
    }
    rs256 = {
      kid: KID_RS256,
      alg: 'RS256',
      privateKey: crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey,
    }
    jwksKeys = [publicJwk(es256), publicJwk(rs256)]

    server = http.createServer((req, res) => {
      if (req.url !== '/auth/v1/.well-known/jwks.json') {
        res.writeHead(404).end()
        return
      }
      jwksRequests += 1
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ keys: jwksKeys }))
    })

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  })

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  beforeEach(() => {
    const { port } = server.address() as AddressInfo
    process.env.SUPABASE_URL = `http://127.0.0.1:${port}`
    process.env.SUPABASE_JWT_SECRET = HS256_SECRET
    jwksRequests = 0
    clearJwksCache()
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    clearJwksCache()
  })

  describe('HS256', () => {
    it('acepta un token firmado con el secreto compartido', async () => {
      const token = signHs256(validPayload())
      const user = await verifySupabaseJwt(token, HS256_SECRET)
      expect(user).toEqual({
        id: 'b844c5c2-0000-4000-8000-000000000000',
        email: 'test-e2e@cobrodetector.com',
        role: 'authenticated',
      })
      // No debe tocar el JWKS para tokens simétricos.
      expect(jwksRequests).toBe(0)
    })

    it('rechaza una firma inválida', async () => {
      const token = signHs256(validPayload(), 'otro-secreto-completamente-distinto-123456')
      expect(await verifySupabaseJwt(token, HS256_SECRET)).toBeNull()
    })

    it('acepta el secreto codificado en base64', async () => {
      const base64Secret = Buffer.from(HS256_SECRET, 'utf8').toString('base64')
      const token = signHs256(validPayload(), HS256_SECRET)
      const user = await verifySupabaseJwt(token, base64Secret)
      expect(user?.id).toBe('b844c5c2-0000-4000-8000-000000000000')
    })

    // Regresión: `exp` era opcional, así que un token sin caducidad se
    // aceptaba para siempre (combinado con el secreto demo, acceso eterno).
    it('rechaza un token sin exp', async () => {
      const payload = validPayload()
      delete payload.exp
      const token = signHs256(payload)
      expect(await verifySupabaseJwt(token, HS256_SECRET)).toBeNull()
    })

    it('rechaza un token expirado', async () => {
      const payload = { ...validPayload(), exp: Math.floor(Date.now() / 1000) - 60 }
      expect(await verifySupabaseJwt(signHs256(payload), HS256_SECRET)).toBeNull()
    })

    // Regresión crítica: sin SUPABASE_JWT_SECRET se usaba el secreto de demo
    // público de Supabase, así que cualquiera podía forjar tokens válidos.
    // El secreto compartido no aplica a tokens asimétricos: sin
    // SUPABASE_JWT_SECRET igual se deben validar ES256/RS256 vía JWKS
    // (el Supabase local y los proyectos nuevos firman así).
    it('valida ES256 por JWKS aunque no haya secreto compartido', async () => {
      const token = signAsymmetric(es256, validPayload())
      const user = await verifySupabaseJwt(token, null)
      expect(user?.id).toBe('b844c5c2-0000-4000-8000-000000000000')
    })

    it('rechaza HS256 si no hay secreto compartido', async () => {
      const token = signHs256(validPayload())
      expect(await verifySupabaseJwt(token, null)).toBeNull()
    })

    it('requireAuth responde 401 (fail-closed) si no hay secreto configurado', async () => {
      delete process.env.SUPABASE_JWT_SECRET
      delete process.env.JWT_SECRET

      const forged = signHs256(validPayload()) // firmado con el secreto demo público
      const sent: { code?: number; body?: unknown } = {}
      const request = { headers: { authorization: `Bearer ${forged}` } } as never
      const reply = {
        status(code: number) {
          sent.code = code
          return this
        },
        send(body: unknown) {
          sent.body = body
          return this
        },
      } as never

      const ok = await requireAuth(request, reply)

      expect(ok).toBe(false)
      expect(sent.code).toBe(401)
    })
  })

  describe('ES256 (JWKS)', () => {
    it('acepta un token ES256 válido usando el JWKS', async () => {
      const token = signAsymmetric(es256, validPayload())
      const user = await verifySupabaseJwt(token, HS256_SECRET)
      expect(user?.id).toBe('b844c5c2-0000-4000-8000-000000000000')
      expect(jwksRequests).toBe(1)
    })

    it('reutiliza la caché de claves entre verificaciones', async () => {
      await verifySupabaseJwt(signAsymmetric(es256, validPayload()), HS256_SECRET)
      await verifySupabaseJwt(signAsymmetric(es256, validPayload()), HS256_SECRET)
      expect(jwksRequests).toBe(1)
    })

    it('rechaza una firma manipulada', async () => {
      const token = signAsymmetric(es256, validPayload())
      const [header, body, signature] = token.split('.')
      const tampered = Buffer.from(signature, 'base64url')
      tampered[0] ^= 0xff
      expect(await verifySupabaseJwt(`${header}.${body}.${b64url(tampered)}`, HS256_SECRET)).toBeNull()
    })

    it('rechaza un payload alterado (firma no corresponde)', async () => {
      const token = signAsymmetric(es256, validPayload())
      const [header, , signature] = token.split('.')
      const forged = b64url(JSON.stringify({ ...validPayload(), sub: 'otro-usuario', exp: Math.floor(Date.now() / 1000) + 3600 }))
      expect(await verifySupabaseJwt(`${header}.${forged}.${signature}`, HS256_SECRET)).toBeNull()
    })

    it('refresca el JWKS cuando el kid es desconocido y luego aparece', async () => {
      // Calienta la caché con las claves actuales.
      await verifySupabaseJwt(signAsymmetric(es256, validPayload()), HS256_SECRET)
      expect(jwksRequests).toBe(1)

      const rotated = {
        kid: 'kid-rotado',
        alg: 'ES256' as const,
        privateKey: crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' }).privateKey,
      }
      jwksKeys = [publicJwk(es256), publicJwk(rs256), publicJwk(rotated)]

      const user = await verifySupabaseJwt(signAsymmetric(rotated, validPayload()), HS256_SECRET)
      expect(user?.id).toBe('b844c5c2-0000-4000-8000-000000000000')
      expect(jwksRequests).toBe(2)
    })

    it('rechaza un kid que no existe en el JWKS', async () => {
      const token = signAsymmetric(es256, validPayload(), 'kid-inexistente')
      expect(await verifySupabaseJwt(token, HS256_SECRET)).toBeNull()
    })
  })

  describe('RS256 (JWKS)', () => {
    it('acepta un token RS256 válido', async () => {
      const user = await verifySupabaseJwt(signAsymmetric(rs256, validPayload()), HS256_SECRET)
      expect(user?.email).toBe('test-e2e@cobrodetector.com')
    })
  })

  describe('validaciones del payload', () => {
    it('rechaza un token expirado', async () => {
      const expired = { ...validPayload(), exp: Math.floor(Date.now() / 1000) - 60 }
      expect(await verifySupabaseJwt(signAsymmetric(es256, expired), HS256_SECRET)).toBeNull()
      expect(await verifySupabaseJwt(signHs256(expired), HS256_SECRET)).toBeNull()
    })

    it('rechaza un token sin sub', async () => {
      const sinSub = validPayload()
      delete sinSub.sub
      expect(await verifySupabaseJwt(signHs256(sinSub), HS256_SECRET)).toBeNull()
    })

    it('rechaza algoritmos no soportados (alg: none)', async () => {
      const header = b64url(JSON.stringify({ alg: 'none', typ: 'JWT' }))
      const body = b64url(JSON.stringify(validPayload()))
      expect(await verifySupabaseJwt(`${header}.${body}.`, HS256_SECRET)).toBeNull()
    })

    it('rechaza tokens con formato inválido', async () => {
      expect(await verifySupabaseJwt('no-es-un-jwt', HS256_SECRET)).toBeNull()
      expect(await verifySupabaseJwt('a.b', HS256_SECRET)).toBeNull()
    })
  })
})
