#!/bin/bash

###############################################################################
# Script de Testing Completo para el Controlador de ROLES
# 
# Este script prueba todos los endpoints del controlador de roles:
# - POST /api/roles - Crear rol
# - GET /api/roles - Listar todos los roles (con paginación)
# - GET /api/roles/{id} - Obtener rol por ID
# - PUT /api/roles/{id} - Actualizar rol
# - DELETE /api/roles/{id} - Eliminar rol
# - GET /api/roles/activos/listar - Listar roles activos
#
# Uso: ./test_roles.sh
###############################################################################

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuración
BASE_URL="http://localhost:8000/api"
ROLES_ENDPOINT="$BASE_URL/roles/"

# Variables globales
CREATED_ROLE_ID=""
TEST_PASSED=0
TEST_FAILED=0

###############################################################################
# Funciones auxiliares
###############################################################################

print_header() {
    echo ""
    echo -e "${CYAN}============================================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}============================================================${NC}"
}

print_test() {
    echo -e "\n${BLUE}▶ TEST: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ PASSED: $1${NC}"
    ((TEST_PASSED++))
}

print_error() {
    echo -e "${RED}✗ FAILED: $1${NC}"
    ((TEST_FAILED++))
}

print_info() {
    echo -e "${YELLOW}ℹ INFO: $1${NC}"
}

print_response() {
    echo -e "${MAGENTA}Response:${NC}"
    echo "$1" | jq '.' 2>/dev/null || echo "$1"
}

check_jq() {
    if ! command -v jq &> /dev/null; then
        print_error "jq no está instalado. Instálalo con: sudo apt-get install jq"
        exit 1
    fi
}

###############################################################################
# Tests
###############################################################################

test_1_listar_roles_iniciales() {
    print_test "1. Listar roles iniciales (seed)"
    
    response=$(curl -s -X GET "$ROLES_ENDPOINT")
    print_response "$response"
    
    # Verificar que hay al menos 4 roles (los del seed)
    count=$(echo "$response" | jq -r '.data.records | length')
    if [ "$count" -ge 4 ]; then
        print_success "Se encontraron $count roles (mínimo 4 del seed)"
    else
        print_error "Se esperaban al menos 4 roles, se encontraron $count"
    fi
    
    # Verificar que existen los roles esperados
    roles=$(echo "$response" | jq -r '.data.records[].nombre')
    for role in "COLABORADOR" "SUPERVISOR" "RRHH" "ADMINISTRADOR"; do
        if echo "$roles" | grep -q "$role"; then
            print_success "Rol '$role' existe"
        else
            print_error "Rol '$role' no encontrado"
        fi
    done
}

test_2_crear_rol_valido() {
    print_test "2. Crear un nuevo rol válido"
    
    # Generar nombre único con timestamp
    timestamp=$(date +%s)
    nombre_rol="AUDITOR_$timestamp"
    
    response=$(curl -s -X POST "$ROLES_ENDPOINT" \
        -H "Content-Type: application/json" \
        -d "{
            \"nombre\": \"$nombre_rol\",
            \"descripcion\": \"Rol de auditoría con acceso de solo lectura\",
            \"es_admin\": false,
            \"puede_aprobar\": false,
            \"puede_ver_reportes\": true,
            \"puede_gestionar_usuarios\": false,
            \"activo\": true
        }")
    
    print_response "$response"
    
    # Guardar ID del rol creado
    CREATED_ROLE_ID=$(echo "$response" | jq -r '.data.id')
    
    if [ "$CREATED_ROLE_ID" != "null" ] && [ -n "$CREATED_ROLE_ID" ]; then
        print_success "Rol creado con ID: $CREATED_ROLE_ID"
    else
        print_error "No se pudo crear el rol"
    fi
}

test_3_crear_rol_duplicado() {
    print_test "3. Intentar crear rol con nombre duplicado (debe fallar)"
    
    response=$(curl -s -X POST "$ROLES_ENDPOINT" \
        -H "Content-Type: application/json" \
        -d '{
            "nombre": "ADMINISTRADOR",
            "descripcion": "Duplicado",
            "es_admin": false,
            "puede_aprobar": false,
            "puede_ver_reportes": false,
            "puede_gestionar_usuarios": false,
            "activo": true
        }')
    
    print_response "$response"
    
    detail=$(echo "$response" | jq -r '.detail')
    if echo "$detail" | grep -qi "ya existe\|duplicate\|exist"; then
        print_success "El sistema rechazó correctamente el rol duplicado"
    else
        print_error "El sistema debería rechazar roles duplicados"
    fi
}

