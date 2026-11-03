import { test, expect } from '@playwright/test';

test.describe('Seguridad y autorización (RLS / IDOR)', () => {
  test.describe('Sin autenticación (rutas protegidas)', () => {
    test('ruta de análisis sin autenticación redirige a login', async ({ page }) => {
      await page.goto('/analisis', { timeout: 10000 });
      await expect(page).toHaveURL('/login', { timeout: 10000 });
      console.log('✅ Ruta protegida redirige a login sin sesión');
    });

    test('historial sin autenticación redirige a login', async ({ page }) => {
      await page.goto('/historial', { timeout: 10000 });
      await expect(page).toHaveURL('/login', { timeout: 10000 });
      console.log('✅ Ruta de historial redirige a login sin sesión');
    });

    test('precios sin autenticación redirige a login', async ({ page }) => {
      await page.goto('/precios', { timeout: 10000 });
      await expect(page).toHaveURL('/login', { timeout: 10000 });
      console.log('✅ Ruta de precios redirige a login sin sesión');
    });
  });
});
