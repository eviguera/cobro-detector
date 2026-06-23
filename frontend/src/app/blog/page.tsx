import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllPosts, getAllTags } from '@/lib/blog'
import { Calendar, Tag, ArrowRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Blog — CobroDetector',
  description: 'Artículos sobre detección de cobros injustificados, comisiones bancarias, reclamos y educación financiera para comercios chilenos.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'Blog de CobroDetector — Detecta cobros injustificados',
    description: 'Guías, casos reales y educación financiera para dueños de negocios en Chile.',
    type: 'website',
    locale: 'es_CL',
  },
}

export default function BlogPage() {
  const posts = getAllPosts()
  const tags = getAllTags()

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#0a0a0f]">
      <div className="max-w-4xl mx-auto px-4 py-16 lg:py-24">
        <div className="text-center mb-16">
          <h1 className="text-4xl lg:text-5xl font-display font-bold text-gray-900 dark:text-gray-100 mb-4">
            Blog de CobroDetector
          </h1>
          <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
            Guías, casos reales y educación financiera para detectar y reclamar cobros injustificados en estados de cuenta bancarios.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2">
            <Link href="/login" className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm">
              Comenzar gratis <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {tags.map((tag) => (
              <span key={tag} className="px-3 py-1 text-xs font-medium bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full border border-gray-200 dark:border-gray-700">
                {tag}
              </span>
            ))}
          </div>
        )}

        {posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500">Pronto publicaremos artículos. ¡Vuelve a visitarnos!</p>
          </div>
        ) : (
          <div className="grid gap-8">
            {posts.map((post, i) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group block bg-white dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-800/40 p-6 lg:p-8 hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-800/40 transition-all duration-300"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:gap-8">
                  <div className="flex-1">
                    <h2 className="text-xl lg:text-2xl font-display font-bold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {post.title}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
                      {post.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        {new Date(post.date).toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Tag className="w-4 h-4" />
                        {post.tags.slice(0, 3).join(', ')}
                      </span>
                    </div>
                  </div>
                  {i === 0 && post.image && (
                    <div className="hidden lg:block w-48 h-32 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-950/40 dark:to-blue-900/20 rounded-xl flex-shrink-0" />
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
