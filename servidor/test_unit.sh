#!/bin/bash

# ============================================================================
# TEST UNITARIO - Sistema de Asistencia
# Script unificado para ejecutar pruebas unitarias
# ============================================================================
# Uso: ./test_unit.sh [comando] [opciones]
# Comandos disponibles:
#   all         - Ejecutar todos los tests unitarios
#   <servicio>  - Ejecutar tests de un servicio específico
#   coverage    - Ejecutar tests con reporte de cobertura
#   report      - Mostrar reporte de status por servicio
#   fast        - Ejecutar solo tests rápidos
#   parallel    - Ejecutar tests en paralelo
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

# Ejecutar todos los tests unitarios
run_all_tests() {
    print_header "Ejecutando TODOS los tests unitarios"
    check_pytest
    python -m pytest tests/unit/ -v --tb=short --disable-warnings
}

# Ejecutar tests de un servicio específico
run_service_tests() {
    local service=$1
    print_header "Ejecutando tests para: ${WHITE}$service${NC}"
    check_pytest
    
    if [ -f "tests/unit/test_${service}_service.py" ]; then
        python -m pytest "tests/unit/test_${service}_service.py" -v --tb=short --disable-warnings
    else
        print_error "No se encontró tests/unit/test_${service}_service.py"
        print_info "Servicios disponibles:"
        list_services
        exit 1
    fi
}

# Ejecutar tests con cobertura
run_with_coverage() {
    print_header "Ejecutando tests CON COBERTURA"
    check_pytest
    
    python -m pytest tests/unit/ \
        --cov=src \
        --cov-report=html \
        --cov-report=term-missing \
        --cov-report=xml \
        -v --disable-warnings
    
    print_success "Reporte de cobertura generado en ${CYAN}htmlcov/index.html${NC}"
}

# Ejecutar tests rápidos
run_fast_tests() {
    print_header "Ejecutando tests RÁPIDOS"
    check_pytest
    python -m pytest tests/unit/ -v -m "not slow" --disable-warnings
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
    
    python -m pytest tests/unit/ -v -n auto --tb=short --disable-warnings
}

