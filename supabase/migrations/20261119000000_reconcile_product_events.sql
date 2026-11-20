-- =============================================
-- Reconciliación de telemetría: events / product_events (2026-11-19)
--
-- Problema: coexistían dos tablas/definiciones según el camino de instalación:
--   - `public.events` (20261113000000_fase0_integridad.sql): escrita por
--     notification-svc (service_role), RLS solo SELECT propio.
--   - `public.product_events` (frontend/supabase/schema.sql): escrita por el
--     frontend autenticado, RLS INSERT/SELECT propio.
-- El embudo quedaba partido y las instalaciones nuevas podían carecer de una u otra.
--
-- Canon: `public.events` es la tabla única. `public.product_events` queda como
-- vista de compatibilidad (lectura/escritura simple) para código existente.
--
-- Idempotente y segura de re-ejecutar.
-- =============================================

BEGIN;

-- 1) Asegurar tabla canónica `events` con forma compatible con ambos usos.
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  event_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Columnas/ajustes por si la tabla existía con otra forma.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS event_type TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.events ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;
ALTER TABLE public.events ALTER COLUMN created_at SET DEFAULT now();
UPDATE public.events SET metadata = '{}'::jsonb WHERE metadata IS NULL;

-- FK de usuario: preferir profiles(id) si existe; si no, auth.users(id).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_user_id_fkey') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'profiles'
    ) THEN
      ALTER TABLE public.events
        ADD CONSTRAINT events_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    ELSE
      ALTER TABLE public.events
        ADD CONSTRAINT events_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- 2) Si existe `product_events` como TABLA, migrar filas a `events` y retirarla.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'product_events'
      AND table_type = 'BASE TABLE'
  ) THEN
    INSERT INTO public.events (id, user_id, event_type, metadata, created_at)
    SELECT id, user_id, event_type, COALESCE(metadata, '{}'::jsonb), COALESCE(created_at, now())
    FROM public.product_events
    ON CONFLICT (id) DO NOTHING;

    DROP TABLE public.product_events CASCADE;
  END IF;
END $$;

-- 3) Índices para patrones de embudo/consulta.
CREATE INDEX IF NOT EXISTS events_user_created_idx
  ON public.events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS events_type_created_idx
  ON public.events (event_type, created_at DESC);

-- 4) RLS: lectura e inserción propia para authenticated; service_role bypass RLS.
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS events_select_own ON public.events;
CREATE POLICY events_select_own ON public.events
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS events_insert_own ON public.events;
CREATE POLICY events_insert_own ON public.events
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Los eventos son append-only para usuarios; no se exponen UPDATE/DELETE.
REVOKE UPDATE, DELETE ON public.events FROM anon, authenticated;

-- 5) Vista de compatibilidad con nombre histórico.
CREATE OR REPLACE VIEW public.product_events AS
  SELECT id, user_id, event_type, metadata, created_at
  FROM public.events;

GRANT SELECT, INSERT ON public.product_events TO authenticated;
GRANT SELECT, INSERT ON public.events TO authenticated;
REVOKE ALL ON public.product_events FROM anon;
REVOKE ALL ON public.events FROM anon;

COMMIT;
