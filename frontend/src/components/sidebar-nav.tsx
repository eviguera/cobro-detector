'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FileSearch, History, CreditCard, BarChart3, Gift } from 'lucide-react'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Panel' },
  { href: '/analisis', icon: FileSearch, label: 'Nuevo análisis' },
  { href: '/historial', icon: History, label: 'Historial' },
  { href: '/dashboard/analytics', icon: BarChart3, label: 'Métricas' },
  { href: '/precios', icon: CreditCard, label: 'Créditos' },
  { href: '/referidos', icon: Gift, label: 'Referidos' },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <nav role="navigation" aria-label="Principal" className="mt-4 flex-1 px-3">
      <p className="px-3 pb-2 text-2xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Menú</p>
      <ul className="space-y-0.5">
        {navItems.map((item) => {
          // Antes `startsWith('/dashboard')` marcaba Panel y Analytics a la vez.
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`)) ||
            (item.href === '/dashboard' && pathname === '/dashboard')

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-brand-50 font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
                    : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground'
                }`}
              >
                <item.icon
                  className={`h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                    isActive ? 'text-brand-600 dark:text-brand-300' : ''
                  }`}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
