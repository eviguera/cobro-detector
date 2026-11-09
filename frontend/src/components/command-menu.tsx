'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import {
  BarChart3,
  CreditCard,
  FileSearch,
  Gift,
  Home,
  LayoutDashboard,
  Plus,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react'

const ROUTES = [
  { href: '/dashboard', label: 'Panel', hint: 'Resumen general', icon: LayoutDashboard, keywords: 'dashboard inicio panel' },
  { href: '/analisis', label: 'Nuevo análisis', hint: 'Subir estado de cuenta', icon: Plus, keywords: 'subir csv pdf excel analizar' },
  { href: '/historial', label: 'Historial', hint: 'Análisis anteriores', icon: FileSearch, keywords: 'reportes historial' },
  { href: '/dashboard/analytics', label: 'Métricas', hint: 'Tendencias y tipos de hallazgo', icon: BarChart3, keywords: 'métricas gráficos' },
  { href: '/precios', label: 'Créditos y planes', hint: 'Comprar créditos', icon: CreditCard, keywords: 'precio plan comprar pago' },
  { href: '/referidos', label: 'Referidos', hint: 'Invita y gana', icon: Gift, keywords: 'invitar referido' },
  { href: '/admin', label: 'Administración', hint: 'Panel de admin', icon: Users, keywords: 'admin usuarios' },
  { href: '/', label: 'Página principal', hint: 'Volver al inicio', icon: Home, keywords: 'landing inicio' },
]

const OPEN_EVENT = 'cobrodetector:command-menu'

/** Botón para abrir la búsqueda rápida desde la barra lateral. */
export function CommandMenuTrigger({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
      className={
        className ??
        'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground'
      }
      aria-label="Abrir búsqueda rápida (Ctrl o Cmd + K)"
    >
      <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="flex-1 text-left">Buscar</span>
      <kbd className="rounded border border-border px-1.5 py-0.5 font-mono text-2xs">⌘K</kbd>
    </button>
  )
}

export function CommandMenu() {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((current) => !current)
      }
    }
    const onOpen = () => setOpen(true)
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener(OPEN_EVENT, onOpen)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener(OPEN_EVENT, onOpen)
    }
  }, [])

  const go = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Búsqueda rápida"
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 px-4 pt-[18vh] backdrop-blur-sm"
      shouldFilter
    >
        <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-lift">
          <div className="flex items-center gap-2 border-b border-border px-4">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <Command.Input
              autoFocus
              placeholder="Ir a… escribe una sección"
              className="h-12 w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <kbd className="shrink-0 rounded border border-border px-1.5 py-0.5 font-mono text-2xs text-muted-foreground">
              esc
            </kbd>
          </div>

          <Command.List className="max-h-72 overflow-y-auto p-2">
            <Command.Empty className="px-3 py-8 text-center text-sm text-muted-foreground">
              Sin resultados.
            </Command.Empty>

            <Command.Group
              heading="Navegación"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground"
            >
              {ROUTES.map((route) => (
                <Command.Item
                  key={route.href}
                  value={`${route.label} ${route.hint} ${route.keywords}`}
                  onSelect={() => go(route.href)}
                  className="flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-sm text-foreground data-[selected=true]:bg-brand-50 data-[selected=true]:text-brand-700 dark:data-[selected=true]:bg-brand-500/15 dark:data-[selected=true]:text-brand-300"
                >
                  <route.icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="flex-1">{route.label}</span>
                  <span className="text-2xs text-muted-foreground">{route.hint}</span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>

          <div className="flex items-center justify-between border-t border-border px-4 py-2 text-2xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3 text-success-600 dark:text-success-500" aria-hidden="true" />
              Tus datos permanecen cifrados
            </span>
            <span>↑↓ para mover · ↵ para abrir</span>
          </div>
        </div>
      </Command.Dialog>
  )
}
