#!/usr/bin/env bash
set -euo pipefail

# Test script para endpoints de horarios
# Requisitos: jq, curl

BASE_URL="http://localhost:8000/api/horarios"
USERS_URL="http://localhost:8000/api/users"
TEST_IMAGES_DIR="test_images"

ADMIN_EMAIL="rubencithochavez036@gmail.com"
COLAB_EMAIL="rubencithochavez037@gmail.com"

print() { echo -e "\n==== $1 ===="; }
ok(){ echo "[OK] $1"; }
fail(){ echo "[FAIL] $1"; exit 1; }

# Helper: obtener usuario por email
get_user_id_by_email(){
  local email="$1"
  resp=$(curl -sS "$USERS_URL/?search=${email}&page=1&pageSize=1")
  echo "$resp" | jq -r '.data.records[0].id // empty'
}

# Preparar: obtener un usuario existente (Admin) o abortar
print "Buscar usuario Admin por email $ADMIN_EMAIL"
ADMIN_ID=$(get_user_id_by_email "$ADMIN_EMAIL")
if [[ -z "$ADMIN_ID" ]]; then
  echo "No se encontró Admin. Asegúrate de ejecutar test_users.sh primero."; exit 2
fi
ok "Admin ID: $ADMIN_ID"

# Limpiar horarios previos del usuario
print "Limpiar horarios previos (si existen)"
curl -sS -X DELETE "$BASE_URL/usuario/${ADMIN_ID}" > /dev/null || true
ok "Limpieza previa completada"

# Asumir que los turnos seed están creados; usaremos turno_id=1 para pruebas básicas
TURN0=1

# 1) Crear un horario simple
print "Crear horario simple"
create_payload=$(cat <<EOF
{
  "user_id": $ADMIN_ID,
  "turno_id": $TURN0,
  "dia_semana": "lunes",
  "hora_entrada": "08:00",
  "hora_salida": "12:00",
  "horas_requeridas": 240,
  "tolerancia_entrada": 15,
  "tolerancia_salida": 15,
  "activo": true,
  "descripcion": "Horario de prueba mañana"
}
EOF
)
resp=$(curl -sS -w "\n%{http_code}" -X POST "$BASE_URL" -H 'Content-Type: application/json' -d "$create_payload")
code=$(echo "$resp" | tail -n1)
body=$(echo "$resp" | sed '$d')
if [[ "$code" -ne 201 ]]; then
  echo "Create horario failed ($code): $body"; exit 1
fi
HORARIO_ID=$(echo "$body" | jq -r '.data.id')
ok "Horario creado: $HORARIO_ID"

# 2) Obtener horario por ID
print "Obtener horario por ID"
resp=$(curl -sS "$BASE_URL/${HORARIO_ID}")
id=$(echo "$resp" | jq -r '.data.id')
if [[ "$id" != "$HORARIO_ID" ]]; then fail "GET by id mismatch"; fi
ok "GET by id correcto"

# 3) Listar horarios por usuario
print "Listar horarios por usuario"
resp=$(curl -sS "$BASE_URL?user_id=${ADMIN_ID}&page=1&page_size=10")
count=$(echo "$resp" | jq '.data.records | length')
if [[ $count -lt 1 ]]; then fail "No se listaron horarios"; fi
ok "Listado por usuario OK ($count registros)"

# 4) Obtener horarios por usuario endpoint específico
print "GET /usuario/{user_id}"
resp=$(curl -sS "$BASE_URL/usuario/${ADMIN_ID}")
count2=$(echo "$resp" | jq '.data.records | length')
if [[ $count2 -lt 1 ]]; then fail "GET by user endpoint returned none"; fi
ok "GET by user OK"

# 5) Actualizar horario (cambiar horas)
print "Actualizar horario (hora_salida)"
upd='{"hora_salida":"13:00","horas_requeridas":300}'
resp=$(curl -sS -X PUT "$BASE_URL/${HORARIO_ID}" -H 'Content-Type: application/json' -d "$upd")
newhoras=$(echo "$resp" | jq -r '.data.horas_requeridas')
if [[ "$newhoras" != "300" ]]; then fail "Update failed"; fi
ok "Update OK"

# 6) Detectar turno activo (usar hora dentro del rango)
print "Detectar turno activo (hora 09:00)"
resp=$(curl -sS "$BASE_URL/usuario/${ADMIN_ID}/turno-activo?dia_semana=lunes&hora=09:00")
if echo "$resp" | jq -e '.data' >/dev/null 2>&1; then
  ok "Turno activo detectado"
else
  echo "No se detectó turno activo: $resp"; fail "Detect turno failed"
fi

