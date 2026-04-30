export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          business_name: string | null
          business_type: string | null
          rut: string | null
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      credits: {
        Row: {
          id: string
          user_id: string
          total: number
          used: number
          company_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['credits']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['credits']['Insert']>
      }
      orders: {
        Row: {
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
          success_plan_active: boolean | null
          company_id: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['orders']['Insert']>
      }
      payment_methods: {
        Row: {
          id: string
          user_id: string
          mp_card_token: string
          mp_customer_id: string | null
          last_four_digits: string | null
          card_brand: string | null
          expires_month: number | null
          expires_year: number | null
          is_default: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['payment_methods']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['payment_methods']['Insert']>
      }
      success_charges: {
        Row: {
          id: string
          user_id: string
          anomaly_id: string | null
          analysis_id: string | null
          recovered_amount: number
          fee_percentage: number
          charge_amount: number
          status: string
          mp_payment_id: string | null
          mp_status: string | null
          mp_detail: string | null
          charged_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['success_charges']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['success_charges']['Insert']>
      }
      companies: {
        Row: {
          id: string
          accountant_id: string
          company_name: string
          business_name: string | null
          rut: string | null
          email: string | null
          phone: string | null
          address: string | null
          industry: string | null
          is_active: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['companies']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['companies']['Insert']>
      }
      api_keys: {
        Row: {
          id: string
          user_id: string
          name: string
          key_hash: string
          key_prefix: string
          permissions: string[] | null
          is_active: boolean | null
          last_used_at: string | null
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['api_keys']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['api_keys']['Insert']>
      }
      api_logs: {
        Row: {
          id: string
          api_key_id: string | null
          user_id: string | null
          endpoint: string
          method: string
          status_code: number
          ip_address: string | null
          user_agent: string | null
          request_body: Json | null
          response_time_ms: number | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['api_logs']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['api_logs']['Insert']>
      }
      analyses: {
        Row: {
          id: string
          user_id: string
          file_name: string
          file_type: string
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
        }
        Insert: Omit<Database['public']['Tables']['analyses']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['analyses']['Insert']>
      }
      anomalies: {
        Row: {
          id: string
          analysis_id: string
          user_id: string
          type: string
          severity: string
          title: string
          description: string | null
          detail: string | null
          recoverable_amount: number
          transaction_refs: Json
          status: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['anomalies']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['anomalies']['Insert']>
      }
    }
  }
}

// App types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Credits = Database['public']['Tables']['credits']['Row']
export type Order = Database['public']['Tables']['orders']['Row']
export type Analysis = Database['public']['Tables']['analyses']['Row']
export type Anomaly = Database['public']['Tables']['anomalies']['Row']
export type PaymentMethod = Database['public']['Tables']['payment_methods']['Row']
export type SuccessCharge = Database['public']['Tables']['success_charges']['Row']
export type Company = Database['public']['Tables']['companies']['Row']
export type ApiKey = Database['public']['Tables']['api_keys']['Row']
export type ApiLog = Database['public']['Tables']['api_logs']['Row']

export type AnomalyType = 'duplicate_commission' | 'installment_error' | 'unknown_charge'
export type Severity = 'high' | 'medium' | 'low'
export type AnomalyStatus = 'pending' | 'claimed' | 'recovered' | 'dismissed'
export type AnalysisStatus = 'processing' | 'completed' | 'failed'
export type SuccessChargeStatus = 'pending' | 'charged' | 'failed' | 'refunded'

export interface ParsedTransaction {
  id: string
  date: string
  description: string
  amount: number
  type: 'credit' | 'debit'
  category?: string
  reference?: string
  flagged?: boolean
}

export interface DetectedAnomaly {
  type: AnomalyType
  severity: Severity
  title: string
  description: string
  detail: string
  recoverableAmount: number
  transactionRefs: string[]
}

export type PlanKey = 'starter' | 'professional' | 'enterprise' | 'success_fee'

export interface Plan {
  key: PlanKey
  name: string
  credits: number
  price: number
  pricePerAnalysis: number
  features: string[]
  highlighted?: boolean
}
