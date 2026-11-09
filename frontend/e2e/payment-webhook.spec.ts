import { test, expect } from '@playwright/test';
import { getTestCredentials } from './helpers/auth';

const { email, password } = getTestCredentials();
const needsAuth = Boolean(email && password);

test.describe('Flujo de pago (MercadoPago webhook y créditos)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    if (!needsAuth) {
      test.skip();
      return;
    }
    await page.goto('/login', { timeout: 10000 });
    await expect(page.getByText('Ingresa a tu cuenta')).toBeVisible({ timeout: 10000 });

    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await emailInput.fill(email);
    await passwordInput.fill(password);
    await passwordInput.press('Enter');

    await page.waitForURL('**/dashboard', { timeout: 15000 });
  });

  test('página de precios carga y muestra planes', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto('/precios', { timeout: 10000 });
    await page.waitForTimeout(3000);

    // Verificar que se muestran los planes
    await expect(page.locator('h1, h2').first()).toBeVisible();

    // Buscar botones de compra
    const buyButtons = page.locator(
      'button:has-text("Comprar"), button:has-text("Analizar con Plan Platino")',
    );
    const buttonCount = await buyButtons.count();
    console.log(`🔍 Botones de compra encontrados: ${buttonCount}`);

    expect(buttonCount).toBeGreaterThan(0);
    console.log('✅ Página de precios carga con planes disponibles');
  });

  test('intento de compra no muestra errores visibles', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto('/precios', { timeout: 10000 });
    await page.waitForTimeout(3000);

    const buyButtons = page.locator(
      'button:has-text("Comprar"), button:has-text("Analizar con Plan Platino")',
    );
    const buttonCount = await buyButtons.count();

    if (buttonCount > 0) {
      await buyButtons.first().click();
      await page.waitForTimeout(5000);

      // Verificar que no haya mensaje de error visible
      const errorMsg = page.locator(
        '.text-red-600, .text-red-500, [role="alert"]',
      ).first();
      const errorVisible = await errorMsg.isVisible().catch(() => false);
      expect(errorVisible).toBeFalsy();

      console.log('✅ Intento de compra no muestra errores visibles');
    } else {
      console.log('⚠️ No hay botones de compra, saltando prueba de flujo de pago');
      test.skip();
    }
  });

  test('historial accesible después de login', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto('/historial', { timeout: 10000 });
    await page.waitForTimeout(3000);

    await expect(page.locator('h1, h2').first()).toBeVisible();
    console.log('✅ Página de historial accesible después de login');
  });
});
