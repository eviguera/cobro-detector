#!/usr/bin/env bash
# Aplica la migración de hardening a una base Postgres de Supabase.
#
# Uso:
#   DATABASE_URL="postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres" \
#     ./scripts/apply-prod-migration.sh
#
# o con la cadena del pooler:
#   DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres" \
#     ./scripts/apply-prod-migration.sh
#
# El script NO asume psql instalado: usa el contenedor local de Supabase o,
# en su defecto, la imagen oficial de Postgres.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MIGRATIONS_DIR="$ROOT/supabase/migrations"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Falta DATABASE_URL (cadena de conexión de Postgres de Supabase)." >&2
  exit 1
fi

# Archivos a aplicar, en orden. Por defecto mantiene el comportamiento histórico
# (solo hardening 20261109). Pasar nombres/paths de migración para aplicar otros,
# p.ej.:
#   ./scripts/apply-prod-migration.sh 20261110000100_analyses_schema_align.sql 20261110000200_analyses_paywall.sql
# o "chain" para aplicar la cadena conocida post-hardening en orden de nombre.
if [ "$#" -eq 0 ]; then
  FILES=("$MIGRATIONS_DIR/20261109_security_hardening.sql")
elif [ "$1" = "chain" ]; then
  # Cadena relevante (idempotente donde aplique). Requiere ventana coordinada con
  # deploy para 20261110000200_analyses_paywall.sql (breaking).
  FILES=(
    "$MIGRATIONS_DIR/20261110000100_analyses_schema_align.sql"
    "$MIGRATIONS_DIR/20261110000200_analyses_paywall.sql"
    "$MIGRATIONS_DIR/20261113000000_fase0_integridad.sql"
    "$MIGRATIONS_DIR/20261113100000_payment_webhook_idempotency.sql"
    "$MIGRATIONS_DIR/20261113110000_analyses_storage_driver.sql"
  )
else
  FILES=()
  for arg in "$@"; do
    if [ -f "$arg" ]; then
      FILES+=("$arg")
    elif [ -f "$MIGRATIONS_DIR/$arg" ]; then
      FILES+=("$MIGRATIONS_DIR/$arg")
    else
      echo "No se encontró la migración: $arg" >&2
      exit 1
    fi
  done
fi

for f in "${FILES[@]}"; do
  if [ ! -f "$f" ]; then
    echo "No se encontró la migración: $f" >&2
    exit 1
  fi
done

run_psql_file() {
  local migration="$1"
  if command -v psql >/dev/null 2>&1; then
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$migration"
  elif docker ps --format '{{.Names}}' | grep -q '^supabase_db_'; then
    local c
    c="$(docker ps --format '{{.Names}}' | grep '^supabase_db_' | head -1)"
    docker exec -i "$c" psql "$DATABASE_URL" -v ON_ERROR_STOP=1 < "$migration"
  else
    docker run --rm -i postgres:17 psql "$DATABASE_URL" -v ON_ERROR_STOP=1 < "$migration"
  fi
}

echo "== Aplicando migraciones (en orden) =="
for migration in "${FILES[@]}"; do
  echo "-- $migration"
  run_psql_file "$migration"
done

echo
echo "== Verificación =="
verify() {
  local sql="$1"
  if command -v psql >/dev/null 2>&1; then
    psql "$DATABASE_URL" -tAc "$sql"
  elif docker ps --format '{{.Names}}' | grep -q '^supabase_db_'; then
    local c
    c="$(docker ps --format '{{.Names}}' | grep '^supabase_db_' | head -1)"
    docker exec -i "$c" psql "$DATABASE_URL" -tAc "$sql"
  else
    docker run --rm postgres:17 psql "$DATABASE_URL" -tAc "$sql"
  fi
}

verify "select 'profiles UPDATE cols: ' || string_agg(column_name, ', ' order by column_name)
        from information_schema.column_privileges
        where table_schema='public' and table_name='profiles' and grantee='authenticated' and privilege_type='UPDATE'"
verify "select 'credits DML: ' || coalesce(string_agg(distinct privilege_type, ','), 'ninguno')
        from information_schema.column_privileges
        where table_schema='public' and table_name='credits' and grantee='authenticated'
          and privilege_type in ('INSERT','UPDATE','DELETE')"
verify "select 'analyses INSERT cols: ' || coalesce(string_agg(column_name, ', ' order by column_name), 'ninguno')
        from information_schema.column_privileges
        where table_schema='public' and table_name='analyses' and grantee='authenticated' and privilege_type='INSERT'"
verify "select 'analyses UPDATE: ' || coalesce(string_agg(column_name, ', ' order by column_name), 'ninguno')
        from information_schema.column_privileges
        where table_schema='public' and table_name='analyses' and grantee='authenticated' and privilege_type='UPDATE'"
verify "select 'analyses storage_driver: ' || coalesce((select 'sí' from information_schema.columns where table_schema='public' and table_name='analyses' and column_name='storage_driver'), 'NO')"
verify "select 'RPC ' || p.proname || ' service_role=' || has_function_privilege('service_role', p.oid, 'EXECUTE')
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname='public'
          and p.proname in ('add_credits','confirm_order_paid','charge_analysis_credit','refund_analysis_credit','get_analysis_report','mark_analysis_failed')
        order by 1"
verify "select 'referrals único en referred_user_id: ' ||
        coalesce((select 'sí' from pg_indexes where tablename='referrals' and indexname='referrals_referred_user_id_key'), 'NO')"
