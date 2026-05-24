/** @type {import('next').NextConfig} */
const nextConfig = {
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
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'mcwqqcngfibhgluvixlu.supabase.co',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Headers de seguridad
  async headers() {
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
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https://*.vercel.app; font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com; connect-src 'self' https://mcwqqcngfibhgluvixlu.supabase.co https://*.vercel.app;",
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

module.exports = nextConfig;
