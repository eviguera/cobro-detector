const API_GATEWAY = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3004'
const ANALYSIS_SVC = process.env.NEXT_PUBLIC_ANALYSIS_SVC_URL ?? API_GATEWAY
const PAYMENT_SVC = process.env.NEXT_PUBLIC_PAYMENT_SVC_URL ?? API_GATEWAY
const ADMIN_SVC = process.env.NEXT_PUBLIC_ADMIN_SVC_URL ?? API_GATEWAY
const AUTH_SVC = process.env.NEXT_PUBLIC_AUTH_SVC_URL ?? API_GATEWAY

export const services = {
  analysis: { baseUrl: ANALYSIS_SVC },
  payment: { baseUrl: PAYMENT_SVC },
  admin: { baseUrl: ADMIN_SVC },
  auth: { baseUrl: AUTH_SVC },
} as const

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

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
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