test_4_crear_rol_nombre_vacio() {
    print_test "4. Intentar crear rol con nombre vacío (debe fallar)"
    
    response=$(curl -s -X POST "$ROLES_ENDPOINT" \
        -H "Content-Type: application/json" \
        -d '{
            "nombre": "",
            "descripcion": "Test",
            "es_admin": false,
            "puede_aprobar": false,
            "puede_ver_reportes": false,
            "puede_gestionar_usuarios": false,
            "activo": true
        }')
    
    print_response "$response"
    
    # Verificar que hay un error de validación
    if echo "$response" | jq -e '.detail' > /dev/null; then
        print_success "El sistema rechazó correctamente el nombre vacío"
    else
        print_error "El sistema debería validar el nombre"
    fi
}

test_5_obtener_rol_por_id() {
    print_test "5. Obtener rol por ID"
    
    if [ -z "$CREATED_ROLE_ID" ]; then
        print_error "No hay ID de rol para probar"
        return
    fi
    
    response=$(curl -s -X GET "$ROLES_ENDPOINT$CREATED_ROLE_ID")
    print_response "$response"
    
    nombre=$(echo "$response" | jq -r '.data.nombre')
    if echo "$nombre" | grep -q "AUDITOR"; then
        print_success "Rol obtenido correctamente: $nombre"
    else
        print_error "El rol no se obtuvo correctamente"
    fi
}

test_6_obtener_rol_inexistente() {
    print_test "6. Intentar obtener rol inexistente (debe fallar)"
    
    response=$(curl -s -X GET "${ROLES_ENDPOINT}99999")
    print_response "$response"
    
    if echo "$response" | jq -e '.detail' > /dev/null; then
        print_success "El sistema manejó correctamente el rol inexistente"
    else
        print_error "El sistema debería retornar error para rol inexistente"
    fi
}

test_7_actualizar_rol() {
    print_test "7. Actualizar rol existente"
    
    if [ -z "$CREATED_ROLE_ID" ]; then
        print_error "No hay ID de rol para probar"
        return
    fi
    
    # Usar el nombre del rol creado dinámicamente
    nombre_actualizado="AUDITOR_$(date +%s)"
    
    response=$(curl -s -X PUT "$ROLES_ENDPOINT$CREATED_ROLE_ID" \
        -H "Content-Type: application/json" \
        -d "{
            \"nombre\": \"$nombre_actualizado\",
            \"descripcion\": \"Rol de auditoría actualizado con más permisos\",
            \"es_admin\": false,
            \"puede_aprobar\": true,
            \"puede_ver_reportes\": true,
            \"puede_gestionar_usuarios\": false,
            \"activo\": true
        }")
    
    print_response "$response"
    
    descripcion=$(echo "$response" | jq -r '.data.descripcion')
    puede_aprobar=$(echo "$response" | jq -r '.data.puede_aprobar')
    
    if echo "$descripcion" | grep -q "actualizado" && [ "$puede_aprobar" == "true" ]; then
        print_success "Rol actualizado correctamente"
    else
        print_error "El rol no se actualizó correctamente"
    fi
}

test_8_listar_con_paginacion() {
    print_test "8. Listar roles con paginación"
    
    # Primera página
    response=$(curl -s -X GET "${ROLES_ENDPOINT}?page=1&pageSize=2")
    print_response "$response"
    
    items=$(echo "$response" | jq -r '.data.records | length')
    page=$(echo "$response" | jq -r '.data.currentPage')
    
    if [ "$items" -eq 2 ] && [ "$page" -eq 1 ]; then
        print_success "Paginación funciona correctamente (2 items en página 1)"
    else
        print_error "La paginación no funciona como se esperaba (items: $items, page: $page)"
    fi
    
    # Segunda página
    print_info "Probando segunda página..."
    response=$(curl -s -X GET "${ROLES_ENDPOINT}?page=2&pageSize=2")
    items=$(echo "$response" | jq -r '.data.records | length')
    page=$(echo "$response" | jq -r '.data.currentPage')
    
    if [ "$page" -eq 2 ]; then
        print_success "Segunda página funciona correctamente ($items items en página 2)"
    else
        print_error "La segunda página no funciona correctamente"
    fi
}

test_9_listar_con_busqueda() {
    print_test "9. Listar roles con búsqueda"
    
    response=$(curl -s -X GET "${ROLES_ENDPOINT}?search=ADMIN")
    print_response "$response"
    
    items=$(echo "$response" | jq -r '.data.records | length')
    nombres=$(echo "$response" | jq -r '.data.records[].nombre')
    
    if [ "$items" -gt 0 ] && echo "$nombres" | grep -qi "ADMIN"; then
        print_success "Búsqueda funciona correctamente (encontrados $items roles)"
    else
        print_error "La búsqueda no funciona correctamente"
    fi
}

test_10_listar_roles_activos() {
    print_test "10. Listar solo roles activos"
    
    response=$(curl -s -X GET "${ROLES_ENDPOINT}activos/listar")
    print_response "$response"
    
    count=$(echo "$response" | jq -r '.data | length')
    
    if [ "$count" -gt 0 ]; then
        print_success "Se listaron $count roles activos"
        
        # Verificar que todos están activos
        inactivos=$(echo "$response" | jq -r '.data[] | select(.activo == false) | .nombre')
        if [ -z "$inactivos" ]; then
            print_success "Todos los roles listados están activos"
        else
            print_error "Se encontraron roles inactivos en la lista"
        fi
    else
        print_error "No se encontraron roles activos"
    fi
}

