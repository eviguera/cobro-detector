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
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['orders']['Insert']>
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

export type AnomalyType = 'duplicate_commission' | 'installment_error' | 'unknown_charge'
export type Severity = 'high' | 'medium' | 'low'
export type AnomalyStatus = 'pending' | 'claimed' | 'recovered' | 'dismissed'
export type AnalysisStatus = 'processing' | 'completed' | 'failed'

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

export type PlanKey = 'starter' | 'professional' | 'enterprise'

export interface Plan {
  key: PlanKey
  name: string
  credits: number
  price: number
  pricePerAnalysis: number
  features: string[]
  highlighted?: boolean
}
