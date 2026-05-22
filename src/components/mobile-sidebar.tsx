'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Shield, LogOut, Menu, X, ChevronRight, Sparkles } from 'lucide-react'
import { SidebarNav } from '@/components/sidebar-nav'

interface MobileSidebarProps {
  creditsLeft: number
  creditsTotal: number
  userName: string
  userEmail: string
  userInitial: string
}

export function MobileSidebar({ creditsLeft, creditsTotal, userName, userEmail, userInitial }: MobileSidebarProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-center shadow-md"
        aria-label="Abrir menú"
        aria-expanded={open}
        aria-controls="mobile-sidebar"
      >
        <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
      </button>

      {open && (
        <div className="lg:hidden fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Menú de navegación">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside
            id="mobile-sidebar"
            className="fixed left-0 top-0 bottom-0 w-72 bg-white dark:bg-[#0d0d14] border-r border-gray-100 dark:border-gray-800/40 flex flex-col h-full z-50 animate-slide-in-right overflow-y-auto"
          >
            <div className="p-5 border-b border-gray-100 dark:border-gray-800/30 flex items-center justify-between">
              <Link href="/dashboard" className="group flex items-center gap-2.5" onClick={() => setOpen(false)}>
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <div>
                  <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm tracking-tight">CobroDetector</span>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium tracking-wider uppercase">Dashboard</p>
                </div>
              </Link>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Cerrar menú"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 py-3 mx-3 mt-4 bg-gradient-to-br from-blue-50 to-blue-100/80 dark:from-blue-950/60 dark:to-blue-900/20 rounded-2xl border border-blue-200/60 dark:border-blue-800/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-400/10 to-transparent rounded-full -translate-y-8 translate-x-8" />
              <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold tracking-wider uppercase mb-1">Créditos</p>
              <p className="text-3xl font-bold text-blue-700 dark:text-blue-300 tracking-tight">{creditsLeft}</p>
              {creditsLeft === 0 ? (
                <Link href="/precios" onClick={() => setOpen(false)} className="inline-flex items-center gap-1 mt-2 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                  <Sparkles className="w-3 h-3" />
                  Comprar créditos <ChevronRight className="w-3 h-3" />
                </Link>
              ) : (
                <p className="text-[11px] text-blue-500/70 dark:text-blue-400/60 mt-2">
                  de {creditsTotal} totales
                </p>
              )}
            </div>

            <div onClick={() => setOpen(false)}>
              <SidebarNav />
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-gray-800/30">
              <div className="flex items-center gap-3 mb-3 px-1">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                  <span className="text-white text-sm font-bold">{userInitial}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate leading-tight">{userName}</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{userEmail}</p>
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
        </div>
      )}
    </>
  )
}
