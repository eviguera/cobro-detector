import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import crypto from 'node:crypto'
import { MercadoPagoGatewayAdapter } from './mercadopago-gateway.adapter.js'

describe('MercadoPagoGatewayAdapter', () => {
  const secret = 'test-webhook-secret-abc123'
  const dataId = 'payment-98765'
  const requestId = 'req-xyz-123'
  const ts = '1718000000'

  beforeEach(() => {
    process.env.MERCADOPAGO_WEBHOOK_SECRET = secret
  })

  afterEach(() => {
    delete process.env.MERCADOPAGO_WEBHOOK_SECRET
  })

  it('verifyWebhook returns true for a valid signature', () => {
    const adapter = new MercadoPagoGatewayAdapter()
    const body = JSON.stringify({ data: { id: dataId }, 'request-id': requestId })
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`
    const hash = crypto.createHmac('sha256', secret).update(manifest).digest('hex')
    const signature = `ts=${ts},v1=${hash}`

    expect(adapter.verifyWebhook(signature, body)).toBe(true)
  })

  it('verifyWebhook returns false for an invalid signature', () => {
    const adapter = new MercadoPagoGatewayAdapter()
    const body = JSON.stringify({ data: { id: dataId }, 'request-id': requestId })
    const signature = `ts=${ts},v1=thisisnotthecorrecthmacvalue123`

    expect(adapter.verifyWebhook(signature, body)).toBe(false)
  })

  it('verifyWebhook uses both data.id and request-id from body', () => {
    const adapter = new MercadoPagoGatewayAdapter()
    const body = JSON.stringify({ data: { id: dataId }, 'request-id': requestId })
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`
    const hash = crypto.createHmac('sha256', secret).update(manifest).digest('hex')
    const signature = `ts=${ts},v1=${hash}`

    expect(adapter.verifyWebhook(signature, body)).toBe(true)
  })

  it('verifyWebhook returns false when body does not match signature', () => {
    const adapter = new MercadoPagoGatewayAdapter()
    const body = JSON.stringify({ data: { id: 'different-id' }, 'request-id': requestId })
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`
    const hash = crypto.createHmac('sha256', secret).update(manifest).digest('hex')
    const signature = `ts=${ts},v1=${hash}`

    expect(adapter.verifyWebhook(signature, body)).toBe(false)
  })

  it('verifyWebhook throws when secret is not set', () => {
    delete process.env.MERCADOPAGO_WEBHOOK_SECRET
    const adapter = new MercadoPagoGatewayAdapter()

    expect(() => adapter.verifyWebhook('ts=1,v1=abc', '{}')).toThrow('Missing MERCADOPAGO_WEBHOOK_SECRET')
  })
})
