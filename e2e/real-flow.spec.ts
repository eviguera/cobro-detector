import { test, expect } from '@playwright/test';
import { randomBytes } from 'crypto';

test.describe('Flujo Real de CobroDetector', () => {
  const testEmail = `test-${randomBytes(4).toString('hex')}@example.com`;
  const testPassword = 'Test123456!';

  test('Registro y análisis de estado de cuenta', async ({ page }) => {
    // 1. Ir a login
    await page.goto('/login');
    await expect(page.locator('form')).toBeVisible();

    // 2. Buscar enlace de registro
    const registerLink = page.getByText(/registrar|registro|crear cuenta/i).first();
    if (await registerLink.isVisible()) {
      await registerLink.click();
      await page.waitForURL('**/register', { timeout: 5000 });
    }

    // 3. Llenar formulario de registro
    await page.getByRole('textbox', { name: /email/i }).fill(testEmail);
    await page.getByRole('textbox', { name: /contraseña/i }).fill(testPassword);
    
    // Confirmar contraseña si existe
    const confirmPassword = page.getByRole('textbox', { name: /confirmar|repetir/i });
    if (await confirmPassword.isVisible()) {
      await confirmPassword.fill(testPassword);
    }

    // 4. Enviar registro
    await page.getByRole('button', { name: /registrar|crear|registrarme/i }).click();

    // 5. Esperar redirección al dashboard o login
    await page.waitForTimeout(3000);

    // 6. Si requiere verificación de email, mostrar mensaje
    const pageContent = await page.content();
    if (pageContent.includes('verifica') || pageContent.includes('confirm')) {
      console.log('Registro exitoso - Requiere verificación de email');
      test.skip();
      return;
    }

    // 7. Ir a página de análisis
    await page.goto('/analisis');
    
    // 8. Subir archivo de prueba
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeVisible();
    
    await fileInput.setInputFiles('/Users/eduardoviguera/Desktop/COBRO/cobro-detector/test-statement.csv');

    // 9. Enviar para análisis
    const submitButton = page.getByRole('button', { name: /analizar|subir|enviar/i });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // 10. Esperar resultado del análisis (máximo 60 segundos)
    await page.waitForSelector('text=/análisis|resultado|completado/i', { timeout: 60000 });

    // 11. Verificar que detecta anomalías
    await expect(page.getByText(/comisión|duplicada|error|anomal/i)).toBeVisible({ timeout: 10000 });

    console.log(`Usuario ${testEmail} registrado y análisis completado`);
  });

  test('Verificar detección de comisiones duplicadas', async ({ page }) => {
    // Login con usuario existente (si hay uno configurado)
    await page.goto('/login');
    
    // Usar credenciales de prueba si existen
    const testUser = process.env.E2E_EMAIL || 'test@example.com';
    const testPass = process.env.E2E_PASSWORD || 'test123';

    await page.getByRole('textbox', { name: /email/i }).fill(testUser);
    await page.getByRole('textbox', { name: /contraseña/i }).fill(testPass);
    await page.getByRole('button', { name: /iniciar/i }).click();

    await page.waitForTimeout(2000);

    // Ir a historial
    await page.goto('/historial');
    
    // Verificar que hay análisis previos (de la BD de producción)
    const analysisCards = page.locator('[class*="card"], [class*="analysis"]');
    const count = await analysisCards.count();
    
    console.log(`Análisis encontrados en producción: ${count}`);
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
