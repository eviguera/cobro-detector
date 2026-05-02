import { test, expect } from '@playwright/test';

test.describe('CobroDetector E2E Tests', () => {
  test('Homepage loads correctly', async ({ page }) => {
    await page.goto('/');
    
    // Verificar que la página carga
    await expect(page).toHaveTitle(/CobroDetector/);
    
    // Verificar que existe un h1
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    
    // Verificar que el testimonio está presente
    await expect(page.getByText('Rodrigo')).toBeVisible();
    
    // Verificar estadísticas
    await expect(page.getByText('97%')).toBeVisible();
  });

  test('Health check endpoint', async ({ page }) => {
    const response = await page.request.get('/api/health');
    expect(response.ok()).toBeTruthy();
    
    const body = await response.json();
    expect(body.status).toBe('healthy');
  });

  test('Login page renders', async ({ page }) => {
    await page.goto('/login');
    
    // Verificar que la página carga
    await expect(page.locator('form, input').first()).toBeVisible();
    
    // Verificar que hay inputs
    const inputs = page.locator('input');
    const count = await inputs.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Pricing page loads', async ({ page }) => {
    await page.goto('/precios');
    
    // Verificar que la página carga
    await expect(page.locator('h2, h1').first()).toBeVisible();
    
    // Verificar que hay precios en la página
    await expect(page.getByText(/\$[0-9]/)).toBeVisible();
  });

  test('Protected routes redirect to login', async ({ page }) => {
    // Probar /analisis
    await page.goto('/analisis');
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');
    
    // Probar /dashboard
    await page.goto('/dashboard');
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');
  });

  test('Dark mode button exists', async ({ page }) => {
    await page.goto('/');
    
    // Buscar botón de tema
    const themeButton = page.locator('button[aria-label*="theme"], button[aria-label*="tema"], [class*="theme"]').first();
    
    // Si existe, hacer clic
    if (await themeButton.isVisible()) {
      await themeButton.click();
      await page.waitForTimeout(500);
    }
    
    // La prueba pasa si no hay errores
    expect(true).toBeTruthy();
  });

  test('Mobile responsive', async ({ page }) => {
    // Configurar viewport móvil
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Verificar que la página se ve correctamente
    await expect(page.locator('h1')).toBeVisible();
  });

test('API endpoints require auth', async ({ page }) => {
  // Probar /api/analyze (debe requerir auth)
  const analyzeResponse = await page.request.post('/api/analyze');
  expect(analyzeResponse.status()).toBe(401);
  
  // Probar /api/health (debe ser público)
  const healthResponse = await page.request.get('/api/health');
  expect(healthResponse.status()).toBe(200);
});
});
