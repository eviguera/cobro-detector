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

MIGRATION="$(cd "$(dirname "$0")/.." && pwd)/supabase/migrations/20261109_security_hardening.sql"

if [ ! -f "$MIGRATION" ]; then
  echo "No se encontró la migración: $MIGRATION" >&2
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Falta DATABASE_URL (cadena de conexión de Postgres de Supabase)." >&2
  exit 1
fi

run_psql() {
  if command -v psql >/dev/null 2>&1; then
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$MIGRATION"
  elif docker ps --format '{{.Names}}' | grep -q '^supabase_db_'; then
    local c
    c="$(docker ps --format '{{.Names}}' | grep '^supabase_db_' | head -1)"
    docker exec -i "$c" psql "$DATABASE_URL" -v ON_ERROR_STOP=1 < "$MIGRATION"
  else
    docker run --rm -i postgres:17 psql "$DATABASE_URL" -v ON_ERROR_STOP=1 < "$MIGRATION"
  fi
}

echo "== Aplicando migración (idempotente) =="
run_psql

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
        where table_name='profiles' and grantee='authenticated' and privilege_type='UPDATE'"
verify "select 'credits DML: ' || coalesce(string_agg(distinct privilege_type, ','), 'ninguno')
        from information_schema.column_privileges
        where table_name='credits' and grantee='authenticated'
          and privilege_type in ('INSERT','UPDATE','DELETE')"
verify "select 'analyses INSERT cols: ' || string_agg(column_name, ', ' order by column_name)
        from information_schema.column_privileges
        where table_name='analyses' and grantee='authenticated' and privilege_type='INSERT'"
verify "select 'RPC ' || p.proname || ' service_role=' || has_function_privilege('service_role', p.oid, 'EXECUTE')
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname='public'
          and p.proname in ('add_credits','confirm_order_paid','charge_analysis_credit','refund_analysis_credit','get_analysis_report')
        order by 1"
verify "select 'referrals único en referred_user_id: ' ||
        coalesce((select 'sí' from pg_indexes where tablename='referrals' and indexname='referrals_referred_user_id_key'), 'NO')"
