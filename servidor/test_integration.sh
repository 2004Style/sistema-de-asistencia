#!/usr/bin/env bash
# run_integration_tests.sh
# Script para ejecutar pruebas de integración del proyecto
# Ubicación esperada: raíz del proyecto (donde está pytest.ini y tests/)

set -euo pipefail
IFS=$'\n\t'

PROGNAME=$(basename "$0")
WORKDIR="$(cd "$(dirname "$0")" && pwd)"

# Defaults
VENV=""
STOP_ON_FAIL=false
COVERAGE=false
MODULE=""
PYTEST_ARGS=()

usage() {
  cat <<EOF
Uso: $PROGNAME [opciones]

Opciones:
  -h, --help          Muestra esta ayuda
  --venv RUTA         Activa virtualenv antes de ejecutar (optional)
  --all               Ejecuta todas las pruebas de integración (por defecto)
  --module RUTA       Ejecuta un módulo o un patrón concreto relativo a tests/integration (ej: test_reportes_integration.py o "tests/integration/test_*.py")
  --stop              Detener en primer fallo (equivalente a -x de pytest)
  --coverage          Ejecutar pytest con cobertura (coverage)
  --pytest-arg ARG    Pasa ARG directamente a pytest (puede repetirse)

Ejemplos:
  $PROGNAME --all
  $PROGNAME --module tests/integration/test_reportes_integration.py --stop
  $PROGNAME --venv .venv --coverage

EOF
}

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      usage; exit 0;;
    --venv)
      shift; VENV="$1";;
    --all)
      MODULE="";;
    --module)
      shift; MODULE="$1";;
    --stop)
      STOP_ON_FAIL=true;;
    --coverage)
      COVERAGE=true;;
    --pytest-arg)
      shift; PYTEST_ARGS+=("$1");;
    *)
      echo "Argumento desconocido: $1" >&2; usage; exit 2;;
  esac
  shift
done

# Activate virtualenv if provided
if [[ -n "$VENV" ]]; then
  if [[ -f "$VENV/bin/activate" ]]; then
    echo "Activando virtualenv: $VENV"
    # shellcheck disable=SC1090
    source "$VENV/bin/activate"
  else
    echo "Virtualenv no encontrado en: $VENV" >&2
    exit 3
  fi
fi

# Build pytest command
PYTEST_CMD=(python -m pytest)

if [[ "$COVERAGE" == true ]]; then
  # Use pytest-cov if available, fallback to pytest
  PYTEST_CMD=(python -m pytest --cov=src --cov-report=term)
fi

if [[ "$STOP_ON_FAIL" == true ]]; then
  PYTEST_ARGS+=("-x")
fi

# Default to all integration tests if MODULE not provided
if [[ -z "$MODULE" ]]; then
  MODULE_PATHS=("tests/integration/")
else
  MODULE_PATHS=("$MODULE")
fi

# Run tests iteratively so we can stop on first failure if requested and show per-module output
EXIT_CODE=0
FAILED_MODULES=()

for path in "${MODULE_PATHS[@]}"; do
  echo "\n==== Ejecutando: $path ===="
  set +e
  if [[ ${#PYTEST_ARGS[@]} -gt 0 ]]; then
    "${PYTEST_CMD[@]}" "$path" "${PYTEST_ARGS[@]}"
    RC=$?
  else
    "${PYTEST_CMD[@]}" "$path"
    RC=$?
  fi
  set -e

  if [[ $RC -ne 0 ]]; then
    echo "\n---- Falló: $path (exit $RC) ----"
    EXIT_CODE=$RC
    FAILED_MODULES+=("$path")
    if [[ "$STOP_ON_FAIL" == true ]]; then
      echo "Deteniendo por --stop"; break
    fi
  else
    echo "\n---- OK: $path ----"
  fi
done

# Summary
echo "\n================ Integration tests finished ================"
if [[ ${#FAILED_MODULES[@]} -eq 0 ]]; then
  echo "Todos los módulos pasaron."
else
  echo "Módulos fallidos:"
  for f in "${FAILED_MODULES[@]}"; do
    echo " - $f"
  done
fi

exit $EXIT_CODE
