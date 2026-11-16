-- =============================================
-- Fase 0 — Integridad (2026-11-13)
--
-- 1. Tabla `events`: existe en el proyecto cloud de Supabase pero no en
--    ninguna migración del repo, así que una instalación nueva rompe el
--    tracking de notification-svc en silencio (solo console.warn). Se crea
--    idempotente con el mismo DDL del entorno cloud: FK a profiles, RLS y
--    política de lectura solo por el dueño.
--
-- 2. RPC `mark_analysis_failed`: la migración de paywall revoca UPDATE sobre
--    `analyses` a `authenticated`, pero el frontend marcaba el error con un
--    UPDATE directo (`supabase-storage.ts`) que falla en silencio porque
--    PostgREST resuelve con {error} en vez de lanzar. Esta RPC valida
--    propiedad con auth.uid(), no permite pisar un análisis completado y
--    devuelve TRUE/FALSE según si actualizó.
-- =============================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS events_select_own ON public.events;
CREATE POLICY events_select_own ON public.events
  FOR SELECT
  TO public
  USING (auth.uid() = user_id);

-- Consulta típica: embudo por usuario ordenado por fecha.
CREATE INDEX IF NOT EXISTS events_user_created_idx
  ON public.events (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.mark_analysis_failed(p_analysis_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  updated BOOLEAN;
BEGIN
  UPDATE public.analyses
     SET status = 'error'
   WHERE id = p_analysis_id
     AND user_id = auth.uid()
     AND status <> 'completed';
  GET DIAGNOSTICS updated = ROW_COUNT;
  RETURN updated;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_analysis_failed(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_analysis_failed(UUID) TO authenticated;

COMMIT;
