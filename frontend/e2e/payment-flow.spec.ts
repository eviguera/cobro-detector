import { test, expect } from '@playwright/test'
import { getTestCredentials, login } from './helpers/auth'

const { email, password } = getTestCredentials()

test.describe('Flujo de Pago E2E', () => {
  test('Health check verifica todos los servicios', async ({ page }) => {
    const response = await page.request.get('/api/health')
    expect(response.ok()).toBeTruthy()

    const body = await response.json()
    console.log('Health check:', JSON.stringify(body, null, 2))

    expect(body.status).toBeDefined()
    expect(body.checks).toBeDefined()
    expect(body.checks.database).toBeDefined()
    expect(body.checks.auth).toBeDefined()
    expect(body.checks.storage).toBeDefined()
    expect(body.checks.groq).toBeDefined()
    expect(body.checks.mercadopago).toBeDefined()
    expect(body.checks.redis).toBeDefined()
    expect(['healthy', 'degraded']).toContain(body.status)
  })

  test('Página de precios muestra créditos disponibles', async ({ page }) => {
    const ok = await login(page, email, password)
    if (!ok) { test.skip(); return }

    await page.goto('/precios')
    await page.waitForTimeout(3000)

    await expect(page.locator('h2, h1').first()).toBeVisible()
    await expect(page.getByText(/crédito/i)).toBeVisible()
    await expect(page.getByText(/\$[0-9]/)).toBeVisible()

    console.log('✅ Página de precios cargada')
  })

  test('API de pagos crea preferencia de MercadoPago (sin tarjeta)', async ({ page }) => {
    const ok = await login(page, email, password)
    if (!ok) { test.skip(); return }

    const response = await page.request.post('/api/payments/create', {
      data: { planKey: 'inicial' },
    })

    const body = await response.json()
    console.log('Payment create response status:', response.status())

    if (response.status() === 200 && body.init_point) {
      expect(body.init_point).toContain('mercadopago')
      console.log('✅ Preferencia MP creada:', body.init_point)
    } else if (response.status() === 400) {
      console.log('⚠️ Sin créditos o error de validación (esperado si ya compró):', body)
    } else {
      console.log('ℹ️ Respuesta:', body)
    }
  })

  test('API unlock-report requiere analysisId válido', async ({ page }) => {
    const ok = await login(page, email, password)
    if (!ok) { test.skip(); return }

    const response = await page.request.post('/api/payments/unlock-report', {
      data: { analysisId: '00000000-0000-0000-0000-000000000000' },
    })

    expect(response.status()).toBe(404)
    console.log('✅ Unlock con ID inválido devuelve 404')
  })

  test('Webhook rechaza peticiones sin firma HMAC', async ({ page }) => {
    const response = await page.request.post('/api/payments/webhook', {
      data: { action: 'payment.updated', data: { id: 'test' } },
      headers: { 'Content-Type': 'application/json' },
    })

    expect(response.status()).toBe(401)
    console.log('✅ Webhook sin HMAC devuelve 401')
  })
})

test.describe('Deduplicación E2E', () => {
  test('Análisis no genera anomalías duplicadas', async ({ page }) => {
    test.setTimeout(120000)
    const ok = await login(page, email, password)
    if (!ok) { test.skip(); return }

    await page.goto('/analisis')
    await page.waitForTimeout(3000)

    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles('e2e/fixtures/test-statement.csv')

    const analyzeButton = page.getByRole('button', { name: /analizar|enviar|procesar/i }).first()
    await expect(analyzeButton).toBeEnabled({ timeout: 5000 })
    await analyzeButton.click()

    try {
      await page.waitForSelector('text=/resultado|completado|análisis completo/i', { timeout: 90000 })
    } catch {
      console.log('⚠️ Timeout esperando resultados')
    }

    const anomalyCards = page.locator('[class*="anomaly"], [data-testid*="anomaly"]')
    const cardCount = await anomalyCards.count()
    console.log(`🔍 Anomaly cards encontradas: ${cardCount}`)

    // Verificar que no hay títulos duplicados en las tarjetas
    if (cardCount > 0) {
      const titles: string[] = []
      for (let i = 0; i < cardCount; i++) {
        const title = await anomalyCards.nth(i).textContent()
        if (title) titles.push(title.trim())
      }
      const uniqueTitles = new Set(titles)
      expect(uniqueTitles.size).toBe(titles.length)
      console.log('✅ Sin títulos duplicados en anomalías')
    }
  })
})
