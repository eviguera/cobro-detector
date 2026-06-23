'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (!mounted) {
    return <div className="w-9 h-9" />
  }

  const isDark = theme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
    >
      <div className="relative w-4 h-4">
        <Sun className={`w-4 h-4 absolute inset-0 transition-all duration-300 ${isDark ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'}`} />
        <Moon className={`w-4 h-4 absolute inset-0 transition-all duration-300 ${isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'}`} />
      </div>
      <span className="font-medium">{isDark ? 'Modo claro' : 'Modo oscuro'}</span>
    </button>
  )
}
