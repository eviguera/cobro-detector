# Tareas Pendientes - CobroDetector

## 🔴 Críticas
1. **Configurar variables en Vercel (Producción)** ⚠️
   - Ir a: Vercel Dashboard → Settings → Environment Variables
   - Agregar TODAS las variables (Production, Preview, Development):
     - `NEXT_PUBLIC_APP_URL`
     - `MERCADOPAGO_ACCESS_TOKEN`
     - `MERCADOPAGO_WEBHOOK_SECRET`
     - `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`
     - `UPSTASH_REDIS_URL`
     - `UPSTASH_REDIS_TOKEN`
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Hacer Redeploy después

2. **Configurar webhook en MercadoPago** ⚠️
   - URL: `{NEXT_PUBLIC_APP_URL}/api/payments/webhook`
   - Events: activar `payment`
   - Webhook Secret: configurar en variable de entorno

3. **Probar pago y acreditación de créditos** ⚠️
   - Ir a la app en /precios
   - Usar tarjeta de prueba de MercadoPago
   - Verificar que se acrediten los créditos en Supabase

## 🟡 Importantes
4. **Arreglar vulnerabilidades de dependencias**
   - Ejecutar: `npm audit fix --force`
   - `xlsx` no tiene fix (considerar migrar a `exceljs`)

5. **Generar CSV de 3.000 transacciones y probar detección masiva**
   - Usar el formato con columnas `tipo_anomalia`, `id_transaccion_referencia`, `reclamable`, `motivo_reclamo`
   - Distribución: 2.650 normales + 200 cobros dobles (100 pares) + 100 cobros altos duplicados (50 pares) + 50 cobros mal realizados = 3.000 filas
   - 350 reclamables en total
   - Verificar que la app detecte todas las anomalías

6. **Probar subiendo `prueba.csv` desde la UI** (verificar end-to-end)
   - Verificar que las 3 anomalías aparezcan en la UI

## 🟢 Opcionales
7. **Probar procesamiento asíncrono con Vercel Queue**
   - Archivo creado: `src/lib/analysis-queue.ts`
   - Pendiente: integrar en flujo de análisis

8. **Considerar upgrade a Next.js 15**
   - Para usar `use cache` y `cacheTag` correctamente

9. **Configurar Sentry (opcional)**
   - Seguir guía en `.agents/skills/`

## ✅ Completados (Sesión 2026-05-10)
- [x] Fix fechas corruptas en CSV por xlsx (nuevo `parseCSVBuffer`)
- [x] Fix commissionKeywords demasiado amplio (keywords específicas)
- [x] Fix Regla 1a sin merchant matching
- [x] Fix Regla 1b agrupaba sin diferenciar montos
- [x] Fix raw_data no guardado en BD
- [x] Fix errores silenciosos (success: false)
- [x] Detección de anomalías pre-etiquetadas desde CSV (`tipo_anomalia`, `id_transaccion_referencia`, etc.)
- [x] Nuevo tipo `incorrect_charge` con label en toda la UI
- [x] Deploy a producción Vercel

## 📝 Documentación
- ✅ `MEJORAS_RESUMEN.md` - Resumen de todas las mejoras
- ✅ `CLEANUP.md` - Documentación de limpieza
- ✅ `SESSION_LOG_2026-05-10.md` - Log de sesión actualizado
- ✅ `.agents/skills/cobro-detector/SKILL.md` - Skill personalizada del proyecto

## 🚀 Comandos Rápidos
```bash
# Desarrollo
npm run dev

# Tests
npx jest --no-cache

# TypeScript check
npx tsc --noEmit

# Deploy
git add <files>
git commit -m "feat: ..."
git push
```

## 🔗 Enlaces Importantes
- **Vercel Dashboard:** https://vercel.com/evigueras-projects/cobro-detector
- **Supabase Dashboard:** https://supabase.com/dashboard/project/mcwqqcngfibhgluvixlu
- **MercadoPago Notifications:** https://www.mercadopago.com.ar/developers/panel/notifications
- **GitHub Repo:** https://github.com/eviguera/cobro-detector
- **Último Deploy:** https://cobro-detector-9rgqql1xd-evigueras-projects.vercel.app
