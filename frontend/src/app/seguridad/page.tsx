import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowLeft,
  CheckCircle2,
  Database,
  FileLock2,
  Lock,
  ShieldCheck,
  Trash2,
  UserCheck,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Seguridad y privacidad · CobroDetector',
  description:
    'Cómo protegemos tus cartolas: cifrado AES-256, procesamiento aislado, borrado automático y acceso restringido.',
}

const SECTIONS = [
  {
    icon: FileLock2,
    title: 'Qué datos recibimos',
    body: 'Solo la cartola que tú descargas del banco: fechas, descripciones y montos de tus movimientos. No te pedimos claves bancarias, acceso a tu cuenta ni tokens de tu banco.',
  },
  {
    icon: Lock,
    title: 'Cifrado antes de subir',
    body: 'El archivo se cifra en tu navegador con AES-256-GCM antes de salir. La clave se genera por cada análisis y se usa una sola vez para descifrarlo en el servidor.',
  },
  {
    icon: Trash2,
    title: 'Borrado automático',
    body: 'El archivo cifrado se elimina de Storage al terminar el análisis, incluso si el procesamiento falla. Conservamos solo los resultados: transacciones, hallazgos y el reporte.',
  },
  {
    icon: Database,
    title: 'Dónde se procesa',
    body: 'El análisis corre en un servicio aislado con acceso restringido. La base de datos y el almacenamiento usan cifrado en reposo y políticas de acceso por usuario (RLS).',
  },
  {
    icon: UserCheck,
    title: 'Quién puede verlo',
    body: 'Solo tu cuenta puede leer tus análisis. El acceso interno está limitado a lo necesario para operar y depurar el servicio, con registros de auditoría.',
  },
  {
    icon: ShieldCheck,
    title: 'Tus derechos',
    body: 'Puedes eliminar un análisis desde el historial. Si necesitas eliminar tu cuenta o todos tus datos, escríbenos a soporte@cobrodetector.cl y lo gestionamos.',
  },
]

const PROVIDERS = [
  { name: 'Supabase', role: 'Autenticación, base de datos y almacenamiento cifrado' },
  { name: 'Vercel', role: 'Hosting del frontend' },
  { name: 'Groq', role: 'Capa opcional de IA; si no está configurada, el motor sigue funcionando con reglas' },
  { name: 'MercadoPago', role: 'Procesamiento de pagos; no recibe tus cartolas' },
]

export default function SeguridadPage() {
  return (
    <main id="main-content" className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-6 sm:py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Volver al inicio
        </Link>

        <header className="mt-8">
          <p className="eyebrow-accent">Seguridad y privacidad</p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-[2.6rem]">
            Tu cartola es sensible. La tratamos así.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Esta página explica, sin letra chica, qué hacemos con tus datos y qué no hacemos.
            Si algo no queda claro, escríbenos a <strong className="text-foreground">soporte@cobrodetector.cl</strong>.
          </p>
        </header>

        <section className="mt-10 grid gap-4 sm:grid-cols-2">
          {SECTIONS.map((section) => (
            <article key={section.title} className="rounded-2xl border border-border bg-card p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <section.icon className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
              <h2 className="mt-4 font-display text-base font-semibold tracking-tight">{section.title}</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{section.body}</p>
            </article>
          ))}
        </section>

        <section className="mt-10 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold tracking-tight">Proveedores que participan</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Solo los necesarios para operar el servicio. No vendemos ni compartimos tus datos con terceros para publicidad.
          </p>
          <ul className="mt-4 divide-y divide-border/70">
            {PROVIDERS.map((provider) => (
              <li key={provider.name} className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                <span className="text-sm font-semibold text-foreground">{provider.name}</span>
                <span className="text-right text-xs text-muted-foreground">{provider.role}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6 rounded-2xl border border-success-200 bg-success-50/60 p-6 dark:border-success-500/25 dark:bg-success-500/5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success-600 dark:text-success-500" aria-hidden="true" />
            <div>
              <h2 className="font-display text-base font-semibold tracking-tight">Lo que nunca hacemos</h2>
              <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-muted-foreground">
                <li>No pedimos claves ni acceso a tu banca en línea.</li>
                <li>No guardamos el archivo original después de procesarlo.</li>
                <li>No usamos tus movimientos para publicidad ni los vendemos.</li>
              </ul>
            </div>
          </div>
        </section>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Última actualización: noviembre 2026 · ¿Necesitas algo más?{' '}
          <a href="mailto:soporte@cobrodetector.cl" className="font-medium text-primary hover:underline">
            soporte@cobrodetector.cl
          </a>
        </p>
      </div>
    </main>
  )
}
