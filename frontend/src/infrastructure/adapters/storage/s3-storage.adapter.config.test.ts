import { S3StorageAdapter } from './s3-storage.adapter'

/**
 * Validación de configuración del adapter S3.
 *
 * Vive en su propio archivo porque `s3-storage.adapter.ts` memoiza el
 * `S3Client`: en un archivo donde ya se corrió una operación con config válida,
 * `readConfig()` no se vuelve a ejecutar. Jest aísla el registro de módulos por
 * archivo, así que acá arrancamos sin cliente cacheado.
 */
describe('S3StorageAdapter (config)', () => {
  const previous = {
    bucket: process.env.S3_BUCKET,
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION,
  }

  afterEach(() => {
    for (const [name, value] of Object.entries({
      S3_BUCKET: previous.bucket,
      S3_ENDPOINT: previous.endpoint,
      S3_REGION: previous.region,
    })) {
      if (value === undefined) delete process.env[name]
      else process.env[name] = value
    }
  })

  it('falla claro si falta S3_BUCKET', async () => {
    delete process.env.S3_BUCKET
    delete process.env.S3_ENDPOINT

    // `createSignedDownloadUrl` no llama a `ensureBucket`, así que llega
    // directo a la lectura de configuración.
    const adapter = new S3StorageAdapter()
    await expect(adapter.createSignedDownloadUrl('a/b.enc', 60)).rejects.toThrow(
      /S3_BUCKET no está configurado/,
    )
  })
})
