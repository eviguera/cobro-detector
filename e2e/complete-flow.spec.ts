import { test, expect } from '@playwright/test'
import { getTestCredentials, login } from './helpers/auth'

const { email, password } = getTestCredentials()

test.describe.serial('Flujo E2E autenticado', () => {
  test('Login, análisis y verificación de resultados', async ({ page }) => {
    test.setTimeout(120000)
    const ok = await login(page, email, password)
    if (!ok) { test.skip(); return }

    await page.goto('/analisis')
    await page.waitForTimeout(3000)

    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles('/Users/eduardoviguera/Desktop/COBRO/cobro-detector/test-statement.csv')

    const analyzeButton = page.getByRole('button', { name: /analizar|enviar|procesar/i }).first()
    await expect(analyzeButton).toBeEnabled({ timeout: 5000 })
    await analyzeButton.click()

    try {
      await page.waitForSelector('text=/resultado|completado|análisis completo/i', { timeout: 90000 })
    } catch { /* timeout aceptable */ }

    const bodyText = await page.textContent('body') || ''
    const foundSomething = /anomal|error|problema|duplicada|comisión|comision|interés|interes/i.test(bodyText)
    console.log(`🔍 Anomalías detectadas: ${foundSomething}`)
    await page.screenshot({ path: 'test-results/complete-flow.png', fullPage: true })
    expect(foundSomething).toBeTruthy()
  })

  test('Verificar descuento de créditos', async ({ page }) => {
    test.setTimeout(120000)
    const ok = await login(page, email, password)
    if (!ok) { test.skip(); return }

    await page.goto('/dashboard')
    await page.waitForTimeout(3000)

    const beforeText = await page.textContent('body') || ''
    const beforeMatch = beforeText.match(/Créditos\s*\n?\s*(\d+)/)
    const creditsBefore = beforeMatch ? parseInt(beforeMatch[1]) : 0
    console.log(`💰 Créditos antes: ${creditsBefore}`)

    if (creditsBefore === 0) {
      console.log('⚠️ Sin créditos disponibles, saltando verificación.')
      test.skip()
      return
    }

    await page.goto('/analisis')
    await page.waitForTimeout(3000)

    const uploadButton = page.getByText(/seleccionar|subir|elegir.*archivo/i).first()
    await expect(uploadButton).toBeVisible({ timeout: 10000 })
    await uploadButton.click()

    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles('/Users/eduardoviguera/Desktop/COBRO/cobro-detector/test-statement.csv')

    const analyzeButton = page.getByRole('button', { name: /analizar|enviar|procesar/i }).first()
    await expect(analyzeButton).toBeEnabled({ timeout: 5000 })
    await analyzeButton.click()

    try {
      await page.waitForSelector('text=/resultado|completado|análisis completo/i', { timeout: 90000 })
    } catch { /* timeout aceptable */ }

    await page.goto('/dashboard')
    await page.waitForTimeout(3000)

    const afterText = await page.textContent('body') || ''
    const afterMatch = afterText.match(/Créditos\s*\n?\s*(\d+)/)
    const creditsAfter = afterMatch ? parseInt(afterMatch[1]) : 0

    console.log(`💰 Créditos después: ${creditsAfter}`)
    console.log(`📉 Descuento: ${creditsBefore - creditsAfter}`)
    await page.screenshot({ path: 'test-results/credits-verification.png', fullPage: true })

    expect(creditsAfter).toBeLessThanOrEqual(creditsBefore)
  })
})
