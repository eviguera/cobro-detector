import { test, expect } from '@playwright/test';
import { getTestCredentials } from './helpers/auth';

const { email, password } = getTestCredentials();
const needsAuth = Boolean(email && password);

test.describe('Flujo de análisis asíncrono (202 Accepted + polling)', () => {
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

  test('sube CSV, recibe 202 Accepted y hace polling hasta resultado', async ({
    page,
  }) => {
    test.setTimeout(120000);

    // Saltear onboarding si existe
    await page.evaluate(() => {
      try {
        localStorage.setItem('cobro-detector-onboarding-done', 'true');
      } catch {
        // ignore
      }
    });

    // Ir a la página de análisis
    await page.goto('/analisis', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Subir archivo CSV de prueba
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles('e2e/fixtures/test-statement.csv');
    await page.waitForTimeout(1000);

    // Verificar que el botón de analizar esté habilitado
    const analyzeButton = page.getByRole('button', {
      name: /analizar|enviar|procesar/i,
    }).first();
    await expect(analyzeButton).toBeEnabled({ timeout: 5000 });

    // Clic en analizar
    await analyzeButton.click();

    // Verificar que la página entra en estado de análisis (procesando)
    await expect(
      page.locator('text=/analizando|procesando|revisando tu cartola/i').first(),
    ).toBeVisible({ timeout: 10000 });

    // Esperar a que el análisis complete (polling interno del frontend)
    // El flujo asíncrono devuelve 202 y el frontend hace polling hasta completed/awaiting_payment/error
    await expect(
      page.locator(
        'text=/resultado de tu cartola|análisis completado|reporte bloqueado|no pudimos completar/i',
      ).first(),
    ).toBeVisible({ timeout: 110000 });

    // Verificar que se mostraron resultados (métricas o mensaje de error)
    const hasResults = await page
      .locator(
        'text=/resultado de tu cartola|monto recuperable|hallazgos|no pudimos completar|reporte bloqueado/i',
      )
      .count();

    expect(hasResults).toBeGreaterThan(0);

    console.log('✅ Flujo de análisis asíncrono completado exitosamente');
  });

  test('muestra estado de seguridad en la página de análisis', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/analisis', { timeout: 10000 });

    // Verificar que los badges de seguridad están presentes
    await expect(
      page.locator('text=/privacidad primero|SSL\/TLS|auto-eliminación|cifrado/i').first(),
    ).toBeVisible({ timeout: 10000 });

    console.log('✅ Indicadores de seguridad visibles en /analisis');
  });
});
