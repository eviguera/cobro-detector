import type { AppEvent } from '../domain/event.entity.js'
import type { EventRepository } from '../domain/ports/event-repository.port.js'

export class TrackEventUseCase {
  constructor(private eventRepo: EventRepository) {}

  async execute(event: AppEvent): Promise<void> {
    await this.eventRepo.track(event)
  }
}
