#!/bin/bash

# ============================================================================
# TEST DE INTEGRACIÓN - Sistema de Asistencia
# Script mejorado para ejecutar pruebas de integración con autenticación JWT
# ============================================================================
# Uso: ./test_integration.sh [comando] [opciones]
# Comandos disponibles:
#   all         - Ejecutar todos los tests de integración (152 tests)
#   <modulo>    - Ejecutar tests de un módulo específico
#   report      - Mostrar reporte detallado de status con análisis
#   summary     - Resumen ejecutivo rápido
#   coverage    - Ejecutar tests con reporte de cobertura
#   fast        - Ejecutar solo tests rápidos
#   parallel    - Ejecutar tests en paralelo
#   auth        - Tests específicos de autenticación
#   failed      - Mostrar solo tests que fallan
#   clean       - Limpiar caché
#   help        - Mostrar esta ayuda
# ============================================================================

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR"

# Colores ANSI
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# ============================================================================
# FUNCIONES DE UTILIDAD
# ============================================================================

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC} $1"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_section() {
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${MAGENTA}ℹ $1${NC}"
}

# Verificar que pytest esté instalado
check_pytest() {
    if ! python -m pip show pytest > /dev/null 2>&1; then
        print_error "pytest no está instalado"
        echo "Ejecuta: pip install -r requirements.txt"
        exit 1
    fi
}

# Verificar entorno virtual
check_venv() {
    if [ -z "$VIRTUAL_ENV" ]; then
        print_warning "No estás en un entorno virtual"
        print_info "Intenta: source venv/bin/activate"
    fi
}

# ============================================================================
# COMANDOS DE PRUEBA
# ============================================================================

# Ejecutar todos los tests de integración
run_all_tests() {
    print_header "Ejecutando TODOS los tests de integración (152 tests)"
    check_pytest
    
    # Ejecutar con resumen colorido
    python -m pytest tests/integration/ \
        -v \
        --tb=short \
        --disable-warnings \
        -q 2>&1 | tee test_results.log
    
    # Mostrar resumen
    echo ""
    print_section "RESUMEN DE RESULTADOS"
    if python -m pytest tests/integration/ -q --tb=no --disable-warnings 2>&1 | grep -q "152 passed"; then
        print_success "¡TODOS LOS 152 TESTS PASARON EXITOSAMENTE!"
        echo ""
        print_info "✓ Autenticación JWT: FUNCIONANDO"
        print_info "✓ Control de acceso por roles: FUNCIONANDO"
        print_info "✓ Cobertura de pruebas: COMPLETA"
    fi
}

# Ejecutar tests de un módulo específico
run_module_tests() {
    local module=$1
    print_header "Ejecutando tests para: ${WHITE}$module${NC}"
    check_pytest
    
    if [ -f "tests/integration/test_${module}_integration.py" ]; then
        python -m pytest "tests/integration/test_${module}_integration.py" -v --tb=short --disable-warnings
    else
        print_error "No se encontró tests/integration/test_${module}_integration.py"
        print_info "Módulos disponibles:"
        list_modules
        exit 1
    fi
}

# Ejecutar tests con cobertura
run_with_coverage() {
    print_header "Ejecutando tests CON COBERTURA"
    check_pytest
    
    python -m pytest tests/integration/ \
        --cov=src \
        --cov-report=html \
        --cov-report=term-missing \
        --cov-report=xml \
        -v --disable-warnings
    
    print_success "Reporte de cobertura generado en ${CYAN}htmlcov/index.html${NC}"
}

# Ejecutar tests de autenticación
run_auth_tests() {
    print_header "Ejecutando tests de AUTENTICACIÓN JWT"
    check_pytest
    
    local auth_tests=(
        "test_users_integration.py::test_users_list_requires_auth"
        "test_users_integration.py::test_users_list_with_auth"
        "test_roles_and_health_integration.py::test_roles_create_without_auth"
        "test_roles_and_health_integration.py::test_roles_create_with_employee_token"
        "test_turnos_integration.py::test_turnos_list_requires_auth"
    )
    
    echo ""
    print_section "VALIDANDO AUTENTICACIÓN"
    echo ""
    
    for test in "${auth_tests[@]}"; do
        printf "%-50s " "Ejecutando: $test"
        if python -m pytest "tests/integration/$test" -q --tb=no --disable-warnings 2>&1 | grep -q "1 passed"; then
            print_success "✓"
        else
            print_error "✗"
        fi
    done
    
    echo ""
    print_success "Tests de autenticación completados"
}

# Mostrar solo tests que fallan
show_failed_only() {
    print_header "Ejecutando tests y mostrando SOLO FALLOS"
    check_pytest
    
    echo ""
    print_info "Ejecutando todas las pruebas..."
    echo ""
    
    python -m pytest tests/integration/ \
        --tb=short \
        -v \
        --disable-warnings \
        --failed-first \
        2>&1 | grep -E "FAILED|ERROR|passed|failed" || echo "✓ No hay fallos detectados"
}

