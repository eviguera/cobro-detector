import { createClient } from './supabase/server'
import { NextRequest } from 'next/server'

export interface ApiAuthResult {
  authenticated: boolean
  user_id?: string
  permissions?: string[]
  api_key_id?: string
  rate_limit_exceeded?: boolean
}

export async function authenticateApiRequest(
  request: NextRequest
): Promise<ApiAuthResult> {
  // Obtener API key del header Authorization
  const authHeader = request.headers.get('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authenticated: false }
  }

  const apiKey = authHeader.replace('Bearer ', '').trim()
  
  if (!apiKey) {
    return { authenticated: false }
  }

    try {
    const supabase = await createClient()
    
    // Verificar API key usando la función de base de datos
    const { data, error } = await supabase
      .rpc('verify_api_key', { key_text: apiKey })
      .single()

    if (error || !data || !data.valid) {
      return { authenticated: false }
    }

    const result = data
    
    return {
      authenticated: true,
      user_id: result.user_id,
      permissions: result.permissions || ['read'],
      api_key_id: result.key_id,
    }

  } catch (err) {
    console.error('Error autenticando API key:', err)
    return { authenticated: false }
  }
}

export function hasPermission(
  auth: ApiAuthResult,
  required: 'read' | 'write' | 'admin'
): boolean {
  if (!auth.authenticated) return false
  
  const permissions = auth.permissions || []
  
  if (permissions.includes('admin')) return true
  
  return permissions.includes(required)
}
