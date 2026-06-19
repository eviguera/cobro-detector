import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ResendEmailAdapter } from './resend-email.adapter.js'

const payload = {
  to: 'user@example.com',
  subject: 'Analisis completado',
  html: '<p>Test</p>',
}

describe('ResendEmailAdapter', () => {
  let adapter: ResendEmailAdapter

  beforeEach(() => {
    adapter = new ResendEmailAdapter()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('envía email exitosamente con RESEND_API_KEY configurada', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_123456789')
    const mockFetch = vi.mocked(globalThis.fetch)
    mockFetch.mockResolvedValueOnce({ ok: true } as Response)

    const result = await adapter.send(payload)

    expect(result).toBe(true)
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer re_123456789',
          'Content-Type': 'application/json',
        }),
        body: expect.stringContaining('user@example.com'),
      }),
    )
  })

  it('retorna false si RESEND_API_KEY no está configurada', async () => {
    vi.stubEnv('RESEND_API_KEY', undefined)

    const result = await adapter.send(payload)

    expect(result).toBe(false)
  })

  it('no hace fetch si RESEND_API_KEY no está configurada', async () => {
    vi.stubEnv('RESEND_API_KEY', undefined)

    await adapter.send(payload)

    expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled()
  })

  it('retorna false si la API responde con error', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_123456789')
    const mockFetch = vi.mocked(globalThis.fetch)
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: vi.fn().mockResolvedValue({ message: 'Invalid API key' }),
    } as unknown as Response)

    const result = await adapter.send(payload)

    expect(result).toBe(false)
  })

  it('retorna false si hay un error de red', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_123456789')
    const mockFetch = vi.mocked(globalThis.fetch)
    mockFetch.mockRejectedValueOnce(new Error('Network timeout'))

    const result = await adapter.send(payload)

    expect(result).toBe(false)
  })
})
