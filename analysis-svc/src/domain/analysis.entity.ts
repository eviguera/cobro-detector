export interface Analysis {
  id: string
  user_id: string
  company_id: string | null
  file_name: string
  file_type: string
  file_url: string
  bank: string | null
  period_start: string | null
  period_end: string | null
  status: string
  anomalies: unknown
  anomalies_count: number | null
  total_transactions: number | null
  recoverable_amount: number | null
  ai_summary: string | null
  raw_data: unknown
  created_at: string
  updated_at: string
}
