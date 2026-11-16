export interface QueueJob {
  userId: string
  fileName: string
  filePath: string
  fileType: string
  companyId: string | null
  analysisId: string
  // Metadatos de cifrado AES-256-GCM (opcional para retrocompatibilidad).
  storagePath?: string | null
  encryptionKeyIv?: string | null
  encryptionKeyBase64?: string | null
}

/**
 * Envelope almacenado en Redis. Envolver el job permite identificarlo de
 * forma única (para ack/retry sin ambigüedad) y contar reintentos.
 */
export interface QueueEnvelope {
  id: string
  /** Intentos ya ejecutados (0 = primera ejecución). */
  attempts: number
  /** Epoch ms del primer enqueue (para observabilidad). */
  enqueuedAt: number
  job: QueueJob
}

/**
 * Job reclamado de la cola. `raw` es la serialización EXACTA almacenada en
 * Redis: ack/retry la usan como miembro a eliminar, sin depender del orden
 * de claves al re-serializar.
 */
export interface ClaimedJob {
  envelope: QueueEnvelope
  raw: string
}

/** Cola mínima que usan las rutas HTTP para encolar jobs. */
export interface AnalysisQueue {
  enqueue(job: QueueJob): Promise<void>
  getLength(): Promise<number>
}

/**
 * Cola confiable con patrón claim/ack:
 *
 * - `claim()` mueve ATÓMICAMENTE un job de la lista `queue` a un sorted set
 *   `processing` con timestamp (score). Si el worker muere antes del ack, el
 *   job no se pierde: el reaper lo devuelve a la cola tras el timeout de
 *   visibilidad (`staleMs`).
 * - `ack()` elimina el job de `processing` (procesado definitivamente).
 * - `retry()` lo reintroduce en la cola con `attempts + 1`, o lo manda a la
 *   DLQ si ya agotó los intentos.
 * - `reap()` devuelve a la cola los jobs de `processing` más viejos que
 *   `staleMs` (workers muertos), reusando la lógica de retry para que un job
 *   que revienta reiteradamente a los workers termine en la DLQ.
 */
export interface ReliableAnalysisQueue extends AnalysisQueue {
  claim(): Promise<ClaimedJob | null>
  ack(claimed: ClaimedJob): Promise<void>
  /**
   * Reintenta el job: lo saca de `processing` y lo reencola con
   * `attempts + 1`, o lo manda a la DLQ si agotó los intentos.
   * `'gone'` significa que otro worker ya hizo ack (o lo reencoló) entre
   * tanto: el job ya está gestionado y no se duplica.
   */
  retry(claimed: ClaimedJob, maxAttempts: number): Promise<'requeued' | 'dead' | 'gone'>
  /**
   * Devuelve a la cola los jobs de `processing` más viejos que `staleMs`
   * (workers muertos), reusando `retry()` para que un job que revierte
   * reiteradamente a los workers termine en la DLQ. Retorna cuántos volvieron
   * a la cola (los enviados a la DLQ no cuentan; los 'gone' se descartan).
   */
  reap(staleMs: number, maxAttempts: number): Promise<number>
  /** Heartbeat: refresca el score del job in-flight para el reaper. */
  touch(claimed: ClaimedJob): Promise<void>
  getProcessingLength(): Promise<number>
  getDeadLength(): Promise<number>
}
