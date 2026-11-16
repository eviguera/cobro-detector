import type { StorageDriver } from '@/domain/ports/storage.port'

function normalize(raw: string | undefined): StorageDriver {
  return (raw ?? '').trim().toLowerCase() === 's3' ? 's3' : 'supabase'
}

/**
 * Driver para código que corre en el servidor (route handlers). Prefiere
 * `STORAGE_DRIVER` y cae a `NEXT_PUBLIC_STORAGE_DRIVER` para no exigir dos
 * variables cuando ambos lados usan el mismo backend.
 */
export function resolveServerStorageDriver(): StorageDriver {
  return normalize(process.env.STORAGE_DRIVER ?? process.env.NEXT_PUBLIC_STORAGE_DRIVER)
}

/** Driver para código de navegador: solo variables `NEXT_PUBLIC_*`. */
export function resolveClientStorageDriver(): StorageDriver {
  return normalize(process.env.NEXT_PUBLIC_STORAGE_DRIVER)
}
