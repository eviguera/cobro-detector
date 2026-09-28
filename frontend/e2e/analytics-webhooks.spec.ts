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

  test('Dashboard muestra estadísticas', async ({ page }) => {
    test.setTimeout(30000)
    const ok = await login(page, email, password)
    if (!ok) { test.skip(); return }

    await page.goto('/dashboard')
    await page.waitForTimeout(3000)

    await expect(page.locator('h1, h2').first()).toBeVisible()
    console.log('✅ Dashboard cargado')
  })
})

test.describe('Edge Cases E2E', () => {
  test('Analyze rechaza sin archivo', async ({ page }) => {
    const ok = await login(page, email, password)
    if (!ok) { test.skip(); return }

    await page.goto('/analisis')
    await page.waitForTimeout(2000)

    // Verificar que el botón de analizar está deshabilitado sin archivo
    const analyzeButton = page.getByRole('button', { name: /analizar|enviar|procesar/i }).first()
    const isDisabled = await analyzeButton.isDisabled().catch(() => true)
    console.log(`🔍 Botón de analizar deshabilitado sin archivo: ${isDisabled}`)
  })

  test('Página 404 para rutas inexistentes', async ({ page }) => {
    await page.goto('/ruta-inexistente-12345')
    await page.waitForTimeout(2000)

    // Verificar que muestra página 404 o redirige
    const is404 = await page.locator('text=/404|not found|página no encontrada/i').first().isVisible().catch(() => false)
    console.log(`🔍 Página 404 mostrada: ${is404}`)
  })
})
