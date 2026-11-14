import Link from 'next/link'
import {
  ArrowRight,
  Banknote,
  Building2,
  CheckCircle2,
  ChevronRight,
  FileSearch,
  Lock,
  Quote,
  Shield,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  Trash2,
  Zap,
} from 'lucide-react'
import { PLANS, getPlanPriceDescription, getPlanPriceLabel, isPercentagePlan } from '@/lib/plans'
import { PlanComparison } from '@/components/plan-comparison'

const STEPS = [
  {
    icon: FileSearch,
    title: 'Sube tu estado de cuenta',
    desc: 'PDF, Excel o CSV del banco. Compatible con Santander, BCI, Banco de Chile, BancoEstado, Itaú y más.',
  },
  {
    icon: Sparkles,
    title: 'La IA revisa cada movimiento',
    desc: 'Detectamos comisiones duplicadas, errores en cuotas y cargos que no coinciden con ningún patrón real.',
  },
  {
    icon: TrendingDown,
    title: 'Reclama con evidencia',
    desc: 'Descarga un reporte con montos, fechas y transacciones de respaldo, listo para presentar en el banco.',
  },
]

const FINDINGS = [
  {
    title: 'Comisión de crédito duplicada',
    desc: 'La comisión de apertura se cobra una sola vez. Si aparece en cada cuota, es un cobro injustificado.',
    tone: 'danger' as const,
  },
  {
    title: 'Error en cuotas sin interés',
    desc: 'Ventas pactadas sin interés que incluyen cargos o tienen montos inconsistentes cuota a cuota.',
    tone: 'warning' as const,
  },
  {
    title: 'Cargos no reconocidos',
    desc: 'Cargos con descripción genérica o en código que no se pueden asociar a ninguna operación real.',
    tone: 'brand' as const,
  },
  {
    title: 'Cobros incorrectos',
    desc: 'Diferencias entre el monto pactado y el cobrado, o cargos repetidos en el mismo período.',
    tone: 'success' as const,
  },
]

const FAQ = [
  {
    q: '¿Qué bancos son compatibles?',
    a: 'Trabajamos con los principales bancos chilenos: Santander, BCI, Banco de Chile, BancoEstado, Itaú, Scotiabank, Security, Falabella y Ripley. Si tu banco no aparece, escríbenos y lo agregamos.',
  },
  {
    q: '¿Mis datos están seguros?',
    a: 'El archivo se cifra en tránsito con TLS y se procesa en un entorno aislado. Una vez terminado el análisis, el archivo original se elimina automáticamente: solo conservamos los resultados del reporte.',
  },
  {
    q: '¿El reporte sirve como reclamo formal?',
    a: 'El reporte ordena la evidencia (montos, fechas, transacciones) para que puedas presentar el reclamo por escrito en tu banco. Si no responden en 10 días hábiles, puedes escalar a la CMF.',
  },
  {
    q: '¿Cómo funcionan los créditos?',
    a: 'Cada análisis consume un crédito. Los créditos no vencen y puedes comprarlos según lo que necesites. El plan Platino no tiene costo fijo: pagas el 20% de lo que efectivamente recuperes.',
  },
  {
    q: '¿Qué pasa si no detectan nada?',
    a: 'Recibes el informe con el resultado del análisis. Gastar un crédito en un mes limpio también es útil: te deja evidencia de que revisaste y tienes una línea base para comparar más adelante.',
  },
]

