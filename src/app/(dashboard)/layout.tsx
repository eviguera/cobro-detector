import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Shield, LayoutDashboard, FileSearch, History, CreditCard, LogOut, ChevronRight } from 'lucide-react'
import type { Credits, Profile } from '@/types/database.types'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/analisis', icon: FileSearch, label: 'Nuevo análisis' },
  { href: '/historial', icon: History, label: 'Mis análisis' },
  { href: '/precios', icon: CreditCard, label: 'Comprar créditos' },
]

// Función para datos del dashboard (sin caché - Next.js 14 no soporta use cache)
async function getDashboardData(userId: string) {
  const supabase = await createClient()
  
  const [profileResult, creditsResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('credits').select('*').eq('user_id', userId).single()
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

  // Usar función cacheada
  const { profile, credits } = await getDashboardData(user.id)

  const creditsLeft = (credits?.total ?? 0) - (credits?.used ?? 0)

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-100 flex flex-col fixed h-full">
        <div className="p-5 border-b border-gray-100">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-gray-900 text-sm">CobroDetector</span>
          </Link>
        </div>

        {/* Créditos */}
        <div className="px-4 py-3 mx-3 mt-4 bg-blue-50 rounded-xl border border-blue-100">
          <p className="text-xs text-blue-600 font-medium mb-0.5">Créditos disponibles</p>
          <p className="text-2xl font-bold text-blue-700">{creditsLeft}</p>
          {creditsLeft === 0 && (
            <Link href="/precios" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5 mt-1">
              Comprar más <ChevronRight className="w-3 h-3" />
            </Link>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 mt-2">
          <ul className="space-y-1">
            {navItems.map(item => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* User */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-blue-700 text-xs font-semibold">
                {(profile?.full_name ?? user.email ?? 'U').charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">{profile?.full_name ?? 'Usuario'}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
          <form action="/api/logout" method="POST">
            <button type="submit" className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
              <LogOut className="w-3.5 h-3.5" />
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-60 p-8">
        {children}
      </main>
    </div>
  )
}
