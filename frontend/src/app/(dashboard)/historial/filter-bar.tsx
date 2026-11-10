import Link from 'next/link'

type Periodo = 'todas' | 'semana' | 'mes' | 'ano'

interface Props {
  current: Periodo
  q?: string
}

const options: { value: Periodo; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mes' },
  { value: 'ano', label: 'Año' },
]

function buildHref(value: Periodo, q?: string): string {
  const params = new URLSearchParams()
  if (value !== 'todas') params.set('periodo', value)
  if (q) params.set('q', q)
  const query = params.toString()
  return query ? `/historial?${query}` : '/historial'
}

export default function FilterBar({ current, q }: Props) {
  return (
    <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800/40 rounded-xl p-1">
      {options.map((opt) => (
        <Link
          key={opt.value}
          href={buildHref(opt.value, q)}
          aria-current={current === opt.value ? 'page' : undefined}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
            current === opt.value
              ? 'bg-white dark:bg-gray-700 text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-muted-foreground dark:hover:text-gray-300'
          }`}
        >
          {opt.label}
        </Link>
      ))}
    </div>
  )
}
