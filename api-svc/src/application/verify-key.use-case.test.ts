import { describe, it, expect, vi, beforeEach } from 'vitest'
import { VerifyKeyUseCase } from './verify-key.use-case.js'
import type { ApiKeyRepository } from '../domain/ports/api-key-repository.port.js'

describe('VerifyKeyUseCase', () => {
  let mockRepo: ApiKeyRepository
  let useCase: VerifyKeyUseCase

  beforeEach(() => {
    mockRepo = {
      verifyKey: vi.fn(),
      findByUserId: vi.fn(),
      create: vi.fn(),
      deactivate: vi.fn(),
      logRequest: vi.fn(),
    }
    useCase = new VerifyKeyUseCase(mockRepo)
  })

  it('should return authenticated false when key is invalid', async () => {
    vi.mocked(mockRepo.verifyKey).mockResolvedValue({
      valid: false,
      key_id: null,
      user_id: null,
      permissions: null,
      rate_limit: 0,
    })

    const result = await useCase.execute('invalid-key')

    expect(result).toEqual({ authenticated: false })
    expect(mockRepo.verifyKey).toHaveBeenCalledWith('invalid-key')
  })

  it('should return authenticated true with user data when key is valid', async () => {
    vi.mocked(mockRepo.verifyKey).mockResolvedValue({
      valid: true,
      key_id: 'key-123',
      user_id: 'user-456',
      permissions: ['read', 'write'],
      rate_limit: 100,
    })

    const result = await useCase.execute('valid-key')

    expect(result).toEqual({
      authenticated: true,
      userId: 'user-456',
      permissions: ['read', 'write'],
      apiKeyId: 'key-123',
    })
  })

  it('should handle repository errors gracefully', async () => {
    vi.mocked(mockRepo.verifyKey).mockRejectedValue(new Error('DB connection failed'))

    await expect(useCase.execute('any-key')).rejects.toThrow('DB connection failed')
  })
})
