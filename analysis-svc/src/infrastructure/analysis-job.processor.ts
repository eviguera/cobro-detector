import crypto from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Logger } from 'pino'
import { PipelineService } from '../domain/pipeline.service.js'
import type { AnalysisRepository } from '../domain/ports/analysis.repository.port.js'
import type { QueueJob } from '../domain/ports/queue.port.js'
import { fetchFileFromSupabase } from '../security/safe-fetch.js'
import { unwrapDataKey } from '../security/key-wrap.js'

const ENC_ALGORITHM = 'aes-256-gcm'

/** Backend donde vive el archivo cifrado (ver `analyses.storage_driver`). */
type StorageDriver = 'supabase' | 's3'

/**
 * Normaliza el valor de la columna. La DB tiene un CHECK que solo permite
 * 'supabase' | 's3', pero un valor inesperado (fila vieja, migración a medias)
 * debe comportarse como el default de producción, no romper el worker.
 */
function normalizeStorageDriver(value: unknown): StorageDriver {
  return value === 's3' ? 's3' : 'supabase'
}

/**
 * Error transitoria (infraestructura caída, DB/Redis inalcanzable, timeout de
 * descarga): el worker REINTENTA el job. Los fallos de negocio (motor que no
 * puede procesar el archivo) NO lanzan esto: se marcan `error` + se devuelve
 * el crédito, y el job se considera terminal.
 */
export class TransientJobError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'TransientJobError'
  }
}

function decryptFileAES256GCM(
  encrypted: Buffer,
  keyBase64: string,
  ivBase64: string,
): Buffer {
  // `keyBase64` puede venir envuelta por la KEK del servidor (v1:...) o en
  // texto plano (filas legadas). Se desenvuelve antes de usarla.
  const rawKeyBase64 = unwrapDataKey(keyBase64)
  const key = Buffer.from(rawKeyBase64, 'base64')
  const iv = Buffer.from(ivBase64, 'base64')

  // Web Crypto (AES-GCM) concatena el tag de autenticación de 16 bytes al
  // final del ciphertext. Node lo espera separado con setAuthTag(); sin esto
  // el descifrado falla con "Unsupported state or unable to authenticate data".
  const TAG_LENGTH = 16
  if (encrypted.length <= TAG_LENGTH) {
    throw new Error('Archivo cifrado inválido: contenido demasiado corto')
  }
  const ciphertext = encrypted.subarray(0, encrypted.length - TAG_LENGTH)
  const authTag = encrypted.subarray(encrypted.length - TAG_LENGTH)

  const decipher = crypto.createDecipheriv(ENC_ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()])
}

export interface AnalysisJobProcessorDeps {
  pipeline: PipelineService
  analysisRepo: AnalysisRepository
  supabase: SupabaseClient
  logger: Logger
}

/**
 * Procesa un job de análisis de forma IDEMPOTENTE (safe para retry/reap):
 * - `storeResults` es un UPDATE.
 * - Las anomalías se borran antes de insertarse (sin duplicados).
 * - El cobro/devolución del crédito ya es idempotente (`credit_consumed_at`).
 *
 * Contrato de errores:
 * - Resuelve sin lanzar → job terminal (ack). Incluye el fallo de negocio:
 *   marca `error` + devuelve crédito + limpia Storage.
 * - Lanza `TransientJobError` → el worker reintenta. El archivo cifrado NO se
 *   borra en este camino: el reintento lo necesita.
 */
export class AnalysisJobProcessor {
  constructor(private readonly deps: AnalysisJobProcessorDeps) {}

