#!/usr/bin/env bash
set -euo pipefail

# Script de pruebas para el módulo de asistencias (registro manual)
# Requisitos: jq, curl

BASE_URL="http://localhost:8000/api/asistencia"
USERS_URL="http://localhost:8000/api/users"

ADMIN_EMAIL="rubencithochavez036@gmail.com"

print() { echo -e "\n==== $1 ===="; }
ok(){ echo "[OK] $1"; }
fail(){ echo "[FAIL] $1"; exit 1; }

# Helper: obtener usuario por email
get_user_id_by_email(){
  local email="$1"
  resp=$(curl -sS "$USERS_URL/?search=${email}&page=1&pageSize=1")
  echo "$resp" | jq -r '.data.records[0].id // empty'
}

print "Buscar usuario por email $ADMIN_EMAIL"
USER_ID=$(get_user_id_by_email "$ADMIN_EMAIL")
if [[ -z "$USER_ID" ]]; then
  echo "No se encontró usuario. Asegúrate de haber creado seeds/users."; exit 2
fi
ok "Usuario ID: $USER_ID"

# 0) Borrar asistencias previas del usuario (si existen)
print "Limpiar asistencias previas del usuario (si existen)"
resp=$(curl -sS "$BASE_URL/usuario/${USER_ID}?page=1&pageSize=100")
ids=$(echo "$resp" | jq -r '.data.records[]?.id') || true
if [[ -n "$ids" ]]; then
  for id in $ids; do
    curl -sS -X DELETE "$BASE_URL/$id" > /dev/null || true
  done
fi
ok "Limpieza previa completada"

# 1) Registrar ENTRADA manual (POST /registrar-manual)
print "Registrar ENTRADA manual"
payload=$(cat <<EOF
{
  "user_id": $USER_ID,
  "tipo_registro": "entrada",
  "observaciones": "Registro manual de prueba entrada"
}
EOF
)
resp=$(curl -sS -w "\n%{http_code}" -X POST "$BASE_URL/registrar-manual" -H 'Content-Type: application/json' -d "$payload")
code=$(echo "$resp" | tail -n1)
body=$(echo "$resp" | sed '$d')
if [[ "$code" -ne 200 && "$code" -ne 201 ]]; then
  echo "Create entrada failed ($code): $body"; exit 1
fi
ASISTENCIA_ID=$(echo "$body" | jq -r '.data.id // .data.id')
if [[ -z "$ASISTENCIA_ID" || "$ASISTENCIA_ID" == "null" ]]; then
  echo "No se obtuvo ID de asistencia: $body"; exit 1
fi
ok "Entrada registrada: $ASISTENCIA_ID"

# 2) Obtener asistencia por ID
print "Obtener asistencia por ID"
resp=$(curl -sS "$BASE_URL/${ASISTENCIA_ID}")
id=$(echo "$resp" | jq -r '.data.id // empty')
if [[ "$id" != "$ASISTENCIA_ID" ]]; then fail "GET by id mismatch: $resp"; fi
ok "GET by id correcto"

# 3) Intentar crear otra ENTRADA (debe fallar si ya existe entrada)
print "Intentar crear otra entrada para el mismo turno (esperado: fallo)"
resp=$(curl -sS -w "\n%{http_code}" -X POST "$BASE_URL/registrar-manual" -H 'Content-Type: application/json' -d "$payload")
code=$(echo "$resp" | tail -n1)
if [[ "$code" == "200" || "$code" == "201" ]]; then
  echo "Se permitió doble entrada (error): $resp"; fail "Duplicate entrada allowed"
fi
ok "Duplicado rechazado (como se esperaba)"

# 4) Registrar SALIDA manual (el endpoint detecta tipo cuando ya existe entrada)
print "Registrar SALIDA manual"
payload_salida=$(cat <<EOF
{
  "user_id": $USER_ID,
  "tipo_registro": "salida",
  "observaciones": "Registro manual de prueba salida"
}
EOF
)
resp=$(curl -sS -w "\n%{http_code}" -X POST "$BASE_URL/registrar-manual" -H 'Content-Type: application/json' -d "$payload_salida")
code=$(echo "$resp" | tail -n1)
body=$(echo "$resp" | sed '$d')
if [[ "$code" -ne 200 && "$code" -ne 201 ]]; then
  echo "Create salida failed ($code): $body"; exit 1
fi
ok "Salida registrada: $ASISTENCIA_ID"

# 5) Obtener asistencia y verificar que hora_salida esté presente
print "Verificar que la asistencia ahora contiene hora_salida"
resp=$(curl -sS "$BASE_URL/${ASISTENCIA_ID}")
hora_salida=$(echo "$resp" | jq -r '.data.hora_salida // empty')
if [[ -z "$hora_salida" ]]; then fail "Hora salida no registrada: $resp"; fi
ok "Salida presente ($hora_salida)"

# 6) Actualizar asistencia (observaciones)
print "Actualizar asistencia (observaciones)"
upd='{"observaciones":"Actualización de prueba - editado"}'
resp=$(curl -sS -w "\n%{http_code}" -X PUT "$BASE_URL/actualizar-manual/${ASISTENCIA_ID}" -H 'Content-Type: application/json' -d "$upd")
code=$(echo "$resp" | tail -n1)
body=$(echo "$resp" | sed '$d')
if [[ "$code" -ne 200 ]]; then echo "Update failed ($code): $body"; fail "Update failed"; fi
newobs=$(echo "$body" | jq -r '.data.observaciones')
if [[ "$newobs" != "Actualización de prueba - editado" ]]; then fail "Update not applied"; fi
ok "Update OK"

# 7) Eliminar asistencia
print "Eliminar asistencia"
resp=$(curl -sS -w "\n%{http_code}" -X DELETE "$BASE_URL/${ASISTENCIA_ID}")
code=$(echo "$resp" | tail -n1)
if [[ "$code" != "200" && "$code" != "204" ]]; then echo "Delete failed: $resp"; fail "Delete failed"; fi
ok "Delete OK"

# 8) Comprobar que la asistencia no existe
print "Verificar que la asistencia fue eliminada"
resp=$(curl -sS -w "\n%{http_code}" "$BASE_URL/${ASISTENCIA_ID}")
code=$(echo "$resp" | tail -n1)
if [[ "$code" != "404" && "$code" != "400" ]]; then echo "Expected 404/400 after delete but got $code: $resp"; fail "Deleted record still exists"; fi
ok "Asistencia eliminada verificada"

# 9) Crear nuevamente otra asistencia manual después del delete
print "Crear NUEVA ENTRADA manual después del delete"
payload_new=$(cat <<EOF
{
  "user_id": $USER_ID,
  "tipo_registro": "entrada",
  "observaciones": "Registro manual recreado despues de delete"
}
EOF
)
resp=$(curl -sS -w "\n%{http_code}" -X POST "$BASE_URL/registrar-manual" -H 'Content-Type: application/json' -d "$payload_new")
code=$(echo "$resp" | tail -n1)
body=$(echo "$resp" | sed '$d')
if [[ "$code" -ne 200 && "$code" -ne 201 ]]; then
  echo "Create nueva entrada failed ($code): $body"; exit 1
fi
NEW_ASISTENCIA_ID=$(echo "$body" | jq -r '.data.id // .data.id')
if [[ -z "$NEW_ASISTENCIA_ID" || "$NEW_ASISTENCIA_ID" == "null" ]]; then
  echo "No se obtuvo ID de la nueva asistencia: $body"; exit 1
fi
ok "Nueva entrada registrada: $NEW_ASISTENCIA_ID"

print "Todos los tests de asistencias (manual) completados con éxito"
exit 0
