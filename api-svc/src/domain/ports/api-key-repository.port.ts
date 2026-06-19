import type { ApiKey } from '../api-key.entity'

export interface VerifyKeyResult {
  valid: boolean
  key_id: string | null
  user_id: string | null
  permissions: string[] | null
  rate_limit: number
}

export interface ApiKeyRepository {
  verifyKey(keyText: string): Promise<VerifyKeyResult>
  findByUserId(userId: string): Promise<ApiKey[]>
  create(data: { user_id: string; name: string; key_hash: string; key_prefix: string; permissions: string[]; expires_at?: string | null }): Promise<ApiKey>
  deactivate(id: string): Promise<void>
  logRequest(data: { api_key_id: string | null; user_id: string | null; endpoint: string; method: string; status_code: number; ip_address?: string | null; user_agent?: string | null; response_time_ms?: number | null }): Promise<void>
}
