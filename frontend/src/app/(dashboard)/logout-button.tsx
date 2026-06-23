'use client'

import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function LogoutButton() {
  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <button
      onClick={handleLogout}
      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-all duration-200"
    >
      <LogOut className="w-3.5 h-3.5" />
      Cerrar sesión
    </button>
  )
}
