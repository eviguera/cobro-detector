#!/bin/bash
# QA Check - Verificación de archivos y estructura

echo "🔍 Iniciando QA Check..."
echo ""

passed=0
failed=0

check_file() {
  if [ -f "$1" ]; then
    echo "✓ $2: $1 existe"
    ((passed++))
    return 0
  else
    echo "✗ $2: $1 NO existe"
    ((failed++))
    return 1
  fi
}

check_dir() {
  if [ -d "$1" ]; then
    echo "✓ $2: $1 existe"
    ((passed++))
    return 0
  else
    echo "✗ $2: $1 NO existe"
    ((failed++))
    return 1
  fi
}

# 1. Migraciones SQL
echo "1. Verificando migraciones SQL..."
check_file "supabase/schema.sql" "Schema principal"
check_file "supabase/migration_payments.sql" "Migración pagos"
check_file "supabase/migration_success_fee.sql" "Migración plan éxito"
check_file "supabase/migration_multi_company.sql" "Migración multi-empresa"
check_file "supabase/migration_api_integration.sql" "Migración API"
echo ""

# 2. Endpoints API
echo "2. Verificando endpoints API..."
check_file "src/app/api/analyze/route.ts" "POST /api/analyze"
check_file "src/app/api/anomalies/[id]/route.ts" "PATCH /api/anomalies/[id]"
check_file "src/app/api/payments/create/route.ts" "POST /api/payments/create"
check_file "src/app/api/payments/link-card/route.ts" "POST /api/payments/link-card"
check_file "src/app/api/payments/webhook/route.ts" "POST /api/payments/webhook"
check_file "src/app/api/documents/complaint-letter/route.ts" "POST /api/documents/complaint-letter"
check_file "src/app/api/documents/complaint-letter/pdf/route.ts" "POST /api/documents/complaint-letter/pdf"
check_file "src/app/api/companies/route.ts" "GET,POST /api/companies"
check_file "src/app/api/companies/[id]/route.ts" "GET,PATCH,DELETE /api/companies/[id]"
check_file "src/app/api/integrations/api-keys/route.ts" "GET,POST /api/integrations/api-keys"
check_file "src/app/api/integrations/api-keys/[id]/route.ts" "DELETE /api/integrations/api-keys/[id]"
check_file "src/app/api/v1/analyses/[id]/route.ts" "GET /api/v1/analyses/[id]"
echo ""

# 3. Librerías y tipos
echo "3. Verificando librerías y tipos..."
check_file "src/types/database.types.ts" "Tipos de base de datos"
check_file "src/lib/mercadopago.ts" "Librería Mercado Pago"
check_file "src/lib/document-generator.ts" "Generador de documentos"
check_file "src/lib/api-auth.ts" "Autenticación API"
check_file "src/lib/analyzer.ts" "Analizador de anomalías"
check_file "src/lib/plans.ts" "Configuración de planes"
echo ""

# 4. Configuración
echo "4. Verificando configuración..."
check_file ".env.local" "Variables de entorno"
check_file "next.config.js" "Configuración Next.js"
check_file "tailwind.config.ts" "Configuración Tailwind"
check_file "package.json" "Dependencias"
check_file "API.md" "Documentación API"
echo ""

# 5. Verificar dependencias clave en package.json
echo "5. Verificando dependencias en package.json..."
if [ -f "package.json" ]; then
  for dep in "next" "@supabase" "mercadopago" "docx" "puppeteer" "zod" "@google/generative-ai"; do
    if grep -q "$dep" package.json; then
      echo "✓ Dependencia instalada: $dep"
      ((passed++))
    else
      echo "✗ Dependencia faltante: $dep"
      ((failed++))
    fi
  done
fi
echo ""

# 6. Verificar estructura de carpetas
echo "6. Verificando estructura de carpetas..."
check_dir "src/app" "Directorio app"
check_dir "src/lib" "Directorio lib"
check_dir "src/types" "Directorio types"
check_dir "supabase" "Directorio supabase"
echo ""

# Resumen
echo "=================================================================="
echo "📊 RESUMEN: $passed pasaron, $failed fallaron"
echo "=================================================================="

if [ $failed -gt 0 ]; then
  echo ""
  echo "❌ ALGUNOS CHECKS FALLARON"
  exit 1
else
  echo ""
  echo "✅ TODOS LOS CHECKS PASARON"
  exit 0
fi
