import type { SupabaseClient } from '@supabase/supabase-js'
import type { AppEvent } from '../../domain/event.entity.js'
import type { EventRepository } from '../../domain/ports/event-repository.port.js'

const logger = {
  warn: (msg: string, data?: Record<string, unknown>) => console.warn(msg, data),
}

export class SupabaseEventRepositoryAdapter implements EventRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async track(event: AppEvent): Promise<void> {
    const { error } = await this.supabase.from('events').insert({
      user_id: event.user_id,
      event_type: event.event_type,
      metadata: event.metadata,
    })

    if (error) {
      logger.warn('Failed to track event', { error: error.message, eventType: event.event_type })
    }
  }
}
