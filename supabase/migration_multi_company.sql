-- =============================================
-- MIGRACIÓN: Soporte Multi-Empresa para Contadores
-- Ejecutar después de schema.sql y otras migraciones
-- =============================================

-- Tabla de empresas/clientes gestionados por contadores
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accountant_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  company_name TEXT NOT NULL,
  business_name TEXT, -- Razón social
  rut TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  industry TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agregar columna company_id a analyses
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

-- Agregar columna company_id a credits (créditos asignados a una empresa específica)
ALTER TABLE credits ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

-- Agregar columna company_id a orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

-- Índices
CREATE INDEX IF NOT EXISTS companies_accountant_id_idx ON companies(accountant_id);
CREATE INDEX IF NOT EXISTS analyses_company_id_idx ON analyses(company_id);
CREATE INDEX IF NOT EXISTS credits_company_id_idx ON credits(company_id);
CREATE INDEX IF NOT EXISTS orders_company_id_idx ON orders(company_id);

-- RLS para companies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- El contador puede ver/modificar sus propias empresas
CREATE POLICY "companies_select_own" ON companies FOR SELECT USING (auth.uid() = accountant_id);
CREATE POLICY "companies_insert_own" ON companies FOR INSERT WITH CHECK (auth.uid() = accountant_id);
CREATE POLICY "companies_update_own" ON companies FOR UPDATE USING (auth.uid() = accountant_id);
CREATE POLICY "companies_delete_own" ON companies FOR DELETE USING (auth.uid() = accountant_id);

-- Trigger updated_at para companies
CREATE OR REPLACE FUNCTION update_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_companies_updated_at();

-- Vista útil: análisis con información de empresa
CREATE OR REPLACE VIEW analyses_with_company AS
  SELECT
    a.*,
    c.company_name,
    c.business_name AS company_business_name,
    c.rut AS company_rut
  FROM analyses a
  LEFT JOIN companies c ON c.id = a.company_id;

-- Función para verificar si un usuario puede acceder a una empresa
CREATE OR REPLACE FUNCTION can_access_company(company_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  company_accountant UUID;
BEGIN
  SELECT accountant_id INTO company_accountant FROM companies WHERE id = company_uuid;
  RETURN company_accountant = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
