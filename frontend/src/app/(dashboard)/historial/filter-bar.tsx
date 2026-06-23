import Link from 'next/link'

type Periodo = 'todas' | 'semana' | 'mes' | 'ano'

interface Props {
  current: Periodo
}

const options: { value: Periodo; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mes' },
  { value: 'ano', label: 'Año' },
]

export default function FilterBar({ current }: Props) {
  return (
    <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800/40 rounded-xl p-1">
      {options.map((opt) => (
        <Link
          key={opt.value}
          href={opt.value === 'todas' ? '/historial' : `/historial?periodo=${opt.value}`}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
            current === opt.value
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
          }`}
        >
          {opt.label}
        </Link>
      ))}
    </div>
  )
}
