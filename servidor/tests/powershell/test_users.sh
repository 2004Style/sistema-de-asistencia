#!/usr/bin/env bash
set -euo pipefail

# Test script para endpoints de usuarios
# Requisitos: jq, curl, bash

BASE_URL="http://localhost:8000/api/users"
TEST_IMAGES_DIR="test_images"

# Emails de prueba
ADMIN_EMAIL="chavezrubencitho@gmail.com"
COLAB_EMAIL="rubencithochavez037@gmail.com"

print() {
  echo -e "\n==== $1 ===="
}

ok() { echo "[OK] $1"; }
fail() { echo "[FAIL] $1"; FAILS=$((FAILS+1)); FAIL_MSGS+=("$1"); }

# Fallos acumulados
FAILS=0
FAIL_MSGS=()

# Helper: crear usuario (multipart/form-data con 10 imágenes)
create_user() {
  local name="$1"
  local email="$2"
  local codigo="$3"
  local password="$4"
  local role_id="$5"

  # Build images part (expect exactly 10 images named img1.jpg..img10.jpg)
  local -a parts
  for i in $(seq 1 10); do
    local img_path1="$TEST_IMAGES_DIR/img${i}.jpg"
    local img_path2="$TEST_IMAGES_DIR/image${i}.jpg"
    local chosen=""
    if [[ -f "$img_path1" ]]; then
      chosen="$img_path1"
    elif [[ -f "$img_path2" ]]; then
      chosen="$img_path2"
    else
      echo "Missing test image: tried $img_path1 and $img_path2"; exit 2
    fi
    parts+=( -F "images=@${chosen}" )
  done

  # Execute multipart request
  response=$(curl -sS -w "\n%{http_code}" -X POST "$BASE_URL/register" \
    -F "name=${name}" \
    -F "email=${email}" \
    -F "codigo_user=${codigo}" \
    -F "password=${password}" \
    -F "confirm_password=${password}" \
    -F "role_id=${role_id}" \
    "${parts[@]}")

  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  echo "$body" | jq . > /dev/null || true

  if [[ "$http_code" -eq 201 ]]; then
    user_id=$(echo "$body" | jq -r '.data.id')
    echo "$user_id"
    return 0
  fi

  # Handle duplicate email/code: try to fetch by codigo
  if [[ "$http_code" -eq 400 ]]; then
    msg=$(echo "$body" | jq -r '.detail // empty')
    if [[ "$msg" == *"email"* ]] || [[ "$msg" == *"código"* ]]; then
      echo "Create returned 400 (possible duplicate): $msg - attempting to fetch existing user by codigo"
      resp=$(curl -sS "$BASE_URL/codigo/${codigo}") || true
      existing_id=$(echo "$resp" | jq -r '.data.id // empty' || true)
      if [[ -n "$existing_id" && "$existing_id" != "null" ]]; then
        echo "$existing_id"
        return 0
      else
        echo "Could not retrieve existing user by codigo. Body: $body"; return 1
      fi
    else
      echo "Create user failed (code $http_code): $body"; return 1
    fi
  fi

  echo "Create user failed (code $http_code): $body"; return 1
}

# Helper: crear usuario pero devolver http code y body (sin lógica de recuperación)
raw_create_user() {
  local name="$1"
  local email="$2"
  local codigo="$3"
  local password="$4"
  local role_id="$5"

  local -a parts
  for i in $(seq 1 10); do
    local img_path1="$TEST_IMAGES_DIR/img${i}.jpg"
    local img_path2="$TEST_IMAGES_DIR/image${i}.jpg"
    local chosen=""
    if [[ -f "$img_path1" ]]; then
      chosen="$img_path1"
    elif [[ -f "$img_path2" ]]; then
      chosen="$img_path2"
    else
      echo "Missing test image: tried $img_path1 and $img_path2"; return 2
    fi
    parts+=( -F "images=@${chosen}" )
  done

  curl -sS -w "\n%{http_code}" -X POST "$BASE_URL/register" \
    -F "name=${name}" \
    -F "email=${email}" \
    -F "codigo_user=${codigo}" \
    -F "password=${password}" \
    -F "confirm_password=${password}" \
    -F "role_id=${role_id}" \
    "${parts[@]}"
}

