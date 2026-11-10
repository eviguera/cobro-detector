-- =============================================
-- Security hardening — 2026-11-09 (parte 1: segura de aplicar en caliente)
--
-- Idempotente y agnóstico al entorno: las columnas/objetos que no existan se
-- omiten en vez de romper. Funciona tanto en un entorno con
-- `public.handle_referral_signup` como con `internal.handle_referral_signup`.
--
-- Aplicar con:
--   DATABASE_URL="postgresql://..." ./scripts/apply-prod-migration.sh
--   (o `npx supabase db push` con el proyecto linkeado)
-- =============================================

-- 1. profiles: el usuario solo puede editar columnas de perfil.
-- Sin esto, cualquier usuario autenticado podía hacer
--   UPDATE profiles SET is_admin = true
-- y admin-svc (que lee is_admin con service role) lo tomaba como verdad.
REVOKE UPDATE ON public.profiles FROM authenticated, anon;
DO $$
DECLARE
  cols TEXT;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ')
    INTO cols
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'profiles'
     AND column_name IN ('full_name', 'business_name', 'business_type', 'rut', 'phone');

  IF cols IS NOT NULL THEN
    EXECUTE 'GRANT UPDATE (' || cols || ') ON public.profiles TO authenticated';
  END IF;
END $$;

-- 2. credits: los créditos solo se mueven por funciones SECURITY DEFINER.
REVOKE INSERT, UPDATE, DELETE ON public.credits FROM authenticated, anon;

-- 3. Referidos: un código debe poder usarse muchas veces (una fila por
-- invitado). El UNIQUE(referral_code) hacía fallar el segundo signup con 23505.
ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS referrals_referral_code_key;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname = 'public' AND tablename = 'referrals'
       AND indexname = 'referrals_referred_user_id_key'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.referrals'::regclass
       AND contype = 'u'
       AND pg_get_constraintdef(oid) = 'UNIQUE (referred_user_id)'
  ) THEN
    CREATE UNIQUE INDEX referrals_referred_user_id_key ON public.referrals(referred_user_id);
  END IF;
END $$;

-- 4. Trigger de referidos: `WHERE referrer_id = referrer_id` era una
-- tautología (o ambigüedad columna/variable) que marcaba filas de otros
-- referrers. Se corrige la versión que exista en cada entorno.
DO $$
BEGIN
  IF to_regprocedure('internal.handle_referral_signup()') IS NOT NULL THEN
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION internal.handle_referral_signup()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = ''
      AS $body$
      DECLARE
        ref_code TEXT;
        v_referrer_id UUID;
      BEGIN
        ref_code := NEW.raw_user_meta_data ->> 'referral_code';
        IF ref_code IS NOT NULL AND ref_code != '' THEN
          SELECT id INTO v_referrer_id FROM public.profiles WHERE referral_code = ref_code;
          IF v_referrer_id IS NOT NULL AND v_referrer_id != NEW.id THEN
            INSERT INTO public.referrals (referrer_id, referred_email, referred_user_id, referral_code, status, completed_at)
            VALUES (v_referrer_id, NEW.email, NEW.id, ref_code, 'completed', NOW());
            UPDATE public.profiles SET referral_code = internal.generate_referral_code()
             WHERE id = NEW.id AND referral_code IS NULL;
            UPDATE public.credits SET total = total + 1 WHERE user_id = v_referrer_id;
            UPDATE public.referrals SET credits_awarded = true
             WHERE referrals.referrer_id = v_referrer_id AND referrals.referred_user_id = NEW.id;
          END IF;
        END IF;
        RETURN NEW;
      END;
      $body$;
    $fn$;
  ELSIF to_regprocedure('public.handle_referral_signup()') IS NOT NULL THEN
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION public.handle_referral_signup()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = 'public'
      AS $body$
      DECLARE
        ref_code TEXT;
        v_referrer_id UUID;
      BEGIN
        ref_code := NEW.raw_user_meta_data ->> 'referral_code';
        IF ref_code IS NOT NULL AND ref_code != '' THEN
          SELECT id INTO v_referrer_id FROM profiles WHERE referral_code = ref_code;
          IF v_referrer_id IS NOT NULL AND v_referrer_id != NEW.id THEN
            INSERT INTO referrals (referrer_id, referred_email, referred_user_id, referral_code, status, completed_at)
            VALUES (v_referrer_id, NEW.email, NEW.id, ref_code, 'completed', NOW());
            UPDATE profiles SET referral_code = generate_referral_code()
             WHERE id = NEW.id AND referral_code IS NULL;
            UPDATE credits SET total = total + 1 WHERE user_id = v_referrer_id;
            UPDATE referrals SET credits_awarded = true
             WHERE referrals.referrer_id = v_referrer_id AND referrals.referred_user_id = NEW.id;
          END IF;
        END IF;
        RETURN NEW;
      END;
      $body$;
    $fn$;
  END IF;