# 7) Crear bulk horarios
print "Crear bulk de horarios"
bulk_payload=$(cat <<EOF
[
  {
    "user_id": $ADMIN_ID,
    "turno_id": $TURN0,
    "dia_semana": "martes",
    "hora_entrada": "08:00",
    "hora_salida": "12:00",
    "horas_requeridas": 240,
    "tolerancia_entrada": 15,
    "tolerancia_salida": 15,
    "activo": true
  },
  {
    "user_id": $ADMIN_ID,
    "turno_id": $TURN0,
    "dia_semana": "miercoles",
    "hora_entrada": "14:00",
    "hora_salida": "18:00",
    "horas_requeridas": 240,
    "tolerancia_entrada": 15,
    "tolerancia_salida": 15,
    "activo": true
  }
]
EOF
)
resp=$(curl -sS -w "\n%{http_code}" -X POST "$BASE_URL/bulk" -H 'Content-Type: application/json' -d "$bulk_payload")
code=$(echo "$resp" | tail -n1)
body=$(echo "$resp" | sed '$d')
if [[ "$code" -ne 201 ]]; then echo "Bulk create failed ($code): $body"; fail "Bulk create"; fi
ok "Bulk create OK"

# 8) Filtrar horarios por día
print "Filtrar horarios por día de la semana"
resp=$(curl -sS "$BASE_URL?dia_semana=lunes&page=1&page_size=10")
count=$(echo "$resp" | jq '.data.records | length')
if [[ $count -lt 1 ]]; then fail "No se encontraron horarios para lunes"; fi
ok "Filtro por día OK ($count horarios)"

# 9) Eliminar horario creado inicialmente
print "Eliminar horario creado"
resp=$(curl -sS -X DELETE "$BASE_URL/${HORARIO_ID}")
ok "Delete OK: $HORARIO_ID"

# 10) Borrar todos los horarios del usuario
print "Eliminar todos los horarios del usuario"
resp=$(curl -sS -X DELETE "$BASE_URL/usuario/${ADMIN_ID}")
ok "Delete all for user OK"

# 11) Crear dos horarios para miércoles en dos turnos distintos
print "Crear dos horarios para miercoles en dos turnos"
# Asumimos que existen al menos dos turnos seed: 1 y 2
TURN1=1
TURN2=2

create_w1=$(cat <<EOF
{
  "user_id": $ADMIN_ID,
  "turno_id": $TURN1,
  "dia_semana": "miercoles",
  "hora_entrada": "08:00",
  "hora_salida": "12:00",
  "horas_requeridas": 240,
  "tolerancia_entrada": 15,
  "tolerancia_salida": 15,
  "activo": true,
  "descripcion": "Miercoles - turno 1"
}
EOF
)

create_w2=$(cat <<EOF
{
  "user_id": $ADMIN_ID,
  "turno_id": $TURN2,
  "dia_semana": "miercoles",
  "hora_entrada": "13:00",
  "hora_salida": "17:00",
  "horas_requeridas": 240,
  "tolerancia_entrada": 15,
  "tolerancia_salida": 15,
  "activo": true,
  "descripcion": "Miercoles - turno 2"
}
EOF
)

resp=$(curl -sS -w "\n%{http_code}" -X POST "$BASE_URL" -H 'Content-Type: application/json' -d "$create_w1")
code=$(echo "$resp" | tail -n1)
body=$(echo "$resp" | sed '$d')
if [[ "$code" -ne 201 ]]; then echo "Create w1 failed ($code): $body"; fail "Create w1"; fi
W1_ID=$(echo "$body" | jq -r '.data.id')
ok "Horario miercoles creado (turno $TURN1): $W1_ID"

resp=$(curl -sS -w "\n%{http_code}" -X POST "$BASE_URL" -H 'Content-Type: application/json' -d "$create_w2")
code=$(echo "$resp" | tail -n1)
body=$(echo "$resp" | sed '$d')
if [[ "$code" -ne 201 ]]; then echo "Create w2 failed ($code): $body"; fail "Create w2"; fi
W2_ID=$(echo "$body" | jq -r '.data.id')
ok "Horario miercoles creado (turno $TURN2): $W2_ID"

# Verificar que ambos horarios aparecen al filtrar por día y usuario
print "Verificar listados para miercoles"
resp=$(curl -sS "$BASE_URL?user_id=${ADMIN_ID}&dia_semana=miercoles&page=1&page_size=10")
count_miercoles=$(echo "$resp" | jq '.data.records | length')
if [[ $count_miercoles -lt 2 ]]; then echo "Esperado >=2 horarios en miercoles, obtenido: $count_miercoles"; fail "Check miercoles"; fi
ok "Se listaron $count_miercoles horarios para miercoles (incluye ambos turnos)"

print "Todos los tests de horarios completados con éxito"
exit 0
