import { test, expect } from '@playwright/test'
import { hasTestCredentials, login, MISSING_CREDENTIALS } from './helpers/auth'

test.describe('Flujo de pago (UI)', () => {
  test.skip(!hasTestCredentials, MISSING_CREDENTIALS)

  test('cada plan expone un CTA de compra', async ({ page }) => {
    await login(page)
    await page.goto('/precios')

    await expect(page.getByRole('heading', { level: 1, name: 'Elige tu plan' })).toBeVisible()

    const ctas = page.getByRole('button', { name: /Comprar |Empezar sin costo fijo/ })
    await expect(ctas).toHaveCount(4)

    // Los planes con precio fijo nombran el plan y el monto en el botón.
    await expect(page.getByRole('button', { name: /^Comprar .+ · \$/ }).first()).toBeVisible()
  })

  /**
   * Único camino de compra que se puede verificar sin MercadoPago: el plan
   * Platino no crea preferencia, redirige al flujo de análisis. El botón
   * "Analizar con Plan Platino" solo aparece cuando hay archivo cargado, así
   * que aquí se asierta la pantalla de análisis con el aviso de cobro.
   */
  test('el plan Platino lleva al análisis sin costo fijo', async ({ page }) => {
    await login(page)
    await page.goto('/precios')

    await page.getByRole('button', { name: 'Empezar sin costo fijo' }).click()

    await expect(page).toHaveURL(/\/analisis\?plan=platino$/)
    await expect(page.getByRole('heading', { name: 'Auditar una cartola' })).toBeVisible()
    await expect(
      page.getByText('Plan Platino · pagas 20% solo si encontramos cobros')
    ).toBeVisible()
  })

  test('el historial de análisis es accesible tras el login', async ({ page }) => {
    await login(page)
    await page.goto('/historial')

    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  })
})
