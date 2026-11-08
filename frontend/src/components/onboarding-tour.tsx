'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react'

interface TourStep {
  target: string
  title: string
  description: string
  position: 'bottom' | 'top' | 'left' | 'right'
}

const TOUR_STEPS: TourStep[] = [
  {
    target: '',
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
const CARD_WIDTH = 320
const CARD_MARGIN = 16
const CARD_FALLBACK_HEIGHT = 240

export function isOnboardingComplete(): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(STORAGE_KEY) === 'true'
}

export function resetOnboarding(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

/** Primer elemento visible que matchea el selector (evita duplicados ocultos del sidebar). */
function findVisibleTarget(selector: string): HTMLElement | null {
  if (!selector) return null
  const candidates = Array.from(document.querySelectorAll<HTMLElement>(selector))
  return (
    candidates.find((candidate) => {
      const rect = candidate.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0
    }) ?? null
  )
}

function getCardPosition(
  rect: DOMRect,
  preferred: TourStep['position'],
  cardHeight: number,
): { top: number; left: number; width: number } {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const width = Math.min(CARD_WIDTH, vw - CARD_MARGIN * 2)
  const height = cardHeight || CARD_FALLBACK_HEIGHT

  // Si no cabe en la posición preferida, la cambiamos por la opuesta o abajo.
  let position = preferred
  if (position === 'right' && rect.right + CARD_MARGIN + width > vw) position = 'bottom'
  if (position === 'left' && rect.left - CARD_MARGIN - width < 0) position = 'bottom'
  if (position === 'bottom' && rect.bottom + CARD_MARGIN + height > vh) position = 'top'
  if (position === 'top' && rect.top - CARD_MARGIN - height < 0) position = 'bottom'

  let top: number
  let left: number

  switch (position) {
    case 'right':
      left = rect.right + CARD_MARGIN
      top = rect.top + rect.height / 2 - height / 2
      break
    case 'left':
      left = rect.left - CARD_MARGIN - width
      top = rect.top + rect.height / 2 - height / 2
      break
    case 'top':
      left = rect.left + rect.width / 2 - width / 2
      top = rect.top - CARD_MARGIN - height
      break
    default:
      left = rect.left + rect.width / 2 - width / 2
      top = rect.bottom + CARD_MARGIN
  }

  left = Math.min(Math.max(CARD_MARGIN, left), vw - width - CARD_MARGIN)
  top = Math.min(Math.max(CARD_MARGIN, top), vh - height - CARD_MARGIN)

  return { top, left, width }
}

interface OnboardingTourProps {
  children: React.ReactNode
}

export function OnboardingTour({ children }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(-1)
  const [dismissed, setDismissed] = useState(true)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [cardHeight, setCardHeight] = useState(CARD_FALLBACK_HEIGHT)
  const cardRef = useRef<HTMLDivElement>(null)
  const scrolledForStep = useRef(false)
  const pathname = usePathname()

  // El tour es de bienvenida al panel: solo se abre solo en /dashboard para no
  // tapar el contenido de páginas como /historial en la primera visita.
  useEffect(() => {
    if (pathname !== '/dashboard') return
    const done = isOnboardingComplete()
    if (!done) {
      setCurrentStep(0)
      setDismissed(false)
    }
  }, [pathname])

  const finish = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setDismissed(true)
    setCurrentStep(-1)
    setTargetRect(null)
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

  const measureTarget = useCallback(() => {
    if (currentStep < 0) return
    const target = findVisibleTarget(TOUR_STEPS[currentStep].target)
    if (!target) {
      setTargetRect(null)
      return
    }

    const rect = target.getBoundingClientRect()
    // Solo desplazamos una vez por paso y nunca para bloques más altos que la
    // pantalla: hacerlo en cada evento de scroll provoca un bucle de scroll.
    const isLargeTarget = rect.height > window.innerHeight * 0.6
    const isOffscreen = rect.bottom < 72 || rect.top > window.innerHeight - 72
    if (!isLargeTarget && !scrolledForStep.current && isOffscreen) {
      scrolledForStep.current = true
      target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
    }
    setTargetRect(rect)
  }, [currentStep])

  // Recalcular al cambiar de paso, al hacer scroll (capturando contenedores internos) y al redimensionar.
  useEffect(() => {
    if (currentStep < 0) return

    scrolledForStep.current = false
    measureTarget()

    const onViewportChange = () => measureTarget()
    window.addEventListener('resize', onViewportChange)
    window.addEventListener('scroll', onViewportChange, true)
    return () => {
      window.removeEventListener('resize', onViewportChange)
      window.removeEventListener('scroll', onViewportChange, true)
    }
  }, [currentStep, measureTarget])

  // Ajustar la altura real de la tarjeta para posicionarla sin tapar el objetivo.
  useEffect(() => {
    if (currentStep < 0 || !cardRef.current) return
    const height = cardRef.current.offsetHeight
    if (height > 0 && height !== cardHeight) setCardHeight(height)
  }, [currentStep, cardHeight])

  // Escape cierra el tour (y no lo vuelve a mostrar).
  useEffect(() => {
    if (currentStep < 0) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [currentStep, finish])

  // Llevar el foco a la tarjeta para lectores de pantalla y teclado.
  useEffect(() => {
    if (currentStep < 0) return
    cardRef.current?.focus()
  }, [currentStep])

  if (dismissed || currentStep < 0) {
    return <>{children}</>
  }

  const step = TOUR_STEPS[currentStep]
  const isFirst = currentStep === 0
  const isLast = currentStep === TOUR_STEPS.length - 1
  const position = targetRect ? getCardPosition(targetRect, step.position, cardHeight) : null

  return (
    <>
      {targetRect ? (
        <div
          aria-hidden="true"
          className="fixed z-40 rounded-xl ring-2 ring-blue-500/80 pointer-events-none transition-all duration-200"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45)',
          }}
        />
      ) : (
        <div className="fixed inset-0 z-40 bg-black/40 pointer-events-none" aria-hidden="true" />
      )}

      {children}

      <div
        ref={cardRef}
        role="dialog"
        aria-labelledby="onboarding-title"
        aria-describedby="onboarding-description"
        tabIndex={-1}
        className="fixed z-50 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 outline-none max-h-[calc(100vh-2rem)] overflow-y-auto"
        style={
          position
            ? { top: position.top, left: position.left, width: position.width }
            : {
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: `min(${CARD_WIDTH}px, calc(100vw - 2rem))`,
              }
        }
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

        <h3 id="onboarding-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {step.title}
        </h3>
        <p id="onboarding-description" className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-5">
          {step.description}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex gap-1.5" aria-hidden="true">
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
    </>
  )
}
