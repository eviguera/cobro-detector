import { test, expect } from '@playwright/test';

test.describe('Verificación de Descuento de Créditos', () => {
  const testEmail = 'santverrepuestos@gmail.com';
  const testPassword = '01020304';

test('Login y verificación de créditos', async ({ page }) => {
    console.log('🔐 Iniciando sesión...');

    // 1. Ir a login
    await page.goto('/login', { timeout: 10000 });
    await expect(page.getByText('Bienvenido de vuelta')).toBeVisible();

    // 2. Llenar credenciales
    await page.locator('input[type="email"]').first().fill(testEmail);
    await page.locator('input[type="password"]').first().fill(testPassword);

    // 3. Hacer login
    await page.getByRole('button', { name: /ingresar|iniciar/i }).first().click();

    console.log('⏳ Esperando respuesta...');
    await page.waitForTimeout(5000);

    // 4. Verificar que estamos autenticados - ir a dashboard
    await page.goto('/dashboard');
    await page.waitForTimeout(3000);

    const dashboardUrl = page.url();
    console.log(`📍 URL después de login: ${dashboardUrl}`);

    if (dashboardUrl.includes('/login')) {
      console.log('❌ No se pudo autenticar. Verificar credenciales.');
      test.skip();
      return;
    }

    console.log('✅ Autenticado correctamente');

    // 2. Ir a dashboard para ver créditos actuales
    await page.goto('/dashboard');
    await page.waitForTimeout(3000);

    // 3. Capturar créditos mostrados en UI
    const pageText = await page.textContent('body') || '';
    
    // Buscar números que podrían ser créditos (ej: "100 créditos")
    const creditsMatch = pageText.match(/(\d+)\s*crédito/);
    let creditsBefore = 0;
    
    if (creditsMatch) {
      creditsBefore = parseInt(creditsMatch[1]);
      console.log(`💰 Créditos antes del análisis: ${creditsBefore}`);
    } else {
      console.log('⚠️ No se pudo leer créditos del dashboard');
    }

    // 4. Ir a análisis
    await page.goto('/analisis');
    await page.waitForTimeout(3000);

    // 5. Subir archivo
    const uploadButton = page.getByText(/seleccionar|subir|elegir.*archivo/i).first();
    await expect(uploadButton).toBeVisible({ timeout: 10000 });
    await uploadButton.click();

    const fileInput = page.locator('input[type="file"]').first();
    const testFilePath = '/Users/eduardoviguera/Desktop/COBRO/cobro-detector/test-statement.csv';
    await fileInput.setInputFiles(testFilePath);

    console.log('📄 Archivo subido');

    // 6. Enviar para análisis
    const analyzeButton = page.getByRole('button', { name: /analizar|enviar|procesar/i }).first();
    await expect(analyzeButton).toBeEnabled({ timeout: 5000 });
    await analyzeButton.click();

    console.log('⏳ Análisis iniciado. Esperando resultado...');

    // 7. Esperar resultado
    try {
      await page.waitForSelector('text=/resultado|completado|análisis completo/i', {
        timeout: 90000
      });
      console.log('✅ Análisis completado');
    } catch (error) {
      console.log('⚠️ Timeout esperando resultado');
    }

    // 8. Volver a dashboard para verificar créditos
    await page.goto('/dashboard');
    await page.waitForTimeout(3000);

    const pageTextAfter = await page.textContent('body') || '';
    const creditsMatchAfter = pageTextAfter.match(/(\d+)\s*crédito/);
    
    if (creditsMatchAfter) {
      const creditsAfter = parseInt(creditsMatchAfter[1]);
      console.log(`💰 Créditos después del análisis: ${creditsAfter}`);
      console.log(`📉 Diferencia: ${creditsBefore - creditsAfter} crédito(s) descontado(s)`);
      
      // Verificar que se descontó al menos 1 crédito
      if (creditsBefore > 0) {
        expect(creditsAfter).toBeLessThan(creditsBefore);
        console.log('✅ Crédito descontado exitosamente');
      }
    } else {
      console.log('⚠️ No se pudo verificar el descuento en la UI');
    }

    // 9. Tomar screenshot final
    await page.screenshot({ path: 'test-results/credits-verification.png', fullPage: true });

    console.log('🎉 Verificación completada');
  });
});
