import type { AppEvent } from '../event.entity.js'

export interface EventRepository {
  track(event: AppEvent): Promise<void>
}
