/** @type {import('next').NextConfig} */
const withMDX = require('@next/mdx')({
  extension: /\.mdx?$/,
})

// La URL de Supabase define qué orígenes se permiten en CSP e imágenes.
// Antes estaba hardcodeada a un proyecto que ya no existe.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
let supabaseUrlParsed = null
try {
  if (supabaseUrl) supabaseUrlParsed = new URL(supabaseUrl)
} catch {
  supabaseUrlParsed = null
}
const supabaseOrigin = supabaseUrlParsed ? supabaseUrlParsed.origin : ''
const isDev = process.env.NODE_ENV !== 'production'

const devOrigins = isDev
  ? ['http://localhost:*', 'http://127.0.0.1:*', 'ws://localhost:*', 'ws://127.0.0.1:*']
  : []

const connectSrc = [
  "'self'",
  supabaseOrigin,
  'https://*.supabase.co',
  'https://*.vercel.app',
  ...devOrigins,
]
  .filter(Boolean)
  .join(' ')

const imgSrc = [
  "'self'",
  'data:',
  'blob:',
  supabaseOrigin,
  'https://*.supabase.co',
  'https://*.vercel.app',
  ...(isDev ? ['http://localhost:*', 'http://127.0.0.1:*'] : []),
]
  .filter(Boolean)
  .join(' ')

const remotePatterns = supabaseUrlParsed
  ? [
      {
        protocol: supabaseUrlParsed.protocol.replace(':', ''),
        hostname: supabaseUrlParsed.hostname,
        ...(supabaseUrlParsed.port ? { port: supabaseUrlParsed.port } : {}),
        pathname: '/storage/v1/object/**',
      },
    ]
  : []

const nextConfig = {
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
  // Permite compilar a un directorio alterno mientras hay un `next dev` activo
  // (evita que ambos procesos compartan .next y se corrompan los manifests).
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // NOTA: ignoreBuildErrors está activo porque @supabase/ssr (v0.10.3) sigue
  // teniendo problemas de inferencia con el Database genérico (retorna 'never').
  // Los tipos en database.types.ts están sincronizados con las migraciones.
  // Para eliminar ignoreBuildErrors en el futuro:
  // 1. Esperar fix definitivo de @supabase/ssr
  // 2. O migrar a @supabase/supabase-js directamente para server components
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Headers de seguridad
  async headers() {
    const isProd = process.env.NODE_ENV === 'production'
    // En producción eliminamos 'unsafe-eval' y limitamos 'unsafe-inline' con nonce cuando sea posible.
    // Next.js requiere 'unsafe-inline' para hidratación de RSC; se mitiga con report-uri y HSTS.
    const scriptSrc = isProd
      ? ["script-src 'self' 'unsafe-inline' https://fonts.googleapis.com"]
      : ["script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com"]

    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              ...scriptSrc,
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              `img-src ${imgSrc}`,
              "font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com",
              `connect-src ${connectSrc}`,
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "report-uri /api/csp-report",
            ].join('; ') + ';',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },
}

module.exports = withMDX(nextConfig);