test_11_desactivar_rol() {
    print_test "11. Desactivar rol (actualizar activo=false)"
    
    if [ -z "$CREATED_ROLE_ID" ]; then
        print_error "No hay ID de rol para probar"
        return
    fi
    
    # Obtener el nombre actual del rol
    nombre_rol=$(curl -s -X GET "$ROLES_ENDPOINT$CREATED_ROLE_ID" | jq -r '.data.nombre')
    
    response=$(curl -s -X PUT "$ROLES_ENDPOINT$CREATED_ROLE_ID" \
        -H "Content-Type: application/json" \
        -d "{
            \"nombre\": \"$nombre_rol\",
            \"descripcion\": \"Rol de auditoría actualizado con más permisos\",
            \"es_admin\": false,
            \"puede_aprobar\": true,
            \"puede_ver_reportes\": true,
            \"puede_gestionar_usuarios\": false,
            \"activo\": false
        }")
    
    print_response "$response"
    
    activo=$(echo "$response" | jq -r '.data.activo')
    
    if [ "$activo" == "false" ]; then
        print_success "Rol desactivado correctamente"
    else
        print_error "El rol no se desactivó correctamente"
    fi
}

test_12_eliminar_rol() {
    print_test "12. Eliminar rol (soft delete)"
    
    if [ -z "$CREATED_ROLE_ID" ]; then
        print_error "No hay ID de rol para probar"
        return
    fi
    
    response=$(curl -s -X DELETE "$ROLES_ENDPOINT$CREATED_ROLE_ID")
    print_response "$response"
    
    message=$(echo "$response" | jq -r '.message')
    
    if echo "$message" | grep -qi "eliminado\|deleted"; then
        print_success "Rol eliminado correctamente"
    else
        print_error "El rol no se eliminó correctamente"
    fi
    
    # Verificar que está marcado como inactivo (soft delete)
    print_info "Verificando que el rol fue marcado como inactivo..."
    response=$(curl -s -X GET "$ROLES_ENDPOINT$CREATED_ROLE_ID")
    activo=$(echo "$response" | jq -r '.data.activo')
    if [ "$activo" == "false" ]; then
        print_success "El rol fue marcado como inactivo (soft delete)"
    else
        print_error "El rol no fue marcado como inactivo"
    fi
}

test_13_eliminar_rol_inexistente() {
    print_test "13. Intentar eliminar rol inexistente (debe fallar)"
    
    response=$(curl -s -X DELETE "${ROLES_ENDPOINT}99999")
    print_response "$response"
    
    if echo "$response" | jq -e '.detail' > /dev/null; then
        print_success "El sistema manejó correctamente el intento de eliminar rol inexistente"
    else
        print_error "El sistema debería retornar error al intentar eliminar rol inexistente"
    fi
}

###############################################################################
# Main
###############################################################################

main() {
    print_header "TESTING COMPLETO DEL CONTROLADOR DE ROLES"
    
    # Verificar dependencias
    check_jq
    
    # Verificar que el servidor está corriendo
    print_info "Verificando conexión con el servidor..."
    if ! curl -s "$BASE_URL/../health" > /dev/null; then
        print_error "El servidor no está corriendo en $BASE_URL"
        exit 1
    fi
    print_success "Servidor accesible"
    
    # Ejecutar tests
    test_1_listar_roles_iniciales
    test_2_crear_rol_valido
    test_3_crear_rol_duplicado
    test_4_crear_rol_nombre_vacio
    test_5_obtener_rol_por_id
    test_6_obtener_rol_inexistente
    test_7_actualizar_rol
    test_8_listar_con_paginacion
    test_9_listar_con_busqueda
    test_10_listar_roles_activos
    test_11_desactivar_rol
    test_12_eliminar_rol
    test_13_eliminar_rol_inexistente
    
    # Resumen
    print_header "RESUMEN DE TESTS"
    echo -e "${GREEN}✓ Tests Pasados: $TEST_PASSED${NC}"
    echo -e "${RED}✗ Tests Fallados: $TEST_FAILED${NC}"
    
    total=$((TEST_PASSED + TEST_FAILED))
    percentage=$((TEST_PASSED * 100 / total))
    echo -e "\n${CYAN}Porcentaje de éxito: ${percentage}%${NC}"
    
    if [ $TEST_FAILED -eq 0 ]; then
        echo -e "\n${GREEN}¡Todos los tests pasaron! 🎉${NC}"
        exit 0
    else
        echo -e "\n${RED}Algunos tests fallaron. Revisa los errores arriba.${NC}"
        exit 1
    fi
}

# Ejecutar
main
