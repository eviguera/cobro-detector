-- =============================================
-- COBRO DETECTOR — CONSOLIDATED SCHEMA
-- =============================================
-- Single authoritative schema. Supersedes all previous migration files.
-- Apply this file in Supabase SQL Editor for fresh installs.
-- Run with: supabase db push (local) or via SQL Editor (production).
-- =============================================

-- =============================================
-- SECTION 1: FUNCTIONS (no table dependencies)
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_payment_methods_updated_at()
RETURNS TRIGGER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_companies_updated_at()
RETURNS TRIGGER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_api_keys_updated_at()
RETURNS TRIGGER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =============================================
-- SECTION 2: TABLES (FK dependency order)
-- =============================================

-- profiles — extends auth.users
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  business_name TEXT,
  business_type TEXT,
  rut TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- companies
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accountant_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  company_name TEXT NOT NULL,
  business_name TEXT,
  rut TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  industry TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- credits
CREATE TABLE IF NOT EXISTS credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  total INTEGER NOT NULL DEFAULT 0,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- api_keys
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  permissions TEXT[] DEFAULT ARRAY['read']::TEXT[],
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- payment_methods
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  mp_card_token TEXT NOT NULL,
  mp_customer_id TEXT,
  last_four_digits TEXT,
  card_brand TEXT,
  expires_month INTEGER,
  expires_year INTEGER,
  is_default BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- orders (includes all MercadoPago + success_plan columns)
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  plan TEXT NOT NULL,
  credits_purchased INTEGER NOT NULL DEFAULT 0,
  amount_clp INTEGER NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'pending',
  payment_provider TEXT DEFAULT 'manual',
  payment_reference TEXT,
  recovered_amount BIGINT DEFAULT 0,
  fee_percentage INTEGER DEFAULT 0,
  mp_preference_id TEXT,
  mp_payment_id TEXT,
  mp_status TEXT,
  mp_detail TEXT,
  metadata JSONB DEFAULT '{}',
  success_plan_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- analyses (includes file_url directly)
CREATE TABLE IF NOT EXISTS analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_url TEXT,
  -- Campos de cifrado y retención (seguridad de datos bancarios)
  storage_path TEXT,                 -- Ruta del archivo cifrado (misma forma en ambos backends)
  storage_driver TEXT NOT NULL DEFAULT 'supabase', -- Backend del archivo: 'supabase' | 's3'
  encryption_key_iv TEXT,            -- IV del cifrado AES-256-GCM (base64)
  encryption_key_base64 TEXT,        -- Clave de cifrado (base64) para que analysis-svc descifre
  file_deleted_at TIMESTAMPTZ,       -- Timestamp de eliminación REAL del archivo de Storage
  bank TEXT,
  period_start DATE,
  period_end DATE,
  total_transactions INTEGER DEFAULT 0,
  anomalies_count INTEGER DEFAULT 0,
  recoverable_amount BIGINT DEFAULT 0,
  status TEXT DEFAULT 'processing',
  raw_data JSONB,
  anomalies JSONB,
  ai_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Columnas de cifrado/retención agregadas después de la creación inicial de la
-- tabla. `CREATE TABLE IF NOT EXISTS` no las agrega en instalaciones que ya
-- existían, así que se fuerzan de forma idempotente. Sin esto, el flujo de
-- subida cifrada falla con PGRST204 ("Could not find the 'storage_path' column").
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS storage_driver TEXT NOT NULL DEFAULT 'supabase';
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS encryption_key_iv TEXT;
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS encryption_key_base64 TEXT;
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS file_deleted_at TIMESTAMPTZ;
ALTER TABLE analyses DROP CONSTRAINT IF EXISTS analyses_storage_driver_check;
ALTER TABLE analyses ADD CONSTRAINT analyses_storage_driver_check
  CHECK (storage_driver IN ('supabase', 's3'));

-- anomalies
CREATE TABLE IF NOT EXISTS anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID REFERENCES analyses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  detail TEXT,
  recoverable_amount BIGINT NOT NULL DEFAULT 0,
  transaction_refs JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- success_charges
