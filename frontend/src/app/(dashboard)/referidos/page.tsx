import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Share2, Users, Gift, Check } from 'lucide-react'
import { CopyReferralButton } from './copy-referral-button'

export const metadata: Metadata = { title: 'Programa de referidos' }

export default async function ReferidosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('referral_code').eq('id', user.id).single()
  const referralCode = profile?.referral_code || ''

  const referralUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://cobrodetector.cl'}/login?ref=${referralCode}`

  const { data: referrals } = await supabase
    .from('referrals')
    .select('referred_email, status, credits_awarded, created_at')
    .eq('referrer_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const completedCount = (referrals || []).filter((r) => r.status === 'completed').length
  const awardedCount = (referrals || []).filter((r) => r.credits_awarded).length

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Programa de Referidos</h1>
          <p className="text-sm text-muted-foreground">Invita a otros comercios y gana créditos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900/60 rounded-2xl border p-5">
          <Users className="w-5 h-5 text-blue-500 mb-2" />
          <p className="text-2xl font-bold">{completedCount}</p>
          <p className="text-xs text-muted-foreground">Referidos completados</p>
        </div>
        <div className="bg-white dark:bg-gray-900/60 rounded-2xl border p-5">
          <Gift className="w-5 h-5 text-emerald-500 mb-2" />
          <p className="text-2xl font-bold">{awardedCount}</p>
          <p className="text-xs text-muted-foreground">Créditos ganados</p>
        </div>
        <div className="bg-white dark:bg-gray-900/60 rounded-2xl border p-5">
          <Share2 className="w-5 h-5 text-purple-500 mb-2" />
          <p className="text-2xl font-bold">+1</p>
          <p className="text-xs text-muted-foreground">Crédito por referido</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900/60 rounded-2xl border p-6">
        <h2 className="font-semibold text-foreground mb-2">Tu link de referido</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Comparte este link. Cuando alguien se registre, ambos reciben 1 crédito gratis.
        </p>

        <div className="flex items-center gap-2">
          <code className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm font-mono text-foreground border border-gray-200 dark:border-gray-700 select-all">
            {referralUrl}
          </code>
          <CopyReferralButton referralUrl={referralUrl} />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900/60 rounded-2xl border p-6">
        <h2 className="font-semibold text-foreground mb-4">Historial de referidos</h2>

        {(referrals || []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no has referido a nadie. ¡Comparte tu link!</p>
        ) : (
          <div className="space-y-2">
            {(referrals || []).map((r) => (
              <div key={r.created_at} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <div>
                  <p className="font-medium text-foreground">{r.referred_email || 'Email pendiente'}</p>
                  <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString('es-CL')}</p>
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
                  r.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700'
                }`}>
                  {r.status === 'completed' ? <Check className="w-3 h-3" /> : null}
                  {r.status === 'completed' ? 'Completado' : 'Pendiente'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
