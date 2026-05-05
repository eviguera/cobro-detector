# Tareas Pendientes - CobroDetector

## 🔴 Críticas
1. **Configurar variables en Vercel (Producción)** ⚠️
   - Ir a: https://vercel.com/evigueras-projects/cobro-detector/settings/environment-variables
   - Agregar TODAS las variables (seleccionar Production, Preview, Development):
     - `NEXT_PUBLIC_APP_URL=https://project-qtyiz.vercel.app`
     - `MERCADOPAGO_ACCESS_TOKEN=APP_USR-564f1360-5874-42e0-ae9c-0865b0f0baa7`
     - `MERCADOPAGO_WEBHOOK_SECRET=637a0bd754816e736c683446c2daf3c064cb2121cb3078812128308faa97bbb9`
     - `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=APP_USR-4537585297961724-042823-a143f4e24ef7571ef5f5e85856ee6748-2237707349`
     - `UPSTASH_REDIS_URL=https://cool-bengal-115547.upstash.io`
     - `UPSTASH_REDIS_TOKEN=gQAAAAAAAcNbAAIgcDIyMzY5ODcwZDZkYWY0NWMxYjg1ZDE4ZjI1ZWU0NmJjYg`
     - `NEXT_PUBLIC_SUPABASE_URL=https://mcwqqcngfibhgluvixlu.supabase.co`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY=[la_que_ya_tenías]`
   - Hacer Redeploy después: https://vercel.com/evigueras-projects/cobro-detector/deployments

2. **Configurar webhook en MercadoPago** ⚠️
   - URL: `https://project-qtyiz.vercel.app/api/payments/webhook`
   - Events: activar `payment`
   - Webhook Secret: `637a0bd754816e736c683446c2daf3c064cb2121cb3078812128308faa97bbb9`
   - URL MP: https://www.mercadopago.com.ar/developers/panel/notifications

3. **Probar pago y acreditación de créditos** ⚠️
   - Ir a: https://project-qtyiz.vercel.app/precios
   - Usar tarjeta de prueba: 4509 9535 6623 3704, CVV: 123
   - Verificar que se acrediten los créditos en Supabase

## 🟡 Importantes
4. **Arreglar vulnerabilidades de dependencias**
   - Ejecutar: `npm audit fix --force`
   - Hay 8 vulnerabilidades (3 moderate, 5 high)
   - `xlsx` no tiene fix (considerar migrar a `exceljs`)

5. **Implementar generación de PDF sin Puppeteer** ✅ COMPLETADO
   - `pdf-lib` instalado y funcionando
   - `puppeteer` eliminado

## 🟢 Opcionales
6. **Probar procesamiento asíncrono con Vercel Queue**
   - `@vercel/queue` ya instalado
   - Archivo creado: `src/lib/analysis-queue.ts`
   - Pendiente: integrar en flujo de análisis

7. **Considerar upgrade a Next.js 15**
   - Para usar `use cache` y `cacheTag` correctamente
   - Revisar breaking changes antes de migrar

8. **Configurar Sentry (opcional)**
   - Usuario tuvo problemas en el pasado
   - Si se quiere: seguir guía en `.agents/skills/` pero con más cuidado

## 📝 Documentación
- ✅ `SESSION_LOG_2026-05-03.md` - Registro de sesión anterior
- ✅ `SESSION_LOG_2026-05-04.md` - Registro de hoy
- ✅ `MEJORAS_RESUMEN.md` - Resumen de todas las mejoras
- ✅ `CLEANUP.md` - Documentación de limpieza
- ✅ `INSTRUCCIONES_VERCEL.md` - Instrucciones para variables de entorno

## 🚀 Comandos Rápidos para Mañana
```bash
# Ver estado actual
git status
vercel --prod

# Arreglar vulnerabilidades
npm audit fix

# Probar localmente
npm run dev

# Ver logs de Vercel
vercel logs

# Ver despliegues
open https://vercel.com/evigueras-projects/cobro-detector/deployments
```

## 🔗 Enlaces Importantes
- **Producción:** https://project-qtyiz.vercel.app
- **Vercel Dashboard:** https://vercel.com/evigueras-projects/cobro-detector
- **Variables de entorno:** https://vercel.com/evigueras-projects/cobro-detector/settings/environment-variables
- **Supabase Dashboard:** https://supabase.com/dashboard/project/mcwqqcngfibhgluvixlu
- **SQL Editor:** https://supabase.com/dashboard/project/mcwqqcngfibhgluvixlu/sql
- **MercadoPago Notifications:** https://www.mercadopago.com.ar/developers/panel/notifications
- **GitHub Repo:** https://github.com/eviguera/cobro-detector