CREATE TABLE IF NOT EXISTS success_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  anomaly_id UUID REFERENCES anomalies(id) ON DELETE SET NULL,
  analysis_id UUID REFERENCES analyses(id) ON DELETE SET NULL,
  recovered_amount BIGINT NOT NULL,
  fee_percentage INTEGER NOT NULL DEFAULT 10,
  charge_amount BIGINT NOT NULL,
  status TEXT DEFAULT 'pending',
  mp_payment_id TEXT,
  mp_status TEXT,
  mp_detail TEXT,
  charged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- api_logs
CREATE TABLE IF NOT EXISTS api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  request_body JSONB,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- company_members
CREATE TABLE IF NOT EXISTS company_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- success_plans
CREATE TABLE IF NOT EXISTS success_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  plan_type TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- =============================================
-- SECTION 3: CONSTRAINTS (UNIQUE + CHECK)
-- =============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'credits_user_company_unique') THEN
    ALTER TABLE credits ADD CONSTRAINT credits_user_company_unique UNIQUE (user_id, company_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'credits_used_check') THEN
    ALTER TABLE credits ADD CONSTRAINT credits_used_check CHECK (used <= total);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'success_charges_fee_check') THEN
    ALTER TABLE success_charges ADD CONSTRAINT success_charges_fee_check
      CHECK (fee_percentage >= 0 AND fee_percentage <= 100);
  END IF;
END $$;


-- =============================================
-- SECTION 4: INDEXES (deduplicated)
-- =============================================

