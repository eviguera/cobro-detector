import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SupabaseApiKeyRepository } from './supabase-api-key-repository.js'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('SupabaseApiKeyRepository', () => {
  let mockSupabase: SupabaseClient
  let repo: SupabaseApiKeyRepository

  beforeEach(() => {
    mockSupabase = {
      rpc: vi.fn(),
      from: vi.fn(),
    } as unknown as SupabaseClient
    repo = new SupabaseApiKeyRepository(mockSupabase)
  })

  describe('verifyKey', () => {
    it('should return valid result when key is verified', async () => {
      const mockData = {
        valid: true,
        key_id: 'key-123',
        user_id: 'user-456',
        permissions: ['read', 'write'],
        rate_limit: 100,
      }
      vi.mocked(mockSupabase.rpc).mockResolvedValue({ data: mockData, error: null } as any)

      const result = await repo.verifyKey('test-key')

      expect(result).toEqual({
        valid: true,
        key_id: 'key-123',
        user_id: 'user-456',
        permissions: ['read', 'write'],
        rate_limit: 100,
      })
    })

    it('should return invalid result when rpc returns error', async () => {
      vi.mocked(mockSupabase.rpc).mockResolvedValue({ data: null, error: new Error('DB error') } as any)

      const result = await repo.verifyKey('test-key')

      expect(result).toEqual({
        valid: false,
        key_id: null,
        user_id: null,
        permissions: null,
        rate_limit: 0,
      })
    })

    it('should handle array response from rpc', async () => {
      const mockData = [{
        valid: true,
        key_id: 'key-123',
        user_id: 'user-456',
        permissions: ['read'],
        rate_limit: 50,
      }]
      vi.mocked(mockSupabase.rpc).mockResolvedValue({ data: mockData, error: null } as any)

      const result = await repo.verifyKey('test-key')

      expect(result.valid).toBe(true)
      expect(result.user_id).toBe('user-456')
    })
  })

  describe('findByUserId', () => {
    it('should return array of API keys', async () => {
      const mockKeys = [
        { id: 'key-1', name: 'Key 1', key_prefix: 'cd_test', permissions: ['read'], is_active: true, expires_at: null, created_at: '2024-01-01' },
        { id: 'key-2', name: 'Key 2', key_prefix: 'cd_prod', permissions: ['read', 'write'], is_active: true, expires_at: null, created_at: '2024-01-02' },
      ]
      
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockKeys, error: null }),
          }),
        }),
      })
      vi.mocked(mockSupabase.from).mockImplementation(mockFrom as any)

      const result = await repo.findByUserId('user-123')

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('key-1')
      expect(result[1].id).toBe('key-2')
    })

    it('should return empty array on error', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
          }),
        }),
      })
      vi.mocked(mockSupabase.from).mockImplementation(mockFrom as any)

      const result = await repo.findByUserId('user-123')

      expect(result).toEqual([])
    })
  })

  describe('create', () => {
    it('should create and return new API key', async () => {
      const newKey = { id: 'key-123', name: 'Test Key', key_hash: 'hash123', key_prefix: 'cd_test', permissions: ['read'], is_active: true, expires_at: null }
      
      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: newKey, error: null }),
          }),
        }),
      })
      vi.mocked(mockSupabase.from).mockImplementation(mockFrom as any)

      const result = await repo.create({
        user_id: 'user-123',
        name: 'Test Key',
        key_hash: 'hash123',
        key_prefix: 'cd_test',
        permissions: ['read'],
      })

      expect(result.id).toBe('key-123')
      expect(result.name).toBe('Test Key')
    })

    it('should throw error when creation fails', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: new Error('Duplicate key') }),
          }),
        }),
      })
      vi.mocked(mockSupabase.from).mockImplementation(mockFrom as any)

      await expect(repo.create({
        user_id: 'user-123',
        name: 'Test Key',
        key_hash: 'hash123',
        key_prefix: 'cd_test',
        permissions: ['read'],
      })).rejects.toThrow('Error creating API key: Duplicate key')
    })
  })

  describe('deactivate', () => {
    it('should deactivate API key successfully', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      })
      vi.mocked(mockSupabase.from).mockImplementation(mockFrom as any)

      await repo.deactivate('key-123')

      expect(mockFrom).toHaveBeenCalledWith('api_keys')
    })

    it('should throw error when deactivation fails', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: new Error('Key not found') }),
        }),
      })
      vi.mocked(mockSupabase.from).mockImplementation(mockFrom as any)

      await expect(repo.deactivate('key-123')).rejects.toThrow('Error deactivating API key: Key not found')
    })
  })
})
