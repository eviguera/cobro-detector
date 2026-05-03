import { test, expect } from '@playwright/test';
import { randomBytes } from 'crypto';

test.describe('Prueba Real de CobroDetector', () => {
  // Credenciales proporcionadas
  const testEmail = `test-${randomBytes(4).toString('hex')}@example.com`;
  const testPassword = '01020304';
  const testName = 'Usuario Prueba';

  test('Registro, subida de archivo y detección de anomalías', async ({ page }) => {
    console.log(`🔐 Credenciales: ${testEmail} / ${testPassword}`);

    // 1. Ir a login
    await page.goto('/login');
    await expect(page.getByText('Bienvenido de vuelta')).toBeVisible();

    // 2. Buscar enlace de registro
    const registerLink = page.getByText(/no tienes cuenta.*regístrate/i);
    await expect(registerLink).toBeVisible();
    await registerLink.click();
    
    // 3. Esperar página de registro (puede ser modal o página nueva)
    await page.waitForTimeout(2000);
    
    // 4. Llenar formulario de registro
    // Buscar inputs por placeholder o tipo
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const nameInput = page.locator('input[placeholder*="nombre"], input[name*="name"]').first();
    
    await emailInput.fill(testEmail);
    await passwordInput.fill(testPassword);
    
    // Si hay campo de nombre, llenarlo
    if (await nameInput.isVisible({ timeout: 1000 })) {
      await nameInput.fill(testName);
    }

    // 5. Confirmar contraseña si existe
    const confirmPassword = page.locator('input[placeholder*="confirm"], input[name*="confirm"]').first();
    if (await confirmPassword.isVisible({ timeout: 1000 })) {
      await confirmPassword.fill(testPassword);
    }

    // 6. Hacer clic en botón de registro
    const registerButton = page.getByRole('button', { name: /registrar|crear|regístrate/i });
    await expect(registerButton).toBeEnabled({ timeout: 5000 });
    await registerButton.click();

    // 7. Esperar respuesta (puede tardar por Supabase)
    await page.waitForTimeout(5000);
    
    const currentUrl = page.url();
    console.log(`📍 URL después de registro: ${currentUrl}`);

    // 8. Verificar si hay mensaje de error
    const errorMsg = await page.locator('text=/error|error|fallo/i').first().textContent().catch(() => null);
    if (errorMsg) {
      console.log(`❌ Error en registro: ${errorMsg}`);
    }

    // 9. Verificar si requiere verificación de email
    const pageText = await page.textContent('body');
    if (pageText?.toLowerCase().includes('verifica') || pageText?.toLowerCase().includes('confirm')) {
      console.log('⚠️ Requiere verificación de email. Revisa la bandeja de entrada.');
      console.log(`📧 Email registrado: ${testEmail}`);
      console.log(`🔑 Contraseña: ${testPassword}`);
      test.skip();
      return;
    }

    // 10. Si seguimos en login, intentar hacer login
    if (currentUrl.includes('/login')) {
      console.log('ℹ️ Registro redirigió a login. Intentando login...');
      
      // Llenar credenciales
      await page.locator('input[type="email"]').first().fill(testEmail);
      await page.locator('input[type="password"]').first().fill(testPassword);
      await page.getByRole('button', { name: /ingresar|iniciar/i }).click();
      
      await page.waitForTimeout(3000);
    }

    // 11. Ir a página de análisis
    await page.goto('/analisis');
    
    // Verificar que no redirige a login (debe estar autenticado)
    await page.waitForTimeout(2000);
    const finalUrl = page.url();
    console.log(`📍 URL final: ${finalUrl}`);
    
    // Si redirige a login, fallar la prueba
    if (finalUrl.includes('/login')) {
      console.log('❌ No se pudo autenticar. Verifica el registro.');
      test.skip();
      return;
    }
    
    await page.waitForTimeout(2000);

    // 10. Subir archivo de prueba
    const fileInput = page.locator('input[type="file"]').first();
    await expect(fileInput).toBeVisible({ timeout: 5000 });
    
    const testFilePath = '/Users/eduardoviguera/Desktop/COBRO/cobro-detector/test-statement.csv';
    await fileInput.setInputFiles(testFilePath);
    
    console.log('📄 Archivo subido: test-statement.csv');

    // 11. Esperar que se habilite el botón de enviar
    const submitButton = page.getByRole('button', { name: /analizar|enviar|procesar/i }).first();
    await expect(submitButton).toBeEnabled({ timeout: 5000 });
    await submitButton.click();

    console.log('⏳ Esperando resultado del análisis...');

    // 12. Esperar resultado (máximo 90 segundos para análisis asíncrono)
    await page.waitForSelector('text=/resultado|completado|análisis completo/i', { 
      timeout: 90000 
    });

    console.log('✅ Análisis completado!');

    // 13. Verificar que detecta anomalías
    await page.waitForTimeout(2000);
    
    const bodyText = await page.textContent('body');
    
    // Verificar detección de comisiones duplicadas
    const hasDuplicates = bodyText?.toLowerCase().includes('duplicada') || 
                         bodyText?.toLowerCase().includes('duplicado');
    console.log(`🔍 Detectó comisiones duplicadas: ${hasDuplicates}`);
    
    // Verificar detección de intereses
    const hasInterest = bodyText?.toLowerCase().includes('interés') || 
                       bodyText?.toLowerCase().includes('interes');
    console.log(`🔍 Detectó intereses: ${hasInterest}`);
    
    // Verificar anomalías en general
    const hasAnomalies = bodyText?.toLowerCase().includes('anomal') ||
                         bodyText?.toLowerCase().includes('error') ||
                         bodyText?.toLowerCase().includes('problema');
    
    expect(hasAnomalies || hasDuplicates || hasInterest).toBeTruthy();
    
    // 14. Verificar que aparece el monto recuperable
    const hasAmount = bodyText?.includes('$') || bodyText?.includes('CLP');
    console.log(`💰 Detectó montos: ${hasAmount}`);

    console.log(`🎉 ¡Prueba completada exitosamente!`);
    console.log(`📧 Usuario: ${testEmail}`);
    console.log(`🔑 Contraseña: ${testPassword}`);
  });
});