-- analyses
CREATE INDEX IF NOT EXISTS idx_analyses_user_id       ON analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_user_created   ON analyses(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_status         ON analyses(status);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at     ON analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_company_id     ON analyses(company_id);

-- anomalies
CREATE INDEX IF NOT EXISTS idx_anomalies_user_id       ON anomalies(user_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_analysis_id   ON anomalies(analysis_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_type_status   ON anomalies(type, status);

-- credits
CREATE INDEX IF NOT EXISTS idx_credits_user_id         ON credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credits_company_id      ON credits(company_id);
CREATE INDEX IF NOT EXISTS idx_credits_user_company    ON credits(user_id, company_id);

-- orders
CREATE INDEX IF NOT EXISTS idx_orders_user_id          ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_status      ON orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_status           ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at       ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_company_id       ON orders(company_id);
CREATE INDEX IF NOT EXISTS orders_mp_preference_id_idx ON orders(mp_preference_id);
CREATE INDEX IF NOT EXISTS orders_mp_payment_id_idx    ON orders(mp_payment_id);

-- api_keys
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id        ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS api_keys_key_hash_idx       ON api_keys(key_hash);

-- api_logs
CREATE INDEX IF NOT EXISTS api_logs_api_key_id_idx     ON api_logs(api_key_id);
CREATE INDEX IF NOT EXISTS api_logs_created_at_idx     ON api_logs(created_at);

-- payment_methods
CREATE INDEX IF NOT EXISTS payment_methods_user_id_idx ON payment_methods(user_id);

-- success_charges
CREATE INDEX IF NOT EXISTS success_charges_user_id_idx    ON success_charges(user_id);
CREATE INDEX IF NOT EXISTS success_charges_status_idx     ON success_charges(status);
CREATE INDEX IF NOT EXISTS success_charges_anomaly_id_idx ON success_charges(anomaly_id);

-- companies
CREATE INDEX IF NOT EXISTS companies_accountant_id_idx ON companies(accountant_id);

-- company_members
CREATE INDEX IF NOT EXISTS idx_company_members_user_id      ON company_members(user_id);
CREATE INDEX IF NOT EXISTS idx_company_members_company_id   ON company_members(company_id);
CREATE INDEX IF NOT EXISTS idx_company_members_user_company ON company_members(user_id, company_id);

-- success_plans
CREATE INDEX IF NOT EXISTS idx_success_plans_user_id ON success_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_success_plans_active   ON success_plans(is_active) WHERE is_active = true;


-- =============================================
-- SECTION 5: ROW LEVEL SECURITY
-- =============================================

ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies        ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits          ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomalies        ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys         ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods  ENABLE ROW LEVEL SECURITY;
ALTER TABLE success_charges  ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE success_plans    ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_logs        ENABLE ROW LEVEL SECURITY;


-- =============================================
-- SECTION 6: RLS POLICIES (optimizadas con (SELECT auth.uid()))
-- =============================================

-- profiles
DROP POLICY IF EXISTS profiles_select_own ON profiles;
DROP POLICY IF EXISTS profiles_insert_own ON profiles;
DROP POLICY IF EXISTS profiles_update_own ON profiles;
CREATE POLICY profiles_select_own ON profiles FOR SELECT USING ((SELECT auth.uid()) = id);
CREATE POLICY profiles_insert_own ON profiles FOR INSERT WITH CHECK ((SELECT auth.uid()) = id);
CREATE POLICY profiles_update_own ON profiles FOR UPDATE USING ((SELECT auth.uid()) = id);

-- companies (via accountant_id)
DROP POLICY IF EXISTS companies_select_own ON companies;
DROP POLICY IF EXISTS companies_insert_own ON companies;
DROP POLICY IF EXISTS companies_update_own ON companies;
DROP POLICY IF EXISTS companies_delete_own ON companies;
CREATE POLICY companies_select_own ON companies FOR SELECT USING ((SELECT auth.uid()) = accountant_id);
CREATE POLICY companies_insert_own ON companies FOR INSERT WITH CHECK ((SELECT auth.uid()) = accountant_id);
CREATE POLICY companies_update_own ON companies FOR UPDATE USING ((SELECT auth.uid()) = accountant_id);
CREATE POLICY companies_delete_own ON companies FOR DELETE USING ((SELECT auth.uid()) = accountant_id);

-- credits
-- HARDENED (2026-11): el usuario NO escribe credits. La acreditación se hace
-- con handle_new_user y consume_credit/via service role (webhook de pagos).
DROP POLICY IF EXISTS credits_select_own ON credits;
DROP POLICY IF EXISTS credits_insert_own ON credits;
DROP POLICY IF EXISTS credits_update_own ON credits;
CREATE POLICY credits_select_own ON credits FOR SELECT USING ((SELECT auth.uid()) = user_id);

-- orders
-- HARDENED (2026-11): órdenes las crea payment-svc (service role); webhook actualiza status.
DROP POLICY IF EXISTS orders_select_own ON orders;
DROP POLICY IF EXISTS orders_insert_own ON orders;
DROP POLICY IF EXISTS orders_update_own ON orders;
CREATE POLICY orders_select_own ON orders FOR SELECT USING ((SELECT auth.uid()) = user_id);

-- analyses
DROP POLICY IF EXISTS analyses_select_own ON analyses;
DROP POLICY IF EXISTS analyses_insert_own ON analyses;
DROP POLICY IF EXISTS analyses_update_own ON analyses;
DROP POLICY IF EXISTS analyses_delete_own ON analyses;
CREATE POLICY analyses_select_own ON analyses FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY analyses_insert_own ON analyses FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
-- HARDENED (2026-11): UPDATE limitado a la columna `status` (retry/error recovery de UI).
-- El service role persiste el resto (anomalías, resumen, métricas).
CREATE POLICY analyses_update_own ON analyses FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY analyses_delete_own ON analyses FOR DELETE USING ((SELECT auth.uid()) = user_id);
-- Solo la columna status es actualizable por el usuario (permission denied en el resto).
REVOKE UPDATE ON analyses FROM authenticated;
GRANT UPDATE (status) ON analyses TO authenticated;

-- anomalies
DROP POLICY IF EXISTS anomalies_select_own ON anomalies;
DROP POLICY IF EXISTS anomalies_insert_own ON anomalies;
DROP POLICY IF EXISTS anomalies_update_own ON anomalies;
CREATE POLICY anomalies_select_own ON anomalies FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY anomalies_insert_own ON anomalies FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

-- api_keys
DROP POLICY IF EXISTS api_keys_select_own ON api_keys;
DROP POLICY IF EXISTS api_keys_insert_own ON api_keys;
DROP POLICY IF EXISTS api_keys_update_own ON api_keys;
DROP POLICY IF EXISTS api_keys_delete_own ON api_keys;
CREATE POLICY api_keys_select_own ON api_keys FOR SELECT USING ((SELECT auth.uid()) = user_id);
-- HARDENED (2026-11): creación/edición/borraje solo vía api-svc (service role).

-- payment_methods
DROP POLICY IF EXISTS payment_methods_select_own ON payment_methods;
DROP POLICY IF EXISTS payment_methods_insert_own ON payment_methods;
DROP POLICY IF EXISTS payment_methods_update_own ON payment_methods;
DROP POLICY IF EXISTS payment_methods_delete_own ON payment_methods;
CREATE POLICY payment_methods_select_own ON payment_methods FOR SELECT USING ((SELECT auth.uid()) = user_id);
-- HARDENED (2026-11): tokenización de tarjetas exclusivamente vía payment-svc.

-- success_charges
DROP POLICY IF EXISTS success_charges_select_own ON success_charges;
DROP POLICY IF EXISTS success_charges_insert_own ON success_charges;
DROP POLICY IF EXISTS success_charges_update_own ON success_charges;
CREATE POLICY success_charges_select_own ON success_charges FOR SELECT USING ((SELECT auth.uid()) = user_id);
-- HARDENED (2026-11): escritura de cobros solo vía backend.

-- company_members
DROP POLICY IF EXISTS company_members_select_own ON company_members;
DROP POLICY IF EXISTS company_members_insert_own ON company_members;
DROP POLICY IF EXISTS company_members_update_own ON company_members;
DROP POLICY IF EXISTS company_members_delete_own ON company_members;
CREATE POLICY company_members_select_own ON company_members FOR SELECT USING ((SELECT auth.uid()) = user_id);
-- HARDENED (2026-11): invitaciones/roles se gestionan por backend (evita self-invitación/escalada de rol).

-- success_plans
DROP POLICY IF EXISTS success_plans_select_own ON success_plans;
DROP POLICY IF EXISTS success_plans_insert_own ON success_plans;
DROP POLICY IF EXISTS success_plans_update_own ON success_plans;
CREATE POLICY success_plans_select_own ON success_plans FOR SELECT USING ((SELECT auth.uid()) = user_id);
-- HARDENED (2026-11): planes los define el backend.

-- api_logs
DROP POLICY IF EXISTS api_logs_insert_own ON api_logs;
DROP POLICY IF EXISTS api_logs_select_own ON api_logs;
CREATE POLICY api_logs_insert_own ON api_logs FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY api_logs_select_own ON api_logs FOR SELECT USING ((SELECT auth.uid()) = user_id);


-- =============================================
-- SECTION 7: TRIGGERS
-- =============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');

  INSERT INTO credits (user_id, total, used)
  VALUES (NEW.id, 1, 0);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- updated_at triggers
DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS credits_updated_at ON credits;
CREATE TRIGGER credits_updated_at BEFORE UPDATE ON credits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS companies_updated_at ON companies;
CREATE TRIGGER companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_companies_updated_at();

DROP TRIGGER IF EXISTS payment_methods_updated_at ON payment_methods;
CREATE TRIGGER payment_methods_updated_at BEFORE UPDATE ON payment_methods
  FOR EACH ROW EXECUTE FUNCTION update_payment_methods_updated_at();

DROP TRIGGER IF EXISTS api_keys_updated_at ON api_keys;
CREATE TRIGGER api_keys_updated_at BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION update_api_keys_updated_at();

DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS analyses_updated_at ON analyses;
CREATE TRIGGER analyses_updated_at BEFORE UPDATE ON analyses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- =============================================
-- SECTION 8: INTERNAL SCHEMA & SECURITY DEFINER FUNCTIONS
-- =============================================

-- Schema privado: no expuesto a la REST API (solo public lo está)
CREATE SCHEMA IF NOT EXISTS internal;

-- verify_api_key (core: SECURITY DEFINER en schema privado)
CREATE OR REPLACE FUNCTION internal.verify_api_key(key_text TEXT)
RETURNS TABLE (
  valid BOOLEAN,
  key_id UUID,
  user_id UUID,
  permissions TEXT[],
  rate_limit INTEGER
)
SET search_path = 'public'
AS $$
DECLARE
  hash TEXT;
  key_record api_keys%ROWTYPE;
BEGIN
  hash := encode(digest(key_text, 'sha256'), 'hex');

  SELECT * INTO key_record FROM api_keys
  WHERE key_hash = hash AND is_active = true
  AND (expires_at IS NULL OR expires_at > NOW());

  IF key_record.id IS NOT NULL THEN
    UPDATE api_keys SET last_used_at = NOW() WHERE id = key_record.id;
    RETURN QUERY SELECT
      true::BOOLEAN, key_record.id, key_record.user_id,
      key_record.permissions, 1000;
  ELSE
    RETURN QUERY SELECT
      false::BOOLEAN, NULL::UUID, NULL::UUID, NULL::TEXT[], 0;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- verify_api_key (wrapper público: SECURITY DEFINER, necesario para auth sin sesión)
CREATE OR REPLACE FUNCTION public.verify_api_key(key_text TEXT)
RETURNS TABLE (
  valid BOOLEAN,
  key_id UUID,
  user_id UUID,
  permissions TEXT[],
  rate_limit INTEGER
)
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY SELECT * FROM internal.verify_api_key(key_text);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- consume_credit (core: SECURITY DEFINER en schema privado)
CREATE OR REPLACE FUNCTION internal.consume_credit(p_user_id UUID, p_company_id UUID DEFAULT NULL)
RETURNS BOOLEAN
SET search_path = 'public'
AS $$
DECLARE
  credit_row credits%ROWTYPE;
  left_credits INTEGER;
BEGIN
  SELECT * INTO credit_row
  FROM credits
  WHERE user_id = p_user_id
    AND (p_company_id IS NULL AND company_id IS NULL
         OR company_id = p_company_id)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  left_credits := credit_row.total - credit_row.used;
  IF left_credits <= 0 THEN
    RETURN FALSE;
  END IF;

  UPDATE credits SET used = used + 1, updated_at = NOW()
  WHERE id = credit_row.id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- consume_credit (wrapper público: SECURITY INVOKER, user_id deriva de auth.uid())
CREATE OR REPLACE FUNCTION public.consume_credit(p_company_id UUID DEFAULT NULL)
RETURNS BOOLEAN
SET search_path = ''
AS $$
BEGIN
  RETURN internal.consume_credit(auth.uid(), p_company_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- can_access_company (core: SECURITY DEFINER en schema privado)
CREATE OR REPLACE FUNCTION internal.can_access_company(company_uuid UUID)
RETURNS BOOLEAN
SET search_path = 'public'
AS $$
DECLARE
  company_accountant UUID;
BEGIN
  SELECT accountant_id INTO company_accountant FROM companies WHERE id = company_uuid;
  RETURN company_accountant = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- can_access_company (wrapper público: SECURITY INVOKER)
CREATE OR REPLACE FUNCTION public.can_access_company(company_uuid UUID)
RETURNS BOOLEAN
SET search_path = ''
AS $$
BEGIN
  RETURN internal.can_access_company(company_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION cleanup_old_api_logs()
RETURNS void
SET search_path = ''
AS $$
BEGIN
  DELETE FROM api_logs WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;


-- =============================================
-- SECTION 9: GRANTS
-- =============================================

-- Schema internal: revocar acceso público, solo authenticated
REVOKE ALL ON SCHEMA internal FROM PUBLIC;
GRANT USAGE ON SCHEMA internal TO authenticated;

-- Wrappers públicos
GRANT EXECUTE ON FUNCTION public.verify_api_key(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_credit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_company(UUID) TO authenticated;

-- Funciones internas: NUNCA ejecutables por el usuario final (los wrappers
-- públicos son SECURITY DEFINER y corren como el owner).
REVOKE EXECUTE ON FUNCTION internal.consume_credit(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION internal.verify_api_key(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION internal.can_access_company(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION internal.consume_credit(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION internal.verify_api_key(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION internal.can_access_company(UUID) TO service_role;

-- handle_new_user es solo para el trigger, no debe ser ejecutable por usuarios
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

-- Acreditación atómica de créditos (usada por payment-svc al confirmar pagos).
-- Antes el adapter hacía read-modify-write: dos acreditaciones concurrentes
-- leían el mismo total y una pisaba a la otra (el usuario pagaba sin recibir
-- créditos). Esta función incrementa en una sola sentencia y serializa por
-- usuario con un advisory lock.
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
    INSERT INTO credits (user_id, company_id, total, used)
    VALUES (p_user_id, NULL, p_amount, 0);
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.add_credits(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_credits(UUID, INTEGER) TO service_role;


-- =============================================
-- SECTION 10: VIEWS (with security_invoker)
-- =============================================

DROP VIEW IF EXISTS orders_with_credits;
CREATE VIEW orders_with_credits WITH (security_invoker = true) AS
  SELECT
    o.*,
    p.email,
    p.full_name,
    p.business_name,
    c.total AS credits_total,
    c.used  AS credits_used,
    (c.total - c.used) AS credits_available
  FROM orders o
  JOIN profiles p ON p.id = o.user_id
  JOIN credits  c ON c.user_id = o.user_id;

DROP VIEW IF EXISTS analyses_with_company;
CREATE VIEW analyses_with_company WITH (security_invoker = true) AS
  SELECT
    a.*,
    c.company_name,
    c.business_name AS company_business_name,
    c.rut AS company_rut
  FROM analyses a
  LEFT JOIN companies c ON c.id = a.company_id;

-- outgoing_webhooks

CREATE TABLE IF NOT EXISTS outgoing_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{analysis.completed}',
  secret TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE outgoing_webhooks ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_outgoing_webhooks_user_id ON outgoing_webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_outgoing_webhooks_active ON outgoing_webhooks(is_active) WHERE is_active = true;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'outgoing_webhooks' AND policyname = 'outgoing_webhooks_select_own') THEN
    CREATE POLICY outgoing_webhooks_select_own ON outgoing_webhooks FOR SELECT USING ((SELECT auth.uid()) = user_id);
  END IF;
  -- HARDENED (2026-11): registro/config de webhooks salientes solo vía backend (la firma HMAC del webhook es secreto compartido).
END $$;

CREATE OR REPLACE FUNCTION dispatch_outgoing_webhooks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public'
AS $$
DECLARE
  wh RECORD;
  payload JSONB;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    payload = jsonb_build_object(
      'event', 'analysis.completed',
      'analysis_id', NEW.id,
      'anomalies_count', NEW.anomalies_count,
      'recoverable_amount', NEW.recoverable_amount,
      'bank', NEW.bank,
      'file_name', NEW.file_name,
      'timestamp', NOW()
    );
    FOR wh IN
      SELECT * FROM outgoing_webhooks
      WHERE user_id = NEW.user_id AND is_active = true AND 'analysis.completed' = ANY(events)
    LOOP
      PERFORM pg_notify('outgoing_webhook', jsonb_build_object(
        'webhook_id', wh.id, 'url', wh.url, 'secret', wh.secret, 'payload', payload
      )::text);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'analyses_webhook_trigger') THEN
    CREATE TRIGGER analyses_webhook_trigger
      AFTER UPDATE ON analyses
      FOR EACH ROW
      EXECUTE FUNCTION dispatch_outgoing_webhooks();
  END IF;
END $$;

-- referrals

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_email TEXT,
  referred_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  credits_awarded BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
-- Un código puede usarse varias veces; cada invitado es una fila distinta.
CREATE UNIQUE INDEX IF NOT EXISTS referrals_referred_user_id_key ON referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'referrals' AND policyname = 'referrals_select_own') THEN
    CREATE POLICY referrals_select_own ON referrals FOR SELECT USING ((SELECT auth.uid()) = referrer_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'referrals' AND policyname = 'referrals_insert_own') THEN
    CREATE POLICY referrals_insert_own ON referrals FOR INSERT WITH CHECK ((SELECT auth.uid()) = referrer_id);
  END IF;
END $$;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code) WHERE referral_code IS NOT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin = true;

-- HARDENED (2026-11): `profiles_update_own` no restringía columnas, así que
-- cualquier usuario autenticado podía hacer UPDATE profiles SET is_admin=true
-- sobre su propia fila. admin-svc lee esa columna con service role, por lo que
-- la escritura del usuario se convertía en escalada a administrador. También
-- permitía sobrescribir referral_code ajeno. Se limita el UPDATE a las
-- columnas de perfil que la UI realmente edita.
REVOKE UPDATE ON public.profiles FROM authenticated, anon;
GRANT UPDATE (full_name, business_name, business_type, rut, phone) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  code TEXT;
  done BOOL := false;
BEGIN
  WHILE NOT done LOOP
    code := lower(substr(md5(random()::text), 1, 8));
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE referral_code = code) THEN
      done := true;
    END IF;
  END LOOP;
  RETURN code;
END;
$$;

CREATE OR REPLACE FUNCTION handle_referral_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
      -- Antes: `WHERE referrer_id = referrer_id` (tautología / ambigüedad
      -- columna-variable): marcaba filas de cualquier referrer.
      UPDATE referrals SET credits_awarded = true
      WHERE referrals.referrer_id = v_referrer_id AND referrals.referred_user_id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_referral') THEN
    CREATE TRIGGER on_auth_user_created_referral
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION handle_referral_signup();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION ensure_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'profiles_ensure_referral_code') THEN
    CREATE TRIGGER profiles_ensure_referral_code
      BEFORE INSERT ON profiles
      FOR EACH ROW
      EXECUTE FUNCTION ensure_referral_code();
  END IF;
END $$;

-- ============================================================
-- SECTION 14: FEEDBACK DE HALLAZGOS
-- Permite que el usuario marque un hallazgo como "no corresponde".
-- Es la señal que alimenta la calibración de precisión del motor.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.anomaly_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  anomaly_key text NOT NULL,
  anomaly_type text,
  severity text,
  reason text NOT NULL DEFAULT 'not_applicable',
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, analysis_id, anomaly_key)
);

CREATE INDEX IF NOT EXISTS idx_anomaly_feedback_analysis
  ON public.anomaly_feedback(analysis_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_feedback_user
  ON public.anomaly_feedback(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomaly_feedback_type
  ON public.anomaly_feedback(anomaly_type, reason);

ALTER TABLE public.anomaly_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own anomaly feedback" ON public.anomaly_feedback;
CREATE POLICY "Users can view own anomaly feedback"
  ON public.anomaly_feedback FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own anomaly feedback" ON public.anomaly_feedback;
CREATE POLICY "Users can insert own anomaly feedback"
  ON public.anomaly_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own anomaly feedback" ON public.anomaly_feedback;
CREATE POLICY "Users can update own anomaly feedback"
  ON public.anomaly_feedback FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own anomaly feedback" ON public.anomaly_feedback;
CREATE POLICY "Users can delete own anomaly feedback"
  ON public.anomaly_feedback FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- SECTION 15: EVENTOS DE PRODUCTO (embudo de activación)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.product_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_events_user_time
  ON public.product_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_events_type_time
  ON public.product_events(event_type, created_at DESC);

ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own product events" ON public.product_events;
CREATE POLICY "Users can insert own product events"
  ON public.product_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own product events" ON public.product_events;
CREATE POLICY "Users can view own product events"
  ON public.product_events FOR SELECT
  USING (auth.uid() = user_id);

-- Los eventos son inmutables para el usuario.
DROP POLICY IF EXISTS "Users can update own product events" ON public.product_events;
DROP POLICY IF EXISTS "Users can delete own product events" ON public.product_events;

-- ============================================================
-- SECTION 16: SEGUIMIENTO DEL RECLAMO
-- Un registro por análisis: borrador → enviado → respondido / escalado CMF.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.claim_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL UNIQUE REFERENCES public.analyses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'responded', 'escalated')),
  sent_at timestamptz,
  response_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_claim_tracking_user
  ON public.claim_tracking(user_id, updated_at DESC);

ALTER TABLE public.claim_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own claim tracking" ON public.claim_tracking;
CREATE POLICY "Users can view own claim tracking"
  ON public.claim_tracking FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own claim tracking" ON public.claim_tracking;
CREATE POLICY "Users can insert own claim tracking"
  ON public.claim_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own claim tracking" ON public.claim_tracking;
CREATE POLICY "Users can update own claim tracking"
  ON public.claim_tracking FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own claim tracking" ON public.claim_tracking;
CREATE POLICY "Users can delete own claim tracking"
  ON public.claim_tracking FOR DELETE
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS claim_tracking_updated_at ON public.claim_tracking;
CREATE TRIGGER claim_tracking_updated_at
  BEFORE UPDATE ON public.claim_tracking
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Recordatorio enviado (idempotencia del job de emails).
ALTER TABLE public.claim_tracking
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_claim_tracking_reminder_due
  ON public.claim_tracking(status, sent_at)
  WHERE reminder_sent_at IS NULL;
