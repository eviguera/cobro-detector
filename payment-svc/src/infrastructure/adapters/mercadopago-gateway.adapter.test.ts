import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import crypto from 'node:crypto'
import { MercadoPagoGatewayAdapter } from './mercadopago-gateway.adapter.js'

describe('MercadoPagoGatewayAdapter', () => {
  const secret = 'test-webhook-secret-abc123'
  const dataId = 'payment-98765'
  const requestId = 'req-xyz-123'
  // HARDENED (2026-11): el anti-replay rechaza ts con más de 5 min de skew,
  // así que los fixtures de firma válida usan un ts "fresco".
  const nowTs = () => String(Math.floor(Date.now() / 1000))

  const sign = (ts: string, requestIdValue: string, dataIdValue: string = dataId) => {
    const manifest = `id:${dataIdValue};request-id:${requestIdValue};ts:${ts};`
    const hash = crypto.createHmac('sha256', secret).update(manifest).digest('hex')
    return `ts=${ts},v1=${hash}`
  }

  beforeEach(() => {
    process.env.MERCADOPAGO_WEBHOOK_SECRET = secret
  })

  afterEach(() => {
    delete process.env.MERCADOPAGO_WEBHOOK_SECRET
  })

  it('verifyWebhook returns true for a valid signature', () => {
    const adapter = new MercadoPagoGatewayAdapter()
    const body = JSON.stringify({ data: { id: dataId }, 'request-id': requestId })
    const signature = sign(nowTs(), requestId)

    expect(adapter.verifyWebhook(signature, body)).toBe(true)
  })

  it('verifyWebhook uses x-request-id from header when provided', () => {
    const adapter = new MercadoPagoGatewayAdapter()
    // MP envía el request-id como HEADER; el body pertenece al payload con data.id.
    const body = JSON.stringify({ data: { id: dataId } })
    const signature = sign(nowTs(), requestId)

    expect(adapter.verifyWebhook(signature, body, requestId)).toBe(true)
  })

  it('verifyWebhook returns false for an invalid signature', () => {
    const adapter = new MercadoPagoGatewayAdapter()
    const body = JSON.stringify({ data: { id: dataId }, 'request-id': requestId })
    const signature = `ts=${nowTs()},v1=thisisnotthecorrecthmacvalue123`

    expect(adapter.verifyWebhook(signature, body)).toBe(false)
  })

  it('verifyWebhook returns false when the timestamp replay window is exceeded', () => {
    const adapter = new MercadoPagoGatewayAdapter()
    const staleTs = String(Math.floor(Date.now() / 1000) - 6 * 60) // hace 6 minutos
    const body = JSON.stringify({ data: { id: dataId }, 'request-id': requestId })
    const signature = sign(staleTs, requestId)

    expect(adapter.verifyWebhook(signature, body)).toBe(false)
  })

  it('verifyWebhook uses both data.id and request-id from body', () => {
    const adapter = new MercadoPagoGatewayAdapter()
    const body = JSON.stringify({ data: { id: dataId }, 'request-id': requestId })
    const signature = sign(nowTs(), requestId)

    expect(adapter.verifyWebhook(signature, body)).toBe(true)
  })

  it('verifyWebhook returns false when body does not match signature', () => {
    const adapter = new MercadoPagoGatewayAdapter()
    const body = JSON.stringify({ data: { id: 'different-id' }, 'request-id': requestId })
    const signature = sign(nowTs(), requestId)

    expect(adapter.verifyWebhook(signature, body)).toBe(false)
  })

  it('verifyWebhook throws when secret is not set', () => {
    delete process.env.MERCADOPAGO_WEBHOOK_SECRET
    const adapter = new MercadoPagoGatewayAdapter()

    expect(() => adapter.verifyWebhook('ts=1,v1=abc', '{}')).toThrow('Missing MERCADOPAGO_WEBHOOK_SECRET')
  })
})
