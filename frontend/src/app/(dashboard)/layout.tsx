import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Shield, ChevronRight, Sparkles } from 'lucide-react'
import type { Profile, Credits } from '@/domain'
import { SidebarNav } from '@/components/sidebar-nav'
import { MobileSidebar } from '@/components/mobile-sidebar'
import { ThemeToggle } from '@/components/theme-toggle'
import { OnboardingTour } from '@/components/onboarding-tour'
import { CommandMenu, CommandMenuTrigger } from '@/components/command-menu'
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
    <div className="flex min-h-screen bg-background">
      <MobileSidebar
        creditsLeft={creditsLeft}
        creditsTotal={credits?.total ?? 0}
        userName={profile?.full_name ?? 'Usuario'}
        userEmail={user.email ?? ''}
        userInitial={(profile?.full_name ?? user.email ?? 'U').charAt(0).toUpperCase()}
      />

      <aside className="sidebar-dark fixed z-30 hidden h-full w-64 flex-col border-r border-border bg-background lg:flex">
        <div className="border-b border-border p-5">
          <Link href="/dashboard" className="group flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary shadow-sm transition-transform duration-300 group-hover:scale-105">
              <Shield className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
            </div>
            <div>
              <span className="block font-display text-lg leading-none tracking-tight text-foreground">CobroDetector</span>
              <p className="mt-1 font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Auditoría de cartolas</p>
            </div>
          </Link>
        </div>

        <div className="mx-3 mt-5 rounded-xl border border-border bg-card/60 p-4">
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Créditos
          </p>
          <div className="mt-1 flex items-end justify-between">
            <p className="font-display text-4xl tabular-nums text-foreground">
              {creditsLeft}
            </p>
            <p className="pb-1 font-mono text-[10px] text-muted-foreground">de {credits?.total ?? 0}</p>
          </div>
          {creditsLeft === 0 ? (
            <Link
              href="/precios"
              className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline"
            >
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              Comprar créditos
              <ChevronRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          ) : (
            <p className="mt-2 font-mono text-[10px] text-muted-foreground">
              Disponibles para analizar
            </p>
          )}
        </div>

        <SidebarNav />

        <div className="mt-auto px-3">
          <CommandMenuTrigger />
        </div>

        <div className="mt-1 px-3">
          <ThemeToggle />
        </div>

        <div className="mt-2 border-t border-border p-4">
          <div className="mb-3 flex items-center gap-3 px-1">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <span className="text-sm font-bold text-white">
                {(profile?.full_name ?? user.email ?? 'U').charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium leading-tight text-foreground">
                {profile?.full_name ?? 'Usuario'}
              </p>
              <p className="truncate text-2xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </aside>

      <main id="main-content" className="min-h-screen flex-1 lg:ml-64">
        <div className="mx-auto max-w-6xl p-4 pt-16 sm:p-6 lg:p-8 xl:p-10 lg:pt-8">
          <OnboardingTour>{children}</OnboardingTour>
        </div>
      </main>

      <CommandMenu />
    </div>
  )
}
