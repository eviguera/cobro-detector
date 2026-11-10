import type { Plan } from '@/types/database.types'

export const PLANS: Plan[] = [
  {
    key: 'inicial',
    name: 'Inicial',
    credits: 1,
    price: 20000,
    pricePerAnalysis: 20000,
    features: [
      '1 análisis de estado de cuenta',
      'Detección con IA',
      'Reporte detallado descargable',
      'Soporte por email',
    ],
  },
  {
    key: 'plus',
    name: 'Plus',
    credits: 2,
    price: 30000,
    pricePerAnalysis: 15000,
    highlighted: true,
    features: [
      '2 análisis de estados de cuenta',
      'Todo lo del plan Inicial',
      'Carta de reclamo para el banco',
      'Soporte prioritario',
    ],
  },
  {
    key: 'contador',
    name: 'Contador',
    credits: 10,
    price: 100000,
    pricePerAnalysis: 10000,
    features: [
      '10 análisis de estados de cuenta',
      'O el 20% de lo que recuperes',
      'Todo lo del plan Plus',
      'Multi-empresa (gestiona varios clientes)',
      'Historial completo de análisis',
      'Soporte telefónico',
    ],
  },
  {
    key: 'platino',
    name: 'Platino',
    credits: 999999,
    price: 0,
    pricePerAnalysis: 0,
    percentage: 20,
    features: [
      'Análisis ilimitados',
      'Pagas solo el 20% de lo que recuperes',
      'Pago contra resultados',
      'Reporte legal completo',
      'Soporte dedicado',
    ],
  },
]

/** Plan por porcentaje (Platino): no tiene precio fijo ni créditos reales. */
export function isPercentagePlan(plan: Plan): boolean {
  return typeof plan.percentage === 'number' && plan.percentage > 0
}

export function getPlanByKey(key: string): Plan | undefined {
  return PLANS.find((plan) => plan.key === key)
}

/**
 * Titular de precio de un plan.
 * Platino nunca debe mostrarse como "$0": se cobra un % de lo recuperado.
 */
export function getPlanPriceLabel(plan: Plan): string {
  if (isPercentagePlan(plan)) return `${plan.percentage}%`
  return formatPrice(plan.price)
}

/**
 * Línea secundaria del precio: créditos y costo unitario.
 */
export function getPlanPriceDescription(plan: Plan): string {
  if (isPercentagePlan(plan)) return 'de lo que recuperes · sin costo fijo'
  if (plan.key === 'contador') {
    return `${plan.credits} créditos · ${formatPrice(plan.pricePerAnalysis)} c/u`
  }
  return `${plan.credits} crédito${plan.credits === 1 ? '' : 's'} · ${formatPrice(
    plan.pricePerAnalysis
  )} por análisis`
}

/** Texto corto para badges y CTAs. */
export function getPlanBadge(plan: Plan): string | null {
  if (isPercentagePlan(plan)) return `${plan.percentage}%`
  return null
}

/** Precio en CLP sin decimales. */
export function formatPrice(value: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value)
}

/** Formato compacto para tarjetas angostas: "$100.000" en vez de "$100.000 CLP". */
export function formatPriceCompact(value: number): string {
  return `$${new Intl.NumberFormat('es-CL').format(value)}`
}

