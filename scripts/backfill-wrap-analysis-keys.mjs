#!/usr/bin/env node
/**
 * Backfill: envuelve (re-wrap) claves de cifrado legadas (texto plano) en
 * `analyses.encryption_key_base64` usando la KEK ANALYSIS_KEY_ENCRYPTION_KEY.
 *
 * - Solo toca filas donde encryption_key_base64 NO empieza con "v1:".
 * - Idempotente: re-ejecutar no modifica filas ya envueltas.
 * - Requiere SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y ANALYSIS_KEY_ENCRYPTION_KEY.
 *
 * Uso:
 *   node --env-file=.env scripts/backfill-wrap-analysis-keys.mjs          # dry-run (default)
 *   node --env-file=.env scripts/backfill-wrap-analysis-keys.mjs --apply  # aplica cambios
 */
import crypto from 'node:crypto'

const PREFIX = 'v1'
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
const KEK_B64 = process.env.ANALYSIS_KEY_ENCRYPTION_KEY?.trim()
const APPLY = process.argv.includes('--apply')

function fail(msg) {
  console.error(`Error: ${msg}`)
  process.exit(1)
}

if (!SUPABASE_URL) fail('Falta SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL)')
if (!SERVICE_ROLE) fail('Falta SUPABASE_SERVICE_ROLE_KEY')
if (!KEK_B64) fail('Falta ANALYSIS_KEY_ENCRYPTION_KEY (no se debe backfill sin KEK)')

const kek = Buffer.from(KEK_B64, 'base64')
if (kek.length !== 32) fail('ANALYSIS_KEY_ENCRYPTION_KEY debe ser 32 bytes en base64')

function wrap(rawKeyBase64) {
  const dataKey = Buffer.from(rawKeyBase64, 'base64')
  if (dataKey.length !== 32) throw new Error('Clave de archivo no es de 32 bytes')
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, kek, iv)
  const ciphertext = Buffer.concat([cipher.update(dataKey), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${PREFIX}:${iv.toString('base64')}.${tag.toString('base64')}.${ciphertext.toString('base64')}`
}

async function supabase(path, init = {}) {
  const res = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(init.headers || {}),
    },
  })
  const text = await res.text()
  let json = null
  try { json = text ? JSON.parse(text) : null } catch { /* ignore */ }
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`)
  return json
}

async function main() {
  const rows = await supabase('analyses?select=id,encryption_key_base64&encryption_key_base64=not.is.null')
  const legacy = (rows || []).filter(r => typeof r.encryption_key_base64 === 'string' && !r.encryption_key_base64.startsWith(`${PREFIX}:`))

  console.log(`Filas con clave: ${(rows || []).length}. Legadas (sin ${PREFIX}:): ${legacy.length}. Modo: ${APPLY ? 'APPLY' : 'DRY-RUN'}`)

  let updated = 0
  let skipped = 0
  let failed = 0
  for (const row of legacy) {
    try {
      const wrapped = wrap(row.encryption_key_base64)
      if (APPLY) {
        await supabase(`analyses?id=eq.${encodeURIComponent(row.id)}`, {
          method: 'PATCH',
          body: JSON.stringify({ encryption_key_base64: wrapped }),
        })
      }
      updated++
      console.log(`${APPLY ? 'wrapped' : 'would-wrap'} ${row.id}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`fail ${row.id}: ${msg}`)
      failed++
      skipped++
    }
  }

  console.log(`Resumen: ${APPLY ? 'actualizadas' : 'a actualizar'}=${updated - failed}, fallidas=${failed}`)
  if (!APPLY) console.log('Ejecuta con --apply para aplicar cambios.')
  if (failed > 0) process.exitCode = 1
}

main().catch(err => { console.error(err); process.exit(1) })
