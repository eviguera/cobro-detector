-- =============================================
-- MIGRACIÓN: Agregar columna file_url a analyses
-- Ejecutar después de schema.sql
-- =============================================

ALTER TABLE analyses ADD COLUMN IF NOT EXISTS file_url TEXT;