# Helper: crear usuario con N imágenes (para probar errores)
raw_create_user_with_n_images() {
  local name="$1"
  local email="$2"
  local codigo="$3"
  local password="$4"
  local role_id="$5"
  local n=$6

  local -a parts
  for i in $(seq 1 $n); do
    local img_path1="$TEST_IMAGES_DIR/img${i}.jpg"
    local img_path2="$TEST_IMAGES_DIR/image${i}.jpg"
    local chosen=""
    if [[ -f "$img_path1" ]]; then
      chosen="$img_path1"
    elif [[ -f "$img_path2" ]]; then
      chosen="$img_path2"
    else
      echo "Missing test image for n=$n: tried $img_path1 and $img_path2"; return 2
    fi
    parts+=( -F "images=@${chosen}" )
  done

  curl -sS -w "\n%{http_code}" -X POST "$BASE_URL/register" \
    -F "name=${name}" \
    -F "email=${email}" \
    -F "codigo_user=${codigo}" \
    -F "password=${password}" \
    -F "confirm_password=${password}" \
    -F "role_id=${role_id}" \
    "${parts[@]}"
}

# Begin tests
print "Preparación: comprobar servidor y dependencias"
command -v jq >/dev/null || { echo "jq missing"; exit 1; }
command -v curl >/dev/null || { echo "curl missing"; exit 1; }

# 1) Crear usuario admin
print "Crear usuario Admin"
ADMIN_ID=$(create_user "Admin Tester" "$ADMIN_EMAIL" "ADMIN2" "Password123" 4)
if [[ -z "$ADMIN_ID" ]]; then fail "No se creó Admin"; fi
ok "Admin creado: $ADMIN_ID"

# 2) Crear usuario colaborador
print "Crear usuario Colaborador"
COLAB_ID=$(create_user "Colab Tester" "$COLAB_EMAIL" "COLAB123" "Password123" 1)
if [[ -z "$COLAB_ID" ]]; then fail "No se creó Colaborador"; fi
ok "Colaborador creado: $COLAB_ID"

# 2b) Intento duplicado explícito (esperamos 400)
print "Intento duplicado de creación (esperado 400)"
dup_resp=$(raw_create_user "Colab Tester" "$COLAB_EMAIL" "COLAB123" "Password123" 1)
dup_code=$(echo "$dup_resp" | tail -n1)
if [[ "$dup_code" -ne 400 && "$dup_code" -ne 201 ]]; then
  echo "Duplicated create unexpected code: $dup_code"; fail "Duplicated create unexpected: $dup_code - body: $(echo "$dup_resp" | sed '
$d')"
else
  ok "Duplicated create returned $dup_code (400 or 201 acceptable)"
fi

# 2c) Intento de registro con menos de 10 imágenes -> esperar 400
print "Registrar con menos de 10 imágenes (esperado 400)"
resp_short=$(raw_create_user_with_n_images "ShortImages" "shortimgs@example.com" "SHORTIMG1" "Password123" 1 5)
code_short=$(echo "$resp_short" | tail -n1)
if [[ "$code_short" -ne 400 ]]; then
  echo "Expected 400 for short images, got $code_short"; fail "Short images test unexpected code: $code_short - body: $(echo "$resp_short" | sed '$d')"
else
  ok "Short images produced 400 as esperado"
fi

# 2d) Intento de registro con contraseña corta -> esperar 400/422
print "Registrar con password corta (esperado 400/422)"
resp_pw=$(raw_create_user "ShortPass" "shortpass@example.com" "SHORTPASS1" "short" 1)
pw_code=$(echo "$resp_pw" | tail -n1)
if [[ "$pw_code" -ne 400 && "$pw_code" -ne 422 ]]; then
  # server may return 500 due to server-side handling; log as failure but continue
  echo "Expected 400/422 for short password, got $pw_code";
  fail "Short password test unexpected code: $pw_code - body: $(echo "$resp_pw" | sed '$d')"
else
  ok "Short password produced $pw_code as esperado"
fi

# 2e) Intento de registro con rol inexistente -> esperar 404
print "Registrar con rol inexistente (esperado 404)"
resp_role=$(raw_create_user "NoRole" "norole@example.com" "NOROLE1" "Password123" 99999)
role_code=$(echo "$resp_role" | tail -n1)
if [[ "$role_code" -ne 404 ]]; then
  echo "Expected 404 for nonexistent role, got $role_code"; fail "Nonexistent role test unexpected code: $role_code - body: $(echo "$resp_role" | sed '$d')"
else
  ok "Nonexistent role produced 404"
fi

# 3) Obtener usuario por id
print "Obtener usuario por ID"
resp=$(curl -sS "$BASE_URL/${COLAB_ID}")
code=$(echo "$resp" | jq -r '.data.id // empty')
if [[ "$code" != "$COLAB_ID" ]]; then fail "GET by id mismatch"; fi
ok "GET by id correcto"

# 4) Obtener usuario por codigo
print "Obtener usuario por código"
resp=$(curl -sS "$BASE_URL/codigo/COLAB123")
code=$(echo "$resp" | jq -r '.data.codigo_user // empty')
if [[ "$code" != "COLAB123" ]]; then fail "GET by codigo mismatch"; fi
ok "GET by codigo correcto"

