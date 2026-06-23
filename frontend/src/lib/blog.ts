import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

export interface BlogPost {
  slug: string
  title: string
  description: string
  date: string
  author: string
  tags: string[]
  image?: string
  content: string
}

const contentDir = path.join(process.cwd(), 'src', 'content', 'blog')

export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(contentDir)) return []

  const files = fs.readdirSync(contentDir).filter((f) => f.endsWith('.mdx'))

  const posts = files.map((file) => {
    const raw = fs.readFileSync(path.join(contentDir, file), 'utf-8')
    const { data, content } = matter(raw)
    const slug = file.replace(/\.mdx$/, '')

    return {
      slug,
      title: data.title || slug,
      description: data.description || '',
      date: data.date || '',
      author: data.author || 'Equipo CobroDetector',
      tags: data.tags || [],
      image: data.image,
      content,
    }
  })

  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export function getPostBySlug(slug: string): BlogPost | null {
  const posts = getAllPosts()
  return posts.find((p) => p.slug === slug) || null
}

export function getAllTags(): string[] {
  const posts = getAllPosts()
  const tagSet = new Set<string>()
  for (const post of posts) {
    for (const tag of post.tags) {
      tagSet.add(tag)
    }
  }
  return Array.from(tagSet).sort()
}
