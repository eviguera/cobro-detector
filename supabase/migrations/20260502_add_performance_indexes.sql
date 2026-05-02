-- Performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_user_created ON analyses(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomalies_user_id ON anomalies(user_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_analysis_id ON anomalies(analysis_id);
CREATE INDEX IF NOT EXISTS idx_credits_user_id ON credits(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_company_members_user_id ON company_members(user_id);
CREATE INDEX IF NOT EXISTS idx_company_members_company_id ON company_members(company_id);