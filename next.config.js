/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // Para archivos PDF/Excel grandes
    },
  },
}

module.exports = nextConfig
