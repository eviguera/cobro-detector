const API_GATEWAY = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3004'
const ANALYSIS_SVC = process.env.NEXT_PUBLIC_ANALYSIS_SVC_URL ?? API_GATEWAY
const PAYMENT_SVC = process.env.NEXT_PUBLIC_PAYMENT_SVC_URL ?? API_GATEWAY
const ADMIN_SVC = process.env.NEXT_PUBLIC_ADMIN_SVC_URL ?? API_GATEWAY
const AUTH_SVC = process.env.NEXT_PUBLIC_AUTH_SVC_URL ?? API_GATEWAY

import { createClient as createBrowserClient } from '@/lib/supabase/client'

export const services = {
  analysis: { baseUrl: ANALYSIS_SVC },
  payment: { baseUrl: PAYMENT_SVC },
  admin: { baseUrl: ADMIN_SVC },
  auth: { baseUrl: AUTH_SVC },
} as const

/**
 * HARDENED (2026-11): resuelve el access_token de Supabase del browser para que
 * apiFetch envíe `Authorization: Bearer` a los microservicios (que validan el
 * JWT server-side). apiFetch solo se usa desde componentes cliente; los server
 * components no llaman microservicios.
 */
async function resolveAccessToken(): Promise<string | null> {
  try {
    const { data } = await createBrowserClient().auth.getSession()
    return data.session?.access_token ?? null
  } catch {
    return null
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiFetch<T>(
  baseUrl: string,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${baseUrl}${path}`
  const token = await resolveAccessToken()

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new ApiError(
      body.error ?? `HTTP ${res.status}`,
      res.status,
      body,
    )
  }

  return res.json() as Promise<T>
}
