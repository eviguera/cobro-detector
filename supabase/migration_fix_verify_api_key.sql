-- =============================================
-- MIGRACIÓN: Corregir verify_api_key (SHA-256 en vez de bcrypt)
-- La app hashea con SHA-256 (crypto.createHash('sha256'))
-- pero el RPC usaba crypt() (bcrypt), así que nunca coincidía.
-- =============================================

CREATE OR REPLACE FUNCTION verify_api_key(key_text TEXT)
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
  -- Generar hash SHA-256 (mismo algoritmo que la app: crypto.createHash('sha256'))
  hash := encode(digest(key_text, 'sha256'), 'hex');

  -- Buscar key
  SELECT * INTO key_record FROM api_keys
  WHERE key_hash = hash AND is_active = true
  AND (expires_at IS NULL OR expires_at > NOW());

  IF key_record.id IS NOT NULL THEN
    -- Actualizar last_used_at
    UPDATE api_keys SET last_used_at = NOW() WHERE id = key_record.id;

    RETURN QUERY SELECT
      true::BOOLEAN,
      key_record.id,
      key_record.user_id,
      key_record.permissions,
      1000 -- rate limit por hora (configurable)
    ;
  ELSE
    RETURN QUERY SELECT
      false::BOOLEAN,
      NULL::UUID,
      NULL::UUID,
      NULL::TEXT[],
      0
    ;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
