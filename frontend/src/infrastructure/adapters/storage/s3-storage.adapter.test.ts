import crypto from 'node:crypto'
import { S3StorageAdapter } from './s3-storage.adapter'

/**
 * Test de integración del adapter S3 contra un endpoint S3-compatible.
 *
 * Se omite por defecto si no hay `S3_TEST_ENDPOINT`. Para ejecutarlo, apunta a
 * un S3 real o compatible (AWS S3, MinIO, R2, etc.) con credenciales/CA
 * configuradas en el entorno, por ejemplo:
 *
 *   cd frontend
 *   S3_TEST_ENDPOINT=https://<endpoint> \
 *   S3_TEST_BUCKET=<bucket> \
 *   npm test -- s3-storage.adapter
 *
 * Si el endpoint usa un CA propio, `NODE_EXTRA_CA_CERTS` debe estar definida
 * antes de iniciar Node.
 */

const endpoint = process.env.S3_TEST_ENDPOINT?.trim()
const bucket = process.env.S3_TEST_BUCKET?.trim() || 'cobrodetector-storage-test'

const describeIfEndpoint = endpoint ? describe : describe.skip

/** Copia los bytes a un ArrayBuffer propio (y no un slice de un pool mayor). */
function toArrayBuffer(buf: Buffer): ArrayBuffer {
  const copy = new Uint8Array(buf.byteLength)
  copy.set(buf)
  return copy.buffer
}

describeIfEndpoint('S3StorageAdapter (integración)', () => {
  const adapter = new S3StorageAdapter()
  const createdKeys: string[] = []

  function newKey(label: string): string {
    const key = `tests/${label}-${Date.now()}-${crypto.randomUUID()}.enc`
    createdKeys.push(key)
    return key
  }

  beforeAll(() => {
    // El adapter lee la config de forma lazy (primer `getClient()`).
    process.env.S3_BUCKET = bucket
    process.env.S3_ENDPOINT = endpoint
    process.env.S3_REGION =
      process.env.S3_REGION?.trim() || process.env.AWS_REGION?.trim() || 'us-east-1'
  })

  afterAll(async () => {
    await Promise.all(
      createdKeys.map((key) => adapter.remove(key).catch(() => undefined)),
    )
  })

  it('expone el driver como "s3"', () => {
    expect(adapter.driver).toBe('s3')
  })

  it('sube desde el servidor y devuelve los mismos bytes por URL prefirmada', async () => {
    const key = newKey('upload')
    const payload = crypto.randomBytes(2048)

    await adapter.upload({
      path: key,
      data: toArrayBuffer(payload),
      contentType: 'application/octet-stream',
    })

    const url = await adapter.createSignedDownloadUrl(key, 60)
    expect(url).toContain(bucket)
    expect(url).toContain(encodeURIComponent(key.split('/').pop() as string))

    const response = await fetch(url)
    expect(response.status).toBe(200)
    const downloaded = Buffer.from(await response.arrayBuffer())
    expect(downloaded.equals(payload)).toBe(true)
  })

  it('permite subir con PUT prefirmado y descargar el objeto', async () => {
    const key = newKey('presigned-put')
    const payload = crypto.randomBytes(1024)

    const putUrl = await adapter.createSignedUploadUrl(key, 60)
    const put = await fetch(putUrl, { method: 'PUT', body: toArrayBuffer(payload) })
    expect(put.status).toBe(200)

    const downloadUrl = await adapter.createSignedDownloadUrl(key, 60)
    const response = await fetch(downloadUrl)
    expect(response.status).toBe(200)
    expect(Buffer.from(await response.arrayBuffer()).equals(payload)).toBe(true)
  })

  it('borra el objeto y la descarga prefirmada deja de servirlo', async () => {
    const key = newKey('delete')
    const payload = crypto.randomBytes(256)

    await adapter.upload({
      path: key,
      data: toArrayBuffer(payload),
      contentType: 'application/octet-stream',
    })
    await adapter.remove(key)

    const url = await adapter.createSignedDownloadUrl(key, 60)
    const response = await fetch(url)
    expect(response.status).toBe(404)
  })
})
