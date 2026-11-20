-- =============================================
-- Hardening y escalabilidad (2026-11-19)
--
-- Cambios seguros e idempotentes: índices por patrones de consulta,
-- endurecimiento de search_path en funciones, y corrección de
-- cleanup_old_api_logs (search_path vacío + nombre no calificado).
-- No aplica particionado/retención automática (requiere política operativa
-- y, para pg_cron, extensión habilitada en el entorno).
-- =============================================

BEGIN;

-- Índices para consultas por usuario/tiempo en tablas append-only/de alto volumen.
CREATE INDEX IF NOT EXISTS api_logs_user_created_idx
  ON public.api_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS anomalies_user_created_idx
  ON public.anomalies (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS orders_user_created_idx
  ON public.orders (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS success_charges_user_created_idx
  ON public.success_charges (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_anomaly_feedback_user
  ON public.anomaly_feedback (user_id, created_at DESC);

-- Corrección: search_path vacío impedía resolver `api_logs` sin calificar.
CREATE OR REPLACE FUNCTION public.cleanup_old_api_logs()
RETURNS void
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.api_logs WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Endurecimiento: fijar search_path y calificar objetos.
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
  code TEXT;
  done BOOL := false;
BEGIN
  WHILE NOT done LOOP
    code := lower(substr(md5(random()::text), 1, 8));
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = code) THEN
      done := true;
    END IF;
  END LOOP;
  RETURN code;
END;
$$;

COMMIT;