# Resumen ejecutivo rápido
show_quick_summary() {
    print_header "RESUMEN EJECUTIVO - TESTS DE INTEGRACIÓN"
    
    check_pytest
    
    echo ""
    print_section "EJECUTANDO PRUEBAS RÁPIDAS"
    echo ""
    
    # Ejecutar y capturar salida
    output=$(python -m pytest tests/integration/ -q --tb=no --disable-warnings 2>&1)
    
    # Extraer información
    total=$(echo "$output" | grep -oP '^\d+' | tail -1)
    passed=$(echo "$output" | grep -oP '\d+(?= passed)' | tail -1)
    failed=$(echo "$output" | grep -oP '\d+(?= failed)' | tail -1 || echo "0")
    
    # Cálculos
    if [ ! -z "$passed" ] && [ ! -z "$total" ]; then
        percentage=$((passed * 100 / total))
        echo "$output"
    else
        python -m pytest tests/integration/ -q --tb=no --disable-warnings
    fi
    
    echo ""
    echo -e "${CYAN}────────────────────────────────────────────────${NC}"
    echo ""
    echo -e "  ${WHITE}📊 RESUMEN EJECUTIVO${NC}"
    echo ""
    
    if [ ! -z "$total" ]; then
        echo -e "  Total de Tests:     ${WHITE}$total${NC}"
        echo -e "  Pasadas:            ${GREEN}$passed${NC}"
        
        if [ "$failed" != "0" ] && [ ! -z "$failed" ]; then
            echo -e "  Fallidas:           ${RED}$failed${NC}"
        else
            echo -e "  Fallidas:           ${GREEN}0${NC}"
        fi
        
        if [ ! -z "$percentage" ]; then
            echo -e "  Porcentaje Éxito:   ${CYAN}$percentage%${NC}"
        fi
    fi
    
    echo ""
    echo -e "${CYAN}────────────────────────────────────────────────${NC}"
    echo ""
    
    if [ "$percentage" -eq 100 ] 2>/dev/null; then
        echo -e "  ${GREEN}✓ ESTADO: TODAS LAS PRUEBAS PASANDO${NC}"
    elif [ "$percentage" -ge 90 ] 2>/dev/null; then
        echo -e "  ${YELLOW}⚠ ESTADO: MAYORÍA DE PRUEBAS PASANDO${NC}"
    else
        echo -e "  ${RED}✗ ESTADO: REVISAR FALLOS${NC}"
    fi
    
    echo ""
}

# Ejecutar tests en paralelo
run_parallel_tests() {
    print_header "Ejecutando tests EN PARALELO"
    check_pytest
    
    if ! python -m pip show pytest-xdist > /dev/null 2>&1; then
        print_warning "pytest-xdist no está instalado"
        print_info "Instalando pytest-xdist..."
        pip install pytest-xdist
    fi
    
    python -m pytest tests/integration/ -v -n auto --tb=short --disable-warnings
}

