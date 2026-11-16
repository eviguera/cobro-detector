/**
 * Validación de rutas de Storage para los route handlers de `/api/storage/*`.
 *
 * Regla única: un usuario autenticado solo puede firmar o borrar objetos bajo
 * su propio prefijo `${user.id}/`. Se ejecuta siempre en el servidor, incluso
 * si el cliente ya construyó la ruta con `buildStoragePath`.
 */

export const MAX_STORAGE_PATH_LENGTH = 512

export type StoragePathValidation =
  | { ok: true; path: string }
  | { ok: false; error: string }

export function validateOwnedStoragePath(
  userId: string,
  rawPath: unknown,
): StoragePathValidation {
  if (typeof rawPath !== 'string' || rawPath.length === 0) {
    return { ok: false, error: 'path es requerido' }
  }
  if (rawPath.length > MAX_STORAGE_PATH_LENGTH) {
    return { ok: false, error: 'path demasiado largo' }
  }
  // Caracteres de control y separadores de Windows: no pertenecen a una clave.
  if (/[\u0000-\u001f\u007f\\]/.test(rawPath)) {
    return { ok: false, error: 'path contiene caracteres inválidos' }
  }
  if (rawPath.startsWith('/')) {
    return { ok: false, error: 'path no puede ser absoluto' }
  }
  if (rawPath.split('/').some((segment) => segment === '..' || segment === '.')) {
    return { ok: false, error: 'path no puede contener segmentos relativos' }
  }
  if (!rawPath.startsWith(`${userId}/`)) {
    return { ok: false, error: 'path fuera del espacio del usuario' }
  }

  return { ok: true, path: rawPath }
}

/** Clampea el TTL de una URL firmada a un rango seguro (60s–1h). */
export function clampSignedUrlTtl(raw: unknown, fallback: number): number {
  const value = Number(raw)
  if (!Number.isFinite(value)) return fallback
  return Math.min(3600, Math.max(60, Math.trunc(value)))
}
