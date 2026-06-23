export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  business_name: string | null
  business_type: string | null
  rut: string | null
  phone: string | null
  is_admin: boolean
  created_at: string
  updated_at: string
}

export interface Credits {
  id: string
  user_id: string
  total: number
  used: number
  company_id: string | null
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  user_id: string
  plan: string
  credits_purchased: number
  amount_clp: number
  status: string
  payment_provider: string | null
  payment_reference: string | null
  recovered_amount: number
  fee_percentage: number
  mp_preference_id: string | null
  mp_payment_id: string | null
  mp_status: string | null
  mp_detail: string | null
  metadata: Json | null
  company_id: string | null
  success_plan_active: boolean | null
  created_at: string
  updated_at: string
}

export interface Analysis {
  id: string
  user_id: string
  file_name: string
  file_type: string
  file_url: string | null
  bank: string | null
  period_start: string | null
  period_end: string | null
  total_transactions: number
  anomalies_count: number
  recoverable_amount: number
  status: string
  raw_data: Json | null
  anomalies: Json | null
  ai_summary: string | null
  company_id: string | null
  created_at: string
  updated_at: string
}

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

export interface Company {
  id: string
  accountant_id: string
  company_name: string
  business_name: string | null
  rut: string | null
  email: string | null
  phone: string | null
  address: string | null
  industry: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CompanyMember {
  id: string
  company_id: string
  user_id: string
  role: string
  created_at: string
}

export interface Anomaly {
  id: string
  analysis_id: string
  user_id: string
  type: string
  severity: string
  title: string
  description: string | null
  detail: string | null
  recoverable_amount: number
  transaction_refs: string[]
  status: string
  created_at: string
}

export interface ParsedTransaction {
  id: string
  date: string
  description: string
  amount: number
  type: 'credit' | 'debit'
  category?: string
  metadata?: Record<string, unknown>
  tipoAnomalia?: string
  idTransaccionReferencia?: string
  reclamable?: boolean
  motivoReclamo?: string
}

export interface DetectedAnomaly {
  type: string
  severity: 'high' | 'medium' | 'low'
  title: string
  description: string
  detail?: string
  recoverableAmount: number
  transactionRefs: string[]
}

export interface Plan {
  key: string
  name: string
  credits: number
  price: number
  pricePerAnalysis: number
  highlighted?: boolean
  features: string[]
  percentage?: number
}

export interface OutgoingWebhook {
  id: string
  user_id: string
  url: string
  events: string[]
  secret: string
  description?: string
  is_active: boolean
  last_triggered_at?: string
  created_at: string
  updated_at: string
}

export interface Referral {
  id: string
  referrer_id: string
  referred_email?: string
  referred_user_id?: string
  referral_code: string
  status: 'pending' | 'completed'
  credits_awarded: boolean
  created_at: string
  completed_at?: string
}

export interface AnalysisResult {
  anomalies: DetectedAnomaly[]
  totalTransactions: number
  totalRecoverable: number
  period?: { start: string; end: string }
  bank?: string
  aiSummary?: string
  success?: boolean
  error?: string
  transactions?: ParsedTransaction[]
}

export interface AnalysisRunResponse {
  analysisId: string
  status: string
  totalTransactions: number
  anomaliesCount: number
  recoverableAmount: number
  summary: string
  bank: string
}

export interface PaymentPreference {
  id: string
  init_point?: string
  sandbox_init_point?: string
  preference_id: string
}

export interface MercadoPagoWebhookEvent {
  type: string
  data_id: string
  action: string
}
