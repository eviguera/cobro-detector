-- ===========================================
-- MIGRACIÓN: Habilitar RLS y Crear Índices
-- Fecha: 2026-05-03
-- Descripción: Habilitar Row Level Security y crear índices para escalabilidad
-- ===========================================

-- ===========================================
-- 1. HABILITAR ROW LEVEL SECURITY
-- ===========================================

-- Habilitar RLS en tablas principales
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE success_charges ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- 2. CREAR POLÍTICAS PARA ACCESO POR USUARIO
-- ===========================================

-- Policies para analyses
CREATE POLICY "Users can view own analyses" ON analyses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analyses" ON analyses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analyses" ON analyses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own analyses" ON analyses
  FOR DELETE USING (auth.uid() = user_id);

-- Policies para credits
CREATE POLICY "Users can view own credits" ON credits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credits" ON credits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credits" ON credits
  FOR UPDATE USING (auth.uid() = user_id);

-- Policies para anomalies
CREATE POLICY "Users can view own anomalies" ON anomalies
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own anomalies" ON anomalies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own anomalies" ON anomalies
  FOR UPDATE USING (auth.uid() = user_id);

-- Policies para companies (multi-empresa)
CREATE POLICY "Accountants can view own companies" ON companies
  FOR SELECT USING (auth.uid() = accountant_id);

CREATE POLICY "Accountants can insert companies" ON companies
  FOR INSERT WITH CHECK (auth.uid() = accountant_id);

CREATE POLICY "Accountants can update own companies" ON companies
  FOR UPDATE USING (auth.uid() = accountant_id);

CREATE POLICY "Accountants can delete own companies" ON companies
  FOR DELETE USING (auth.uid() = accountant_id);

-- Policies para api_keys
CREATE POLICY "Users can manage own api keys" ON api_keys
  FOR ALL USING (auth.uid() = user_id);

-- Policies para payment_methods
CREATE POLICY "Users can view own payment methods" ON payment_methods
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own payment methods" ON payment_methods
  FOR ALL USING (auth.uid() = user_id);

-- ===========================================
-- 3. CREAR ÍNDICES PARA ESCALABILIDAD
-- ===========================================

-- Índices para analyses
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_company_id ON analyses(company_id);
CREATE INDEX IF NOT EXISTS idx_analyses_status ON analyses(status);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);

-- Índices para credits
CREATE INDEX IF NOT EXISTS idx_credits_user_id ON credits(user_id);

-- Índices para anomalies
CREATE INDEX IF NOT EXISTS idx_anomalies_analysis_id ON anomalies(analysis_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_user_id ON anomalies(user_id);

-- Índices para companies
CREATE INDEX IF NOT EXISTS idx_companies_accountant_id ON companies(accountant_id);

-- Índices para api_keys
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);

-- Índices para api_logs
CREATE INDEX IF NOT EXISTS idx_api_logs_api_key_id ON api_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_logs(created_at DESC);

-- Índices para payment_methods
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);

-- Índices para success_charges
CREATE INDEX IF NOT EXISTS idx_success_charges_user_id ON success_charges(user_id);
CREATE INDEX IF NOT EXISTS idx_success_charges_created_at ON success_charges(created_at DESC);

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
-- 5. FUNCIÓN PARA INCREMENTAR USO DE API KEY
-- ===========================================

CREATE OR REPLACE FUNCTION increment_api_key_usage(p_key_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE api_keys 
  SET 
    requests_count = requests_count + 1,
    last_used_at = NOW()
  WHERE id = p_key_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION increment_api_key_usage(UUID) TO authenticated;

-- ===========================================
-- COMENTARIOS
-- ===========================================
COMMENT ON FUNCTION consume_credit(UUID) IS 'Consume un crédito atómicamente para evitar race conditions';
COMMENT ON FUNCTION increment_api_key_usage(UUID) IS 'Incrementa el contador de uso de API key';

-- ===========================================
-- FINALIZADO
-- ===========================================
-- Ejecutar este script en el SQL Editor de Supabase
-- URL: https://supabase.com/dashboard/project/mcwqqcngfibhgluvixlu/sql
