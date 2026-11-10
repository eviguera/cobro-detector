'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Shield, LogOut, Menu, X, ChevronRight, Sparkles, Coins, Loader2, Search } from 'lucide-react'
import { SidebarNav } from '@/components/sidebar-nav'
import { ThemeToggle } from '@/components/theme-toggle'
import { createClient } from '@/lib/supabase/client'

interface MobileSidebarProps {
  creditsLeft: number
  creditsTotal: number
  userName: string
  userEmail: string
  userInitial: string
}

export function MobileSidebar({ creditsLeft, creditsTotal, userName, userEmail, userInitial }: MobileSidebarProps) {
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Escape para cerrar, foco atrapado dentro del drawer y restauración del foco
  // al botón que lo abrió (WCAG 2.4.3).
  useEffect(() => {
    if (!open) return

    const focusables = () =>
      Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) ?? []
      ).filter((element) => element.offsetParent !== null)

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        triggerRef.current?.focus()
        return
      }
      if (event.key !== 'Tab') return

      const elements = focusables()
      if (elements.length === 0) return
      const first = elements[0]
      const last = elements[elements.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)
    closeButtonRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const close = () => {
    setOpen(false)
    triggerRef.current?.focus()
  }

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <>
      <header className="sidebar-dark fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur-xl lg:hidden">
        <button
          ref={triggerRef}
          onClick={() => setOpen(true)}
          className="-ml-1 flex h-10 w-10 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-surface-muted"
          aria-label="Abrir menú"
          aria-expanded={open}
          aria-controls="mobile-sidebar"
          aria-haspopup="dialog"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        <Link href="/dashboard" className="flex min-w-0 items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-3.5 w-3.5 text-primary-foreground" aria-hidden="true" />
          </div>
          <span className="truncate text-sm font-semibold tracking-tight text-foreground">CobroDetector</span>
        </Link>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('cobrodetector:command-menu'))}
            aria-label="Buscar secciones"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
          </button>
          <Link
            href="/precios"
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors ${
              creditsLeft === 0
                ? 'bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-500'
                : 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
            }`}
            aria-label={`${creditsLeft} créditos disponibles. Ir a comprar créditos`}
          >
            <Coins className="h-3.5 w-3.5" aria-hidden="true" />
            {creditsLeft}
          </Link>
          <div className="w-10">
            <ThemeToggle compact />
          </div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú de navegación">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={close} aria-hidden="true" />
          <aside
            id="mobile-sidebar"
            ref={panelRef}
            className="fixed bottom-0 left-0 top-0 flex h-full w-72 max-w-[85vw] animate-slide-in-right flex-col overflow-y-auto overscroll-contain border-r border-border bg-card"
          >
            <div className="flex items-center justify-between border-b border-border p-5">
              <Link href="/dashboard" className="group flex items-center gap-2.5" onClick={close}>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary">
                  <Shield className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
                </div>
                <div>
                  <span className="block text-sm font-semibold tracking-tight text-foreground">CobroDetector</span>
                  <p className="text-2xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Panel</p>
                </div>
              </Link>
              <button
                ref={closeButtonRef}
                onClick={close}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
                aria-label="Cerrar menú"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mx-3 mt-4 rounded-2xl border border-brand-200/70 bg-brand-50/70 p-4 dark:border-brand-500/20 dark:bg-brand-500/10">
              <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-brand-700 dark:text-brand-300">
                Créditos
              </p>
              <div className="mt-1 flex items-end justify-between">
                <p className="font-display text-3xl font-semibold tabular-nums text-brand-700 dark:text-brand-200">
                  {creditsLeft}
                </p>
                <p className="pb-1 text-2xs text-brand-700/70 dark:text-brand-300/70">de {creditsTotal}</p>
              </div>
              {creditsLeft === 0 ? (
                <Link
                  href="/precios"
                  onClick={close}
                  className="mt-2 inline-flex items-center gap-1 text-2xs font-semibold text-brand-700 hover:underline dark:text-brand-300"
                >
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  Comprar créditos
                  <ChevronRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              ) : (
                <p className="mt-2 text-2xs text-brand-700/70 dark:text-brand-300/70">Disponibles para analizar</p>
              )}
            </div>

            <div onClick={close}>
              <SidebarNav />
            </div>

            <div className="mt-2 px-3">
              <ThemeToggle />
            </div>

            <div className="mt-auto border-t border-border p-4">
              <div className="mb-3 flex items-center gap-3 px-1">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600">
                  <span className="text-sm font-bold text-white">{userInitial}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium leading-tight text-foreground">{userName}</p>
                  <p className="truncate text-2xs text-muted-foreground">{userEmail}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground disabled:opacity-60"
              >
                {loggingOut ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {loggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
