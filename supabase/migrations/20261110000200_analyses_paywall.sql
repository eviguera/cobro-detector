-- =============================================
-- Security hardening — 2026-11-10 (parte 2: analyses + paywall + cobro)
--
-- ⚠️ REQUIERE DESPLEGAR EL CÓDIGO NUEVO EN LA MISMA VENTANA.
-- Revoca INSERT/UPDATE y recorta SELECT en `analyses`, así que un frontend
-- desplegado que haga `insert({status})` o `select('*')` dejará de funcionar
-- hasta que se despliegue la versión nueva.
--
-- Orden: 1) desplegar microservicios + frontend   2) aplicar este archivo
-- =============================================

BEGIN;

-- 7. analyses: el cliente solo aporta metadatos de subida. `status`, montos,
-- anomalías y llaves los escribe el worker con service role.
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'credits';
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS credit_consumed_at TIMESTAMPTZ;
DO $$
BEGIN
  ALTER TABLE public.analyses ADD CONSTRAINT analyses_plan_check CHECK (plan IN ('credits', 'platino'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

REVOKE INSERT, UPDATE ON public.analyses FROM authenticated, anon;
DO $$
DECLARE
  ins_cols TEXT;
  sel_cols TEXT;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ')
    INTO ins_cols
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'analyses'
     AND column_name IN ('user_id', 'company_id', 'file_name', 'file_type', 'file_url',
                         'storage_path', 'encryption_key_iv', 'encryption_key_base64', 'plan');
  IF ins_cols IS NOT NULL THEN
    EXECUTE 'GRANT INSERT (' || ins_cols || ') ON public.analyses TO authenticated';
  END IF;

  SELECT string_agg(quote_ident(column_name), ', ')
    INTO sel_cols
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'analyses'
     AND column_name IN ('id', 'user_id', 'company_id', 'file_name', 'file_type', 'file_url',
                         'bank', 'period_start', 'period_end', 'total_transactions',
                         'anomalies_count', 'recoverable_amount', 'status', 'plan',
                         'created_at', 'updated_at', 'file_deleted_at');
  IF sel_cols IS NOT NULL THEN
    EXECUTE 'REVOKE SELECT ON public.analyses FROM authenticated, anon';
    EXECUTE 'GRANT SELECT (' || sel_cols || ') ON public.analyses TO authenticated';
  END IF;
END $$;

-- 8. Lectura del reporte con paywall aplicado en la base. Usa jsonb para no
-- depender de que existan las columnas de cifrado en todos los entornos.
CREATE OR REPLACE FUNCTION public.get_analysis_report(p_analysis_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  r public.analyses%ROWTYPE;
  v_json JSONB;
BEGIN
  SELECT * INTO r FROM public.analyses WHERE id = p_analysis_id AND user_id = auth.uid();
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_json := to_jsonb(r) - 'encryption_key_base64' - 'encryption_key_iv';

  IF NOT ((r.status = 'completed') OR (COALESCE(r.recoverable_amount, 0) <= 0)) THEN
    v_json := v_json - 'anomalies' - 'raw_data' - 'ai_summary';
  END IF;

  RETURN v_json;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_analysis_report(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_analysis_report(UUID) TO authenticated;

-- 9. Cobro de crédito idempotente y durable por análisis.
CREATE OR REPLACE FUNCTION public.charge_analysis_credit(p_analysis_id UUID, p_company_id UUID DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user UUID;
BEGIN
  UPDATE analyses
     SET credit_consumed_at = NOW()
   WHERE id = p_analysis_id AND credit_consumed_at IS NULL
  RETURNING user_id INTO v_user;

  IF NOT FOUND THEN
    RETURN 'already';
  END IF;

  IF NOT internal.consume_credit(v_user, p_company_id) THEN
    UPDATE analyses SET credit_consumed_at = NULL WHERE id = p_analysis_id;
    RETURN 'no_credits';
  END IF;

  RETURN 'charged';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.charge_analysis_credit(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.charge_analysis_credit(UUID, UUID) TO service_role;

-- 10. Devolución del crédito cuando el análisis falla o no se pudo encolar.
CREATE OR REPLACE FUNCTION public.refund_analysis_credit(p_analysis_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user UUID;
  v_company UUID;
BEGIN
  SELECT user_id, company_id INTO v_user, v_company
  FROM analyses
  WHERE id = p_analysis_id AND credit_consumed_at IS NOT NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF v_company IS NOT NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE analyses SET credit_consumed_at = NULL WHERE id = p_analysis_id;
  PERFORM public.add_credits(v_user, 1);
  RETURN TRUE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.refund_analysis_credit(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_analysis_credit(UUID) TO service_role;

COMMIT;
