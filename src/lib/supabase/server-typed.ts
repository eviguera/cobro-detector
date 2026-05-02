import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database.types'

/**
 * Cliente de Supabase tipado para el servidor
 * Esta función asegura que el tipo Database se propague correctamente
 */
export function createServerSupabaseClient() {
  const cookieStore = cookies()
  
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {}
        },
      },
    }
  )
}

/**
 * Cliente de Supabase tipado para componentes de cliente
 */
export function createClientSupabaseClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => document.cookie.split('; ').map(c => {
          const [name, ...rest] = c.split('=')
          return { name, value: rest.join('=') }
        }),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            document.cookie = `${name}=${value}; path=${options?.path ?? '/'}; ${options?.secure ? 'secure;' : ''}`
          })
        },
      },
    }
  )
}
