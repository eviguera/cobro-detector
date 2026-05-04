# Cómo arreglar el registro de usuarios

## Problema
Los nuevos usuarios no pueden registrarse porque Supabase requiere confirmación de email por defecto.

## Solución (2 opciones)

### Opción A: Desactivar confirmación (Recomendado para pruebas)
1. Ve a https://supabase.com/dashboard/project/mcwqqcngfibhgluvixlu
2. Navega a **Authentication** → **Settings**
3. Busca la sección **"Email Auth"**
4. **Desactiva** la opción **"Enable email confirmations"**
5. Guarda los cambios

### Opción B: Ejecutar SQL (Alternativa)
1. Ve a **SQL Editor** en Supabase
2. Ejecuta este SQL:
```sql
UPDATE auth.config SET enable_confirmations = false;
```

## Verificación
1. Ve a https://project-qtyiz.vercel.app/login
2. Haz clic en **"¿No tienes cuenta? Regístrate gratis"**
3. Usa un email nuevo: `test-nuevo@gmail.com` / `123456`
4. Deberías poder registrarte **sin confirmar email**

## Nota para producción
Para producción real, es recomendable:
- Mantener confirmación activada
- Configurar SMTP en Supabase para envío real de emails
- O usar proveedores sociales (Google, GitHub)
