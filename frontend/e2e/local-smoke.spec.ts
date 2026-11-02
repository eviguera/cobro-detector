import { test, expect } from '@playwright/test'

test.use({ baseURL: 'http://localhost:3000' })

test('login local end-to-end con Supabase local', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`))

  await page.goto('/login')
  await expect(page.getByText('Bienvenido de vuelta')).toBeVisible()

  await page.locator('input[type="email"]').first().fill('demo@cobrodetector.com')
  await page.locator('input[type="password"]').first().fill('Demo1234!')
  await page.locator('input[type="password"]').first().press('Enter')

  await page.waitForURL('**/dashboard', { timeout: 20000 })
  console.log('URL final:', page.url())

  const body = await page.locator('body').innerText()
  console.log('--- dashboard (primeras 600 chars) ---')
  console.log(body.slice(0, 600))

  expect(body).toContain('100')

  // sin violaciones de CSP ni errores de red
  const cspErrors = consoleErrors.filter((e) => /Content Security Policy|Refused to connect|Failed to fetch/i.test(e))
  console.log('errores CSP/fetch:', cspErrors)
  expect(cspErrors).toEqual([])
})

test('análisis completo: upload CSV → resultado → historial', async ({ page }) => {
  test.setTimeout(180000)
  const consoleErrors: string[] = []
  page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`))

  await page.goto('/login')
  await page.locator('input[type="email"]').first().fill('demo@cobrodetector.com')
  await page.locator('input[type="password"]').first().fill('Demo1234!')
  await page.locator('input[type="password"]').first().press('Enter')
  await page.waitForURL('**/dashboard', { timeout: 20000 })

  await page.goto('/analisis')
  // El tour de bienvenida aparece la primera vez y bloquea la interacción.
  const closeTour = page.getByRole('button', { name: /Cerrar tour/i })
  if (await closeTour.isVisible().catch(() => false)) await closeTour.click()
  await expect(page.getByText('Arrastra tu estado de cuenta aquí')).toBeVisible()

  await page.locator('#analysis-file').setInputFiles('e2e/fixtures/test-statement.csv')
  await expect(page.getByText('test-statement.csv')).toBeVisible({ timeout: 15000 })
  await page.getByRole('button', { name: /Analizar ahora/i }).click()

  await expect(page.getByText('Resultados del análisis')).toBeVisible({ timeout: 60000 })
  const text = await page.locator('body').innerText()
  console.log('--- resultado ---')
  console.log(text.slice(0, 700))

  await page.getByRole('button', { name: /Ver (reporte completo|detalle del análisis)/i }).click()
  await page.waitForURL('**/historial/**', { timeout: 20000 })
  await expect(page.locator('body')).toContainText(/anomal/i, { timeout: 20000 })
  console.log('URL historial:', page.url())

  expect(consoleErrors).toEqual([])
})
