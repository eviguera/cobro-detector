import { apiFetch, services } from './client'
import type { ApiKey } from '@/domain'

interface VerifyResult {
  authenticated: boolean
  user_id?: string
  permissions?: string[]
  api_key_id?: string
}

interface VerifyParams {
  apiKey: string
}

export function verifyApiKey(apiKey: string): Promise<VerifyResult> {
  return apiFetch<VerifyResult>(
    services.auth.baseUrl,
    '/v1/verify',
    {
      method: 'POST',
      body: JSON.stringify({ apiKey } satisfies VerifyParams),
    },
  )
}

export async function listUserKeys(userId: string): Promise<ApiKey[]> {
  const keys = await apiFetch<Record<string, unknown>[]>(
    services.auth.baseUrl,
    `/v1/keys/${userId}`,
  )
  return keys as unknown as ApiKey[]
}
