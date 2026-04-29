-- =============================================
-- MIGRACIÓN: Soporte Mercado Pago
-- Ejecutar DESPUÉS del schema.sql inicial
-- =============================================

-- Columnas adicionales en orders para MP
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS mp_preference_id TEXT,
  ADD COLUMN IF NOT EXISTS mp_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS mp_status TEXT,
  ADD COLUMN IF NOT EXISTS mp_detail TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Índices para búsqueda rápida por IDs de MP
CREATE INDEX IF NOT EXISTS orders_mp_preference_id_idx ON orders(mp_preference_id);
CREATE INDEX IF NOT EXISTS orders_mp_payment_id_idx ON orders(mp_payment_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);

-- Vista útil: orders con créditos del usuario
CREATE OR REPLACE VIEW orders_with_credits AS
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
