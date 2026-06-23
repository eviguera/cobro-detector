'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react'

interface TourStep {
  target: string
  title: string
  description: string
  position: 'bottom' | 'top' | 'left' | 'right'
}

const TOUR_STEPS: TourStep[] = [
  {
    target: '#main-content',
    title: 'Bienvenido a CobroDetector',
    description: 'Detecta cobros injustificados en tu estado de cuenta bancario en 3 pasos: sube tu archivo, nuestra IA lo analiza, y descargas la carta de reclamo lista para el banco.',
    position: 'bottom',
  },
  {
    target: 'a[href="/analisis"]',
    title: 'Nuevo Análisis',
    description: 'Aquí subes tu estado de cuenta (PDF, Excel o CSV). La IA detectará comisiones duplicadas, errores en cuotas y cargos no reconocidos.',
    position: 'right',
  },
  {
    target: 'a[href="/historial"]',
    title: 'Historial de Análisis',
    description: 'Revisa todos tus análisis anteriores. Cada uno muestra las anomalías encontradas y el monto recuperable.',
    position: 'right',
  },
  {
    target: 'a[href="/precios"]',
    title: 'Planes y Créditos',
    description: 'Cada análisis consume 1 crédito. Puedes comprar más créditos aquí. El plan Platino te permite pagar solo si encuentras anomalías (20% de lo recuperado).',
    position: 'right',
  },
]

const STORAGE_KEY = 'cobro-detector-onboarding-done'

export function isOnboardingComplete(): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(STORAGE_KEY) === 'true'
}

export function resetOnboarding(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

interface OnboardingTourProps {
  children: React.ReactNode
}

export function OnboardingTour({ children }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(-1)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    const done = isOnboardingComplete()
    if (!done) {
      setCurrentStep(0)
      setDismissed(false)
    }
  }, [])

  const finish = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setDismissed(true)
    setCurrentStep(-1)
  }, [])

  const next = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((s) => s + 1)
    } else {
      finish()
    }
  }, [currentStep, finish])

  const prev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1)
    }
  }, [currentStep])

  const skip = useCallback(() => {
    finish()
  }, [finish])

  if (dismissed || currentStep < 0) {
    return <>{children}</>
  }

  const step = TOUR_STEPS[currentStep]
  const isFirst = currentStep === 0
  const isLast = currentStep === TOUR_STEPS.length - 1

  const positionClasses: Record<string, string> = {
    bottom: 'top-full mt-3 left-1/2 -translate-x-1/2',
    top: 'bottom-full mb-3 left-1/2 -translate-x-1/2',
    right: 'left-full ml-3 top-1/2 -translate-y-1/2',
    left: 'right-full mr-3 top-1/2 -translate-y-1/2',
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40 transition-opacity pointer-events-none" />
      {children}
      <div className="fixed z-50 pointer-events-none" style={{ inset: 0 }}>
        <div
          className={`absolute pointer-events-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 w-80 ${positionClasses[step.position] || positionClasses.bottom}`}
          style={{
            left: step.position === 'bottom' || step.position === 'top' ? '50%' : undefined,
            top: step.position === 'left' || step.position === 'right' ? '50%' : '50%',
            transform: step.position === 'bottom' ? 'translateX(-50%)' : step.position === 'top' ? 'translate(-50%, -100%)' : 'translateY(-50%)',
          }}
        >
          <button
            onClick={skip}
            className="absolute top-3 right-3 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Cerrar tour"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
              Paso {currentStep + 1} de {TOUR_STEPS.length}
            </span>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {step.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-5">
            {step.description}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {TOUR_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === currentStep
                      ? 'bg-blue-500 scale-125'
                      : i < currentStep
                        ? 'bg-blue-300 dark:bg-blue-700'
                        : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {!isFirst && (
                <button
                  onClick={prev}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Atrás
                </button>
              )}
              {isLast ? (
                <button
                  onClick={finish}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  Comenzar
                </button>
              ) : (
                <button
                  onClick={next}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
