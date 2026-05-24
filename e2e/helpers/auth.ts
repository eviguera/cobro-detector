import { test, expect, type Page } from '@playwright/test'

export function getTestCredentials() {
  const email = process.env.TEST_EMAIL
  const password = process.env.TEST_PASSWORD
  if (!email || !password) {
    console.log('⚠️ TEST_EMAIL o TEST_PASSWORD no configurados. Saltando prueba.')
    test.skip()
    return { email: '', password: '' }
  }
  return { email, password }
}

export async function login(page: Page, email: string, password: string): Promise<boolean> {
  await page.goto('/login', { timeout: 10000 })
  await expect(page.getByText('Bienvenido de vuelta')).toBeVisible()

  const emailInput = page.locator('input[type="email"]').first()
  const passwordInput = page.locator('input[type="password"]').first()

  await emailInput.fill(email)
  await passwordInput.fill(password)

  // Presionar Enter en el campo password para hacer submit del form
  await passwordInput.press('Enter')

  // Esperar a que el login redirija a /dashboard
  try {
    await page.waitForURL('**/dashboard', { timeout: 15000 })
    console.log('✅ Autenticado correctamente')
    return true
  } catch {
    const url = page.url()
    console.log(`📍 URL después de login: ${url}`)
    console.log('❌ No se pudo autenticar.')
    return false
  }
}
