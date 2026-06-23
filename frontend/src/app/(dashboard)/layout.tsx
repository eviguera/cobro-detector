import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Shield, LogOut, ChevronRight, Sparkles } from 'lucide-react'
import type { Profile, Credits } from '@/domain'
import { SidebarNav } from '@/components/sidebar-nav'
import { MobileSidebar } from '@/components/mobile-sidebar'
import { ThemeToggle } from '@/components/theme-toggle'
import { OnboardingTour } from '@/components/onboarding-tour'
import { LogoutButton } from './logout-button'

async function getDashboardData(userId: string) {
  const supabase = await createClient()
  const [profileResult, creditsResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('credits').select('*').eq('user_id', userId).single(),
  ])
  return {
    profile: profileResult.data as Profile | null,
    credits: creditsResult.data as Credits | null,
  }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { profile, credits } = await getDashboardData(user.id)
  const creditsLeft = (credits?.total ?? 0) - (credits?.used ?? 0)

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#0a0a0f] flex">
      <MobileSidebar
        creditsLeft={creditsLeft}
        creditsTotal={credits?.total ?? 0}
        userName={profile?.full_name ?? 'Usuario'}
        userEmail={user.email ?? ''}
        userInitial={(profile?.full_name ?? user.email ?? 'U').charAt(0).toUpperCase()}
      />

      <aside className="hidden lg:flex w-64 bg-white/80 dark:bg-[#0d0d14]/90 backdrop-blur-xl border-r border-gray-100 dark:border-gray-800/40 flex-col fixed h-full z-30">
        <div className="p-5 border-b border-gray-100 dark:border-gray-800/30">
          <Link href="/dashboard" className="group flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/30 group-hover:scale-105 transition-all duration-300">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm tracking-tight">CobroDetector</span>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium tracking-wider uppercase">Dashboard</p>
            </div>
          </Link>
        </div>

        <div className="px-4 py-3 mx-3 mt-4 bg-gradient-to-br from-blue-50 to-blue-100/80 dark:from-blue-950/60 dark:to-blue-900/20 rounded-2xl border border-blue-200/60 dark:border-blue-800/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-400/10 to-transparent rounded-full -translate-y-8 translate-x-8" />
          <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold tracking-wider uppercase mb-1">Créditos</p>
          <p className="text-3xl font-bold text-blue-700 dark:text-blue-300 tracking-tight">{creditsLeft}</p>
          {creditsLeft === 0 ? (
            <Link href="/precios" className="inline-flex items-center gap-1 mt-2 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
              <Sparkles className="w-3 h-3" />
              Comprar créditos <ChevronRight className="w-3 h-3" />
            </Link>
          ) : (
            <p className="text-[11px] text-blue-500/70 dark:text-blue-400/60 mt-2">
              de {credits?.total ?? 0} totales
            </p>
          )}
        </div>

        <SidebarNav />

        <div className="px-3 mt-2 space-y-0.5">
          <ThemeToggle />
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-gray-800/30">
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-white text-sm font-bold">
                {(profile?.full_name ?? user.email ?? 'U').charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate leading-tight">{profile?.full_name ?? 'Usuario'}</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </aside>

      <main id="main-content" className="flex-1 lg:ml-64 min-h-screen">
        <div className="max-w-6xl mx-auto p-4 lg:p-8 xl:p-10 pt-16 lg:pt-8">
          <OnboardingTour>{children}</OnboardingTour>
        </div>
      </main>
    </div>
  )
}
