-- =============================================
-- Backend de storage por análisis (2026-11-13)
--
-- El archivo cifrado puede vivir en Supabase Storage o en S3 (driver opt-in).
-- `storage_path` es `${userId}/${ts}-${archivo}.enc` en AMBOS backends, así que
-- la ruta por sí sola NO permite saber dónde está el objeto. El worker
-- necesita esa información para decidir si borra (Supabase) o delega en la
-- regla de lifecycle del bucket (S3), y para no escribir `file_deleted_at`
-- cuando el borrado no ocurrió.
--
-- Aditiva y compatible hacia atrás: default 'supabase', el driver de
-- producción. No cambia RLS; solo otorga la columna al cliente para que
-- `createAnalysisRecord` pueda declararla, igual que el resto de metadatos de
-- subida que ya inserta `authenticated` (grants por columna del paywall).
-- =============================================

BEGIN;

ALTER TABLE public.analyses
  ADD COLUMN IF NOT EXISTS storage_driver TEXT NOT NULL DEFAULT 'supabase';

DO $$
BEGIN
  ALTER TABLE public.analyses
    ADD CONSTRAINT analyses_storage_driver_check CHECK (storage_driver IN ('supabase', 's3'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- El paywall revocó INSERT/SELECT a nivel tabla y los re-otorgó por columna.
-- Los grants por columna son acumulativos: agregar esta columna no toca los
-- existentes.
GRANT INSERT (storage_driver) ON public.analyses TO authenticated;
GRANT SELECT (storage_driver) ON public.analyses TO authenticated;

COMMIT;
