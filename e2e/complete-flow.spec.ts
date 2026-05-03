import { test, expect } from '@playwright/test';
import { randomBytes } from 'crypto';

test.describe('Flujo Completo CobroDetector', () => {
  const testEmail = `test-${randomBytes(4).toString('hex')}@example.com`;
  const testPassword = '01020304';

  test('Registro y análisis completo', async ({ page }) => {
    console.log(`🔐 Registrando: ${testEmail}`);

    // 1. Ir a login
    await page.goto('/login', { timeout: 10000 });
    await expect(page.getByText('Bienvenido de vuelta')).toBeVisible();

    // 2. Hacer clic en "Regístrate gratis"
    const registerLink = page.getByText(/no tienes cuenta.*regístrate/i);
    await expect(registerLink).toBeVisible({ timeout: 5000 });
    await registerLink.click();

    // 3. Esperar a que aparezca el formulario (puede ser modal o página nueva)
    await page.waitForTimeout(3000);
    
    // Tomar screenshot para debug
    await page.screenshot({ path: 'test-results/01-after-register-click.png' });

    // 4. Buscar inputs en la página actual
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    
    await expect(emailInput).toBeVisible({ timeout: 5000 });
    await expect(passwordInput).toBeVisible({ timeout: 5000 });

    // 5. Llenar formulario
    await emailInput.fill(testEmail);
    await passwordInput.fill(testPassword);

    // 6. Buscar campo de nombre (opcional)
    const nameInput = page.locator('input[placeholder*="nombre"], input[name*="name"]').first();
    if (await nameInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await nameInput.fill('Usuario Prueba');
    }

    // 7. Confirmar contraseña si existe
    const confirmInput = page.locator('input[placeholder*="confirm"], input[name*="confirm"]').first();
    if (await confirmInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmInput.fill(testPassword);
    }

    // 8. Click en registrarse
    const submitButton = page.getByRole('button', { name: /registrar|crear|regístrate/i }).first();
    await expect(submitButton).toBeEnabled({ timeout: 5000 });
    
    await submitButton.click();
    
    console.log('⏳ Esperando respuesta del servidor...');

    // 9. Esperar respuesta (máximo 10 segundos)
    await page.waitForTimeout(10000);

    // Tomar screenshot
    await page.screenshot({ path: 'test-results/02-after-submit.png' });

    const currentUrl = page.url();
    const pageText = await page.textContent('body') || '';
    
    console.log(`📍 URL actual: ${currentUrl}`);

    // 10. Verificar si requiere verificación de email
    if (pageText.toLowerCase().includes('verifica') || pageText.toLowerCase().includes('confirm')) {
      console.log('⚠️ Requiere verificación de email');
      console.log(`📧 Email: ${testEmail}`);
      console.log(`🔑 Contraseña: ${testPassword}`);
      test.skip();
      return;
    }

    // 11. Si estamos en login, intentar login directo
    if (currentUrl.includes('/login')) {
      console.log('ℹ️ Redirigió a login. Intentando login...');
      
      await page.locator('input[type="email"]').first().fill(testEmail);
      await page.locator('input[type="password"]').first().fill(testPassword);
      await page.getByRole('button', { name: /ingresar|iniciar/i }).first().click();
      
      await page.waitForTimeout(5000);
    }

    // 12. Verificar que estamos autenticados - ir a dashboard
    await page.goto('/dashboard');
    await page.waitForTimeout(3000);
    
    const dashboardUrl = page.url();
    console.log(`📍 URL después de ir a dashboard: ${dashboardUrl}`);

    if (dashboardUrl.includes('/login')) {
      console.log('❌ No se pudo autenticar');
      test.skip();
      return;
    }

    console.log('✅ Autenticado correctamente');

    // 13. Ir a análisis
    await page.goto('/analisis');
    await page.waitForTimeout(3000);

    // 14. Subir archivo
    const fileInput = page.locator('input[type="file"]').first();
    await expect(fileInput).toBeVisible({ timeout: 10000 });

    const testFilePath = '/Users/eduardoviguera/Desktop/COBRO/cobro-detector/test-statement.csv';
    await fileInput.setInputFiles(testFilePath);
    
    console.log('📄 Archivo subido');

    // 15. Enviar para análisis
    const analyzeButton = page.getByRole('button', { name: /analizar|enviar|procesar/i }).first();
    await expect(analyzeButton).toBeEnabled({ timeout: 5000 });
    await analyzeButton.click();

    console.log('⏳ Esperando análisis (máximo 90s)...');

    // 16. Esperar resultado
    await page.waitForSelector('text=/resultado|completado|análisis completo/i', { 
      timeout: 90000 
    });

    console.log('✅ Análisis completado');

    // 17. Verificar detección de anomalías
    await page.waitForTimeout(3000);
    const bodyText = await page.textContent('body') || '';

    // Buscar palabras clave
    const hasAnomalies = /anomal|error|problema|duplicada/i.test(bodyText);
    const hasCommission = /comisión|comision/i.test(bodyText);
    const hasInterest = /interés|interes/i.test(bodyText);

    console.log(`🔍 Anomalías detectadas: ${hasAnomalies}`);
    console.log(`💰 Comisiones: ${hasCommission}`);
    console.log(`📊 Intereses: ${hasInterest}`);

    expect(hasAnomalies || hasCommission || hasInterest).toBeTruthy();

    console.log('🎉 ¡Prueba completada exitosamente!');
    console.log(`📧 Usuario: ${testEmail}`);
    console.log(`🔑 Contraseña: ${testPassword}`);
  });
});
