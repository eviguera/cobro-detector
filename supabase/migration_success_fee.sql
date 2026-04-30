-- =============================================
-- MIGRACIÓN: Plan de Éxito (10% de lo recuperado)
-- Ejecutar después de schema.sql y migration_payments.sql
-- =============================================

-- Tabla para métodos de pago tokenizados (tarjetas vinculadas)
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  mp_card_token TEXT NOT NULL, -- Token de la tarjeta en MP
  mp_customer_id TEXT, -- ID del cliente en MP (si se crea)
  last_four_digits TEXT, -- Últimos 4 dígitos para mostrar
  card_brand TEXT, -- 'visa', 'mastercard', etc.
  expires_month INTEGER,
  expires_year INTEGER,
  is_default BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla para registrar cargos por éxito
CREATE TABLE IF NOT EXISTS success_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  anomaly_id UUID REFERENCES anomalies(id) ON DELETE SET NULL,
  analysis_id UUID REFERENCES analyses(id) ON DELETE SET NULL,
  recovered_amount BIGINT NOT NULL, -- Monto recuperado
  fee_percentage INTEGER NOT NULL DEFAULT 10,
  charge_amount BIGINT NOT NULL, -- recovered_amount * fee_percentage / 100
  status TEXT DEFAULT 'pending', -- 'pending', 'charged', 'failed', 'refunded'
  mp_payment_id TEXT, -- ID del pago en MP
  mp_status TEXT,
  mp_detail TEXT,
  charged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agregar columna a orders para identificar plan de éxito activo
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS success_plan_active BOOLEAN DEFAULT false;

-- Índices
CREATE INDEX IF NOT EXISTS payment_methods_user_id_idx ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS success_charges_user_id_idx ON success_charges(user_id);
CREATE INDEX IF NOT EXISTS success_charges_status_idx ON success_charges(status);
CREATE INDEX IF NOT EXISTS success_charges_anomaly_id_idx ON success_charges(anomaly_id);

-- RLS para payment_methods
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_methods_select_own" ON payment_methods FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "payment_methods_insert_own" ON payment_methods FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "payment_methods_update_own" ON payment_methods FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "payment_methods_delete_own" ON payment_methods FOR DELETE USING (auth.uid() = user_id);

-- RLS para success_charges
ALTER TABLE success_charges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "success_charges_select_own" ON success_charges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "success_charges_insert_own" ON success_charges FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "success_charges_update_own" ON success_charges FOR UPDATE USING (auth.uid() = user_id);

-- Trigger updated_at para payment_methods
CREATE OR REPLACE FUNCTION update_payment_methods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_methods_updated_at BEFORE UPDATE ON payment_methods
  FOR EACH ROW EXECUTE FUNCTION update_payment_methods_updated_at();
