import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Shield, LayoutDashboard, FileSearch, History, CreditCard, LogOut, ChevronRight, Sparkles } from 'lucide-react'
import type { Credits, Profile } from '@/types/database.types'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Panel' },
  { href: '/analisis', icon: FileSearch, label: 'Nuevo análisis' },
  { href: '/historial', icon: History, label: 'Historial' },
  { href: '/precios', icon: CreditCard, label: 'Créditos' },
]

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
      <aside className="w-64 bg-white/80 dark:bg-[#0d0d14]/90 backdrop-blur-xl border-r border-gray-100 dark:border-gray-800/40 flex flex-col fixed h-full z-30">
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

        <nav className="flex-1 px-3 mt-4">
          <ul className="space-y-0.5">
            {navItems.map(item => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-all duration-200"
                >
                  <item.icon className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

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
          <form action="/api/logout" method="POST">
            <button type="submit" className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-all duration-200">
              <LogOut className="w-3.5 h-3.5" />
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 ml-64 min-h-screen">
        <div className="max-w-6xl mx-auto p-6 lg:p-8 xl:p-10">
          {children}
        </div>
      </main>
    </div>
  )
}
