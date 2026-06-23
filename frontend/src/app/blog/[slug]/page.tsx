import { getPostBySlug, getAllPosts } from '@/lib/blog'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Calendar, Tag, Clock } from 'lucide-react'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const posts = getAllPosts()
  return posts.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) return { title: 'No encontrado' }

  return {
    title: `${post.title} — Blog CobroDetector`,
    description: post.description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
      tags: post.tags,
      locale: 'es_CL',
    },
  }
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#0a0a0f]">
      <article className="max-w-3xl mx-auto px-4 py-12 lg:py-20">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al blog
        </Link>

        <header className="mb-10">
          <h1 className="text-3xl lg:text-4xl font-display font-bold text-gray-900 dark:text-gray-100 mb-4 leading-tight">
            {post.title}
          </h1>
          <p className="text-lg text-gray-500 dark:text-gray-400 mb-6">
            {post.description}
          </p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 border-b border-gray-200 dark:border-gray-800 pb-6">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {new Date(post.date).toLocaleDateString('es-CL', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {Math.ceil(post.content.split(/\s+/).length / 200)} min de lectura
            </span>
            <span className="flex items-center gap-1.5">
              <Tag className="w-4 h-4" />
              {post.tags.join(', ')}
            </span>
          </div>
        </header>

        <div className="prose prose-lg dark:prose-invert max-w-none">
          {post.content.split('\n').map((paragraph, i) => {
            const trimmed = paragraph.trim()
            if (!trimmed) return null

            if (trimmed.startsWith('# ')) {
              return (
                <h1 key={i} className="text-3xl font-display font-bold text-gray-900 dark:text-gray-100 mt-8 mb-4">
                  {trimmed.replace('# ', '')}
                </h1>
              )
            }
            if (trimmed.startsWith('## ')) {
              return (
                <h2 key={i} className="text-2xl font-display font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
                  {trimmed.replace('## ', '')}
                </h2>
              )
            }
            if (trimmed.startsWith('### ')) {
              return (
                <h3 key={i} className="text-xl font-display font-semibold text-gray-800 dark:text-gray-200 mt-4 mb-2">
                  {trimmed.replace('### ', '')}
                </h3>
              )
            }
            if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
              return null // Tables handled below
            }
            if (trimmed.startsWith('- ')) {
              return (
                <li key={i} className="text-gray-700 dark:text-gray-300 leading-relaxed ml-6 list-disc">
                  {trimmed.replace('- ', '')}
                </li>
              )
            }
            if (trimmed.startsWith('> ')) {
              return (
                <blockquote key={i} className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-50 dark:bg-blue-950/20 rounded-r-lg text-gray-700 dark:text-gray-300 italic">
                  {trimmed.replace('> ', '')}
                </blockquote>
              )
            }
            if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
              return (
                <p key={i} className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4 font-semibold">
                  {trimmed.replace(/^\*\*|\*\*$/g, '')}
                </p>
              )
            }
            if (trimmed.startsWith('```')) {
              return null
            }

            return (
              <p key={i} className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                {trimmed}
              </p>
            )
          })}
        </div>

        <footer className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-2xl p-6 text-center">
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              ¿Quieres detectar cobros injustificados en tu estado de cuenta?
            </p>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Sube tu estado de cuenta y nuestra IA encontrará comisiones duplicadas, errores y cargos no reconocidos.
            </p>
            <Link
              href="/analisis"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              Analizar mi estado de cuenta →
            </Link>
          </div>
        </footer>
      </article>
    </div>
  )
}
