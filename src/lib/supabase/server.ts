import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database.types'

/**
 * Cliente tipado para el servidor
 * Retorna un cliente con el tipo Database propagado correctamente
 */
export async function createClient() {
  const cookieStore = await cookies()
  
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
 * Helper para operaciones de base de datos
 * Evita el uso de `as any` manteniendo tipos
 */
export function db(supabase: Awaited<ReturnType<typeof createClient>>) {
  return supabase
}

export type SupabaseClient = Awaited<ReturnType<typeof createClient>>
