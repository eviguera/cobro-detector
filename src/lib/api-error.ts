import { NextResponse } from 'next/server'
import type { ZodError } from 'zod'

export class ApiError extends Error {
  constructor(
    public message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function handleApiError(error: unknown, context: string): NextResponse {
  console.error(`API Error [${context}]:`, error)

  // Error personalizado de la API
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, details: error.details },
      { status: error.status }
    )
  }

  // Error de validación Zod
  if (isZodError(error)) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: (error as ZodError).errors },
      { status: 400 }
    )
  }

  // Error de Supabase
  if (error && typeof error === 'object' && 'message' in error) {
    const sbError = error as { message: string; code?: string }
    
    // Códigos comunes de Postgres/Supabase
    if (sbError.code === '23505') { // Unique violation
      return NextResponse.json(
        { error: 'El registro ya existe' },
        { status: 409 }
      )
    }
    
    if (sbError.code === '23503') { // Foreign key violation
      return NextResponse.json(
        { error: 'Referencia inválida' },
        { status: 400 }
      )
    }
  }

  // Error genérico
  return NextResponse.json(
    { error: 'Error interno del servidor' },
    { status: 500 }
  )
}

// Helper para verificar si es error de Zod
function isZodError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'name' in error &&
    (error as { name: string }).name === 'ZodError'
  )
}

// Helper para respuestas exitosas consistentes
export function successResponse(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status })
}

// Helper para errores de autenticación
export function authError(): NextResponse {
  return NextResponse.json(
    { error: 'No autenticado' },
    { status: 401 }
  )
}


