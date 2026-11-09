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
          is_admin: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          business_name?: string | null
          business_type?: string | null
          rut?: string | null
          phone?: string | null
          is_admin?: boolean
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
          is_admin?: boolean
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
          total?: number
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
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan: string
          credits_purchased: number
          amount_clp: number
          status: string
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
          updated_at?: string
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
          updated_at?: string
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
          updated_at: string
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
          updated_at?: string
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
          updated_at?: string
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
          recoverable_amount?: number
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
      outgoing_webhooks: {
        Row: {
          id: string
          user_id: string
          url: string
          events: string[]
          secret: string
          description: string | null
          is_active: boolean
          last_triggered_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          url: string
          events?: string[]
          secret: string
          description?: string | null
          is_active?: boolean
          last_triggered_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          url?: string
          events?: string[]
          secret?: string
          description?: string | null
          is_active?: boolean
          last_triggered_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      referrals: {
        Row: {
          id: string
          referrer_id: string
          referred_email: string | null
          referred_user_id: string | null
          referral_code: string
          status: string
          credits_awarded: boolean
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          referrer_id: string
          referred_email?: string | null
          referred_user_id?: string | null
          referral_code: string
          status?: string
          credits_awarded?: boolean
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          referrer_id?: string
          referred_email?: string | null
          referred_user_id?: string | null
          referral_code?: string
          status?: string
          credits_awarded?: boolean
          created_at?: string
          completed_at?: string | null
        }
      }
      events: {
        Row: {
          id: string
          user_id: string
          event_type: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_type: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          event_type?: string
          metadata?: Json | null
          created_at?: string
        }
      }
      claim_tracking: {
        Row: {
          id: string
          analysis_id: string
          user_id: string
          status: 'draft' | 'sent' | 'responded' | 'escalated'
          sent_at: string | null
          response_at: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          analysis_id: string
          user_id: string
          status?: 'draft' | 'sent' | 'responded' | 'escalated'
          sent_at?: string | null
          response_at?: string | null
          notes?: string | null
        }
        Update: {
          analysis_id?: string
          status?: 'draft' | 'sent' | 'responded' | 'escalated'
          sent_at?: string | null
          response_at?: string | null
          notes?: string | null
        }
      }
      product_events: {
        Row: {
          id: string
          user_id: string
          event_type: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_type: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          event_type?: string
          metadata?: Json | null
        }
      }
      anomaly_feedback: {
        Row: {
          id: string
          analysis_id: string
          user_id: string
          anomaly_key: string
          anomaly_type: string | null
          severity: string | null
          reason: string
          comment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          analysis_id: string
          user_id: string
          anomaly_key: string
          anomaly_type?: string | null
          severity?: string | null
          reason?: string
          comment?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          analysis_id?: string
          user_id?: string
          anomaly_key?: string
          anomaly_type?: string | null
          severity?: string | null
          reason?: string
          comment?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Re-export domain types for backward compatibility
export type {
  Profile,
  Credits,
  Order,
  Analysis,
  ApiKey,
  Company,
  CompanyMember,
  Anomaly,
  ParsedTransaction,
  DetectedAnomaly,
  Plan,
  OutgoingWebhook,
  Referral,
  AnalysisResult,
  AnalysisRunResponse,
  PaymentPreference,
  MercadoPagoWebhookEvent,
} from '@/domain/index'