END $$;

-- 5. Acreditación atómica de créditos (payment-svc la llama al confirmar pagos).
-- Sustituye el read-modify-write que perdía acreditaciones concurrentes.
CREATE OR REPLACE FUNCTION public.add_credits(p_user_id UUID, p_amount INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF p_amount IS NULL OR p_amount = 0 THEN
    RETURN;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  UPDATE credits
     SET total = total + p_amount, updated_at = NOW()
   WHERE id = (
     SELECT id FROM credits
      WHERE user_id = p_user_id AND company_id IS NULL
      ORDER BY created_at, id
      LIMIT 1
   );

  IF NOT FOUND THEN
    INSERT INTO credits (user_id, company_id, total, used) VALUES (p_user_id, NULL, p_amount, 0);
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.add_credits(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_credits(UUID, INTEGER) TO service_role;

-- 6. Confirmación de pago atómica: CAS de la orden + acreditación en la MISMA
-- transacción. Antes la orden quedaba 'paid' y si la acreditación fallaba el
-- reintento de MercadoPago ya no acreditaba (cliente pagado sin créditos).
CREATE OR REPLACE FUNCTION public.confirm_order_paid(
  p_order_id UUID,
  p_mp_payment_id TEXT,
  p_mp_status TEXT DEFAULT NULL,
  p_mp_detail TEXT DEFAULT NULL,
  p_expected_status TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user UUID;
  v_credits INTEGER;
BEGIN
  UPDATE orders
     SET status = 'paid',
         mp_payment_id = p_mp_payment_id,
         mp_status = p_mp_status,
         mp_detail = p_mp_detail
   WHERE id = p_order_id
     AND (p_expected_status IS NULL OR status = p_expected_status)
  RETURNING user_id, credits_purchased INTO v_user, v_credits;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  PERFORM public.add_credits(v_user, v_credits);
  RETURN TRUE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.confirm_order_paid(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_order_paid(UUID, TEXT, TEXT, TEXT, TEXT) TO service_role;

-- 11. internal.* no debe ser ejecutable por el usuario final: los wrappers
-- públicos pasan a SECURITY DEFINER. Antes authenticated podía llamar
-- internal.consume_credit(p_user_id arbitrario) y consumir créditos ajenos.
DO $$
BEGIN
  IF to_regprocedure('public.consume_credit(uuid)') IS NOT NULL THEN
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION public.consume_credit(p_company_id UUID DEFAULT NULL)
      RETURNS BOOLEAN
      SET search_path = ''
      AS $body$
      BEGIN
        RETURN internal.consume_credit(auth.uid(), p_company_id);
      END;
      $body$ LANGUAGE plpgsql SECURITY DEFINER;
    $fn$;
  END IF;

  IF to_regprocedure('public.can_access_company(uuid)') IS NOT NULL THEN
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION public.can_access_company(company_uuid UUID)
      RETURNS BOOLEAN
      SET search_path = ''
      AS $body$
      BEGIN
        RETURN internal.can_access_company(company_uuid);
      END;
      $body$ LANGUAGE plpgsql SECURITY DEFINER;
    $fn$;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regprocedure('internal.consume_credit(uuid,uuid)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION internal.consume_credit(UUID, UUID) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION internal.consume_credit(UUID, UUID) TO service_role;
  END IF;
  IF to_regprocedure('internal.verify_api_key(text)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION internal.verify_api_key(TEXT) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION internal.verify_api_key(TEXT) TO service_role;
  END IF;
  IF to_regprocedure('internal.can_access_company(uuid)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION internal.can_access_company(UUID) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION internal.can_access_company(UUID) TO service_role;
  END IF;
END $$;
