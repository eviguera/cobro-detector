import type { Plan } from '@/types/database.types'

export const PLANS: Plan[] = [
  {
    key: 'starter',
    name: 'Emprendedor',
    credits: 1,
    price: 9900,
    pricePerAnalysis: 9900,
    features: [
      '1 análisis de estado de cuenta',
      'Detección de comisiones duplicadas',
      'Detección de errores en cuotas',
      'Reporte PDF descargable',
      'Soporte por email',
    ],
  },
  {
    key: 'professional',
    name: 'Profesional',
    credits: 3,
    price: 24900,
    pricePerAnalysis: 8300,
    highlighted: true,
    features: [
      '3 análisis de estados de cuenta',
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
    credits: 5,
    price: 59900,
    pricePerAnalysis: 11980,
    features: [
      '5 análisis de estados de cuenta',
      'Todo lo del plan Profesional',
      'Multi-empresa (gestiona varios clientes)',
      'Historial completo de análisis',
      'Exportación masiva de reportes',
      'API de integración (próximamente)',
      'Soporte telefónico',
    ],
  },
  {
    key: 'success_fee',
    name: 'Cobro por Éxito',
    credits: 999999, // Ilimitado (se cobra por éxito)
    price: 0, // No tiene precio fijo
    pricePerAnalysis: 0,
    features: [
      'Análisis ilimitados',
      'Solo pagas el 10% de lo que recuperes',
      'Requiere vincular tarjeta de crédito/débito',
      'Detección con IA avanzada',
      'Reporte legal para el banco',
      'Soporte prioritario 24/7',
      'Gestión de cobro (próximamente)',
    ],
  },
]

export const FREE_CREDITS = 1 // análisis gratis al registrarse
