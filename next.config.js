/** @type {import('next').NextConfig} */
const { withSentryConfig } = require('@sentry/nextjs');

const nextConfig = {
  typescript: {
    // No ignorar errores de TypeScript en build
    ignoreBuildErrors: false,
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
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.sentry.io; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://*.supabase.co https://*.vercel.app https://*.sentry.io;",
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

// Configuración de Sentry
const sentryWebpackPluginOptions = {
  // Only print logs for uploading source maps in CI
  silent: true,  // Silenciar logs
  
  org: process.env.SENTRY_ORG || "deev-aq",
  project: process.env.SENTRY_PROJECT || "cobro-detector",
  
  // Auth token for uploading source maps
  authToken: process.env.SENTRY_AUTH_TOKEN,
  
  // Suppresses source map uploading logs
  suppressErrors: true,
  
  // Upload source maps for better error tracking
  sourcemaps: {
    disable: true,  // ← Desactivado temporalmente hasta arreglar auth token
  },
  
  // Opciones adicionales
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
}

module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions);
