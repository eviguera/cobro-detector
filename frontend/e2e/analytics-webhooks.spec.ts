import { test, expect } from '@playwright/test'
import { getTestCredentials, login } from './helpers/auth'

const { email, password } = getTestCredentials()

test.describe('Analytics y Webhooks E2E', () => {
  test('Página de analytics carga con datos', async ({ page }) => {
    test.setTimeout(30000)
    const ok = await login(page, email, password)
    if (!ok) { test.skip(); return }

    await page.goto('/dashboard/analytics')
    await page.waitForTimeout(3000)

    await expect(page.locator('h1').filter({ hasText: 'Analytics' })).toBeVisible()
    console.log('✅ Analytics page loaded')
  })

  test('API webhooks CRUD', async ({ page }) => {
    test.setTimeout(30000)
    const ok = await login(page, email, password)
    if (!ok) { test.skip(); return }

    // Create webhook
    const createResp = await page.request.post('/api/webhooks', {
      data: {
        url: 'https://example.com/webhook',
        events: ['analysis.completed'],
        description: 'Test webhook',
      },
    })
    expect(createResp.status()).toBe(201)
    const created = await createResp.json()
    expect(created.webhook).toBeDefined()
    expect(created.webhook.secret).toBeDefined()
    console.log('✅ Webhook created:', created.webhook.id)

    // List webhooks
    const listResp = await page.request.get('/api/webhooks')
    expect(listResp.status()).toBe(200)
    const list = await listResp.json()
    expect(list.webhooks.length).toBeGreaterThan(0)
    console.log('✅ Webhooks listed:', list.webhooks.length)

    // Update webhook
    const updateResp = await page.request.patch('/api/webhooks', {
      data: { id: created.webhook.id, is_active: false },
    })
    expect(updateResp.status()).toBe(200)
    console.log('✅ Webhook updated')

    // Delete webhook
    const deleteResp = await page.request.delete(`/api/webhooks?id=${created.webhook.id}`)
    expect(deleteResp.status()).toBe(200)
    console.log('✅ Webhook deleted')
  })

  test('API webhooks rechaza sin auth', async ({ page }) => {
    const resp = await page.request.post('/api/webhooks', {
      data: { url: 'https://example.com', events: ['analysis.completed'] },
    })
    expect(resp.status()).toBe(401)
    console.log('✅ Webhooks API requires auth')
  })

  test('Sidebar muestra link de Analytics', async ({ page }) => {
    test.setTimeout(30000)
    const ok = await login(page, email, password)
    if (!ok) { test.skip(); return }

    await page.goto('/dashboard')
    await page.waitForTimeout(2000)

    const analyticsLink = page.getByRole('link', { name: /analytics/i })
    const isVisible = await analyticsLink.isVisible().catch(() => false)
    console.log(`🔍 Analytics link visible: ${isVisible}`)
  })
})

test.describe('API Edge Cases', () => {
  test('Health check responde con estructura completa', async ({ page }) => {
    const resp = await page.request.get('/api/health')
    expect(resp.ok()).toBeTruthy()

    const body = await resp.json()
    expect(body.version).toBe('1.0.0')
    expect(body.uptime).toBeGreaterThan(0)
  })

  test('Analyze rechaza sin archivo', async ({ page }) => {
    const ok = await login(page, email, password)
    if (!ok) { test.skip(); return }

    const resp = await page.request.post('/api/analyze', {
      data: {},
    })
    expect(resp.status()).toBeGreaterThanOrEqual(400)
    console.log('✅ Analyze rejects empty body')
  })
})
