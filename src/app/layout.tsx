import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import { ThemeProvider } from 'next-themes'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CobroDetector · Detecta cobros injustificados de tu banco',
  description: 'Sube tu estado de cuenta y nuestra IA detecta comisiones duplicadas, errores en cuotas y cargos no reconocidos. Recupera tu dinero.',
  keywords: 'cobros duplicados, comisiones bancarias, estado de cuenta, Santander, BCI, Chile',
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
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
