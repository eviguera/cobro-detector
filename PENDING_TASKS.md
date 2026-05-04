# Tareas Pendientes - CobroDetector

## 🔴 Críticas
1. **Verificar ejecución de SQL migration**
   - Ir a: https://supabase.com/dashboard/project/mcwqqcngfibhgluvixlu/sql
   - Ejecutar: `supabase/migration_rls_and_indexes_FIXED.sql`
   - Verificar: RLS habilitado, índices creados, función `consume_credit()` disponible
   - Usuario dijo "listo ejecutado" pero no se verificó el resultado

2. **Configurar variables faltantes en Vercel** (opcional)
   - `UPSTASH_REDIS_URL` y `UPSTASH_REDIS_TOKEN` (para rate limiting)
   - Si se configuran, descomentar rate limiting en `src/app/api/analyze/route.ts`

## 🟡 Importantes
3. **Probar webhook de MercadoPago**
   - Configurar en MP dashboard: `MERCADOPAGO_WEBHOOK_SECRET`
   - URL: `https://project-qtyiz.vercel.app/api/payments/webhook`
   - Hacer pago de prueba para verificar que acredita créditos

4. **Arreglar vulnerabilidades de dependencias**
   - Ejecutar: `npm audit fix`
   - Hay 8 vulnerabilidades (3 moderate, 5 high)
   - Revisar si afectan producción

5. **Implementar generación de PDF sin Puppeteer**
   - Puppeteer fue removido (incompatible con serverless)
   - Opciones: `pdf-lib`, `react-pdf`, o servicio externo
   - Archivos relacionados: `src/app/api/documents/complaint-letter/pdf/route.ts`

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
- ✅ `SESSION_LOG_2026-05-03.md` - Registro de esta sesión
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
- **GitHub Repo:** https://github.com/eviguera/cobro-detector
