#!/usr/bin/env bash
set -euo pipefail

# Script de pruebas para el módulo de justificaciones
# Requisitos: jq, curl

BASE_URL="http://localhost:8000/api/justificaciones"
USERS_URL="http://localhost:8000/api/users"

USER_EMAIL="rubencithochavez037@gmail.com"  # usuario que pedirá la justificación
REVISOR_EMAIL="rubencithochavez036@gmail.com" # usaremos admin como revisor

print() { echo -e "\n==== $1 ===="; }
ok(){ echo "[OK] $1"; }
fail(){ echo "[FAIL] $1"; exit 1; }

# Helpers
get_user_id_by_email(){
  local email="$1"
  resp=$(curl -sS "$USERS_URL/?search=${email}&page=1&pageSize=1")
  echo "$resp" | jq -r '.data.records[0].id // empty'
}

USER_ID=$(get_user_id_by_email "$USER_EMAIL")
REVISOR_ID=$(get_user_id_by_email "$REVISOR_EMAIL")

if [[ -z "$USER_ID" ]]; then
  echo "Usuario por email $USER_EMAIL no encontrado, intentando primer usuario activo..."
  USER_ID=$(curl -sS "$USERS_URL/?page=1&pageSize=1" | jq -r '.data.records[0].id // empty')
fi
if [[ -z "$REVISOR_ID" ]]; then
  echo "Revisor por email $REVISOR_EMAIL no encontrado, intentando primer usuario activo..."
  REVISOR_ID=$(curl -sS "$USERS_URL/?page=1&pageSize=1" | jq -r '.data.records[0].id // empty')
fi

if [[ -z "$USER_ID" ]]; then echo "Usuario para justificaciones no encontrado ($USER_EMAIL)"; exit 2; fi
if [[ -z "$REVISOR_ID" ]]; then echo "Revisor no encontrado ($REVISOR_EMAIL)"; exit 2; fi
ok "Usuarios encontrados: user=$USER_ID revisor=$REVISOR_ID"

# 1) Crear justificación
print "Crear justificación"
create_payload=$(cat <<EOF
{
  "user_id": $USER_ID,
  "fecha_inicio": "2025-10-10",
  "fecha_fin": "2025-10-11",
  "tipo": "medica",
  "motivo": "Consulta médica y reposo. Adjunto certificado",
  "documento_url": "https://example.com/cert.pdf"
}
EOF
)
resp=$(curl -sS -w "\n%{http_code}" -X POST "$BASE_URL" -H 'Content-Type: application/json' -d "$create_payload")
code=$(echo "$resp" | tail -n1)
body=$(echo "$resp" | sed '$d')
if [[ "$code" -ne 201 ]]; then echo "Create justificacion failed ($code): $body"; exit 1; fi
JUST_ID=$(echo "$body" | jq -r '.data.id // .data.id')
ok "Justificación creada: $JUST_ID"

# 2) Obtener por ID
print "Obtener justificación por ID"
resp=$(curl -sS "$BASE_URL/${JUST_ID}")
ret_id=$(echo "$resp" | jq -r '.data.id // empty')
if [[ "$ret_id" != "$JUST_ID" ]]; then fail "GET by id mismatch"; fi
ok "GET by id correcto"

# 3) Listar justificaciones por usuario
print "Listar justificaciones por usuario"
resp=$(curl -sS "$BASE_URL?user_id=${USER_ID}&page=1&page_size=10")
count=$(echo "$resp" | jq -r '.data.records | length')
if [[ $count -lt 1 ]]; then fail "Listado por usuario vacío"; fi
ok "Listado por usuario OK ($count registros)"

# 4) Actualizar justificación (solo pendientes permiten actualización)
print "Actualizar justificación (motivo)"
upd='{"motivo":"Actualización en el motivo - prueba"}'
resp=$(curl -sS -w "\n%{http_code}" -X PUT "$BASE_URL/${JUST_ID}" -H 'Content-Type: application/json' -d "$upd")
code=$(echo "$resp" | tail -n1)
body=$(echo "$resp" | sed '$d')
if [[ "$code" -ne 200 ]]; then echo "Update failed ($code): $body"; fail "Update failed"; fi
newmotivo=$(echo "$body" | jq -r '.data.motivo')
if [[ "$newmotivo" != "Actualización en el motivo - prueba" ]]; then fail "Update not applied"; fi
ok "Update OK"

