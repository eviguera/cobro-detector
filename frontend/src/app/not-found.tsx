import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-6xl font-bold text-gray-200 mb-4">404</p>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Página no encontrada</h1>
        <p className="text-gray-500 mb-6">El análisis que buscas no existe o no tienes acceso.</p>
        <Link href="/dashboard" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          Volver al dashboard
        </Link>
      </div>
    </div>
  )
}