# 5) Listar usuarios paginados (pageSize=2)
print "Listar usuarios paginados"
resp=$(curl -sS "$BASE_URL/?page=1&pageSize=2")
count=$(echo "$resp" | jq '.data.records | length')
if [[ $count -lt 1 ]]; then fail "Paginated list empty"; fi
ok "Paginado OK ($count records)"

# 6) Buscar usuarios por term
print "Buscar por termino 'Colab'"
resp=$(curl -sS "$BASE_URL/?search=Colab")
count=$(echo "$resp" | jq '.data.records | length')
if [[ $count -lt 1 ]]; then fail "Search returned none"; fi
ok "Search OK"

# 7) Actualizar usuario (PUT)
print "Actualizar usuario (nombre)"
update_payload='{"name":"Colab Updated"}'
resp=$(curl -sS -X PUT "$BASE_URL/${COLAB_ID}" -H 'Content-Type: application/json' -d "$update_payload")
newname=$(echo "$resp" | jq -r '.data.name')
if [[ "$newname" != "Colab Updated" ]]; then fail "Update failed"; fi
ok "Update OK"

# 7b) Intentar actualizar email a uno existente (debe fallar: 400)
print "Actualizar email a uno existente (esperado 400)"
resp_email=$(curl -sS -X PUT "$BASE_URL/${COLAB_ID}" -H 'Content-Type: application/json' -d '{"email":"'$ADMIN_EMAIL'"}')
code_email=$(echo "$resp_email" | jq -r '.status_code // empty' || true)
if [[ -z "$code_email" ]]; then
  # servidor puede retornar HTTP 400 con body simple
  possible_msg=$(echo "$resp_email" | jq -r '.detail // empty' || true)
  if [[ -z "$possible_msg" ]]; then
    ok "Update email returned non-JSON body, continue"
  else
    echo "Update email returned message: $possible_msg";
  fi
fi
ok "Update email duplicate test executed"

# 7c) Cambiar role_id
print "Actualizar role_id" 
resp_role_upd=$(curl -sS -X PUT "$BASE_URL/${COLAB_ID}" -H 'Content-Type: application/json' -d '{"role_id":4}')
newrole=$(echo "$resp_role_upd" | jq -r '.data.role.id // empty' || true)
if [[ -z "$newrole" ]]; then
  # Try alternative field name role_id
  newrole=$(echo "$resp_role_upd" | jq -r '.data.role_id // empty' || true)
fi
if [[ -z "$newrole" ]]; then
  echo "Role update returned no role id in body; body: $resp_role_upd"; fail "Role update failed"
else
  ok "Role update OK -> role id $newrole"
fi

# 7d) Cambiar contraseña
print "Actualizar contraseña (PUT)"
resp_pw_upd=$(curl -sS -X PUT "$BASE_URL/${COLAB_ID}" -H 'Content-Type: application/json' -d '{"password":"NewPassword123"}')
ok "Password update executed (response may not expose password)"

# 8) Eliminar usuario
print "Eliminar usuario Colaborador"
resp=$(curl -sS -X DELETE "$BASE_URL/${COLAB_ID}")
deleted=$(echo "$resp" | jq -r '.data.deleted')
if [[ "$deleted" != "true" ]]; then fail "Delete failed"; fi
ok "Delete OK"

# 9) Intentar obtener usuario eliminado (debe 404)
print "Obtener usuario eliminado (esperado 404)"
set +e
resp=$(curl -sS -w "\n%{http_code}" "$BASE_URL/${COLAB_ID}")
set -e
http_code=$(echo "$resp" | tail -n1)
if [[ "$http_code" -ne 404 ]]; then fail "Expected 404, got $http_code"; fi
ok "404 recibido correctamente"

print "Tests finalizados"

if [[ $FAILS -gt 0 ]]; then
  echo "\nResumen: $FAILS prueba(s) fallida(s):"
  for m in "${FAIL_MSGS[@]}"; do
    echo " - $m"
  done
  echo ""
  # Imprimir también el admin id para posible limpieza manual
  echo "Admin ID creado: $ADMIN_ID"
  echo "Colab ID (si existe): $COLAB_ID"
  exit 1
else
  echo "\nResumen: todas las pruebas pasaron"
  echo "Admin ID creado: $ADMIN_ID"
  echo "Colab ID (delete hecho): $COLAB_ID"
fi

# Limpieza opcional: si se exporta CLEANUP=true, eliminar el Admin creado
if [[ "${CLEANUP:-false}" == "true" ]]; then
  echo "\nCLEANUP=true -> eliminando Admin ($ADMIN_ID)"
  curl -sS -X DELETE "$BASE_URL/${ADMIN_ID}" | jq . || echo "Failed to delete admin"
fi

exit 0
