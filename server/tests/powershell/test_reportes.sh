#!/bin/bash

###############################################################################
# Script de Testing para el controlador de REPORTES
#
# Pruebas incluidas (básicas):
# - GET /api/reportes/listar
# - GET /api/reportes/diario (fecha válida)
# - GET /api/reportes/diario (fecha futura -> debe fallar)
# - GET /api/reportes/descargar/{ruta} (reporte inexistente -> 404)
# - DELETE /api/reportes/eliminar/{ruta} (reporte inexistente -> 404)
#
# Uso: ./test_reportes.sh
###############################################################################

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

BASE_URL="http://localhost:8000/api"
REPORTES_ENDPOINT="$BASE_URL/reportes/"

TEST_PASSED=0
TEST_FAILED=0

check_jq() {
    if ! command -v jq &> /dev/null; then
        echo -e "${RED}jq no está instalado. Instálalo con: sudo apt-get install jq${NC}"
        exit 1
    fi
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

print_response() {
    echo -e "${MAGENTA}Response:${NC}"
    echo "$1" | jq '.' 2>/dev/null || echo "$1"
}

test_1_listar_reportes() {
    print_test "1. Listar reportes (debe responder OK y retornar estructura)"
    response=$(curl -s -w "\n%{http_code}" -X GET "${REPORTES_ENDPOINT}listar")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    print_response "$body"

    if [ "$http_code" -ne 200 ]; then
        print_error "Esperaba 200, obtuvo $http_code"
        return
    fi

    if echo "$body" | jq -e '.success==true and .reportes' > /dev/null; then
        print_success "Listado de reportes retornado correctamente"
    else
        print_error "Respuesta inválida al listar reportes"
    fi
}

test_2_generar_reporte_diario_valido() {
    print_test "2. Generar reporte diario con fecha válida (hoy)"
    fecha=$(date +%F)
    response=$(curl -s -w "\n%{http_code}" -G "${REPORTES_ENDPOINT}diario" --data-urlencode "fecha=${fecha}" --data-urlencode "formato=both")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    print_response "$body"

    if [ "$http_code" -ne 200 ]; then
        print_error "Esperaba 200, obtuvo $http_code"
        return
    fi

    if echo "$body" | jq -e '.success==true and .archivos' > /dev/null; then
        print_success "Reporte diario generado (o encolado) correctamente"
    else
        print_error "Fallo al generar reporte diario"
    fi
}

test_3_generar_reporte_diario_futuro() {
    print_test "3. Generar reporte diario con fecha futura (debe fallar)"
    fecha=$(date -d "+7 days" +%F)
    response=$(curl -s -w "\n%{http_code}" -G "${REPORTES_ENDPOINT}diario" --data-urlencode "fecha=${fecha}")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    print_response "$body"

    if [ "$http_code" -eq 400 ] || echo "$body" | jq -e '.detail' > /dev/null; then
        print_success "El sistema rechazó la fecha futura correctamente (http: $http_code)"
    else
        print_error "El sistema debería rechazar fechas futuras (http: $http_code)"
    fi
}

test_4_descargar_reporte_inexistente() {
    print_test "4. Intentar descargar reporte inexistente (debe retornar 404)"
    ruta="diarios/reporte_inexistente_para_test_12345.pdf"
    http_code=$(curl -s -o /dev/null -w "%{http_code}" "${REPORTES_ENDPOINT}descargar/${ruta}")

    if [ "$http_code" -eq 404 ]; then
        print_success "Descarga de reporte inexistente devolvió 404"
    else
        print_error "Esperaba 404 al descargar reporte inexistente, obtuvo $http_code"
    fi
}

test_5_eliminar_reporte_inexistente() {
    print_test "5. Intentar eliminar reporte inexistente (debe retornar 404)"
    ruta="diarios/reporte_inexistente_para_test_12345.pdf"
    http_code=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "${REPORTES_ENDPOINT}eliminar/${ruta}")

    if [ "$http_code" -eq 404 ]; then
        print_success "Eliminar reporte inexistente devolvió 404"
    else
        print_error "Esperaba 404 al eliminar reporte inexistente, obtuvo $http_code"
    fi
}

main() {
    check_jq

    # Verificar server
    echo -e "\n${CYAN}Verificando servidor...${NC}"
    if ! curl -s "${BASE_URL}/../health" > /dev/null; then
        echo -e "${RED}El servidor no está accesible en $BASE_URL${NC}"
        exit 1
    fi

    test_1_listar_reportes
    test_2_generar_reporte_diario_valido
    test_3_generar_reporte_diario_futuro
    test_4_descargar_reporte_inexistente
    test_5_eliminar_reporte_inexistente

    echo -e "\n${GREEN}✓ Tests Pasados: $TEST_PASSED${NC}"
    echo -e "${RED}✗ Tests Fallados: $TEST_FAILED${NC}"

    total=$((TEST_PASSED + TEST_FAILED))
    if [ $total -gt 0 ]; then
        percentage=$((TEST_PASSED * 100 / total))
    else
        percentage=0
    fi
    echo -e "\n${CYAN}Porcentaje de éxito: ${percentage}%${NC}\n"

    if [ $TEST_FAILED -eq 0 ]; then
        exit 0
    else
        exit 1
    fi
}

main
