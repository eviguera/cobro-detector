export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

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
        Insert: {
          id?: string
          email?: string | null
          full_name?: string | null
          business_name?: string | null
          business_type?: string | null
          rut?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          business_name?: string | null
          business_type?: string | null
          rut?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
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
        Insert: {
          id?: string
          user_id: string
          total: number
          used?: number
          company_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          total?: number
          used?: number
          company_id?: string | null
          created_at?: string
          updated_at?: string
        }
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
          company_id: string | null
          success_plan_active: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan: string
          credits_purchased: number
          amount_clp: number
          status?: string
          payment_provider?: string | null
          payment_reference?: string | null
          recovered_amount?: number
          fee_percentage?: number
          mp_preference_id?: string | null
          mp_payment_id?: string | null
          mp_status?: string | null
          mp_detail?: string | null
          metadata?: Json | null
          company_id?: string | null
          success_plan_active?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plan?: string
          credits_purchased?: number
          amount_clp?: number
          status?: string
          payment_provider?: string | null
          payment_reference?: string | null
          recovered_amount?: number
          fee_percentage?: number
          mp_preference_id?: string | null
          mp_payment_id?: string | null
          mp_status?: string | null
          mp_detail?: string | null
          metadata?: Json | null
          company_id?: string | null
          success_plan_active?: boolean | null
          created_at?: string
        }
      }
      analyses: {
        Row: {
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
        }
        Insert: {
          id?: string
          user_id: string
          file_name: string
          file_type: string
          file_url?: string | null
          bank?: string | null
          period_start?: string | null
          period_end?: string | null
          total_transactions?: number
          anomalies_count?: number
          recoverable_amount?: number
          status?: string
          raw_data?: Json | null
          anomalies?: Json | null
          ai_summary?: string | null
          company_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          file_name?: string
          file_type?: string
          file_url?: string | null
          bank?: string | null
          period_start?: string | null
          period_end?: string | null
          total_transactions?: number
          anomalies_count?: number
          recoverable_amount?: number
          status?: string
          raw_data?: Json | null
          anomalies?: Json | null
          ai_summary?: string | null
          company_id?: string | null
          created_at?: string
        }
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
          transaction_refs: string[]
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          analysis_id: string
          user_id: string
          type: string
          severity: string
          title: string
          description?: string | null
          detail?: string | null
          recoverable_amount: number
          transaction_refs?: string[]
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          analysis_id?: string
          user_id?: string
          type?: string
          severity?: string
          title?: string
          description?: string | null
          detail?: string | null
          recoverable_amount?: number
          transaction_refs?: string[]
          status?: string
          created_at?: string
        }
      }
      api_keys: {
        Row: {
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
        Insert: {
          id?: string
          user_id: string
          name: string
          key_hash: string
          key_prefix: string
          permissions?: string[]
          is_active?: boolean
          last_used_at?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          key_hash?: string
          key_prefix?: string
          permissions?: string[]
          is_active?: boolean
          last_used_at?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
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
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          accountant_id: string
          company_name: string
          business_name?: string | null
          rut?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          industry?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          accountant_id?: string
          company_name?: string
          business_name?: string | null
          rut?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          industry?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      company_members: {
        Row: {
          id: string
          company_id: string
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          user_id: string
          role: string
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          user_id?: string
          role?: string
          created_at?: string
        }
      }
      success_plans: {
        Row: {
          id: string
          user_id: string
          company_id: string | null
          plan_type: string
          starts_at: string
          ends_at: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          company_id?: string | null
          plan_type: string
          starts_at: string
          ends_at?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          company_id?: string | null
          plan_type?: string
          starts_at?: string
          ends_at?: string | null
          is_active?: boolean
          created_at?: string
        }
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
        Insert: {
          id?: string
          user_id: string
          anomaly_id?: string | null
          analysis_id?: string | null
          recovered_amount: number
          fee_percentage: number
          charge_amount: number
          status?: string
          mp_payment_id?: string | null
          mp_status?: string | null
          mp_detail?: string | null
          charged_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          anomaly_id?: string | null
          analysis_id?: string | null
          recovered_amount?: number
          fee_percentage?: number
          charge_amount?: number
          status?: string
          mp_payment_id?: string | null
          mp_status?: string | null
          mp_detail?: string | null
          charged_at?: string | null
          created_at?: string
        }
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
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          mp_card_token: string
          mp_customer_id?: string | null
          last_four_digits?: string | null
          card_brand?: string | null
          expires_month?: number | null
          expires_year?: number | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          mp_card_token?: string
          mp_customer_id?: string | null
          last_four_digits?: string | null
          card_brand?: string | null
          expires_month?: number | null
          expires_year?: number | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
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
        Insert: {
          id?: string
          api_key_id?: string | null
          user_id?: string | null
          endpoint: string
          method: string
          status_code: number
          ip_address?: string | null
          user_agent?: string | null
          request_body?: Json | null
          response_time_ms?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          api_key_id?: string | null
          user_id?: string | null
          endpoint?: string
          method?: string
          status_code?: number
          ip_address?: string | null
          user_agent?: string | null
          request_body?: Json | null
          response_time_ms?: number | null
          created_at?: string
        }
      }
    }
    Views: {
      orders_with_credits: {
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
          company_id: string | null
          success_plan_active: boolean | null
          created_at: string
          email: string | null
          full_name: string | null
          business_name: string | null
          credits_total: number
          credits_used: number
          credits_available: number
        }
      }
      analyses_with_company: {
        Row: {
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
          company_name: string | null
          company_business_name: string | null
          company_rut: string | null
        }
      }
    }
    Functions: {
      verify_api_key: {
        Args: { key_text: string }
        Returns: {
          valid: boolean
          key_id: string | null
          user_id: string | null
          permissions: string[] | null
          rate_limit: number
        }
      }
      can_access_company: {
        Args: { company_uuid: string }
        Returns: boolean
      }
    }
    Enums: {}
  }
}

// Export types for convenience
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Credits = Database['public']['Tables']['credits']['Row']
export type Order = Database['public']['Tables']['orders']['Row']
export type Analysis = Database['public']['Tables']['analyses']['Row']
export type ApiKey = Database['public']['Tables']['api_keys']['Row']
export type Company = Database['public']['Tables']['companies']['Row']
export type CompanyMember = Database['public']['Tables']['company_members']['Row']
export type SuccessPlan = Database['public']['Tables']['success_plans']['Row']
export type Anomaly = Database['public']['Tables']['anomalies']['Row']
export type SuccessCharge = Database['public']['Tables']['success_charges']['Row']
export type PaymentMethod = Database['public']['Tables']['payment_methods']['Row']

// Custom types
export type SuccessChargeStatus = 'pending' | 'charged' | 'failed'

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
