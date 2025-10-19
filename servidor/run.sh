#!/bin/bash

# ============================================================================
# Script para ejecutar el servidor de Sistema de Asistencia
# ============================================================================

# Colores para el terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

# Símbolos y emojis
SUCCESS="✅"
ERROR="❌"
WARNING="⚠️ "
INFO="ℹ️ "
ROCKET="🚀"
PACKAGE="📦"
SPARKLES="✨"
BOOKS="📚"
CLOCK="⏱️ "
FIRE="🔥"
CHECK="✓"
CROSS="✗"

# ============================================================================
# Funciones de utilidad
# ============================================================================

print_banner() {
    echo -e "${CYAN}${BOLD}"
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                                                                ║"
    echo "║           ${FIRE} SISTEMA DE ASISTENCIA - SERVIDOR ${FIRE}              ║"
    echo "║                                                                ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo -e "${RESET}"
}

print_section() {
    echo -e "\n${BLUE}${BOLD}▶ $1${RESET}"
    echo -e "${DIM}────────────────────────────────────────────────────${RESET}"
}

print_success() {
    echo -e "${GREEN}${SUCCESS} $1${RESET}"
}

print_error() {
    echo -e "${RED}${ERROR} $1${RESET}"
}

print_warning() {
    echo -e "${YELLOW}${WARNING}$1${RESET}"
}

print_info() {
    echo -e "${CYAN}${INFO}$1${RESET}"
}

print_step() {
    echo -e "${MAGENTA}  ${CHECK} $1${RESET}"
}

# ============================================================================
# Inicio del script
# ============================================================================

clear
print_banner

START_TIME=$(date +%s)

# ============================================================================
# Verificar entorno virtual
# ============================================================================

print_section "${PACKAGE} Verificando Entorno Virtual"

if [ -d "venv" ]; then
    print_step "Entorno virtual encontrado"
    print_info "Activando entorno virtual..."
    source venv/bin/activate
    print_success "Entorno virtual activado"
else
    print_warning "No se encontró entorno virtual"
    print_info "Usando Python del sistema"
fi

# Verificar versión de Python
PYTHON_VERSION=$(python --version 2>&1)
print_info "Versión: ${WHITE}$PYTHON_VERSION${RESET}"

# ============================================================================
# Verificar dependencias
# ============================================================================

print_section "${PACKAGE} Verificando Dependencias"

if ! pip show fastapi > /dev/null 2>&1; then
    print_warning "Dependencias no encontradas"
    print_info "Instalando dependencias desde requirements.txt..."
    
    if pip install -r requirements.txt; then
        print_success "Dependencias instaladas correctamente"
    else
        print_error "Error al instalar dependencias"
        exit 1
    fi
else
    print_success "Todas las dependencias están instaladas"
fi



# ============================================================================
# Iniciar servidor
# ============================================================================

print_section "${FIRE} Iniciando Servidor Principal"

echo -e "${GREEN}${BOLD}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Servidor listo. Presiona Ctrl+C para detener                 ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${RESET}\n"

# Manejar señales de interrupción: matamos al servidor hijo si existe
cleanup() {
    echo -e "\n${YELLOW}${WARNING}Deteniendo servidor...${RESET}"
    if [ -n "$SERVER_PID" ] && kill -0 $SERVER_PID > /dev/null 2>&1; then
        print_info "Enviando SIGTERM al proceso del servidor (PID: $SERVER_PID)"
        kill $SERVER_PID
        wait $SERVER_PID 2>/dev/null
    fi
    exit 0
}
trap cleanup INT TERM

# Ejecutar el servidor en segundo plano y guardar su PID
print_info "Iniciando servidor en segundo plano..."
python main.py &
SERVER_PID=$!
print_success "Servidor iniciado (PID: $SERVER_PID)"

# Dar un pequeño tiempo para que el servidor arranque antes de ejecutar los seeds
sleep 2

# Ejecutar seed_roles.py y seed_turnos.py después de que enciende el servidor
print_section "${SPARKLES} Ejecutando seeds posteriores al arranque"

if [ -f "seed_roles.py" ]; then
    print_info "Ejecutando seed_roles.py..."
    if python seed_roles.py; then
        print_success "seed_roles.py ejecutado correctamente"
    else
        print_warning "seed_roles.py devolvió un error (puede que ya existan los datos)"
    fi
else
    print_warning "Archivo seed_roles.py no encontrado"
fi

if [ -f "seed_turnos.py" ]; then
    print_info "Ejecutando seed_turnos.py..."
    if python seed_turnos.py; then
        print_success "seed_turnos.py ejecutado correctamente"
    else
        print_warning "seed_turnos.py devolvió un error (puede que ya existan los datos)"
    fi
else
    print_warning "Archivo seed_turnos.py no encontrado"
fi

# Esperar al proceso del servidor para mantener el script en primer plano
wait $SERVER_PID

# Si el servidor se detiene
END_TIME=$(date +%s)
TOTAL_TIME=$((END_TIME - START_TIME))

echo -e "\n${CYAN}╔════════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${CYAN}║  ${WHITE}Servidor detenido${RESET}                                          ${CYAN}║${RESET}"
echo -e "${CYAN}║  ${DIM}Tiempo total de ejecución: ${TOTAL_TIME}s${RESET}                          ${CYAN}║${RESET}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${RESET}\n"
