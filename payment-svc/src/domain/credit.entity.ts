export interface Credit {
  id: string
  user_id: string
  company_id: string | null
  total: number
  used: number
}
