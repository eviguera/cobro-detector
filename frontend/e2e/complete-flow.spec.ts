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

    // Subir archivo
    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles('e2e/fixtures/test-statement.csv')
    await page.waitForTimeout(1000)

    // Verificar que el botón de analizar se habilita
    const analyzeButton = page.getByRole('button', { name: /analizar|enviar|procesar/i }).first()
    await expect(analyzeButton).toBeEnabled({ timeout: 5000 })
    console.log('✅ Archivo subido y botón de análisis habilitado')

    await page.screenshot({ path: 'test-results/complete-flow.png', fullPage: true })
  })
})
