import 'server-only'

import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { StoragePort, StorageUploadRequest } from '@/domain/ports/storage.port'

/**
 * Adapter S3 SOLO para el servidor (route handlers de `/api/storage/*`).
 *
 * Nunca debe importarse desde código de navegador: expone las credenciales AWS
 * a través del `S3Client`. El navegador usa `HttpS3StorageAdapter`, que pide
 * URLs prefirmadas a estas rutas.
 *
 * Funciona con AWS S3, Cloudflare R2, MinIO y con el emulador local
 * (`S3_ENDPOINT` + `forcePathStyle`).
 */

export interface S3Config {
  bucket: string
  region: string
  endpoint?: string
}

function readConfig(): S3Config {
  const bucket = process.env.S3_BUCKET?.trim()
  if (!bucket) {
    throw new Error('S3_BUCKET no está configurado')
  }

  const endpoint = process.env.S3_ENDPOINT?.trim() || undefined

  return {
    bucket,
    region: process.env.S3_REGION?.trim() || process.env.AWS_REGION?.trim() || 'us-east-1',
    endpoint,
  }
}

let client: S3Client | null = null
let bucketReady: Promise<void> | null = null
let cachedConfig: S3Config | null = null

function getClient(): { client: S3Client; config: S3Config } {
  if (!client || !cachedConfig) {
    cachedConfig = readConfig()
    client = new S3Client({
      region: cachedConfig.region,
      // Con endpoint propio (emulador/MinIO/R2) hay que mantener el bucket en el
      // path: la virtual-host resolution no resuelve `<bucket>.127.0.0.1`.
      forcePathStyle: Boolean(cachedConfig.endpoint),
    })
  }
  return { client, config: cachedConfig }
}

/**
 * Crea el bucket si no existe. Es best-effort y solo se intenta cuando hay
 * `S3_ENDPOINT` (entornos locales/emulador) o `S3_AUTO_CREATE_BUCKET=true`;
 * en producción los buckets se aprovisionan por infraestructura.
 */
async function ensureBucket(): Promise<void> {
  const { client: s3, config } = getClient()
  const autoCreate =
    Boolean(config.endpoint) || process.env.S3_AUTO_CREATE_BUCKET?.trim() === 'true'
  if (!autoCreate) return

  if (!bucketReady) {
    bucketReady = (async () => {
      try {
        await s3.send(new HeadBucketCommand({ Bucket: config.bucket }))
        return
      } catch {
        // No existe (o no hay permiso para HeadBucket): intentamos crear.
      }
      try {
        await s3.send(new CreateBucketCommand({ Bucket: config.bucket }))
      } catch (error) {
        // Si otro proceso lo creó en paralelo, seguimos.
        const name = (error as { name?: string })?.name
        if (name !== 'BucketAlreadyOwnedByYou' && name !== 'BucketAlreadyExists') {
          throw error
        }
      }
    })().catch((error) => {
      // Permitimos reintentar en la siguiente petición.
      bucketReady = null
      throw error
    })
  }

  await bucketReady
}

export class S3StorageAdapter implements StoragePort {
  readonly driver = 's3' as const

  /** Subida directa desde el servidor (no se usa en el flujo del navegador). */
  async upload({ path, data, contentType }: StorageUploadRequest): Promise<void> {
    await ensureBucket()
    const { client: s3, config } = getClient()
    await s3.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: path,
        Body: new Uint8Array(data),
        ContentType: contentType,
      }),
    )
  }

  /**
   * URL prefirmada para que el navegador suba los bytes cifrados.
   *
   * No se firma `ContentType`: el contenido ya va cifrado y el bucket no tiene
   * allowlist de MIME; exigir la cabecera solo agrega un punto de fallo.
   */
  async createSignedUploadUrl(path: string, ttlSeconds: number): Promise<string> {
    await ensureBucket()
    const { client: s3, config } = getClient()
    return getSignedUrl(
      s3,
      new PutObjectCommand({ Bucket: config.bucket, Key: path }),
      { expiresIn: ttlSeconds },
    )
  }

  async createSignedDownloadUrl(path: string, ttlSeconds: number): Promise<string> {
    const { client: s3, config } = getClient()
    return getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: config.bucket, Key: path }),
      { expiresIn: ttlSeconds },
    )
  }

  async remove(path: string): Promise<void> {
    const { client: s3, config } = getClient()
    await s3.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: path }))
  }
}

let cachedPort: S3StorageAdapter | null = null

/** Instancia memoizada (el `S3Client` se reutiliza entre peticiones). */
export function getS3StoragePort(): S3StorageAdapter {
  if (!cachedPort) cachedPort = new S3StorageAdapter()
  return cachedPort
}
