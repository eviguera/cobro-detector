-- =============================================
-- MIGRACIÓN: consume_credit atómico con FOR UPDATE
-- Reemplaza el fallback no-atómico de credit.service.ts
-- =============================================

CREATE OR REPLACE FUNCTION consume_credit(p_user_id UUID, p_company_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  credit_row credits%ROWTYPE;
  left_credits INTEGER;
BEGIN
  -- Lock explícito para evitar race condition entre requests concurrentes
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

  UPDATE credits
  SET used = used + 1, updated_at = NOW()
  WHERE id = credit_row.id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
