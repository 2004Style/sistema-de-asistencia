#!/bin/bash
# Verificar y repotar estado de tests unitarios por servicio

echo "════════════════════════════════════════════════════════════════"
echo "REPORTE DE TESTS UNITARIOS - SISTEMA DE ASISTENCIA"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Array de servicios
services=("roles" "users" "turnos" "horarios" "asistencias" "justificaciones" "notificaciones" "email" "reportes")

total_passed=0
total_failed=0
total_error=0

for service in "${services[@]}"; do
    test_file="tests/unit/test_${service}_service.py"
    
    if [ ! -f "$test_file" ]; then
        echo "❌ $service - No existe test file"
        continue
    fi
    
    # Ejecutar tests y capturar resultado
    output=$(python -m pytest "$test_file" -v --tb=no 2>&1 | tail -1)
    
    # Extraer números
    if [[ $output =~ ([0-9]+)\ passed ]]; then
        passed="${BASH_REMATCH[1]}"
    else
        passed=0
    fi
    
    if [[ $output =~ ([0-9]+)\ failed ]]; then
        failed="${BASH_REMATCH[1]}"
    else
        failed=0
    fi
    
    if [[ $output =~ ([0-9]+)\ error ]]; then
        error="${BASH_REMATCH[1]}"
    else
        error=0
    fi
    
    total_passed=$((total_passed + passed))
    total_failed=$((total_failed + failed))
    total_error=$((total_error + error))
    
    # Mostrar resultado
    if [ $failed -eq 0 ] && [ $error -eq 0 ]; then
        status="✅"
    elif [ $passed -gt 0 ]; then
        status="⚠️ "
    else
        status="❌"
    fi
    
    echo "$status $service: $passed passed, $failed failed, $error errors"
done

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "TOTAL: $total_passed passed, $total_failed failed, $total_error errors"
echo "════════════════════════════════════════════════════════════════"

# Calcular porcentaje de éxito
total_tests=$((total_passed + total_failed + total_error))
if [ $total_tests -gt 0 ]; then
    percentage=$((total_passed * 100 / total_tests))
    echo "Porcentaje de éxito: $percentage%"
fi