  async process(job: QueueJob): Promise<void> {
    const { logger, analysisRepo, pipeline, supabase } = this.deps

    // Cargar el análisis para conocer user_id, plan y metadatos de cifrado.
    const { data: analysis, error: loadError } = await supabase
      .from('analyses')
      .select('user_id, plan, status, file_type, file_name, storage_path, storage_driver, encryption_key_iv, encryption_key_base64')
      .eq('id', job.analysisId)
      .single()

    // Si el análisis no existe, el job es inválido (registro borrado por el
    // usuario): terminal, no reintenta. Un error de red/DB sí reintenta.
    if (loadError) {
      if (loadError.code === 'PGRST116') {
        logger.warn({ analysisId: job.analysisId }, 'El análisis ya no existe: job descartado')
        return
      }
      throw new TransientJobError('No se pudo cargar el análisis para el worker', { cause: loadError })
    }
    if (!analysis) {
      logger.warn({ analysisId: job.analysisId }, 'El análisis ya no existe: job descartado')
      return
    }

    const userId = analysis.user_id as string
    // El plan declarado al crear el análisis decide el cobro; `status` ya no
    // lo controla el cliente (grants por columna).
    const isPlatino = analysis.plan === 'platino'
    const storagePath = analysis.storage_path as string | null
    const storageDriver = normalizeStorageDriver(analysis.storage_driver)
    const encryptionKeyIv = analysis.encryption_key_iv as string | null
    const encryptionKeyBase64 = analysis.encryption_key_base64 as string | null

    try {
      await analysisRepo.updateStatus(job.analysisId, userId, 'processing')
    } catch (err) {
      throw new TransientJobError('No se pudo marcar el análisis como processing', { cause: err })
    }

    try {
      // Descarga y descifrado. Ambos fallos son TRANSITORIOS: una descarga
      // truncada produce el mismo error de auth tag que un archivo corrupto,
      // y descargar de nuevo es barato. Si el archivo es genuinamente
      // ilegible, agota los intentos y termina en la DLQ → failTerminal.
      let buffer: Buffer
      try {
        const encryptedBuffer = await fetchFileFromSupabase(job.filePath)
        if (encryptionKeyIv && encryptionKeyBase64) {
          buffer = decryptFileAES256GCM(encryptedBuffer, encryptionKeyBase64, encryptionKeyIv)
        } else {
          // Fallback: archivo sin cifrar (retrocompatibilidad con análisis previos).
          buffer = encryptedBuffer
        }
      } catch (err) {
        throw new TransientJobError('Descarga o descifrado del archivo falló (¿red truncada?)', { cause: err })
      }

      // El pipeline puede lanzar por infraestructura (Groq/red/DB) o por bug:
      // se clasifica transitorio salvo veredicto explícito del motor.
      let result: Awaited<ReturnType<PipelineService['run']>>
      try {
        result = await pipeline.run(buffer, job.fileType, {
          userId,
          fileName: job.fileName,
        })
      } catch (err) {
        throw new TransientJobError('El pipeline falló durante la ejecución', { cause: err })
      }

      // Veredicto del motor: el archivo no es procesable. TERMINAL.
      if (result.success === false) {
        throw new Error(result.error || 'El motor de análisis no pudo procesar el archivo')
      }

      const anomalies = result.anomalies ?? []
      try {
        if (anomalies.length > 0) {
          const anomaliesToInsert = anomalies.map((anomaly) => ({
            analysis_id: job.analysisId,
            user_id: userId,
            type: anomaly.type as string,
            severity: anomaly.severity as string,
            title: anomaly.title as string,
            description: anomaly.description as string,
            detail: (anomaly.detail as string) ?? null,
            recoverable_amount: anomaly.recoverableAmount as number,
            transaction_refs: anomaly.transactionRefs as string[],
            status: 'pending' as string,
          }))
          // Idempotencia: en una re-ejecución (retry/reap) no se duplican.
          await analysisRepo.deleteAnomaliesByAnalysis(job.analysisId, userId)
          await analysisRepo.insertAnomalies(job.analysisId, userId, anomaliesToInsert)
        }
        await analysisRepo.storeResults(job.analysisId, userId, result as unknown as Parameters<typeof analysisRepo.storeResults>[2], isPlatino)
      } catch (err) {
        throw new TransientJobError('No se pudo persistir el resultado del análisis', { cause: err })
      }

      const recoverableAmount = result.totalRecoverable ?? 0
      logger.info(
        { analysisId: job.analysisId, userId, anomaliesCount: anomalies.length, recoverableAmount },
        'Análisis completado por worker',
      )

      // Éxito: outcome terminal, el archivo ya no hace falta.
      await this.cleanupStorage(job.analysisId, storagePath, storageDriver)
    } catch (error) {
      if (error instanceof TransientJobError) {
        // NO borrar el archivo: el reintento lo necesita. Tampoco marcar
        // error: el análisis puede terminar bien en el siguiente intento.
        throw error
      }

      // Fallo de negocio (motor no puede procesar): terminal.
      logger.error({ err: error, analysisId: job.analysisId }, 'Error procesando análisis en worker')
      try {
        await analysisRepo.markError(job.analysisId, userId)
      } catch (markErrorErr) {
        // DB caída mientras se reportaba el fallo: reintenta el job completo.
        throw new TransientJobError('No se pudo marcar el análisis como error', { cause: markErrorErr })
      }

      // Si el análisis se cobró con un crédito, devolverlo: el usuario no debe
      // pagar por un análisis que falló. El flag credit_consumed_at evita
      // devoluciones dobles.
      const { data: refunded, error: refundError } = await supabase.rpc('refund_analysis_credit', {
        p_analysis_id: job.analysisId,
      })
      if (refundError) {
        logger.error({ err: refundError, analysisId: job.analysisId }, 'No se pudo devolver el crédito')
      } else if (refunded === true) {
        logger.info({ analysisId: job.analysisId }, 'Crédito devuelto por análisis fallido')
      }

      // Fallo de negocio: outcome terminal, el archivo ya no hace falta.
      await this.cleanupStorage(job.analysisId, storagePath, storageDriver)
    }
  }

