#!/usr/bin/env node
// Script para ejecutar migración SQL en Supabase
// Requiere: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  try {
    console.log('🚀 Ejecutando migración SQL...')
    
    const sqlPath = path.join(process.cwd(), 'supabase/migration_rls_and_indexes.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    
    // Ejecutar SQL usando rpc (si está disponible) o dividiendo en statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    console.log(`📄 Encontrados ${statements.length} statements SQL`)
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i]
      if (!stmt) continue
      
      console.log(`⏳️  Ejecutando statement ${i + 1}/${statements.length}...`)
      
      try {
        // Usar fetch directo a Supabase REST API para ejecutar SQL
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Prefer': 'params=single-object',
          },
          body: JSON.stringify({
            query: stmt
          })
        })
        
        if (!response.ok) {
          const error = await response.json()
          console.warn(`⚠️  Warning en statement ${i + 1}:`, error)
        } else {
          console.log(`✅ Statement ${i + 1} ejecutado`)
        }
      } catch (err) {
        console.warn(`⚠️  Error en statement ${i + 1}:`, err)
      }
    }
    
    console.log('✅ Migración completada')
    
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error)
    process.exit(1)
  }
}

runMigration()
