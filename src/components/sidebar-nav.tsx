'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FileSearch, History, CreditCard } from 'lucide-react'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Panel' },
  { href: '/analisis', icon: FileSearch, label: 'Nuevo análisis' },
  { href: '/historial', icon: History, label: 'Historial' },
  { href: '/precios', icon: CreditCard, label: 'Créditos' },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <nav role="navigation" aria-label="Principal" className="flex-1 px-3 mt-4">
      <ul className="space-y-0.5">
        {navItems.map(item => {
          const isActive = pathname.startsWith(item.href)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-[#4c6ef5] text-white font-semibold shadow-lg shadow-[#4c6ef5]/20'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                <item.icon className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
                <span className="font-medium">{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
