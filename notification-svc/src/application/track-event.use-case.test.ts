import { describe, it, expect, vi } from 'vitest'
import { TrackEventUseCase } from './track-event.use-case.js'
import type { EventRepository } from '../domain/ports/event-repository.port.js'
import type { AppEvent } from '../domain/event.entity.js'

const testEvent: AppEvent = {
  user_id: 'user-123',
  event_type: 'analysis_completed',
  metadata: { analysisId: 'abc-123' },
}

function createEventRepo(): EventRepository {
  return { track: vi.fn().mockResolvedValue(undefined) }
}

describe('TrackEventUseCase', () => {
  it('llama a eventRepo.track con el evento', async () => {
    const eventRepo = createEventRepo()
    const useCase = new TrackEventUseCase(eventRepo)

    await useCase.execute(testEvent)

    expect(eventRepo.track).toHaveBeenCalledWith(testEvent)
  })

  it('propaga el error si eventRepo.track lanza una excepción', async () => {
    const error = new Error('DB connection failed')
    const eventRepo: EventRepository = { track: vi.fn().mockRejectedValue(error) }
    const useCase = new TrackEventUseCase(eventRepo)

    await expect(useCase.execute(testEvent)).rejects.toThrow('DB connection failed')
  })
})
