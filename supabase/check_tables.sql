-- Script para verificar qué tablas existen en tu BD
-- Ejecutar en Supabase SQL Editor

-- Ver tablas existentes
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Verificar RLS habilitado
SELECT tablename, rowsecurity 
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE schemaname = 'public';

-- Si no tienes las tablas, ejecuta primero el schema.sql:
-- Ir a: supabase/schema.sql y copiar todo el contenido
-- Pegar en SQL Editor y ejecutar
