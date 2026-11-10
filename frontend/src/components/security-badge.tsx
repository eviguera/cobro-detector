'use client'

import { ShieldCheck, Lock, Database, Trash2 } from 'lucide-react'

interface SecurityFeature {
  icon: React.ElementType
  title: string
  description: string
  iconColor: string
  cardBg: string
}

const SECURITY_FEATURES: SecurityFeature[] = [
  {
    icon: Lock,
    title: 'SSL/TLS',
    description: 'Conexión cifrada',
    iconColor: 'text-blue-600 dark:text-blue-400',
    cardBg: 'bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40',
  },
  {
    icon: ShieldCheck,
    title: 'AES-256',
    description: 'Encriptación de datos',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    cardBg: 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40',
  },
  {
    icon: Database,
    title: 'Datos en Chile',
    description: 'Almacenamiento local',
    iconColor: 'text-purple-600 dark:text-purple-400',
    cardBg: 'bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/40',
  },
  {
    icon: Trash2,
    title: 'Auto-eliminación',
    description: 'CSV se elimina tras procesar',
    iconColor: 'text-amber-600 dark:text-amber-400',
    cardBg: 'bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40',
  },
]

interface SecurityBadgeProps {
  variant?: 'grid' | 'detailed' | 'compact'
  className?: string
}

/**
 * SecurityBadge — muestra sellos de seguridad visuales del frontend.
 *
 * Variants:
 *  - grid: tarjetas individuales (ideal cerca del área de drop)
 *  - detailed: lista vertical con ícono + título + descripción
 *  - compact: fila horizontal resumida (badge de confianza)
 *
 * No usa factory pattern: un solo componente con prop `variant`, según
 * AGENTS.md para evitar React error #419.
 */
export function SecurityBadge({ variant = 'grid', className }: SecurityBadgeProps) {
  if (variant === 'compact') {
    return (
      <div
        className={`inline-flex items-center gap-2.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-semibold ${className ?? ''}`}
      >
        <ShieldCheck className="w-3 h-3 text-emerald-500" />
        <span className="text-muted-foreground dark:text-gray-300">Conexión segura · AES-256 · SSL/TLS</span>
      </div>
    )
  }

  if (variant === 'detailed') {
    return (
      <div
        className={`rounded-2xl border p-4 shadow-sm ${className ?? ''}`}
      >
        {SECURITY_FEATURES.map((feature, i) => (
          <div
            key={feature.title}
            className={`flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-700/40 ${
              i === SECURITY_FEATURES.length - 1 ? 'border-b-0' : ''
            } ${i === 0 ? 'pt-2' : ''} ${i === SECURITY_FEATURES.length - 1 ? 'pb-0' : ''}`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${feature.cardBg}`}>
              <feature.icon className={`w-4 h-4 ${feature.iconColor}`} />
            </div>
            <div>
              <p className={`text-sm font-semibold text-foreground ${feature.iconColor}`}>
                {feature.title}
              </p>
              <p className="text-xs text-muted-foreground">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // variant === 'grid' (default)
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 ${className ?? ''}`}>
      {SECURITY_FEATURES.map((feature) => (
        <div key={feature.title} className={`${feature.cardBg} rounded-xl p-3 text-center`}>
          <div className={`w-8 h-8 mx-auto mb-2 rounded-lg flex items-center justify-center ${feature.iconColor} dark:${feature.iconColor}`}>
            <feature.icon className="w-4 h-4" />
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
            {feature.title}
          </p>
          <p className="text-xs text-muted-foreground leading-tight">
            {feature.description}
          </p>
        </div>
      ))}
    </div>
  )
}
