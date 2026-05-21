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

