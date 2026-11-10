import { test, expect } from '@playwright/test'

// Sin credenciales en el repo: se inyectan por entorno (local o secrets de CI).
const EMAIL = process.env.TEST_EMAIL ?? ''
const PASSWORD = process.env.TEST_PASSWORD ?? ''
test.skip(!EMAIL || !PASSWORD, 'TEST_EMAIL / TEST_PASSWORD no configurados')

test.use({ baseURL: process.env.E2E_URL || 'http://localhost:3000' })

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: /Ingresa a tu cuenta/i })).toBeVisible()
  await page.locator('input[type="email"]').first().fill(EMAIL)
  await page.locator('input[type="password"]').first().fill(PASSWORD)
  await page.locator('button[type="submit"]').first().click()
  await page.waitForURL('**/dashboard', { timeout: 25000 })
}

test('login local end-to-end con Supabase local', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`))

  await login(page)

  const body = await page.locator('body').innerText()
  expect(body).toMatch(/Panel|Hola/i)

  const cspErrors = consoleErrors.filter((e) =>
    /Content Security Policy|Refused to connect|Failed to fetch/i.test(e)
  )
  expect(cspErrors).toEqual([])
})

test('análisis completo: upload CSV → resultado → expediente', async ({ page }) => {
  test.setTimeout(180000)
  const consoleErrors: string[] = []
  page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`))

  await login(page)
  await page.goto('/analisis')

  await expect(page.getByText(/Arrastra tu cartola aquí/i)).toBeVisible()
  await page.locator('#analysis-file').setInputFiles('e2e/fixtures/test-statement.csv')
  await expect(page.getByText('test-statement.csv')).toBeVisible({ timeout: 15000 })
  await page.getByRole('button', { name: /Analizar ahora/i }).click()

  await expect(page.getByRole('heading', { name: /Resultado de tu cartola/i })).toBeVisible({
    timeout: 120000,
  })

  await page.getByRole('button', { name: /Ver reporte y evidencia|Ver detalle/i }).click()
  await page.waitForURL('**/historial/**', { timeout: 30000 })
  await expect(page.getByRole('tab', { name: /Hallazgos/i })).toBeVisible({ timeout: 20000 })

  console.log('URL expediente:', page.url())
  expect(consoleErrors).toEqual([])
})
