export interface Order {
  id: string
  user_id: string
  plan: string
  credits_purchased: number
  amount_clp: number
  status: string
  mp_preference_id: string | null
  mp_payment_id: string | null
  created_at: string
}