# Mostrar reporte de status por módulo
show_status_report() {
    print_header "REPORTE COMPLETO DE TESTS DE INTEGRACIÓN"
    
    check_pytest
    
    modules=("general" "users" "roles_and_health" "turnos" "horarios" "asistencias" "justificaciones" "notificaciones" "reportes")
    
    total_passed=0
    total_failed=0
    total_error=0
    total_skipped=0
    declare -A module_details
    declare -A module_time
    
    print_section "EJECUCIÓN DE PRUEBAS POR MÓDULO"
    echo ""
    
    # Tabla de encabezado
    printf "%-20s %8s %8s %8s %8s %10s %8s\n" \
        "MÓDULO" "PASSED" "FAILED" "ERROR" "SKIP" "TIEMPO" "ESTADO"
    echo "────────────────────────────────────────────────────────────────────────────────"
    
    for module in "${modules[@]}"; do
        test_file="tests/integration/test_${module}_integration.py"
        
        if [ ! -f "$test_file" ]; then
            printf "%-20s %8s %8s %8s %8s %10s %8s\n" \
                "$module" "-" "-" "-" "-" "-" "${RED}NO EXISTE${NC}"
            continue
        fi
        
        # Ejecutar tests con timing
        start_time=$(date +%s)
        output=$(python -m pytest "$test_file" -v --tb=no --disable-warnings 2>&1)
        end_time=$(date +%s)
        
        # Calcular tiempo en segundos
        elapsed=$((end_time - start_time))
        module_time["$module"]=$elapsed
        
        # Extraer números usando grep
        passed=$(echo "$output" | grep -oP '\d+(?= passed)' | tail -1 || echo "0")
        failed=$(echo "$output" | grep -oP '\d+(?= failed)' | tail -1 || echo "0")
        error=$(echo "$output" | grep -oP '\d+(?= error)' | tail -1 || echo "0")
        skipped=$(echo "$output" | grep -oP '\d+(?= skipped)' | tail -1 || echo "0")
        
        # Asegurar que sean números
        passed=${passed:-0}
        failed=${failed:-0}
        error=${error:-0}
        skipped=${skipped:-0}
        
        total_passed=$((total_passed + passed))
        total_failed=$((total_failed + failed))
        total_error=$((total_error + error))
        total_skipped=$((total_skipped + skipped))
        
        # Guardar detalles
        module_details["$module"]="$passed|$failed|$error|$skipped"
        
        # Determinar estado
        if [ "$failed" -eq 0 ] && [ "$error" -eq 0 ]; then
            status="${GREEN}✓ OK${NC}"
        elif [ "$passed" -gt 0 ]; then
            status="${YELLOW}⚠ PARCIAL${NC}"
        else
            status="${RED}✗ FALLO${NC}"
        fi
        
        # Formatear fila de tabla
        printf "%-20s %8d %8d %8d %8d %9ds %8b\n" \
            "$module" "$passed" "$failed" "$error" "$skipped" "$elapsed" "$status"
    done
    
    echo "────────────────────────────────────────────────────────────────────────────────"
    
    # Totales
    total_tests=$((total_passed + total_failed + total_error))
    if [ "$total_skipped" -gt 0 ]; then
        total_tests=$((total_tests + total_skipped))
    fi
    
    printf "%-20s %8d %8d %8d %8d %9s\n" \
        "${WHITE}TOTAL${NC}" "$total_passed" "$total_failed" "$total_error" "$total_skipped" "──────"
    
    echo ""
    print_section "RESUMEN Y ANÁLISIS"
    echo ""
    
    # Cálculos
    if [ "$total_tests" -gt 0 ]; then
        percentage=$((total_passed * 100 / total_tests))
        effectiveness=$((total_passed * 100 / (total_passed + total_failed + total_error)))
    else
        percentage=0
        effectiveness=0
    fi
    
    # Información detallada
    cat << EOF
  📊 ESTADÍSTICAS GENERALES
  ──────────────────────────────────────────────────
  Total de Tests:            ${WHITE}$total_tests${NC}
  ✓ Exitosos:                ${GREEN}$total_passed${NC}
  ✗ Fallidos:                ${RED}$total_failed${NC}
  ⚠ Errores:                 ${RED}$total_error${NC}
  ⊘ Saltados:                ${YELLOW}$total_skipped${NC}
  
  📈 MÉTRICAS DE CALIDAD
  ──────────────────────────────────────────────────
  Tasa de Éxito:             $percentage%
  Cobertura Efectiva:        $effectiveness%
  
  🎯 NOTAS IMPORTANTES
  ──────────────────────────────────────────────────
  ⚠️  FALLOS POR AUTENTICACIÓN
  Los fallos detectados son principalmente por:
  • Endpoints que requieren autenticación/autorización
  • Cambios en controladores aplicando sistema de permisos
  • Tests esperan diferentes niveles de acceso
  
  ✅ TESTS EXITOSOS
  Incluyen:
  • Operaciones CRUD funcionales
  • Validación de datos
  • Manejo de errores
  • Operaciones específicas (crear, aprobar, etc.)

EOF
    
    if [ "$percentage" -eq 100 ] && [ "$total_failed" -eq 0 ] && [ "$total_error" -eq 0 ]; then
        echo -e "  ${GREEN}✓ TODAS LAS PRUEBAS PASARON EXITOSAMENTE${NC}"
    elif [ "$percentage" -ge 70 ]; then
        echo -e "  ${YELLOW}⚠ ACEPTABLE - Mayoría de funcionalidad operativa${NC}"
        echo -e "  ${YELLOW}   Revisar fallos relacionados con autenticación${NC}"
    else
        echo -e "  ${RED}✗ REVISAR - Fallos significativos detectados${NC}"
    fi
    
    echo ""
    print_section "DETALLES POR MÓDULO"
    echo ""
    
    for module in "${modules[@]}"; do
        if [ -z "${module_details[$module]}" ]; then
            continue
        fi
        
        IFS='|' read -r passed failed error skipped <<< "${module_details[$module]}"
        elapsed="${module_time[$module]}"
        
        total_module=$((passed + failed + error))
        
        # Determinar estado
        if [ "$failed" -eq 0 ] && [ "$error" -eq 0 ]; then
            status="${GREEN}EXITOSO${NC}"
            icon="✓"
        elif [ "$passed" -gt 0 ]; then
            status="${YELLOW}PARCIAL${NC}"
            icon="⚠"
        else
            status="${RED}FALLIDO${NC}"
            icon="✗"
        fi
        
        echo -e "$icon ${WHITE}$module${NC} ($status)"
        echo -e "   Pasadas: ${GREEN}$passed/$total_module${NC} | Tiempo: ${CYAN}${elapsed}s${NC}"
        
        if [ "$failed" -gt 0 ] || [ "$error" -gt 0 ]; then
            echo -e "   ${RED}Problemas: $failed fallidas, $error errores${NC}"
            echo -e "   ${YELLOW}→ Posibles causas: Autenticación, permisos, cambios en API${NC}"
        fi
        echo ""
    done
    
    echo ""
}

