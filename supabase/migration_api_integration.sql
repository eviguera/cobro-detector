-- =============================================
-- MIGRACIÓN: API para Integración con Sistemas Contables
-- Ejecutar después de las otras migraciones
-- =============================================

-- Tabla para API Keys de integración
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL, -- Nombre descriptivo de la integración
  key_hash TEXT NOT NULL UNIQUE, -- Hash de la API key (para seguridad)
  key_prefix TEXT NOT NULL, -- Primeros 8 caracteres para identificación (ej: "cd_abc123")
  permissions TEXT[] DEFAULT ARRAY['read']::TEXT[], -- 'read', 'write', 'admin'
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla para logs de requests de la API
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

-- Índices
CREATE INDEX IF NOT EXISTS api_keys_user_id_idx ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS api_keys_key_hash_idx ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS api_logs_api_key_id_idx ON api_logs(api_key_id);
CREATE INDEX IF NOT EXISTS api_logs_created_at_idx ON api_logs(created_at);

-- RLS para api_keys
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_keys_select_own" ON api_keys FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "api_keys_insert_own" ON api_keys FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "api_keys_update_own" ON api_keys FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "api_keys_delete_own" ON api_keys FOR DELETE USING (auth.uid() = user_id);

-- Función para verificar API key
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
  -- Generar hash (usar crypt si está disponible, sino md5 como fallback)
  BEGIN
    hash := crypt(key_text, gen_salt('bf'));
  EXCEPTION WHEN OTHERS THEN
    hash := md5(key_text);
  END;
  
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

-- Trigger updated_at para api_keys
CREATE OR REPLACE FUNCTION update_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER api_keys_updated_at BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION update_api_keys_updated_at();

-- Limpieza automática de logs antiguos (más de 30 días)
CREATE OR REPLACE FUNCTION cleanup_old_api_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM api_logs WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
