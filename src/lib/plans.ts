import type { Plan } from '@/types/database.types'

export const PLANS: Plan[] = [
  {
    key: 'starter',
    name: 'Emprendedor',
    credits: 3,
    price: 9900,
    pricePerAnalysis: 3300,
    features: [
      '3 análisis de estados de cuenta',
      'Detección de comisiones duplicadas',
      'Detección de errores en cuotas',
      'Reporte PDF descargable',
      'Soporte por email',
    ],
  },
  {
    key: 'professional',
    name: 'Profesional',
    credits: 10,
    price: 24900,
    pricePerAnalysis: 2490,
    highlighted: true,
    features: [
      '10 análisis de estados de cuenta',
      'Todo lo del plan Emprendedor',
      'Detección de cargos no reconocidos con IA',
      'Resumen ejecutivo con IA',
      'Plantilla de carta de reclamo al banco',
      'Soporte prioritario',
    ],
  },
  {
    key: 'enterprise',
    name: 'Contador / Empresa',
    credits: 30,
    price: 59900,
    pricePerAnalysis: 1997,
    features: [
      '30 análisis de estados de cuenta',
      'Todo lo del plan Profesional',
      'Multi-empresa (gestiona varios clientes)',
      'Historial completo de análisis',
      'Exportación masiva de reportes',
      'API de integración (próximamente)',
      'Soporte telefónico',
    ],
  },
]

export const FREE_CREDITS = 1 // análisis gratis al registrarse
