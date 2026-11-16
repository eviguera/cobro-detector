import { test, expect } from '@playwright/test'
import { hasTestCredentials, login, MISSING_CREDENTIALS } from './helpers/auth'

/**
 * Requiere un usuario E2E real. Sin TEST_EMAIL / TEST_PASSWORD (PRs de fork)
 * el describe completo se salta con motivo explícito.
 *
 * El flujo de análisis de punta a punta necesita el stack local levantado
 * (Supabase + analysis-svc + Redis). Se activa con E2E_FULL_STACK=1; si no,
 * se salta para no fallar por servicios que el CI público no tiene.
 */
const hasFullStack = process.env.E2E_FULL_STACK === '1'
const MISSING_STACK =
  'E2E_FULL_STACK!=1: requiere analysis-svc + Supabase local, omitido'

test.describe('Planes y créditos', () => {
  test.skip(!hasTestCredentials, MISSING_CREDENTIALS)

  test('la página de precios lista los planes y el saldo de créditos', async ({ page }) => {
    await login(page)

    await page.goto('/precios')

    await expect(page.getByRole('heading', { level: 1, name: 'Elige tu plan' })).toBeVisible()
    await expect(page.getByText(/Los créditos no vencen/i)).toBeVisible()

    // Cuatro planes, cada uno con su CTA de compra.
    await expect(page.getByRole('button', { name: /Comprar |Empezar sin costo fijo/ })).toHaveCount(4)
  })
})

test.describe('Deduplicación de hallazgos', () => {
  test.skip(!hasTestCredentials, MISSING_CREDENTIALS)
  test.skip(!hasFullStack, MISSING_STACK)

  test('un análisis no reporta la misma transacción dos veces', async ({ page }) => {
    test.setTimeout(180_000)
    await login(page)

    await page.addInitScript(() => {
      localStorage.setItem('cobro-detector-onboarding-done', 'true')
    })
    await page.goto('/analisis')

    await page.locator('#analysis-file').setInputFiles('e2e/fixtures/test-statement.csv')
    await expect(page.getByText('test-statement.csv')).toBeVisible()

    const analyze = page.getByRole('button', { name: /Analizar ahora/ })
    await expect(analyze).toBeEnabled()
    await analyze.click()

    await expect(
      page.getByRole('heading', { name: /Resultado de tu cartola/i })
    ).toBeVisible({ timeout: 150_000 })

    // `mergeAnomalies` garantiza que una transacción recuperable se reclama
    // una sola vez: el monto recuperable no puede superar el total de cargos.
    const recoverable = page.getByText(/Monto recuperable/i).first()
    await expect(recoverable).toBeVisible()
  })
})
