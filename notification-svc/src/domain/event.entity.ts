export type EventType =
  | 'analysis_started'
  | 'analysis_completed'
  | 'analysis_failed'
  | 'report_downloaded'
  | 'credit_purchased'
  | 'user_registered'
  | 'plan_viewed'
  | 'payment_received'

export interface AppEvent {
  id?: string
  user_id: string | null
  event_type: EventType
  metadata: Record<string, unknown>
  created_at?: string
}
