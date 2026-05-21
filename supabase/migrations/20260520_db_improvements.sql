-- =============================================
-- MIGRACIÓN: Mejoras de Base de Datos
-- Creada: 2026-05-20
-- Contiene: company_members, success_plans, UNIQUE constraint,
--            CHECK constraints, índices, vistas con security_invoker
-- =============================================

-- =============================================
-- 1. Tabla company_members (soporte multi-empresa)
-- =============================================
CREATE TABLE IF NOT EXISTS company_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_members_select_own" ON company_members
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "company_members_insert_own" ON company_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "company_members_update_own" ON company_members
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "company_members_delete_own" ON company_members
  FOR DELETE USING (auth.uid() = user_id);

-- Índices
CREATE INDEX IF NOT EXISTS idx_company_members_user_id ON company_members(user_id);
CREATE INDEX IF NOT EXISTS idx_company_members_company_id ON company_members(company_id);
CREATE INDEX IF NOT EXISTS idx_company_members_user_company ON company_members(user_id, company_id);

-- =============================================
-- 2. Tabla success_plans (registro de planes activos)
-- =============================================
CREATE TABLE IF NOT EXISTS success_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  plan_type TEXT NOT NULL, -- 'platino', 'contador_20'
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE success_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "success_plans_select_own" ON success_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "success_plans_insert_own" ON success_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "success_plans_update_own" ON success_plans
  FOR UPDATE USING (auth.uid() = user_id);

-- Índices
CREATE INDEX IF NOT EXISTS idx_success_plans_user_id ON success_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_success_plans_active ON success_plans(is_active) WHERE is_active = true;

-- =============================================
-- 3. Restricción UNIQUE en credits(user_id, company_id)
--    Corrige el upsert de credit.service.ts que asume esta restricción
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'credits_user_company_unique'
  ) THEN
    ALTER TABLE credits ADD CONSTRAINT credits_user_company_unique UNIQUE (user_id, company_id);
  END IF;
END $$;

-- =============================================
-- 4. CHECK constraints para integridad de datos
-- =============================================

-- credits: used no puede superar total
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'credits_used_check'
  ) THEN
    ALTER TABLE credits ADD CONSTRAINT credits_used_check CHECK (used <= total);
  END IF;
END $$;

-- success_charges: fee_percentage entre 0 y 100
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'success_charges_fee_check'
  ) THEN
    ALTER TABLE success_charges ADD CONSTRAINT success_charges_fee_check
      CHECK (fee_percentage >= 0 AND fee_percentage <= 100);
  END IF;
END $$;

-- =============================================
-- 5. Índices compuestos faltantes
-- =============================================

-- Índice compuesto para consultas de créditos por user+company
CREATE INDEX IF NOT EXISTS idx_credits_user_company ON credits(user_id, company_id);

-- Índice para filtrar anomalías por tipo y estado
CREATE INDEX IF NOT EXISTS idx_anomalies_type_status ON anomalies(type, status);

-- Índice para búsquedas en company_members
CREATE INDEX IF NOT EXISTS idx_analyses_company_id ON analyses(company_id);

-- =============================================
-- 6. Vistas con security_invoker = true
--    (Postgres 15+: las vistas heredan los permisos del usuario que consulta)
-- =============================================

-- Reemplazar orders_with_credits con security_invoker
DROP VIEW IF EXISTS orders_with_credits;
CREATE VIEW orders_with_credits WITH (security_invoker = true) AS
  SELECT
    o.*,
    p.email,
    p.full_name,
    p.business_name,
    c.total   AS credits_total,
    c.used    AS credits_used,
    (c.total - c.used) AS credits_available
  FROM orders o
  JOIN profiles p ON p.id = o.user_id
  JOIN credits  c ON c.user_id = o.user_id;

-- Reemplazar analyses_with_company con security_invoker
DROP VIEW IF EXISTS analyses_with_company;
CREATE VIEW analyses_with_company WITH (security_invoker = true) AS
  SELECT
    a.*,
    c.company_name,
    c.business_name AS company_business_name,
    c.rut AS company_rut
  FROM analyses a
  LEFT JOIN companies c ON c.id = a.company_id;
