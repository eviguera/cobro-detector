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
  })
})
