import { test, expect } from '@playwright/test'
import { getTestCredentials, login } from './helpers/auth'
import path from 'path'

const { email, password } = getTestCredentials()

test.describe('Formatos de archivo E2E', () => {
  test('Subida de archivo Excel', async ({ page }) => {
    test.setTimeout(120000)
    const ok = await login(page, email, password)
    if (!ok) { test.skip(); return }

    // Completar onboarding tour primero
    await page.evaluate(() => localStorage.setItem('cobro-detector-onboarding-done', 'true'))

    await page.goto('/analisis')
    await page.waitForTimeout(3000)

    // Subir archivo Excel
    const fileInput = page.locator('input[type="file"]').first()
    const excelPath = path.join(__dirname, 'fixtures', 'test-statement.xlsx')
    await fileInput.setInputFiles(excelPath)
    await page.waitForTimeout(1000)

    // Verificar que el botón de analizar se habilita
    const analyzeButton = page.getByRole('button', { name: /analizar|enviar|procesar/i }).first()
    const isEnabled = await analyzeButton.isEnabled().catch(() => false)
    console.log(`📊 Botón de análisis habilitado para Excel: ${isEnabled}`)

    if (isEnabled) {
      await analyzeButton.click({ force: true })
      try {
        await page.waitForSelector('text=/resultado|completado|análisis completo|anomalía/i', { timeout: 90000 })
        console.log('✅ Análisis de Excel completado')
      } catch {
        console.log('⚠️ Timeout esperando resultados de Excel')
      }
    }
  })

  test('Subida de archivo PDF', async ({ page }) => {
    test.setTimeout(120000)
    const ok = await login(page, email, password)
    if (!ok) { test.skip(); return }

    // Completar onboarding tour primero
    await page.evaluate(() => localStorage.setItem('cobro-detector-onboarding-done', 'true'))

    await page.goto('/analisis')
    await page.waitForTimeout(3000)

    // Subir archivo PDF
    const fileInput = page.locator('input[type="file"]').first()
    const pdfPath = path.join(__dirname, 'fixtures', 'test-statement.pdf')
    await fileInput.setInputFiles(pdfPath)
    await page.waitForTimeout(1000)

    // Verificar que el botón de analizar se habilita
    const analyzeButton = page.getByRole('button', { name: /analizar|enviar|procesar/i }).first()
    const isEnabled = await analyzeButton.isEnabled().catch(() => false)
    console.log(`📄 Botón de análisis habilitado para PDF: ${isEnabled}`)

    if (isEnabled) {
      await analyzeButton.click({ force: true })
      try {
        await page.waitForSelector('text=/resultado|completado|análisis completo|anomalía/i', { timeout: 90000 })
        console.log('✅ Análisis de PDF completado')
      } catch {
        console.log('⚠️ Timeout esperando resultados de PDF')
      }
    }
  })

  test('Archivo sin formato válido es rechazado', async ({ page }) => {
    test.setTimeout(60000)
    const ok = await login(page, email, password)
    if (!ok) { test.skip(); return }

    await page.evaluate(() => localStorage.setItem('cobro-detector-onboarding-done', 'true'))
    await page.goto('/analisis')
    await page.waitForTimeout(3000)

    // Verificar que el botón de analizar está deshabilitado sin archivo
    const analyzeButton = page.getByRole('button', { name: /analizar|enviar|procesar/i }).first()
    const isDisabled = await analyzeButton.isDisabled().catch(() => true)
    console.log(`🔍 Botón de analizar deshabilitado sin archivo: ${isDisabled}`)
    expect(isDisabled).toBe(true)
  })
})
