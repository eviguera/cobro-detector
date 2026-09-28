import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'sonner'
import { ThemeProvider } from 'next-themes'
import * as Sentry from '@sentry/nextjs'

export const metadata: Metadata = {
  title: 'CobroDetector · Detecta cobros injustificados de tu banco',
  description: 'Sube tu estado de cuenta y nuestra IA detecta comisiones duplicadas, errores en cuotas y cargos no reconocidos. Recupera tu dinero.',
  keywords: 'cobros duplicados, comisiones bancarias, estado de cuenta, Santander, BCI, Chile',
}

// Inicializar Sentry en el cliente
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    environment: process.env.NODE_ENV || 'development',
  })
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://mcwqqcngfibhgluvixlu.supabase.co" />
        <link rel="dns-prefetch" href="https://mcwqqcngfibhgluvixlu.supabase.co" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <a href="#main-content" className="skip-link">
          Saltar al contenido
        </a>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