  /**
   * Cierre terminal best-effort para jobs que mueren sin veredicto (DLQ por
   * reintentos agotados o bug del worker): marca el análisis `error` y
   * devuelve el crédito si aplica, sin lanzar (el worker ya está en camino
   * al ack/DLQ; esto es solo para no dejar al usuario en "processing").
   */
  async failTerminal(job: QueueJob): Promise<void> {
    const { logger, analysisRepo, supabase } = this.deps
    try {
      await analysisRepo.markError(job.analysisId, job.userId)
      const { data: refunded, error: refundError } = await supabase.rpc('refund_analysis_credit', {
        p_analysis_id: job.analysisId,
      })
      if (refundError) {
        logger.error({ err: refundError, analysisId: job.analysisId }, 'failTerminal: no se pudo devolver el crédito')
      } else if (refunded === true) {
        logger.info({ analysisId: job.analysisId }, 'failTerminal: crédito devuelto')
      }
    } catch (err) {
      logger.error({ err, analysisId: job.analysisId }, 'failTerminal: no se pudo cerrar el análisis (requiere revisión manual)')
    }
  }

  /**
   * Elimina el archivo cifrado de Storage. Se llama SOLO en outcomes
   * terminales (éxito o fallo de negocio): en los transitorios el reintento
   * necesita el archivo.
   *
   * - Supabase: borra el objeto y, solo si el borrado fue REAL, escribe
   *   `file_deleted_at` (marca de retención, no de intento).
   * - S3: el worker no tiene credenciales AWS (las URLs prefirmadas las emite
   *   el frontend); el objeto lo borra la regla de lifecycle del bucket. Por eso
   *   no se escribe `file_deleted_at`.
   *
   * Falla loggeada, nunca rompe el flujo.
   */
  private async cleanupStorage(
    analysisId: string,
    storagePath: string | null,
    driver: StorageDriver,
  ): Promise<void> {
    const { logger, supabase } = this.deps
    if (!storagePath) return

    if (driver === 's3') {
      logger.info(
        { analysisId, storagePath },
        'Archivo en S3: el borrado queda a cargo de la regla de lifecycle del bucket',
      )
      return
    }

    try {
      const { error: removeError } = await supabase.storage
        .from('analysis-files')
        .remove([storagePath])
      if (removeError) {
        logger.error(
          { err: removeError, analysisId, storagePath },
          'No se pudo eliminar el archivo de Storage',
        )
        return
      }
    } catch (cleanupError) {
      logger.error({ err: cleanupError, analysisId, storagePath }, 'Error limpiando archivo de Storage')
      return
    }

    const { error: markError } = await supabase
      .from('analyses')
      .update({ file_deleted_at: new Date().toISOString() })
      .eq('id', analysisId)
    if (markError) {
      logger.error(
        { err: markError, analysisId, storagePath },
        'Archivo borrado, pero no se pudo registrar file_deleted_at',
      )
      return
    }
    logger.info({ analysisId, storagePath }, 'Archivo cifrado eliminado de Storage')
  }
}
