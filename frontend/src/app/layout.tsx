import type { Metadata, Viewport } from 'next'
import { Archivo, Instrument_Serif, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import { ThemeProvider } from 'next-themes'

// Fuentes self-hosted: elimina el @import bloqueante a Google Fonts del CSS
// y mejora LCP/CLS. Los nombres de variable los consume tailwind.config.ts.
const archivo = Archivo({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-archivo',
})

const instrument = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-instrument',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains',
})

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cobrodetector.cl'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'CobroDetector · Detecta cobros injustificados de tu banco',
    template: '%s · CobroDetector',
  },
  description:
    'Sube tu estado de cuenta y nuestra IA detecta comisiones duplicadas, errores en cuotas y cargos no reconocidos. Recupera tu dinero con un reporte listo para el banco.',
  keywords: [
    'cobros duplicados',
    'comisiones bancarias',
    'estado de cuenta',
    'Santander',
    'BCI',
    'Banco de Chile',
    'Chile',
  ],
  applicationName: 'CobroDetector',
  authors: [{ name: 'CobroDetector' }],
  openGraph: {
    type: 'website',
    locale: 'es_CL',
    siteName: 'CobroDetector',
    title: 'CobroDetector · Recupera lo que tu banco te cobró de más',
    description:
      'Análisis automático de estados de cuenta para detectar comisiones duplicadas, errores en cuotas y cargos no reconocidos.',
    url: APP_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CobroDetector · Recupera lo que tu banco te cobró de más',
    description:
      'Análisis automático de estados de cuenta con IA. Reporte listo para reclamar al banco.',
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f4ee' },
    { media: '(prefers-color-scheme: dark)', color: '#0c1018' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  return (
    <html
      lang="es-CL"
      suppressHydrationWarning
      className={`${archivo.variable} ${instrument.variable} ${jetbrains.variable}`}
    >
      <head>
        {supabaseUrl && (
          <>
            <link rel="preconnect" href={supabaseUrl} />
            <link rel="dns-prefetch" href={supabaseUrl} />
          </>
        )}
      </head>
      <body>
        <a href="#main-content" className="skip-link">
          Saltar al contenido
        </a>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster
            richColors
            position="top-right"
            toastOptions={{
              className: 'font-sans',
              duration: 4500,
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
