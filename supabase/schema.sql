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
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_payment_methods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_api_keys_updated_at()
RETURNS TRIGGER AS $$
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- analyses (includes file_url directly)
CREATE TABLE IF NOT EXISTS analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_url TEXT,
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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


-- =============================================
-- SECTION 6: RLS POLICIES
-- =============================================

-- profiles
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- companies (via accountant_id)
CREATE POLICY "companies_select_own" ON companies FOR SELECT USING (auth.uid() = accountant_id);
CREATE POLICY "companies_insert_own" ON companies FOR INSERT WITH CHECK (auth.uid() = accountant_id);
CREATE POLICY "companies_update_own" ON companies FOR UPDATE USING (auth.uid() = accountant_id);
CREATE POLICY "companies_delete_own" ON companies FOR DELETE USING (auth.uid() = accountant_id);

-- credits
CREATE POLICY "credits_select_own" ON credits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "credits_insert_own" ON credits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "credits_update_own" ON credits FOR UPDATE USING (auth.uid() = user_id);

-- orders
CREATE POLICY "orders_select_own" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "orders_insert_own" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "orders_update_own" ON orders FOR UPDATE USING (auth.uid() = user_id);

-- analyses
CREATE POLICY "analyses_select_own" ON analyses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "analyses_insert_own" ON analyses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "analyses_update_own" ON analyses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "analyses_delete_own" ON analyses FOR DELETE USING (auth.uid() = user_id);

-- anomalies
CREATE POLICY "anomalies_select_own" ON anomalies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "anomalies_insert_own" ON anomalies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "anomalies_update_own" ON anomalies FOR UPDATE USING (auth.uid() = user_id);

-- api_keys
CREATE POLICY "api_keys_select_own" ON api_keys FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "api_keys_insert_own" ON api_keys FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "api_keys_update_own" ON api_keys FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "api_keys_delete_own" ON api_keys FOR DELETE USING (auth.uid() = user_id);

-- payment_methods
CREATE POLICY "payment_methods_select_own" ON payment_methods FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "payment_methods_insert_own" ON payment_methods FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "payment_methods_update_own" ON payment_methods FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "payment_methods_delete_own" ON payment_methods FOR DELETE USING (auth.uid() = user_id);

-- success_charges
CREATE POLICY "success_charges_select_own" ON success_charges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "success_charges_insert_own" ON success_charges FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "success_charges_update_own" ON success_charges FOR UPDATE USING (auth.uid() = user_id);

-- company_members
CREATE POLICY "company_members_select_own" ON company_members FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "company_members_insert_own" ON company_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "company_members_update_own" ON company_members FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "company_members_delete_own" ON company_members FOR DELETE USING (auth.uid() = user_id);

-- success_plans
CREATE POLICY "success_plans_select_own" ON success_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "success_plans_insert_own" ON success_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "success_plans_update_own" ON success_plans FOR UPDATE USING (auth.uid() = user_id);


-- =============================================
-- SECTION 7: TRIGGERS
-- =============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
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
) AS $$
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
) AS $$
BEGIN
  RETURN QUERY SELECT * FROM internal.verify_api_key(key_text);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- consume_credit (core: SECURITY DEFINER en schema privado)
CREATE OR REPLACE FUNCTION internal.consume_credit(p_user_id UUID, p_company_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
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
RETURNS BOOLEAN AS $$
BEGIN
  RETURN internal.consume_credit(auth.uid(), p_company_id);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- can_access_company (core: SECURITY DEFINER en schema privado)
CREATE OR REPLACE FUNCTION internal.can_access_company(company_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  company_accountant UUID;
BEGIN
  SELECT accountant_id INTO company_accountant FROM companies WHERE id = company_uuid;
  RETURN company_accountant = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- can_access_company (wrapper público: SECURITY INVOKER)
CREATE OR REPLACE FUNCTION public.can_access_company(company_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN internal.can_access_company(company_uuid);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

CREATE OR REPLACE FUNCTION cleanup_old_api_logs()
RETURNS void AS $$
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

-- Funciones internas (accesibles desde wrappers públicos)
GRANT EXECUTE ON FUNCTION internal.consume_credit(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION internal.verify_api_key(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION internal.can_access_company(UUID) TO authenticated;


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
