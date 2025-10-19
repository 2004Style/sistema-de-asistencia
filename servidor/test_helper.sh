#!/bin/bash

# Script Helper para ejecutar tests
# Uso: ./test_helper.sh [comando] [opciones]

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funciones helper
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
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

# Verificar que pytest esté instalado
check_pytest() {
    if ! python -m pip show pytest > /dev/null 2>&1; then
        print_error "pytest no está instalado"
        echo "Ejecuta: pip install -r requirements.txt"
        exit 1
    fi
}

# Ejecutar todos los tests unitarios
run_all_tests() {
    print_header "Ejecutando todos los tests unitarios"
    check_pytest
    python -m pytest tests/unit/ -v --tb=short
}

# Ejecutar tests de un servicio específico
run_service_tests() {
    local service=$1
    print_header "Ejecutando tests para: $service"
    check_pytest
    
    if [ -f "tests/unit/test_${service}_service.py" ]; then
        python -m pytest "tests/unit/test_${service}_service.py" -v --tb=short
    else
        print_error "No se encontró tests/unit/test_${service}_service.py"
        exit 1
    fi
}

# Ejecutar tests con cobertura
run_with_coverage() {
    print_header "Ejecutando tests con cobertura"
    check_pytest
    python -m pytest tests/unit/ \
        --cov=src \
        --cov-report=html \
        --cov-report=term-missing \
        --cov-report=xml \
        -v
    print_success "Reporte de cobertura generado en htmlcov/index.html"
}

# Ejecutar tests rápidos (sin slow)
run_fast_tests() {
    print_header "Ejecutando tests rápidos"
    check_pytest
    python -m pytest tests/unit/ -v -m "not slow"
}

# Ejecutar un test específico
run_specific_test() {
    local test_path=$1
    print_header "Ejecutando test específico: $test_path"
    check_pytest
    python -m pytest "$test_path" -v --tb=short
}

# Ejecutar tests en paralelo
run_parallel_tests() {
    print_header "Ejecutando tests en paralelo"
    check_pytest
    python -m pytest tests/unit/ -v -n 4 --tb=short
}

# Ejecutar tests de humo (básicos)
run_smoke_tests() {
    print_header "Ejecutando tests de humo"
    check_pytest
    python -m pytest tests/unit/ -v -m "smoke"
}

# Limpiar caché y archivos temporales
clean_cache() {
    print_header "Limpiando caché"
    find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
    find . -type f -name "*.pyc" -delete 2>/dev/null || true
    rm -rf .pytest_cache htmlcov .coverage
    print_success "Caché limpiado"
}

# Mostrar ayuda
show_help() {
    echo "Test Helper Script - Sistema de Asistencia"
    echo ""
    echo "Uso: $0 [comando] [opciones]"
    echo ""
    echo "Comandos:"
    echo "  all              - Ejecutar todos los tests unitarios"
    echo "  <servicio>       - Ejecutar tests de un servicio específico"
    echo "                   Ej: $0 roles"
    echo "  coverage         - Ejecutar tests con reporte de cobertura"
    echo "  fast             - Ejecutar solo tests rápidos"
    echo "  parallel         - Ejecutar tests en paralelo (más rápido)"
    echo "  smoke            - Ejecutar tests de humo"
    echo "  specific <path>  - Ejecutar un test específico"
    echo "                   Ej: $0 specific tests/unit/test_roles_service.py::TestRoleService::test_crear_rol_exitoso"
    echo "  clean            - Limpiar caché y archivos temporales"
    echo "  help             - Mostrar este mensaje"
    echo ""
    echo "Servicios disponibles:"
    echo "  roles, users, turnos, horarios, asistencias,"
    echo "  justificaciones, notificaciones, email, reportes"
    echo ""
    echo "Ejemplos:"
    echo "  $0 all                      # Ejecutar todos los tests"
    echo "  $0 roles                    # Tests de roles"
    echo "  $0 coverage                 # Tests con cobertura"
    echo "  $0 parallel                 # Tests en paralelo"
    echo "  $0 clean                    # Limpiar caché"
}

# Listar servicios disponibles
list_services() {
    echo "Servicios disponibles:"
    for file in tests/unit/test_*_service.py; do
        service=$(basename "$file" | sed 's/test_//;s/_service.py//')
        echo "  - $service"
    done
}

# Main
main() {
    local command=${1:-help}
    
    case "$command" in
        all)
            run_all_tests
            ;;
        coverage)
            run_with_coverage
            ;;
        fast)
            run_fast_tests
            ;;
        parallel)
            run_parallel_tests
            ;;
        smoke)
            run_smoke_tests
            ;;
        specific)
            if [ -z "$2" ]; then
                print_error "Debes especificar el path del test"
                echo "Uso: $0 specific <path>"
                exit 1
            fi
            run_specific_test "$2"
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
