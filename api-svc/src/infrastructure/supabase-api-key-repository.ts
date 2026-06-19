import type { ApiKeyRepository, VerifyKeyResult } from '../domain/ports/api-key-repository.port'
import type { ApiKey } from '../domain/api-key.entity'
import type { SupabaseClient } from '@supabase/supabase-js'

export class SupabaseApiKeyRepository implements ApiKeyRepository {
  constructor(private supabase: SupabaseClient) {}

  async verifyKey(keyText: string): Promise<VerifyKeyResult> {
    const { data, error } = await this.supabase.rpc('verify_api_key', { key_text: keyText })
    if (error || !data) return { valid: false, key_id: null, user_id: null, permissions: null, rate_limit: 0 }

    const result = Array.isArray(data) ? data[0] : data
    return {
      valid: result.valid ?? false,
      key_id: result.key_id ?? null,
      user_id: result.user_id ?? null,
      permissions: result.permissions ?? null,
      rate_limit: result.rate_limit ?? 0,
    }
  }

  async findByUserId(userId: string): Promise<ApiKey[]> {
    const { data, error } = await this.supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) return []
    return data as unknown as ApiKey[]
  }

  async create(params: { user_id: string; name: string; key_hash: string; key_prefix: string; permissions: string[]; expires_at?: string | null }): Promise<ApiKey> {
    const { data, error } = await this.supabase
      .from('api_keys')
      .insert(params)
      .select()
      .single()

    if (error || !data) throw new Error(`Error creating API key: ${error?.message ?? 'unknown'}`)
    return data as unknown as ApiKey
  }

  async deactivate(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('api_keys')
      .update({ is_active: false })
      .eq('id', id)

    if (error) throw new Error(`Error deactivating API key: ${error.message}`)
  }

  async logRequest(data: { api_key_id: string | null; user_id: string | null; endpoint: string; method: string; status_code: number; ip_address?: string | null; user_agent?: string | null; response_time_ms?: number | null }): Promise<void> {
    await this.supabase.from('api_logs').insert({
      api_key_id: data.api_key_id,
      user_id: data.user_id,
      endpoint: data.endpoint,
      method: data.method,
      status_code: data.status_code,
      ip_address: data.ip_address ?? null,
      user_agent: data.user_agent ?? null,
      response_time_ms: data.response_time_ms ?? null,
    })
  }
}
