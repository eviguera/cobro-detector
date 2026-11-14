-- =============================================
-- Idempotencia del webhook de MercadoPago (2026-11-13)
--
-- Problema: MercadoPago reenvía el mismo webhook (retries, re-entregas). Un
-- duplicado de un pago aprobado re-ejecutaba getPaymentStatus (llamada API
-- innecesaria) y re-corria la lógica de créditos, protegida solo por el CAS
-- de `confirm_order_paid` pero sin registro auditable. El flujo `unlock_`
-- además llamaba markCompleted sin verificar estado previo: un replay podía
-- pisar un análisis que ya cambió de estado.
--
-- Solución: tabla `payment_events` (un evento por mp_payment_id, UNIQUE) +
-- RPCs `record_payment_event` / `is_payment_event_processed`. payment-svc
-- consulta is_payment_event_processed ANTES de llamar a MercadoPago y
-- registra el evento SOLO tras aplicar el efecto (orden acreditada o reporte
-- liberado). Si la acreditación falla, no hay evento y MercadoPago reintenta.
--
-- ⚠️ ORDEN DE DESPLIEGUE: aplicar esta migración ANTES de desplegar el
-- payment-svc nuevo. Sin las RPCs, /v1/webhook responde 5xx y los pagos no
-- se procesan hasta que MercadoPago agote sus reintentos.
--
-- RLS ENABLED sin políticas: ni anon ni authenticated ven/escriben filas;
-- solo service_role (bypassrls) la usa.
-- =============================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mp_payment_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  order_id UUID NULL,
  analysis_id UUID NULL,
  payload JSONB NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT payment_events_mp_payment_id_key UNIQUE (mp_payment_id)
);

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

-- Defensa en profundidad: RLS sin políticas ya bloquea anon/authenticated,
-- pero revocamos también los grants por defecto de Supabase.
REVOKE ALL ON public.payment_events FROM anon, authenticated;

-- Auditoría: qué pagos liberaron el reporte de cada análisis.
CREATE INDEX IF NOT EXISTS payment_events_analysis_id_idx
  ON public.payment_events (analysis_id);

-- Registra el evento de pago de forma atómica. Devuelve TRUE si insertó
-- (primera vez que este pago aplica su efecto) o FALSE si ya existía
-- (webhook duplicado / carrera entre dos entregas del mismo pago).
CREATE OR REPLACE FUNCTION public.record_payment_event(
  p_mp_payment_id TEXT,
  p_event_type TEXT,
  p_order_id UUID DEFAULT NULL,
  p_analysis_id UUID DEFAULT NULL,
  p_payload JSONB DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  inserted BOOLEAN;
BEGIN
  INSERT INTO public.payment_events (mp_payment_id, event_type, order_id, analysis_id, payload)
  VALUES (p_mp_payment_id, p_event_type, p_order_id, p_analysis_id, p_payload)
  ON CONFLICT (mp_payment_id) DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted;
END;
$$;

-- ¿Ya se procesó este pago? Consulta de dedup barata antes de gastar la
-- llamada a la API de MercadoPago.
CREATE OR REPLACE FUNCTION public.is_payment_event_processed(p_mp_payment_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.payment_events WHERE mp_payment_id = p_mp_payment_id
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_payment_event(TEXT, TEXT, UUID, UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_payment_event(TEXT, TEXT, UUID, UUID, JSONB) TO service_role;

REVOKE EXECUTE ON FUNCTION public.is_payment_event_processed(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_payment_event_processed(TEXT) TO service_role;

COMMIT;
