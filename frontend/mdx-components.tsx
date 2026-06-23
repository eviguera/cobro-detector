import type { MDXComponents } from 'mdx/types'

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children }) => (
      <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-gray-100 mt-8 mb-4">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-2xl font-display font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-xl font-display font-semibold text-gray-800 dark:text-gray-200 mt-4 mb-2">{children}</h3>
    ),
    p: ({ children }) => (
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">{children}</p>
    ),
    ul: ({ children }) => (
      <ul className="list-disc pl-6 space-y-2 mb-4 text-gray-700 dark:text-gray-300">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal pl-6 space-y-2 mb-4 text-gray-700 dark:text-gray-300">{children}</ol>
    ),
    li: ({ children }) => (
      <li className="leading-relaxed">{children}</li>
    ),
    a: ({ href, children }) => (
      <a href={href} className="text-blue-600 dark:text-blue-400 hover:underline font-medium" target={href?.startsWith('http') ? '_blank' : undefined} rel={href?.startsWith('http') ? 'noopener' : undefined}>
        {children}
      </a>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold text-gray-900 dark:text-gray-100">{children}</strong>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-50 dark:bg-blue-950/20 rounded-r-lg text-gray-700 dark:text-gray-300 italic">
        {children}
      </blockquote>
    ),
    code: ({ children }) => (
      <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono text-pink-600 dark:text-pink-400">{children}</code>
    ),
    pre: ({ children }) => (
      <pre className="bg-gray-900 dark:bg-gray-950 text-gray-100 rounded-xl p-4 overflow-x-auto mb-4 text-sm font-mono">{children}</pre>
    ),
    hr: () => <hr className="my-8 border-gray-200 dark:border-gray-800" />,
    ...components,
  }
}
