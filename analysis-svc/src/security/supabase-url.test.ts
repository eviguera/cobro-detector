import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  InvalidFileUrlError,
  resolveAllowedFileUrl,
} from './supabase-url.js'

describe('resolveAllowedFileUrl', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env.NODE_ENV = 'production'
    process.env.SUPABASE_URL = 'https://abcdefgh.supabase.co'
    delete process.env.S3_BUCKET
    delete process.env.S3_ENDPOINT
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  describe('producción', () => {
    it('acepta https al host configurado', () => {
      const url = 'https://abcdefgh.supabase.co/storage/v1/object/sign/analysis-files/a/b.pdf?token=x'
      expect(resolveAllowedFileUrl(url).toString()).toBe(url)
    })

    it('acepta dominios gestionados de Supabase', () => {
      expect(() =>
        resolveAllowedFileUrl('https://otro-proyecto.supabase.co/storage/v1/object/sign/x'),
      ).not.toThrow()
    })

    it('rechaza http aunque sea el host configurado', () => {
      expect(() =>
        resolveAllowedFileUrl('http://abcdefgh.supabase.co/storage/v1/object/sign/x'),
      ).toThrow(InvalidFileUrlError)
    })

    it('rechaza hosts arbitrarios', () => {
      expect(() =>
        resolveAllowedFileUrl('https://evil.example.com/x'),
      ).toThrow(InvalidFileUrlError)
    })

    it('rechaza IPs internas', () => {
      expect(() =>
        resolveAllowedFileUrl('http://169.254.169.254/latest/meta-data/'),
      ).toThrow(InvalidFileUrlError)
    })

    it('rechaza protocolos no HTTP', () => {
      expect(() => resolveAllowedFileUrl('file:///etc/passwd')).toThrow(InvalidFileUrlError)
      expect(() => resolveAllowedFileUrl('gopher://127.0.0.1:6379/_x')).toThrow(InvalidFileUrlError)
    })

    it('rechaza URLs malformadas', () => {
      expect(() => resolveAllowedFileUrl('no-es-una-url')).toThrow(InvalidFileUrlError)
    })

    describe('S3 / R2', () => {
      it('acepta path-style de AWS', () => {
        const url = 'https://s3.us-east-1.amazonaws.com/analysis-files/u/f.csv.enc?X-Amz-Signature=x'
        expect(resolveAllowedFileUrl(url).toString()).toBe(url)
      })

      it('acepta virtual-host de AWS', () => {
        expect(() =>
          resolveAllowedFileUrl(
            'https://analysis-files.s3.us-east-1.amazonaws.com/u/f.csv.enc?X-Amz-Signature=x',
          ),
        ).not.toThrow()
      })

      it('acepta la variante regional con guion (s3-<region>)', () => {
        expect(() =>
          resolveAllowedFileUrl('https://s3-us-west-2.amazonaws.com/analysis-files/u/f.csv.enc'),
        ).not.toThrow()
      })

      it('acepta el dominio de China (.com.cn)', () => {
        expect(() =>
          resolveAllowedFileUrl(
            'https://analysis-files.s3.cn-north-1.amazonaws.com.cn/u/f.csv.enc',
          ),
        ).not.toThrow()
      })

      it('acepta Cloudflare R2', () => {
        expect(() =>
          resolveAllowedFileUrl(
            'https://accountid.r2.cloudflarestorage.com/analysis-files/u/f.csv.enc?X-Amz-Signature=x',
          ),
        ).not.toThrow()
      })

      it('acepta el host del S3_ENDPOINT configurado', () => {
        process.env.S3_ENDPOINT = 'https://minio.internal.example.com'
        expect(() =>
          resolveAllowedFileUrl('https://minio.internal.example.com/analysis-files/u/f.csv.enc'),
        ).not.toThrow()
      })

      it('acepta el virtual-host del bucket configurado', () => {
        process.env.S3_BUCKET = 'cobrodetector-files'
        expect(() =>
          resolveAllowedFileUrl(
            'https://cobrodetector-files.s3.amazonaws.com/u/f.csv.enc',
          ),
        ).not.toThrow()
      })

      it('rechaza http aunque sea un host de S3', () => {
        expect(() =>
          resolveAllowedFileUrl('http://s3.us-east-1.amazonaws.com/analysis-files/u/f.csv.enc'),
        ).toThrow(InvalidFileUrlError)
      })

      it('rechaza dominios que imitan a AWS', () => {
        expect(() =>
          resolveAllowedFileUrl('https://s3.amazonaws.com.evil.example/analysis-files/u/f.enc'),
        ).toThrow(InvalidFileUrlError)
        expect(() =>
          resolveAllowedFileUrl('https://s3evil.amazonaws.com/analysis-files/u/f.enc'),
        ).toThrow(InvalidFileUrlError)
        expect(() =>
          resolveAllowedFileUrl('https://s3.us-east-1.amazonaws.com.evil.example/x'),
        ).toThrow(InvalidFileUrlError)
      })
    })
  })

  describe('desarrollo', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development'
      process.env.SUPABASE_URL = 'http://host.docker.internal:54321'
    })

    it('acepta el host local y lo reescribe al Supabase alcanzable', () => {
      const result = resolveAllowedFileUrl(
        'http://127.0.0.1:54321/storage/v1/object/sign/analysis-files/a/b.csv?token=abc',
      )
      expect(result.origin).toBe('http://host.docker.internal:54321')
      expect(result.pathname).toBe('/storage/v1/object/sign/analysis-files/a/b.csv')
      expect(result.search).toBe('?token=abc')
    })

    it('acepta localhost', () => {
      const result = resolveAllowedFileUrl('http://localhost:54321/storage/v1/object/sign/x')
      expect(result.hostname).toBe('host.docker.internal')
    })

    it('no reescribe el host de Supabase ya configurado', () => {
      const url = 'http://host.docker.internal:54321/storage/v1/object/sign/x'
      expect(resolveAllowedFileUrl(url).toString()).toBe(url)
    })

    it('sigue rechazando hosts externos arbitrarios', () => {
      expect(() => resolveAllowedFileUrl('http://169.254.169.254/latest/meta-data/')).toThrow(
        InvalidFileUrlError,
      )
      expect(() => resolveAllowedFileUrl('https://evil.example.com/x')).toThrow(
        InvalidFileUrlError,
      )
    })

    it('no reescribe las URLs del emulador S3 local', () => {
      const url =
        'https://127.0.0.1:9297/analysis-files/user/f.csv.enc?X-Amz-Signature=abc&X-Amz-Credential=def'
      const result = resolveAllowedFileUrl(url)
      expect(result.origin).toBe('https://127.0.0.1:9297')
      expect(result.pathname).toBe('/analysis-files/user/f.csv.enc')
      expect(result.searchParams.get('X-Amz-Signature')).toBe('abc')
    })
  })
})