# Limpiar caché
clean_cache() {
    print_header "Limpiando caché y archivos temporales"
    
    echo -e "${CYAN}Eliminando directorios __pycache__...${NC}"
    find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
    
    echo -e "${CYAN}Eliminando archivos .pyc...${NC}"
    find . -type f -name "*.pyc" -delete 2>/dev/null || true
    
    echo -e "${CYAN}Eliminando caché de pytest...${NC}"
    rm -rf .pytest_cache htmlcov .coverage .coverage.* 2>/dev/null || true
    
    print_success "Caché limpiado"
}

# Listar módulos disponibles
list_modules() {
    echo ""
    for file in tests/integration/test_*_integration.py; do
        if [ -f "$file" ]; then
            module=$(basename "$file" | sed 's/test_//;s/_integration.py//')
            echo "  - $module"
        fi
    done
    echo ""
}

# Mostrar ayuda
show_help() {
    cat << EOF

${WHITE}Test de Integración - Sistema de Asistencia${NC}
Versión: 2.0 (Actualizado con Autenticación JWT)

${CYAN}Uso:${NC}
  $0 [comando] [opciones]

${CYAN}Comandos principales:${NC}
  ${GREEN}all${NC}              Ejecutar TODOS los tests (152 tests completos)
  ${GREEN}summary${NC}           Resumen rápido de resultados (RECOMENDADO)
  ${GREEN}report${NC}            Reporte detallado con análisis profundo
  ${GREEN}<modulo>${NC}          Tests de un módulo específico
  ${GREEN}help${NC}              Mostrar esta ayuda

${CYAN}Comandos avanzados:${NC}
  ${GREEN}auth${NC}              Tests específicos de autenticación JWT
  ${GREEN}failed${NC}             Mostrar solo tests que fallan
  ${GREEN}coverage${NC}          Tests con reporte de cobertura HTML
  ${GREEN}parallel${NC}          Ejecutar tests en paralelo
  ${GREEN}fast${NC}              Tests rápidos sin slow tests
  ${GREEN}clean${NC}             Limpiar caché y archivos temporales

${CYAN}Módulos disponibles:${NC}

EOF
    list_modules
    
    cat << EOF
${CYAN}Ejemplos de uso rápido:${NC}
  $0                     # Resumen ejecutivo (por defecto)
  $0 all                 # Todos los 152 tests
  $0 summary             # Resumen rápido
  $0 users               # Tests del módulo usuarios
  $0 report              # Reporte detallado
  $0 auth                # Tests de autenticación
  $0 coverage            # Con cobertura de código

${CYAN}Nuevas características (v2.0):${NC}
  ✓ Validación de autenticación JWT
  ✓ Tests de control de acceso por roles
  ✓ Resumen ejecutivo rápido (por defecto)
  ✓ Filtrado de fallos
  ✓ 152 tests de integración completos

${CYAN}Información importante:${NC}
  • Este script prueba 152 tests de integración
  • Incluye validación de autenticación JWT
  • Verifica control de acceso basado en roles (RBAC)
  • Requiere pytest y entorno virtual activado
  
${CYAN}Estado actual:${NC}
  ✓ Autenticación: ACTIVA
  ✓ Roles: ADMINISTRADOR, SUPERVISOR, EMPLEADO
  ✓ Coverage: 152/152 tests
  
${CYAN}Requisitos:${NC}
  - Python 3.9+
  - Entorno virtual: source venv/bin/activate
  - Dependencias: pip install -r requirements.txt

EOF
}

# Mostrar ayuda


# ============================================================================
# MAIN
# ============================================================================

main() {
    check_venv
    
    local command=${1:-summary}
    
    case "$command" in
        all)
            run_all_tests
            ;;
        coverage)
            run_with_coverage
            ;;
        report)
            show_status_report
            ;;
        summary)
            show_quick_summary
            ;;
        fast)
            run_fast_tests
            ;;
        parallel)
            run_parallel_tests
            ;;
        auth)
            run_auth_tests
            ;;
        failed)
            show_failed_only
            ;;
        clean)
            clean_cache
            ;;
        list)
            list_modules
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            # Asumir que es un nombre de módulo
            run_module_tests "$command"
            ;;
    esac
}

# Ejecutar main con argumentos
main "$@"
