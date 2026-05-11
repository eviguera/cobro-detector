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

5. **Implementar generación de PDF sin Puppeteer** ✅ COMPLETADO
   - `pdf-lib` instalado y funcionando
   - `puppeteer` eliminado

## 🟢 Opcionales
6. **Probar procesamiento asíncrono con Vercel Queue**
   - Archivo creado: `src/lib/analysis-queue.ts`
   - Pendiente: integrar en flujo de análisis

7. **Considerar upgrade a Next.js 15**
   - Para usar `use cache` y `cacheTag` correctamente

8. **Configurar Sentry (opcional)**
   - Seguir guía en `.agents/skills/`

## 📝 Documentación
- ✅ `MEJORAS_RESUMEN.md` - Resumen de todas las mejoras
- ✅ `CLEANUP.md` - Documentación de limpieza

## 🚀 Comandos Rápidos
```bash
git status
npm run dev
npm run build
vercel --prod
```

## 🔗 Enlaces Importantes
- **Vercel Dashboard:** https://vercel.com/evigueras-projects/cobro-detector
- **Supabase Dashboard:** https://supabase.com/dashboard/project/mcwqqcngfibhgluvixlu
- **MercadoPago Notifications:** https://www.mercadopago.com.ar/developers/panel/notifications
- **GitHub Repo:** https://github.com/eviguera/cobro-detector
