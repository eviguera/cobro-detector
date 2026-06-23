import { createClient } from './server'

type ServerClient = Awaited<ReturnType<typeof createClient>>

/**
 * Database helper — centraliza el acceso a tablas.
 * Workaround para bug de inferencia de @supabase/ssr (retorna 'never' en tablas).
 *
 * Uso: const { anomalies, paymentMethods } = tables(supabase)
 */
export function tables(client: ServerClient) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = client as any
  return {
    analyses: s.from('analyses'),
    anomalies: s.from('anomalies'),
    orders: s.from('orders'),
    credits: s.from('credits'),
    profiles: s.from('profiles'),
    paymentMethods: s.from('payment_methods'),
    successCharges: s.from('success_charges'),
    apiKeys: s.from('api_keys'),
    apiLogs: s.from('api_logs'),
    companies: s.from('companies'),
    companyMembers: s.from('company_members'),
    successPlans: s.from('success_plans'),
    rpc: (fn: string, params?: Record<string, unknown>) => s.rpc(fn, params),
  } as const
}


