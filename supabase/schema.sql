-- =============================================
-- COBRO DETECTOR - Schema Supabase
-- Ejecutar en el SQL Editor de Supabase
-- =============================================

-- Perfiles de usuario (extiende auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  business_name TEXT,
  business_type TEXT, -- 'small', 'medium', 'accountant'
  rut TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Créditos de análisis (modelo pago único)
CREATE TABLE IF NOT EXISTS credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  total INTEGER NOT NULL DEFAULT 0,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pagos / órdenes
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  plan TEXT NOT NULL, -- 'starter', 'professional', 'enterprise'
  credits_purchased INTEGER NOT NULL,
  amount_clp INTEGER NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'failed'
  payment_provider TEXT DEFAULT 'manual',
  payment_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Análisis de estados de cuenta
CREATE TABLE IF NOT EXISTS analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'pdf', 'xlsx', 'csv'
  bank TEXT,
  period_start DATE,
  period_end DATE,
  total_transactions INTEGER DEFAULT 0,
  anomalies_count INTEGER DEFAULT 0,
  recoverable_amount BIGINT DEFAULT 0, -- en pesos CLP
  status TEXT DEFAULT 'processing', -- 'processing', 'completed', 'failed'
  raw_data JSONB, -- transacciones parseadas
  anomalies JSONB, -- anomalías detectadas
  ai_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Anomalías individuales detectadas
CREATE TABLE IF NOT EXISTS anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID REFERENCES analyses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL, -- 'duplicate_commission', 'installment_error', 'unknown_charge'
  severity TEXT NOT NULL, -- 'high', 'medium', 'low'
  title TEXT NOT NULL,
  description TEXT,
  detail TEXT,
  recoverable_amount BIGINT NOT NULL DEFAULT 0,
  transaction_refs JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending', -- 'pending', 'claimed', 'recovered', 'dismissed'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomalies ENABLE ROW LEVEL SECURITY;

-- Profiles: el usuario solo ve/edita su propio perfil
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Credits
CREATE POLICY "credits_select_own" ON credits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "credits_insert_own" ON credits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "credits_update_own" ON credits FOR UPDATE USING (auth.uid() = user_id);

-- Orders
CREATE POLICY "orders_select_own" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "orders_insert_own" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Analyses
CREATE POLICY "analyses_select_own" ON analyses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "analyses_insert_own" ON analyses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "analyses_update_own" ON analyses FOR UPDATE USING (auth.uid() = user_id);

-- Anomalies
CREATE POLICY "anomalies_select_own" ON anomalies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "anomalies_insert_own" ON anomalies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "anomalies_update_own" ON anomalies FOR UPDATE USING (auth.uid() = user_id);

-- Trigger: crear perfil y créditos al registrarse
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');

  INSERT INTO credits (user_id, total, used)
  VALUES (NEW.id, 1, 0); -- 1 análisis gratis al registrarse

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Trigger: updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER credits_updated_at BEFORE UPDATE ON credits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
