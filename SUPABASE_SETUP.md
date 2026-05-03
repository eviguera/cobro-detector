# Configuración de Supabase para CobroDetector

## Problema: "No permite crear usuario nuevo"

El problema reportado indica que el registro de nuevos usuarios falla. Esto se debe típicamente a:

1. **Confirmación de email requerida**: Supabase viene con `enable_confirmations = true` por defecto
2. **Signups deshabilitados**: Posiblemente `enable_signup = false`

## Solución Rápida

Ejecutar en **Supabase Dashboard > SQL Editor**:

```sql
-- Opción 1: Deshabilitar confirmación de email (recomendado para desarrollo)
UPDATE auth.config 
SET enable_signup = true, 
    enable_confirmations = false;

-- Verificar cambios
SELECT enable_signup, enable_confirmations 
FROM auth.config;
```

## Verificación

Después de ejecutar el SQL anterior:

1. Ve a https://project-qtyiz.vercel.app/login
2. Haz clic en "¿No tienes cuenta? Regístrate gratis"
3. Usa un email nuevo (ej: `test-nuevo-$(date +%s)@gmail.com`)
4. La contraseña debe tener al menos 6 caracteres
5. Deberías poder registrarte y acceder inmediatamente

## Configuración de Producción

Para producción, es recomendable:
- Mantener `enable_confirmations = true` por seguridad
- Configurar SMTP en Supabase para envío real de emails
- O usar un proveedor de autenticación social (Google, GitHub, etc.)

## Variables de Entorno en Vercel

Las siguientes variables ya están configuradas en Vercel:
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`

## Notas Adicionales

- El trigger `handle_new_user()` crea automáticamente el perfil y 1 crédito gratis
- El callback `/auth/callback` maneja la redirección después de confirmar email
- Si usas confirmación de email, asegúrate de que `emailRedirectTo` apunte a tu dominio correcto
