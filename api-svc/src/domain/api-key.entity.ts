export interface ApiKey {
  id: string
  user_id: string
  name: string
  key_hash: string
  key_prefix: string
  permissions: string[]
  is_active: boolean
  last_used_at: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
}

export type Permission = 'read' | 'write' | 'admin'
