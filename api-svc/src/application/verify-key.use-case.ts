import type { ApiKeyRepository } from '../domain/ports/api-key-repository.port'

export class VerifyKeyUseCase {
  constructor(private keyRepo: ApiKeyRepository) {}

  async execute(keyText: string) {
    const result = await this.keyRepo.verifyKey(keyText)
    if (!result.valid) {
      return { authenticated: false }
    }

    return {
      authenticated: true,
      userId: result.user_id,
      permissions: result.permissions,
      apiKeyId: result.key_id,
    }
  }
}