# Mostrar reporte de status por servicio (MEJORADO CON DETALLE COMPLETO)
show_status_report() {
    print_header "REPORTE COMPLETO DE TESTS UNITARIOS"
    
    check_pytest
    
    services=("asistencias" "email" "horarios" "justificaciones" "notificaciones" "reportes" "roles" "turnos" "users")
    
    total_passed=0
    total_failed=0
    total_error=0
    total_skipped=0
    declare -A service_details
    declare -A service_time
    
    print_section "EJECUCIÓN DE PRUEBAS POR SERVICIO"
    echo ""
    
    # Tabla de encabezado
    printf "%-18s %8s %8s %8s %8s %10s %8s\n" \
        "SERVICIO" "PASSED" "FAILED" "ERROR" "SKIP" "TIEMPO" "ESTADO"
    echo "────────────────────────────────────────────────────────────────────────────"
    
    for service in "${services[@]}"; do
        test_file="tests/unit/test_${service}_service.py"
        
        if [ ! -f "$test_file" ]; then
            printf "%-18s %8s %8s %8s %8s %10s %8s\n" \
                "$service" "-" "-" "-" "-" "-" "${RED}NO EXISTE${NC}"
            continue
        fi
        
        # Ejecutar tests con timing
        start_time=$(date +%s)
        output=$(python -m pytest "$test_file" -v --tb=no --disable-warnings 2>&1)
        end_time=$(date +%s)
        
        # Calcular tiempo en segundos
        elapsed=$((end_time - start_time))
        service_time["$service"]=$elapsed
        
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
        service_details["$service"]="$passed|$failed|$error|$skipped"
        
        # Determinar estado
        if [ "$failed" -eq 0 ] && [ "$error" -eq 0 ]; then
            status="${GREEN}✓ OK${NC}"
        elif [ "$passed" -gt 0 ]; then
            status="${YELLOW}⚠ PARCIAL${NC}"
        else
            status="${RED}✗ FALLO${NC}"
        fi
        
        # Formatear fila de tabla
        printf "%-18s %8d %8d %8d %8d %9ds %8b\n" \
            "$service" "$passed" "$failed" "$error" "$skipped" "$elapsed" "$status"
    done
    
    echo "────────────────────────────────────────────────────────────────────────────"
    
    # Totales
    total_tests=$((total_passed + total_failed + total_error))
    if [ "$total_skipped" -gt 0 ]; then
        total_tests=$((total_tests + total_skipped))
    fi
    
    printf "%-18s %8d %8d %8d %8d %9s\n" \
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
  
  🎯 RESULTADO FINAL
  ──────────────────────────────────────────────────
EOF
    
    if [ "$percentage" -eq 100 ] && [ "$total_failed" -eq 0 ] && [ "$total_error" -eq 0 ]; then
        echo -e "  ${GREEN}✓ TODAS LAS PRUEBAS PASARON EXITOSAMENTE${NC}"
    elif [ "$percentage" -ge 90 ]; then
        echo -e "  ${GREEN}✓ EXCELENTE - La mayoría de pruebas pasaron${NC}"
    elif [ "$percentage" -ge 80 ]; then
        echo -e "  ${YELLOW}⚠ BUENO - Hay algunos problemas menores${NC}"
    elif [ "$percentage" -ge 50 ]; then
        echo -e "  ${YELLOW}⚠ ACEPTABLE - Revisar pruebas fallidas${NC}"
    else
        echo -e "  ${RED}✗ CRÍTICO - Múltiples fallos detectados${NC}"
    fi
    
    echo ""
    print_section "DETALLES POR SERVICIO"
    echo ""
    
    for service in "${services[@]}"; do
        if [ -z "${service_details[$service]}" ]; then
            continue
        fi
        
        IFS='|' read -r passed failed error skipped <<< "${service_details[$service]}"
        elapsed="${service_time[$service]}"
        
        total_service=$((passed + failed + error))
        
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
        
        echo -e "$icon ${WHITE}$service${NC} ($status)"
        echo -e "   Pasadas: ${GREEN}$passed/$total_service${NC} | Tiempo: ${CYAN}${elapsed}s${NC}"
        
        if [ "$failed" -gt 0 ] || [ "$error" -gt 0 ]; then
            echo -e "   ${RED}Problemas: $failed fallidas, $error errores${NC}"
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

# Listar servicios disponibles
list_services() {
    echo ""
    for file in tests/unit/test_*_service.py; do
        if [ -f "$file" ]; then
            service=$(basename "$file" | sed 's/test_//;s/_service.py//')
            echo "  - $service"
        fi
    done
    echo ""
}

# Mostrar ayuda
show_help() {
    cat << EOF

${WHITE}Test Unitario - Sistema de Asistencia${NC}
Versión: 1.0

${CYAN}Uso:${NC}
  $0 [comando] [opciones]

${CYAN}Comandos:${NC}
  ${GREEN}all${NC}              Ejecutar TODOS los tests unitarios
  ${GREEN}<servicio>${NC}        Ejecutar tests de un servicio específico
                        Ejemplo: $0 roles
  ${GREEN}coverage${NC}          Ejecutar tests con reporte de cobertura HTML
  ${GREEN}report${NC}            Mostrar reporte de status por servicio
  ${GREEN}fast${NC}              Ejecutar solo tests rápidos (sin slow)
  ${GREEN}parallel${NC}          Ejecutar tests en paralelo para más rapidez
  ${GREEN}clean${NC}             Limpiar caché y archivos temporales
  ${GREEN}help${NC}              Mostrar esta ayuda

${CYAN}Servicios disponibles:${NC}

EOF
    list_services
    
    cat << EOF
${CYAN}Ejemplos de uso:${NC}
  $0 all                    # Ejecutar todos los tests
  $0 roles                  # Tests del servicio de roles
  $0 users                  # Tests del servicio de usuarios
  $0 coverage               # Tests con reporte de cobertura
  $0 report                 # Reporte de status
  $0 parallel               # Tests en paralelo
  $0 clean                  # Limpiar caché

${CYAN}Requisitos:${NC}
  - Python 3.9+
  - Entorno virtual activado
  - pytest instalado (pip install -r requirements.txt)

${CYAN}Nota:${NC}
  Este script requiere estar en un entorno virtual activado.
  Si no estás en uno, ejecuta primero:
    source venv/bin/activate

EOF
}

# ============================================================================
# MAIN
# ============================================================================

main() {
    check_venv
    
    local command=${1:-help}
    
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
        fast)
            run_fast_tests
            ;;
        parallel)
            run_parallel_tests
            ;;
        clean)
            clean_cache
            ;;
        list)
            list_services
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            # Asumir que es un nombre de servicio
            run_service_tests "$command"
            ;;
    esac
}

# Ejecutar main con argumentos
main "$@"