# 5) Obtener pendientes generales
print "Obtener justificaciones pendientes"
resp=$(curl -sS "$BASE_URL/pendientes/todas")
pendientes_count=$(echo "$resp" | jq -r '.data.records | length')
ok "Pendientes obtenidos: $pendientes_count"

# 6) Aprobar la justificación
print "Aprobar justificación"
resp=$(curl -sS -w "\n%{http_code}" -X POST "$BASE_URL/${JUST_ID}/aprobar?revisor_id=${REVISOR_ID}&comentario=Todo+ok")
code=$(echo "$resp" | tail -n1)
body=$(echo "$resp" | sed '$d')
if [[ "$code" -ne 200 ]]; then echo "Aprobar failed ($code): $body"; exit 1; fi
estado=$(echo "$body" | jq -r '.data.estado')
if [[ "$estado" != "aprobada" ]]; then fail "Estado no APROBADA: $estado"; fi
ok "Aprobada OK"

# 7) Intentar rechazar una ya aprobada (debe fallar)
print "Intentar rechazar una aprobada (esperado fallo)"
resp=$(curl -sS -w "\n%{http_code}" -X POST "$BASE_URL/${JUST_ID}/rechazar?revisor_id=${REVISOR_ID}&comentario=No+valido")
code=$(echo "$resp" | tail -n1)
if [[ "$code" == "200" ]]; then echo "Se permitió rechazar una aprobada (error)"; fail "Rechazo should fail"; fi
ok "Rechazo rechazado (como se espera)"

# 8) Crear otra justificación para probar rechazo
print "Crear otra justificación para rechazarla"
create_payload2=$(cat <<EOF
{
  "user_id": $USER_ID,
  "fecha_inicio": "2025-10-12",
  "fecha_fin": "2025-10-12",
  "tipo": "personal",
  "motivo": "Asunto personal - prueba",
  "documento_url": ""
}
EOF
)
resp=$(curl -sS -w "\n%{http_code}" -X POST "$BASE_URL" -H 'Content-Type: application/json' -d "$create_payload2")
code=$(echo "$resp" | tail -n1)
body=$(echo "$resp" | sed '$d')
if [[ "$code" -ne 201 ]]; then echo "Create justificacion2 failed ($code): $body"; exit 1; fi
JUST2_ID=$(echo "$body" | jq -r '.data.id // .data.id')
ok "Just2 creada: $JUST2_ID"

# 9) Rechazar la nueva justificación (comentario obligatorio)
print "Rechazar justificación (comentario obligatorio)"
resp=$(curl -sS -w "\n%{http_code}" -X POST "$BASE_URL/${JUST2_ID}/rechazar?revisor_id=${REVISOR_ID}&comentario=Falta+documento")
code=$(echo "$resp" | tail -n1)
body=$(echo "$resp" | sed '$d')
if [[ "$code" -ne 200 ]]; then echo "Rechazar failed ($code): $body"; exit 1; fi
estado2=$(echo "$body" | jq -r '.data.estado')
if [[ "$estado2" != "rechazada" ]]; then fail "Estado no RECHAZADA: $estado2"; fi
ok "Rechazo OK"

# 10) Eliminar la justificación rechazada (no permitida si no es pendiente) - debe fallar
print "Eliminar justificación rechazada (esperado fallo)"
resp=$(curl -sS -w "\n%{http_code}" -X DELETE "$BASE_URL/${JUST2_ID}")
code=$(echo "$resp" | tail -n1)
if [[ "$code" == "200" ]]; then echo "Se eliminó una justificación no pendiente (error)"; fail "Delete should fail"; fi
ok "Delete rechazado como se esperaba"

print "Todos los tests de justificaciones completados con éxito"
exit 0
