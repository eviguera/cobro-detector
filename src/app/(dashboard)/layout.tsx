import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Shield, LogOut, ChevronRight, Sparkles } from 'lucide-react'
import type { Credits, Profile } from '@/types/database.types'
import { SidebarNav } from '@/components/sidebar-nav'
import { MobileSidebar } from '@/components/mobile-sidebar'
import { ThemeToggle } from '@/components/theme-toggle'

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
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0a0a0f] flex">
      <MobileSidebar
        creditsLeft={creditsLeft}
        creditsTotal={credits?.total ?? 0}
        userName={profile?.full_name ?? 'Usuario'}
        userEmail={user.email ?? ''}
        userInitial={(profile?.full_name ?? user.email ?? 'U').charAt(0).toUpperCase()}
      />

      <aside className="hidden lg:flex w-64 bg-[#0f172a] flex-col fixed h-full z-30 shadow-2xl">
        <div className="p-5 border-b border-gray-800/40">
          <Link href="/dashboard" className="group flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#4c6ef5] rounded-xl flex items-center justify-center shadow-lg shadow-[#4c6ef5]/20 group-hover:shadow-xl group-hover:shadow-[#4c6ef5]/30 group-hover:scale-105 transition-all duration-300">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-display font-bold text-white text-sm tracking-tight">CobroDetector</span>
              <p className="text-[10px] text-gray-400 font-medium tracking-wider uppercase">Dashboard</p>
            </div>
          </Link>
        </div>

        <div className="px-4 py-3 mx-3 mt-4 bg-[#1e293b] rounded-2xl border border-gray-700/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#4c6ef5]/10 to-transparent rounded-full -translate-y-8 translate-x-8" />
          <p className="text-[11px] text-gray-400 font-semibold tracking-wider uppercase mb-1">Créditos</p>
          <p className="text-3xl font-bold text-white tracking-tight font-display">{creditsLeft}</p>
          {creditsLeft === 0 ? (
            <Link href="/precios" className="inline-flex items-center gap-1 mt-2 text-[11px] font-medium text-[#10b981] hover:text-[#34d399] transition-colors">
              <Sparkles className="w-3 h-3" />
              Comprar créditos <ChevronRight className="w-3 h-3" />
            </Link>
          ) : (
            <p className="text-[11px] text-gray-500 mt-2">
              de {credits?.total ?? 0} totales
            </p>
          )}
        </div>

        <SidebarNav />

        <div className="px-3 mt-2 space-y-0.5">
          <ThemeToggle />
        </div>

        <div className="p-4 border-t border-gray-800/40 mt-auto">
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="w-9 h-9 bg-[#4c6ef5] rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-[#4c6ef5]/20">
              <span className="text-white text-sm font-bold">
                {(profile?.full_name ?? user.email ?? 'U').charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate leading-tight">{profile?.full_name ?? 'Usuario'}</p>
              <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
          <form action="/api/logout" method="POST">
            <button type="submit" className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 rounded-xl transition-all duration-200">
              <LogOut className="w-3.5 h-3.5" />
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      <main id="main-content" className="flex-1 lg:ml-64 min-h-screen">
        <div className="max-w-6xl mx-auto p-4 lg:p-8 xl:p-10 pt-16 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  )
}
