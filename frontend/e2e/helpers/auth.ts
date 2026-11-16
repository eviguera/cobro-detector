import { expect, type Page } from '@playwright/test'

/**
 * Credenciales del usuario E2E. En local se exportan a mano; en CI vienen de
 * los secrets del repo. Si no existen (p. ej. un PR desde un fork) los specs
 * autenticados deben SALTARSE con razón explícita, nunca fallar.
 */
export const TEST_EMAIL = process.env.TEST_EMAIL ?? ''
export const TEST_PASSWORD = process.env.TEST_PASSWORD ?? ''

/** true cuando hay credenciales suficientes para ejercitar el flujo autenticado. */
export const hasTestCredentials = Boolean(TEST_EMAIL && TEST_PASSWORD)

/**
 * Razón estándar para `test.skip(!hasTestCredentials, MISSING_CREDENTIALS)`.
 * Se aplica a nivel de `test.describe`, así el reporte muestra los tests como
 * "skipped" con motivo en vez de esconder un fallo de autenticación.
 */
export const MISSING_CREDENTIALS =
  'TEST_EMAIL / TEST_PASSWORD no configurados: test autenticado omitido'

/**
 * Login por UI. Solo para los specs que prueban el propio login; el resto de
 * los flujos debería sembrar la sesión por API/storageState (ver `login` en
 * `local-smoke.spec.ts`). Sin `try/catch`: si no redirige, el test falla con
 * el `waitForURL` y el error real de la app.
 */
export async function login(
  page: Page,
  email: string = TEST_EMAIL,
  password: string = TEST_PASSWORD
): Promise<void> {
  await page.goto('/login')

  await expect(page.getByRole('heading', { name: /Ingresa a tu cuenta/i })).toBeVisible()

  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  await page.getByRole('button', { name: 'Ingresar' }).click()

  await page.waitForURL('**/dashboard', { timeout: 25_000 })
}
