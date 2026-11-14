import { test, expect } from '@playwright/test';

/**
 * Smoke de rutas públicas. No requiere credenciales ni backend: cualquier
 * usuario/visitante anónimo debe poder recorrer estas páginas.
 */
test.describe('Rutas públicas', () => {
  test('homepage carga con hero y estadísticas', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/CobroDetector/);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();

    // Testimonio y estadísticas del hero: copy estable de la landing.
    await expect(page.getByText('Rodrigo')).toBeVisible();
    await expect(page.getByText('3 min', { exact: true })).toBeVisible();
    await expect(page.getByText('9+', { exact: true })).toBeVisible();
  });

  test('login renderiza el formulario sin sesión', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: /Ingresa a tu cuenta/i })).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible();
  });

  test('sección de precios de la landing muestra planes', async ({ page }) => {
    await page.goto('/#precios');

    const pricing = page.locator('#precios');
    await expect(
      pricing.getByRole('heading', { name: /Pago por análisis, sin suscripción/i })
    ).toBeVisible();

    // Al menos un precio formateado aparece en la sección.
    await expect(pricing.getByText(/\$/).first()).toBeVisible();
  });

  test('rutas protegidas redirigen a login sin sesión', async ({ page }) => {
    for (const route of ['/analisis', '/historial', '/precios', '/dashboard']) {
      await page.goto(route);
      await expect(page, `${route} debe redirigir a /login`).toHaveURL(/\/login$/);
    }
  });

  /**
   * El CTA del header apunta a `/login?mode=signup` (intención de registro).
   * Nota: hoy la página de login ignora el parámetro `mode` y muestra el
   * formulario de ingreso; este test fija la navegación, no el copy del
   * formulario. Cuando el parámetro se respete habrá que asertar
   * "Crea tu cuenta" aquí.
   */
  test('CTA "Comenzar" del header lleva a la intención de registro', async ({ page }) => {
    await page.goto('/');

    await page.locator('header').getByRole('link', { name: 'Comenzar' }).click();

    await expect(page).toHaveURL(/\/login\?mode=signup$/);
    await expect(page.locator('form')).toBeVisible();
  });

  test('homepage es usable en viewport móvil', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Comenzar' }).first()).toBeVisible();
  });
});
