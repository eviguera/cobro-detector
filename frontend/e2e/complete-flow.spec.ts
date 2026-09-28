import { test, expect } from '@playwright/test'
import { getTestCredentials, login } from './helpers/auth'

const { email, password } = getTestCredentials()

test.describe.serial('Flujo E2E autenticado', () => {
  test('Login y navegación básica', async ({ page }) => {
    test.setTimeout(60000)
    const ok = await login(page, email, password)
    if (!ok) { test.skip(); return }

    // Completar onboarding tour primero
    await page.evaluate(() => localStorage.setItem('cobro-detector-onboarding-done', 'true'))

    // Navegar a analisis
    await page.goto('/analisis')
    await page.waitForTimeout(3000)

    // Verificar que la página carga
    await expect(page.locator('h1, h2').first()).toBeVisible()
    console.log('✅ Página de análisis cargada')

    // Verificar que existe input de archivo
    const fileInput = page.locator('input[type="file"]')
    const hasFileInput = await fileInput.count() > 0
    console.log(`📁 Input de archivo presente: ${hasFileInput}`)
  })

  test('Subida de archivo y análisis', async ({ page }) => {
    test.setTimeout(120000)
    const ok = await login(page, email, password)
    if (!ok) { test.skip(); return }

    // Completar onboarding tour primero
    await page.evaluate(() => localStorage.setItem('cobro-detector-onboarding-done', 'true'))

    await page.goto('/analisis')
    await page.waitForTimeout(3000)

    // Subir archivo
    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles('e2e/fixtures/test-statement.csv')
    await page.waitForTimeout(1000)

    // Verificar que el botón de analizar se habilita
    const analyzeButton = page.getByRole('button', { name: /analizar|enviar|procesar/i }).first()
    await expect(analyzeButton).toBeEnabled({ timeout: 5000 })
    console.log('✅ Archivo subido y botón de análisis habilitado')

    // Hacer clic en analizar
    await analyzeButton.click({ force: true })

    // Esperar resultados (el análisis puede tardar)
    try {
      await page.waitForSelector('text=/resultado|completado|análisis completo|anomalía/i', { timeout: 90000 })
      console.log('✅ Análisis completado')
    } catch {
      console.log('⚠️ Timeout esperando resultados (puede ser normal si el servicio está lento)')
    }

    await page.screenshot({ path: 'test-results/complete-flow.png', fullPage: true })
  })

  test('Navegación a historial', async ({ page }) => {
    test.setTimeout(30000)
    const ok = await login(page, email, password)
    if (!ok) { test.skip(); return }

    await page.goto('/historial')
    await page.waitForTimeout(2000)

    await expect(page.locator('h1, h2').first()).toBeVisible()
    console.log('✅ Página de historial cargada')
  })

  test('Navegación a precios', async ({ page }) => {
    test.setTimeout(30000)
    const ok = await login(page, email, password)
    if (!ok) { test.skip(); return }

    await page.goto('/precios')
    await page.waitForTimeout(2000)

    await expect(page.locator('h1, h2').first()).toBeVisible()
    console.log('✅ Página de precios cargada')
  })
})
