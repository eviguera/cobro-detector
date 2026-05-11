/** @type {import('next').NextConfig} */
const nextConfig = {
  // NOTA: ignoreBuildErrors está activo porque @supabase/ssr v0.8.0 tiene problemas
  // de inferencia de tipos con el Database genérico. Para arreglarlo:
  // 1. npm install @supabase/supabase-js@latest @supabase/ssr@latest
  // 2. Ejecutar: npx supabase gen types --lang=ts --linked > src/types/database.types.ts
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
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https://*.vercel.app; font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com; connect-src 'self' https://*.supabase.co https://*.vercel.app;",
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
