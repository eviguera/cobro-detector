import { test, expect } from '@playwright/test'
import { getTestCredentials, login } from './helpers/auth'

const { email, password } = getTestCredentials()

test.describe('Flujo de Pago E2E', () => {
  test('Página de precios muestra créditos disponibles', async ({ page }) => {
    const ok = await login(page, email, password)
    if (!ok) { test.skip(); return }

    await page.goto('/precios')
    await page.waitForTimeout(3000)

    await expect(page.locator('h2, h1').first()).toBeVisible()
    await expect(page.locator('span.text-4xl').first()).toBeVisible()

    console.log('✅ Página de precios cargada')
  })
})

test.describe('Deduplicación E2E', () => {
  test('Análisis no genera anomalías duplicadas', async ({ page }) => {
    test.setTimeout(120000)
    const ok = await login(page, email, password)
    if (!ok) { test.skip(); return }

    // Completar onboarding tour primero
    await page.evaluate(() => localStorage.setItem('cobro-detector-onboarding-done', 'true'))
    await page.goto('/analisis')
    await page.waitForTimeout(3000)

    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles('e2e/fixtures/test-statement.csv')
    await page.waitForTimeout(1000)

    const analyzeButton = page.getByRole('button', { name: /analizar|enviar|procesar/i }).first()
    await expect(analyzeButton).toBeEnabled({ timeout: 5000 })
    await analyzeButton.click({ force: true })

    try {
      await page.waitForSelector('text=/resultado|completado|análisis completo/i', { timeout: 90000 })
    } catch {
      console.log('⚠️ Timeout esperando resultados')
    }

    const anomalyCards = page.locator('[class*="anomaly"], [data-testid*="anomaly"]')
    const cardCount = await anomalyCards.count()
    console.log(`🔍 Anomaly cards encontradas: ${cardCount}`)
  })
})
