# INSTRUCCIONES PARA CONFIGURAR VERCEL

## PASO 1: Variables de Entorno Requeridas

Ir a: https://vercel.com/evigueras-projects/cobro-detector/settings/environment-variables

### A. Rate Limiting (Upstash Redis)
1. Ir a: https://upstash.com → Create Database
2. Copiar:
   - `UPSTASH_REDIS_URL` (ejemplo: https://xxx.upstash.io)
   - `UPSTASH_REDIS_TOKEN` (token largo)

3. Agregar en Vercel:
   - `UPSTASH_REDIS_URL` = https://xxx.upstash.io
   - `UPSTASH_REDIS_TOKEN` = tu_token

### B. Webhook Secret (MercadoPago)
1. Ir a: https://www.mercadopago.cl/developers/panel/credentials
2. Copiar: `Webhook Secret` (en la sección de credenciales)

3. Agregar en Vercel:
   - `MERCADOPAGO_WEBHOOK_SECRET` = tu_webhook_secret

### C. Opcional: Redis Directo (para otras funciones)
Si ya tienes Redis:
   - `REDIS_URL` = https://xxx.upstash.io
   - `REDIS_TOKEN` = tu_token

---

## PASO 2: Ejecutar Migración SQL en Supabase

Ir a: https://supabase.com/dashboard/project/mcwqqcngfibhgluvixlu/sql

1. Click en "New Query"
2. Copiar TODO el contenido de: `supabase/migration_rls_and_indexes.sql`
3. Pegar en el SQL Editor
4. Click en "RUN" (ejecutar)
5. Verificar que salga "Success" (éxito)

---

## PASO 3: Desplegar

### Opción A: Vercel CLI (Recomendada)
```bash
cd /Users/eduardoviguera/Desktop/COBRO/cobro-detector
vercel --prod
```

### Opción B: Via Git
```bash
git push origin main
# Vercel desplegará automáticamente
```

---

## PASO 4: Verificar Despliegue

1. Ir a: https://cobro-detector.vercel.app
2. Probar login
3. Subir archivo Excel de prueba
4. Verificar que se descuentan créditos
5. Verificar que sale el mensaje: "Análisis en cola"

---

## ✅ CHECKLIST ANTES DEL DESPLIEGUE

- [ ] Variables de entorno agregadas en Vercel
- [ ] Migración SQL ejecutada en Supabase
- [ ] `UPSTASH_REDIS_URL` configurada
- [ ] `UPSTASH_REDIS_TOKEN` configurada
- [ ] `MERCADOPAGO_WEBHOOK_SECRET` configurada
- [ ] Build local exitoso (`npm run build`)

---

## 🔍 COMANDOS ÚTILES

### Ver variables actuales:
```bash
vercel env ls
```

### Agregar variable (CLI):
```bash
vercel env add UPSTASH_REDIS_URL
# Luego te pedirá el valor y entornos (Production, Preview, Development)
```

### Ver logs de despliegue:
```bash
vercel logs
```

---

## ⚠️ NOTAS IMPORTANTES

1. **Rate Limiting**: Si no configuras Upstash, el rate limiting NO funcionará (pero la app sí)
2. **Webhook**: Si no configuras el secret, en producción fallará la verificación
3. **Redis**: Solo es necesario si quieres usar las funciones avanzadas de caché

---

## 📞 CONTACTO

Si hay problemas:
- Revisar logs: `vercel logs`
- Verificar variables: `vercel env ls`
- Documentación: https://vercel.com/docs
