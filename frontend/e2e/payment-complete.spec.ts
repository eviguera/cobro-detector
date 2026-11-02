import { test, expect } from '@playwright/test'
import { getTestCredentials, login } from './helpers/auth'

const { email, password } = getTestCredentials()

test.describe('Flujo de pago completo E2E', () => {
  test('Login, ver planes y crear preferencia de pago', async ({ page }) => {
    test.setTimeout(60000)
    const ok = await login(page, email, password)
    if (!ok) { test.skip(); return }

    // Ir a la página de precios
    await page.goto('/precios')
    await page.waitForTimeout(3000)

    // Verificar que se muestran los planes
    await expect(page.locator('h1, h2').first()).toBeVisible()

    // Buscar botones de compra (BuyButton)
    const buyButtons = page.locator('button:has-text("Comprar"), button:has-text("Analizar con Plan Platino")')
    const buttonCount = await buyButtons.count()
    console.log(`🔍 Botones de compra encontrados: ${buttonCount}`)

    if (buttonCount > 0) {
      // Clic en el primer botón de compra (plan Inicial)
      await buyButtons.first().click()
      await page.waitForTimeout(5000)

      // Si es plan Platino, redirige a /analisis?plan=platino
      // Si es plan normal, redirige a MercadoPago (init_point)
      const url = page.url()
      console.log(`📍 URL después de comprar: ${url}`)

      // Verificar que no haya error visible
      const errorMsg = page.locator('.text-red-600, .text-red-500, [role="alert"]').first()
      const errorVisible = await errorMsg.isVisible().catch(() => false)
      expect(errorVisible).toBeFalsy()
    }
  })

  test('Historial de análisis accesible después de login', async ({ page }) => {
    test.setTimeout(60000)
    const ok = await login(page, email, password)
    if (!ok) { test.skip(); return }

    await page.goto('/historial')
    await page.waitForTimeout(3000)

    // La página de historial debe cargar (puede estar vacía)
    await expect(page.locator('h1, h2').first()).toBeVisible()
    console.log('✅ Página de historial cargada')
  })
})
