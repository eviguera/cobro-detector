#!/usr/bin/env node
// QA Check - Verificación de endpoints y flujos principales
// Ejecutar: npx ts-node scripts/qa-check.ts

import fs from 'fs'
import path from 'path'

const errors: string[] = []
let passed = 0
let failed = 0

function check(condition: boolean, msg: string) {
  if (condition) {
    console.log(`✓ ${msg}`)
    passed++
  } else {
    console.error(`✗ ${msg}`)
    errors.push(msg)
    failed++
  }
}

async function main() {
  console.log('🔍 Iniciando QA Check...\n')

  // 1. Verificar archivos de migración SQL
  console.log('1. Verificando migraciones SQL...')
  const migrationFiles = [
    'supabase/schema.sql',
  ]

  for (const file of migrationFiles) {
    const exists = fs.existsSync(path.join(process.cwd(), file))
    check(exists, `Migración existe: ${file}`)
    if (exists) {
      const content = fs.readFileSync(path.join(process.cwd(), file), 'utf8')
      check(content.length > 100, `${file} tiene contenido`)
    }
  }

  // 2. Verificar endpoints API
  console.log('\n2. Verificando endpoints API...')
  const apiEndpoints = [
    'src/app/api/analyze/route.ts',
    'src/app/api/payments/create/route.ts',
    'src/app/api/payments/webhook/route.ts',
    'src/app/api/payments/unlock-report/route.ts',
    'src/app/api/documents/complaint-letter/route.ts',
    'src/app/api/documents/complaint-letter/pdf/route.ts',
    'src/app/api/companies/route.ts',
    'src/app/api/companies/[id]/route.ts',
    'src/app/api/v1/analyses/[id]/route.ts',
  ]

  for (const endpoint of apiEndpoints) {
    const exists = fs.existsSync(path.join(process.cwd(), endpoint))
    check(exists, `Endpoint existe: ${endpoint}`)
    if (exists) {
      const content = fs.readFileSync(path.join(process.cwd(), endpoint), 'utf8')
      check(content.includes('export async function'), `${endpoint} tiene handler exportado`)
    }
  }

  // 3. Verificar tipos de base de datos
  console.log('\n3. Verificando tipos de base de datos...')
  const dbTypesPath = 'src/types/database.types.ts'
  const typesExists = fs.existsSync(path.join(process.cwd(), dbTypesPath))
  check(typesExists, 'database.types.ts existe')

  if (typesExists) {
    const content = fs.readFileSync(path.join(process.cwd(), dbTypesPath), 'utf8')
    const requiredTables = ['profiles', 'credits', 'orders', 'analyses', 'anomalies', 'payment_methods', 'success_charges', 'companies', 'api_keys', 'api_logs']
    for (const table of requiredTables) {
      check(content.includes(table), `Tipo existe para tabla: ${table}`)
    }
  }

  // 4. Verificar librerías instaladas
  console.log('\n4. Verificando librerías...')
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies }
  const requiredDeps = ['next', '@supabase/ssr', '@supabase/supabase-js', 'mercadopago', 'docx', 'groq-sdk', 'zod', 'pdf-lib', 'pdf-parse', 'exceljs']
  for (const dep of requiredDeps) {
    check(!!allDeps[dep], `Dependencia instalada: ${dep}`)
  }

  // 5. Verificar archivos de configuración
  console.log('\n5. Verificando archivos de configuración...')
  check(fs.existsSync('.env.local'), 'Archivo .env.local existe')
  check(fs.existsSync('next.config.js'), 'next.config.js existe')
  check(fs.existsSync('tailwind.config.ts'), 'tailwind.config.ts existe')

  // 6. Verificar documentación
  console.log('\n6. Verificando documentación...')
  check(fs.existsSync('README.md'), 'README.md existe')

  // Resumen
  console.log('\n' + '='.repeat(50))
  console.log(`📊 RESUMEN: ${passed} pasaron, ${failed} fallaron`)
  console.log('='.repeat(50))

  if (errors.length > 0) {
    console.log('\n❌ ERRORES:')
    errors.forEach(e => console.log(`  - ${e}`))
  }

  if (failed > 0) {
    process.exit(1)
  }
}

main().catch(err => {
  console.error('Error inesperado:', err instanceof Error ? err.message : err)
  process.exit(1)
})
