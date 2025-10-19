#!/usr/bin/env bash
set -euo pipefail

BASE_URL="http://localhost:8000/api/turnos"
ADMIN_EMAIL="rubencithochavez036@gmail.com"

print(){ echo "\n$1"; }
ok(){ echo "[OK] $1"; }
fail(){ echo "[FAIL] $1"; exit 1; }

# 0) Buscar usuario admin para obtener sesión (simplificado)
print "==== Buscar usuario Admin por email ${ADMIN_EMAIL} ===="
resp=$(curl -sS "$BASE_URL" || true)
# We'll query users endpoint to fetch admin id
USER_API="http://localhost:8000/api/users"
user_resp=$(curl -sS "$USER_API/?search=${ADMIN_EMAIL}&page=1&pageSize=1")
ADMIN_ID=$(echo "$user_resp" | jq -r '.data.records[0].id')
if [[ -z "$ADMIN_ID" || "$ADMIN_ID" == "null" ]]; then fail "No se encontró Admin"; fi
ok "Admin ID: $ADMIN_ID"

# Helper: limpiar turnos con nombre de prueba (intenta desactivar si existen)
cleanup_turnos(){
  names=("Turno Test Mañana" "Turno Test Tarde")
  for n in "${names[@]}"; do
    get=$(curl -sS "http://localhost:8000/api/turnos?limit=100" )
    id=$(echo "$get" | jq -r --arg NAME "$n" '.turnos[] | select(.nombre==($NAME)) | .id' || true)
    if [[ -n "$id" ]]; then
      curl -sS -X DELETE "http://localhost:8000/api/turnos/$id" || true
    fi
  done
}

print "==== Limpieza previa (si existen turnos de prueba) ===="
cleanup_turnos
ok "Limpieza previa completada"

# 1) Crear turno
print "==== Crear turno 1 (mañana) ===="
create_payload='{"nombre":"Turno Test Mañana","descripcion":"Turno de prueba mañana","hora_inicio":"08:00","hora_fin":"12:00","activo":true}'
resp=$(curl -sS -X POST "$BASE_URL/" -H 'Content-Type: application/json' -d "$create_payload")
# If API enforces admin via current_user dependency, it will find an active user automatically
if echo "$resp" | jq -e '.id' >/dev/null 2>&1; then
  TURNO_ID=$(echo "$resp" | jq -r '.id')
  ok "Turno creado: $TURNO_ID"
else
  echo "Create failed: $resp"
  fail "Create turno failed"
fi

# 2) Obtener turno por ID
print "Obtener turno por ID"
resp=$(curl -sS "$BASE_URL/$TURNO_ID")
id=$(echo "$resp" | jq -r '.id')
if [[ "$id" != "$TURNO_ID" ]]; then fail "GET by id mismatch"; fi
ok "GET by id correcto"

# 3) Listar turnos
print "Listar turnos"
resp=$(curl -sS "$BASE_URL/?limit=10")
count=$(echo "$resp" | jq '.turnos | length')
if [[ $count -lt 1 ]]; then fail "No se listaron turnos"; fi
ok "Listado OK ($count turnos)"

# 4) Actualizar turno
print "Actualizar turno (cambiar hora_fin)"
upd='{"hora_fin":"13:30"}'
resp=$(curl -sS -X PUT "$BASE_URL/$TURNO_ID" -H 'Content-Type: application/json' -d "$upd")
newfin=$(echo "$resp" | jq -r '.hora_fin')
if [[ "$newfin" != "13:30:00" && "$newfin" != "13:30" ]]; then fail "Update failed: $resp"; fi
ok "Update OK"

# 5) Listar turnos activos
print "Listar turnos activos"
resp=$(curl -sS "$BASE_URL/activos")
active_count=$(echo "$resp" | jq 'length')
if [[ $active_count -lt 1 ]]; then fail "No se listaron turnos activos"; fi
ok "Listados activos OK ($active_count)"

# 6) Desactivar turno (delete)
print "Desactivar turno (soft delete)"
curl -sS -X DELETE "$BASE_URL/$TURNO_ID"
ok "Delete OK: $TURNO_ID"

# 7) Reactivar turno
print "Reactivar turno"
resp=$(curl -sS -X POST "$BASE_URL/$TURNO_ID/activar")
if echo "$resp" | jq -e '.id' >/dev/null 2>&1; then
  ok "Reactivate OK"
else
  echo "Reactivate failed: $resp"; fail "Reactivate failed"
fi

print "==== Tests de turnos completados ===="
exit 0
