-- ===========================================
-- MIGRACIÓN CORREGIDA: Habilitar RLS y Crear Índices
-- Fecha: 2026-05-03
-- Nota: Solo aplica a tablas que EXISTEN en el esquema
-- ===========================================

-- ===========================================
-- 1. HABILITAR ROW LEVEL SECURITY (solo tablas existentes)
-- ===========================================

-- Tablas principales (confirmadas en schema.sql)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomalies ENABLE ROW LEVEL SECURITY;

-- Tablas opcionales (si existen, descomenta):
-- ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE api_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE success_charges ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- 2. CREAR POLÍTICAS PARA ACCESO POR USUARIO
-- ===========================================

-- Policies para profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Policies para credits
CREATE POLICY "Users can view own credits" ON credits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credits" ON credits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credits" ON credits
  FOR UPDATE USING (auth.uid() = user_id);

-- Policies para orders
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders" ON orders
  FOR UPDATE USING (auth.uid() = user_id);

-- Policies para analyses
CREATE POLICY "Users can view own analyses" ON analyses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analyses" ON analyses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analyses" ON analyses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own analyses" ON analyses
  FOR DELETE USING (auth.uid() = user_id);

-- Policies para anomalies
CREATE POLICY "Users can view own anomalies" ON anomalies
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own anomalies" ON anomalies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own anomalies" ON anomalies
  FOR UPDATE USING (auth.uid() = user_id);

-- ===========================================
-- 3. CREAR ÍNDICES PARA ESCALABILIDAD
-- ===========================================

-- Índices para analyses
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_status ON analyses(status);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);

-- Índices para credits
CREATE INDEX IF NOT EXISTS idx_credits_user_id ON credits(user_id);

-- Índices para anomalies
CREATE INDEX IF NOT EXISTS idx_anomalies_analysis_id ON anomalies(analysis_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_user_id ON anomalies(user_id);

-- Índices para orders
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- ===========================================
-- 4. FUNCIÓN PARA CONSUMO ATÓMICO DE CRÉDITOS
-- ===========================================

CREATE OR REPLACE FUNCTION consume_credit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_total INT;
  v_used INT;
BEGIN
  -- Lock the row for update to prevent race conditions
  SELECT total, used INTO v_total, v_used 
  FROM credits 
  WHERE user_id = p_user_id 
  FOR UPDATE;
  
  -- Check if user has credits
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if enough credits
  IF v_total - v_used <= 0 THEN
    RETURN FALSE;
  END IF;
  
  -- Consume one credit
  UPDATE credits 
  SET used = used + 1 
  WHERE user_id = p_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION consume_credit(UUID) TO authenticated;

-- ===========================================
-- 5. COMENTARIOS
-- ===========================================
COMMENT ON FUNCTION consume_credit(UUID) IS 'Consume un crédito atómicamente para evitar race conditions';

-- ===========================================
-- INSTRUCCIONES:
-- ===========================================
-- 1. Ejecutar este SQL en: https://supabase.com/dashboard/project/mcwqqcngfibhgluvixlu/sql
-- 2. Verificar que salga "Success" (no errores)
-- 3. Las tablas companies, api_keys, etc. se pueden agregar después si las necesitas
-- 4. Por ahora, la app funciona con profiles, credits, orders, analyses, anomalies

-- ===========================================
-- PARA CREAR TABLAS FALTANTES (opcional):
-- ===========================================

/*
-- Descomenta si necesitas la tabla companies:
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
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Descomenta si necesitas api_keys:
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  permissions TEXT[] DEFAULT '{read}',
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Descomenta si necesitas payment_methods:
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  mp_card_token TEXT,
  last_four_digits TEXT,
  card_brand TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Descomenta si necesitas success_charges:
CREATE TABLE IF NOT EXISTS success_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  anomaly_id UUID REFERENCES anomalies(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES analyses(id) ON DELETE CASCADE,
  recovered_amount BIGINT DEFAULT 0,
  fee_percentage INTEGER DEFAULT 10,
  charge_amount BIGINT DEFAULT 0,
  status TEXT DEFAULT 'pending',
  mp_payment_id TEXT,
  mp_status TEXT,
  mp_detail TEXT,
  charged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
*/