const TONE = {
  danger: 'bg-danger-50 text-danger-600 dark:bg-danger-500/15 dark:text-danger-500',
  warning: 'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-500',
  brand: 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300',
  success: 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500',
} as const

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <a href="#main-content" className="sr-only focus:not-sr-only">
        Ir al contenido
      </a>

      {/* NAV */}
      <header className="site-header sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="hidden border-b border-border/60 md:block">
          <div className="mx-auto flex h-7 max-w-6xl items-center justify-between px-6 font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            <span>CobroDetector · Informe financiero</span>
            <span>Chile · {new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
          </div>
        </div>
        <nav aria-label="Principal" className="mx-auto flex h-[68px] max-w-6xl items-center justify-between px-5 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5" aria-label="CobroDetector, inicio">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary shadow-sm">
              <Shield className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
            </span>
            <span className="font-display text-xl tracking-tight">CobroDetector</span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {[
              ['#como-funciona', 'Cómo funciona'],
              ['#detectamos', 'Qué detectamos'],
              ['#precios', 'Precios'],
              ['#faq', 'Preguntas'],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted sm:block"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/login?mode=signup"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Comenzar
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </nav>
      </header>

      <main id="main-content" tabIndex={-1}>
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 grid-backdrop opacity-60" aria-hidden="true" />
          <div className="pointer-events-none absolute -top-32 right-0 h-[420px] w-[420px] glow-blob" aria-hidden="true" />

          <div className="relative mx-auto grid max-w-6xl gap-12 px-5 pb-16 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:pb-24">
            <div>
              <div className="stamp text-primary">
                <Banknote className="h-3 w-3" aria-hidden="true" />
                Auditoría de cartolas · Pymes Chile
              </div>

              <h1 className="mt-7 max-w-xl text-balance font-display text-[3.2rem] leading-[0.96] tracking-tight sm:text-[4rem] lg:text-[4.6rem]">
                Tu banco te puede estar cobrando de más.
                <span className="mt-2 block italic text-primary">Recupéralo con evidencia.</span>
              </h1>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Sube tu estado de cuenta y revisamos cada transacción buscando comisiones duplicadas, errores en cuotas
                y cargos injustificados. Recibes un reporte listo para reclamar.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/login?mode=signup"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/90"
                >
                  Analizar mi estado de cuenta
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <a
                  href="#como-funciona"
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-transparent px-6 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-card"
                >
                  Ver cómo funciona
                </a>
              </div>

              <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5 text-success-600 dark:text-success-500" aria-hidden="true" />
                Cifrado AES-256-GCM en tu navegador · El archivo se elimina al terminar el análisis
              </p>

              <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-border pt-6">
                {[
                  { value: '3 min', label: 'Tiempo de análisis' },
                  { value: '9+', label: 'Bancos compatibles' },
                  { value: '0', label: 'Costo si no hay hallazgos*' },
                ].map((stat) => (
                  <div key={stat.label}>
                    <dt className="sr-only">{stat.label}</dt>
                    <dd>
                      <p className="font-display text-3xl tracking-tight">{stat.value}</p>
                      <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{stat.label}</p>
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-2xs text-muted-foreground">*Con Plan Platino: pagas solo el 20% de lo recuperado.</p>
            </div>

            {/* Mock del reporte */}
            <div className="relative mx-auto w-full max-w-md lg:max-w-none lg:rotate-[1.2deg]">
              <div className="absolute -top-3 left-8 z-10 rounded-t-md bg-primary px-3 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-primary-foreground">
                Expediente confidencial
              </div>
              <div className="dossier relative overflow-hidden rounded-b-xl rounded-t-none">
                <span className="stamp absolute right-4 top-16 z-10 hidden text-danger-600 sm:inline-flex">Prioridad alta</span>
                <div className="flex items-center justify-between border-b border-border/80 px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-danger-50 text-danger-600 dark:bg-danger-500/15 dark:text-danger-500">
                      <FileSearch className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-xs font-semibold">cartola-marzo.csv</p>
                      <p className="text-2xs text-muted-foreground">Banco Santander · 312 movimientos</p>
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  <p className="eyebrow">Monto recuperable estimado</p>
                  <p className="mt-1 font-display text-5xl tracking-tight tabular-nums">$487.300</p>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    {[
                      { label: 'Hallazgos', value: '7', tone: 'text-danger-600 dark:text-danger-500' },
                      { label: 'Mayor cobro', value: '$189K', tone: 'text-foreground' },
                      { label: 'Confianza', value: '92%', tone: 'text-success-600 dark:text-success-500' },
                    ].map((item) => (
                      <div key={item.label} className="rounded-xl bg-surface-muted px-2 py-2.5">
                        <p className="text-2xs text-muted-foreground">{item.label}</p>
                        <p className={`mt-0.5 font-display text-sm font-semibold tabular-nums ${item.tone}`}>
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 space-y-2">
                    {[
                      { title: 'Comisión de crédito duplicada', detail: '12 cuotas · $251.300', tone: 'danger' as const },
                      { title: 'Error en cuotas sin interés', detail: '3 cuotas · $94.000', tone: 'warning' as const },
                      { title: 'Cargo no reconocido', detail: '1 movimiento · $42.000', tone: 'brand' as const },
                    ].map((finding) => (
                      <div
                        key={finding.title}
                        className="flex items-center gap-2.5 border-b border-border/70 py-2.5 last:border-b-0"
                      >
                        <span className={`h-6 w-1 shrink-0 rounded-full ${
                          finding.tone === 'danger'
                            ? 'bg-danger-500'
                            : finding.tone === 'warning'
                              ? 'bg-warning-500'
                              : 'bg-brand-500'
                        }`} aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">{finding.title}</p>
                          <p className="text-2xs text-muted-foreground">{finding.detail}</p>
                        </div>
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-success-600 dark:text-success-500" aria-hidden="true" />
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-success-600/30 pt-3">
                    <p className="text-xs font-medium text-success-700 dark:text-success-500">Reporte listo para el banco</p>
                    <span className="rounded-sm bg-success-600 px-2.5 py-1 text-2xs font-semibold text-white">
                      Descargar
                    </span>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-4 -left-4 hidden rounded-xl border border-border bg-card px-3 py-2 shadow-lift sm:block">
                <p className="flex items-center gap-1.5 text-2xs font-medium text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-success-600 dark:text-success-500" aria-hidden="true" />
                  Archivo original eliminado
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* BANCOS */}
        <section className="border-y border-border bg-surface-muted/60 py-6" aria-label="Bancos compatibles">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-5 sm:flex-row sm:justify-between sm:px-6">
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Building2 className="h-4 w-4" aria-hidden="true" />
              Compatible con los principales bancos de Chile
            </p>
            <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
              {['Santander', 'BCI', 'Banco de Chile', 'BancoEstado', 'Itaú', 'Scotiabank', 'Security'].map((bank) => (
                <li key={bank} className="font-display text-sm font-medium text-muted-foreground/80">
                  {bank}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CÓMO FUNCIONA */}
        <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20 sm:px-6">
          <div className="max-w-2xl">
            <p className="section-index">01 / Cómo funciona</p>
            <h2 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">De la cartola al reclamo en tres pasos</h2>
            <p className="mt-3 text-muted-foreground">
              Sin planillas, sin revisar 300 movimientos a mano y sin adivinar qué cobro es incorrecto.
            </p>
          </div>

          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="relative rounded-lg border border-border bg-card p-6">
                <span className="absolute right-5 top-5 font-mono text-xs font-semibold text-muted-foreground/50">
                  0{index + 1}
                </span>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                  <step.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* PROBLEMA / DETECCIÓN */}
        <section id="detectamos" className="border-y border-border bg-surface-muted/50 scroll-mt-20 py-20">
          <div className="mx-auto max-w-6xl px-5 sm:px-6">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
              <div>
                <p className="section-index">02 / Qué detectamos</p>
                <h2 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">
                  Los errores que más plata te cuestan
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  No todos los cobros raros son errores, y no todos los errores son obvios. Estas son las cuatro
                  categorías con mayor tasa de recuperación en cartolas de pymes.
                </p>
                <Link
                  href="/login?mode=signup"
                  className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline dark:text-brand-300"
                >
                  Revisar mi cartola
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {FINDINGS.map((finding) => (
                  <div key={finding.title} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${TONE[finding.tone]}`}>
                      <Zap className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <h3 className="mt-3.5 text-sm font-semibold">{finding.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{finding.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONIO */}
        <section className="mx-auto max-w-4xl px-5 py-20 sm:px-6">
          <figure className="relative rounded-3xl border border-border bg-card p-8 shadow-card sm:p-10">
            <Quote className="h-7 w-7 text-brand-500/40" aria-hidden="true" />
            <blockquote className="mt-4 text-lg leading-relaxed text-foreground sm:text-xl">
              Revisando los pagos con tarjeta de mi carnicería descubrí que el banco me cobraba la comisión de crédito
              en <strong>cada cuota</strong>, cuando solo debía cobrarse una vez. Con el reporte pude reclamar con
              evidencia, sin revisar los movimientos uno por uno.
            </blockquote>
            <figcaption className="mt-5 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Rodrigo</span> · dueño de carnicería, Rancagua
              <span className="mt-0.5 block text-xs">
                Caso que inspiró CobroDetector. El monto recuperable depende de tu propia cartola.
              </span>
            </figcaption>
          </figure>
        </section>

        {/* SEGURIDAD */}
        <section className="border-y border-border bg-surface-muted/50 py-16">
          <div className="mx-auto max-w-6xl px-5 sm:px-6">
            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  icon: Lock,
                  title: 'Cifrado en tu navegador',
                  desc: 'Tu cartola se cifra con AES-256-GCM antes de salir, con una clave única por análisis.',
                },
                {
                  icon: Trash2,
                  title: 'Eliminación automática',
                  desc: 'El estado de cuenta original se borra al terminar el análisis.',
                },
                {
                  icon: ShieldCheck,
                  title: 'Evidencia auditable',
                  desc: 'Cada hallazgo queda vinculado a las transacciones que lo respaldan.',
                },
              ].map((item) => (
                <div key={item.title} className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card text-success-600 shadow-card dark:text-success-500">
                    <item.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">{item.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRECIOS */}
        <section id="precios" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20 sm:px-6">
          <div className="max-w-2xl">
            <p className="section-index">03 / Precios</p>
            <h2 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">Pago por análisis, sin suscripción</h2>
            <p className="mt-3 text-muted-foreground">Los créditos no vencen. Elige según cuántas cartolas revises.</p>
          </div>

          <PlanComparison
            className="mt-8 md:hidden"
            renderAction={(plan) => (
              <Link
                href="/login?mode=signup"
                className={`inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                  plan.highlighted
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'border border-border bg-surface-muted text-foreground hover:bg-muted'
                }`}
              >
                {isPercentagePlan(plan) ? 'Empezar sin costo fijo' : 'Comenzar'}
              </Link>
            )}
          />

          <div className="mt-10 hidden gap-5 md:grid sm:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((plan) => {
              const percentage = isPercentagePlan(plan)
              return (
                <div
                  key={plan.key}
                  className={`relative flex flex-col rounded-2xl border p-6 ${
                    plan.highlighted
                      ? 'border-primary bg-card shadow-glow'
                      : 'border-border bg-card shadow-card'
                  }`}
                >
                  {plan.highlighted && (
                    <span className="absolute -top-2.5 left-5 rounded-full bg-primary px-2.5 py-0.5 text-2xs font-semibold text-primary-foreground">
                      Más popular
                    </span>
                  )}

                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold">{plan.name}</h3>
                    {percentage && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-success-200 bg-success-50 px-1.5 py-0.5 text-2xs font-semibold text-success-700 dark:border-success-500/30 dark:bg-success-500/15 dark:text-success-500">
                        <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
                        Éxito
                      </span>
                    )}
                  </div>

                  <p className="mt-3 font-display text-2xl font-semibold tracking-tight">
                    {getPlanPriceLabel(plan)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{getPlanPriceDescription(plan)}</p>

                  <ul className="mt-5 flex-1 space-y-2.5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-xs leading-relaxed">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success-600 dark:text-success-500" aria-hidden="true" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/login?mode=signup"
                    className={`mt-6 inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                      plan.highlighted
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'border border-border bg-surface-muted text-foreground hover:bg-muted'
                    }`}
                  >
                    {percentage ? 'Empezar sin costo fijo' : 'Comenzar'}
                  </Link>
                </div>
              )
            })}
          </div>

          <p className="mt-6 hidden text-center text-xs text-muted-foreground md:block">
            Todos los planes incluyen análisis completos y reporte descargable.
          </p>
        </section>

        {/* FAQ */}
        <section id="faq" className="border-t border-border bg-surface-muted/40 scroll-mt-20 py-20">
          <div className="mx-auto max-w-3xl px-5 sm:px-6">
            <div className="max-w-2xl">
              <p className="section-index">04 / Preguntas frecuentes</p>
              <h2 className="mt-3 font-display text-4xl tracking-tight">Lo que suelen preguntarnos</h2>
            </div>

            <div className="mt-8 space-y-3">
              {FAQ.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-lg border border-border bg-card px-5 py-4 [&_summary::-webkit-details-marker]:hidden"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-4 text-sm font-semibold">
                    {item.q}
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
                      aria-hidden="true"
                    />
                  </summary>
                  <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="mx-auto max-w-6xl px-5 py-20 sm:px-6">
          <div className="relative overflow-hidden rounded-lg border border-foreground/15 bg-foreground px-6 py-14 text-center text-background sm:px-12">
            <div className="pointer-events-none absolute inset-0 grid-backdrop opacity-40" aria-hidden="true" />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl font-display text-4xl tracking-tight sm:text-5xl">
                Descubre en 3 minutos si te están cobrando de más
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-sm text-background/65 sm:text-base">
                Sube tu cartola, revisa los hallazgos y descarga el reporte con la evidencia.
              </p>
              <Link
                href="/login?mode=signup"
                className="mt-7 inline-flex items-center gap-2 rounded-md bg-background px-6 py-3.5 text-sm font-semibold text-foreground transition-all duration-200 hover:-translate-y-0.5"
              >
                Empezar ahora
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer border-t border-border py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                <Shield className="h-3.5 w-3.5 text-primary-foreground" aria-hidden="true" />
              </span>
              <span className="font-display text-sm font-semibold">CobroDetector</span>
            </Link>
            <nav aria-label="Enlaces del pie" className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <a href="#como-funciona" className="hover:text-foreground">Cómo funciona</a>
              <a href="#precios" className="hover:text-foreground">Precios</a>
              <a href="#faq" className="hover:text-foreground">Preguntas</a>
              <Link href="/seguridad" className="hover:text-foreground">Seguridad</Link>
              <Link href="/login" className="hover:text-foreground">Iniciar sesión</Link>
            </nav>
          </div>
          <div className="flex flex-col items-start justify-between gap-2 border-t border-border pt-5 text-2xs text-muted-foreground sm:flex-row sm:items-center">
            <p>© {new Date().getFullYear()} CobroDetector. Hecho en Chile para emprendedores chilenos.</p>
            <p>La CMF recibe reclamos en cmfchile.cl si el banco no responde en 10 días hábiles.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
