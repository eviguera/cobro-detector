import { test, expect } from '@playwright/test';

/**
 * Protección de rutas de página vía middleware (`src/middleware.ts`).
 * Sin sesión, las rutas privadas deben terminar en `/login`, sin exponer el
 * contenido de la página ni un 500.
 */
test.describe('Seguridad y autorización (rutas protegidas)', () => {
  const PROTECTED = [
    { route: '/analisis', label: 'análisis' },
    { route: '/historial', label: 'historial' },
    { route: '/precios', label: 'precios' },
    { route: '/dashboard', label: 'panel' },
    { route: '/dashboard/analytics', label: 'métricas' },
  ];

  for (const { route, label } of PROTECTED) {
    test(`${label} sin sesión redirige a login`, async ({ page }) => {
      const response = await page.goto(route);

      await expect(page).toHaveURL(/\/login$/);
      // El contenido privado nunca se renderiza para un visitante anónimo.
      await expect(page.getByRole('heading', { name: /Ingresa a tu cuenta/i })).toBeVisible();
      expect(response?.status() ?? 200).toBeLessThan(400);
    });
  }

  test('no se filtra contenido privado en la respuesta de una ruta protegida', async ({
    request,
  }) => {
    const response = await request.get('/historial', { maxRedirects: 0 });

    // Next.js responde con redirect (307/308) o reescribe a /login; lo que no
    // puede pasar es servir 200 con el expediente del usuario.
    expect([200, 307, 308]).toContain(response.status());
    if (response.status() === 200) {
      expect(await response.text()).not.toMatch(/Tus análisis|Descargar carta/i);
    }
  });
});
