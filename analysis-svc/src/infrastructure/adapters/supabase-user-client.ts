import { createClient } from '@supabase/supabase-js'

/**
 * Crea un cliente Supabase con el JWT del usuario final.
 * Así RLS se aplica a nivel de base de datos (políticas auth.uid() = user_id)
 * y no dependemos únicamente del service_role, que bypassa RSL por completo.
 */
export function createUserClient(accessToken: string) {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY')
  }

  const fetchWithAuth = (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers)
    headers.set('Authorization', `Bearer ${accessToken}`)
    return fetch(input, { ...init, headers })
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: fetchWithAuth },
  })
}
