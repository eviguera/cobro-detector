-- =============================================
-- Alineación aditiva del esquema de `analyses` (2026-11-10)
--
-- Solo AGREGA columnas nullable / con default. No cambia grants ni políticas,
-- así que es seguro aplicarla con la versión actual desplegada.
--
-- Necesaria antes de desplegar el código nuevo: `analysis-svc` lee
-- storage_path / encryption_key_iv / encryption_key_base64, el worker escribe
-- `file_deleted_at`, y el cobro usa `plan` + `credit_consumed_at`.
-- =============================================

BEGIN;

ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS encryption_key_iv TEXT;
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS encryption_key_base64 TEXT;
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS file_deleted_at TIMESTAMPTZ;
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'credits';
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS credit_consumed_at TIMESTAMPTZ;

DO $$
BEGIN
  ALTER TABLE public.analyses ADD CONSTRAINT analyses_plan_check CHECK (plan IN ('credits', 'platino'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMIT;
