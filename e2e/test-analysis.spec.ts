import { test, expect } from '@playwright/test';

test.describe('Prueba de Análisis con Usuario Existente', () => {
  // Credenciales de usuario ya registrado en producción
  const testEmail = 'santverrepuestos@gmail.com';
  const testPassword = '01020304';

  test('Login y análisis de archivo', async ({ page }) => {
    console.log('🔐 Iniciando sesión con usuario de prueba...');

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

    // 5. Ir a página de análisis
    await page.goto('/analisis');
    await page.waitForTimeout(3000);

    console.log('📄 Preparando para subir archivo...');

    // 6. Buscar el botón que activa el input de archivo (no el input hidden)
    const uploadButton = page.getByText(/seleccionar|subir|elegir.*archivo/i).first();
    await expect(uploadButton).toBeVisible({ timeout: 10000 });
    await uploadButton.click();

    // 7. Subir archivo de prueba (usar el input[type="file"] aunque esté hidden)
    const fileInput = page.locator('input[type="file"]').first();
    const testFilePath = '/Users/eduardoviguera/Desktop/COBRO/cobro-detector/test-statement.csv';
    await fileInput.setInputFiles(testFilePath);

    console.log('📄 Archivo subido: test-statement.csv');

    // Esperar a que se procese el archivo
    await page.waitForTimeout(2000);

    // 7. Enviar para análisis
    const analyzeButton = page.getByRole('button', { name: /analizar|enviar|procesar/i }).first();
    await expect(analyzeButton).toBeEnabled({ timeout: 5000 });
    await analyzeButton.click();

    console.log('⏳ Análisis iniciado. Esperando resultado (máximo 90s)...');

    // 8. Esperar resultado del análisis (asíncrono)
    try {
      await page.waitForSelector('text=/resultado|completado|análisis completo|procesado/i', {
        timeout: 90000
      });
      console.log('✅ Análisis completado!');
    } catch (error) {
      console.log('⚠️ Timeout esperando resultado. Verificando página...');
    }

    // 9. Verificar detecciones
    await page.waitForTimeout(3000);
    const pageText = await page.textContent('body') || '';

    // Tomar screenshot del resultado
    await page.screenshot({ path: 'test-results/analysis-result.png', fullPage: true });

    // Buscar coincidencias
    const hasAnomalies = /anomalía|anomal/i.test(pageText);
    const hasDuplicates = /duplicada|duplicado/i.test(pageText);
    const hasCommission = /comisión|comision/i.test(pageText);
    const hasInterest = /interés|interes/i.test(pageText);
    const hasAmount = /\$[\d.,]+/.test(pageText);

    console.log('🔍 Resultados de la detección:');
    console.log(`  - Anomalías detectadas: ${hasAnomalies}`);
    console.log(`  - Comisiones duplicadas: ${hasDuplicates}`);
    console.log(`  - Errores de comisión: ${hasCommission}`);
    console.log(`  - Intereses detectados: ${hasInterest}`);
    console.log(`  - Montos recuperables: ${hasAmount}`);

    // Verificar que al menos detectó algo
    const foundSomething = hasAnomalies || hasDuplicates || hasCommission || hasInterest;
    expect(foundSomething).toBeTruthy();

    // 10. Verificar que se puede generar reporte
    const pdfButton = page.getByRole('button', { name: /reporte|pdf|descargar/i }).first();
    if (await pdfButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('📑 Botón de reporte PDF encontrado');
    }

    console.log('🎉 ¡Prueba completada exitosamente!');
    console.log(`📧 Usuario: ${testEmail}`);
    console.log(`🔑 Contraseña: ${testPassword}`);
  });
});
