#!/bin/bash

# ============================================
# Script de Despliegue con Docker Compose
# Sistema de Asistencia - Arquitectura Monolítica con Contenedores Separados
# ============================================
# Este script realiza despliegue selectivo:
# - deploy-compose.sh client     → Actualiza solo el contenedor de cliente
# - deploy-compose.sh server     → Actualiza solo el contenedor de servidor
# - deploy-compose.sh both       → Actualiza cliente y servidor
# - deploy-compose.sh            → Redeploy completo (cliente + servidor)

set -e

# ============================================
# COLORES Y ESTILOS
# ============================================

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

# Emojis y símbolos
SUCCESS="✅"
ERROR="❌"
WARNING="⚠️ "
INFO="ℹ️ "
ROCKET="🚀"
PACKAGE="📦"
SPARKLES="✨"
CLOCK="⏱️ "
FIRE="🔥"
CHECK="✓"

# ============================================
# CONFIGURACIÓN
# ============================================

APP_DIR="/home/deploy/app/sistema-de-asistencia"
REPO_URL="git@github.com:2004Style/sistema-de-asistencia.git"
LOG_DIR="${HOME}/.deploy/logs"
LOG_FILE="$LOG_DIR/deploy_$(date +%Y%m%d_%H%M%S).log"

# Parámetro: tipo de despliegue (client, server, both, o vacío para ambos)
DEPLOY_TYPE="${1:-both}"

# Crear directorio de logs
mkdir -p "$LOG_DIR" 2>/dev/null || LOG_DIR="/tmp/deploy-logs-$$" && mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/deploy_$(date +%Y%m%d_%H%M%S).log"

# ============================================
# FUNCIONES DE LOG
# ============================================

print_banner() {
    echo -e "${CYAN}${BOLD}"
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                                                                ║"
    echo "║   ${FIRE} SISTEMA DE ASISTENCIA - DOCKER COMPOSE DEPLOY ${FIRE}       ║"
    echo "║                                                                ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo -e "${RESET}"
}

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE" 2>/dev/null || echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

log_error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ${RED}${ERROR} ERROR: $1${RESET}" | tee -a "$LOG_FILE" 2>/dev/null >&2 || echo "[$(date +'%Y-%m-%d %H:%M:%S')] ${RED}${ERROR} ERROR: $1${RESET}" >&2
}

log_success() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ${GREEN}${SUCCESS} $1${RESET}" | tee -a "$LOG_FILE" 2>/dev/null || echo "[$(date +'%Y-%m-%d %H:%M:%S')] ${GREEN}${SUCCESS} $1${RESET}"
}

log_warning() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ${YELLOW}${WARNING}$1${RESET}" | tee -a "$LOG_FILE" 2>/dev/null || echo "[$(date +'%Y-%m-%d %H:%M:%S')] ${YELLOW}${WARNING}$1${RESET}"
}

log_info() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ${BLUE}${INFO}$1${RESET}" | tee -a "$LOG_FILE" 2>/dev/null || echo "[$(date +'%Y-%m-%d %H:%M:%S')] ${BLUE}${INFO}$1${RESET}"
}

log_section() {
    echo -e "\n${MAGENTA}${BOLD}▶ $1${RESET}" | tee -a "$LOG_FILE" 2>/dev/null || echo -e "\n${MAGENTA}${BOLD}▶ $1${RESET}"
    echo -e "${DIM}────────────────────────────────────────────────────${RESET}" | tee -a "$LOG_FILE" 2>/dev/null || echo -e "${DIM}────────────────────────────────────────────────────${RESET}"
}

# ============================================
# VALIDACIONES
# ============================================

clear
print_banner

log_section "🔍 Validaciones Iniciales"

# Validar tipo de despliegue
case "$DEPLOY_TYPE" in
    client|server|both) 
        log_info "Tipo de despliegue: $DEPLOY_TYPE"
        ;;
    *)
        log_warning "Tipo de despliegue inválido: $DEPLOY_TYPE. Usando: both"
        DEPLOY_TYPE="both"
        ;;
esac

# Verificar requisitos
if ! command -v docker &> /dev/null; then
    log_error "Docker no está instalado"
    exit 1
fi

if ! command -v git &> /dev/null; then
    log_error "Git no está instalado"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    log_error "Docker Compose no está instalado"
    exit 1
fi

log_success "Requisitos verificados: Docker, Git, Docker Compose"

# ============================================
# ACTUALIZAR REPOSITORIO
# ============================================

log_section "📥 Actualizando Repositorio"

if [ ! -d "$APP_DIR" ]; then
    log "Clonando repositorio en $APP_DIR..."
    mkdir -p "$(dirname "$APP_DIR")"
    
    if git clone "$REPO_URL" "$APP_DIR" >> "$LOG_FILE" 2>&1; then
        log_success "Repositorio clonado exitosamente"
    else
        log_error "Error al clonar el repositorio"
        exit 1
    fi
else
    log "Actualizando repositorio existente..."
    cd "$APP_DIR" || { log_error "No se puede acceder a $APP_DIR"; exit 1; }
    
    if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        log_error "Repositorio git corrupto"
        cd /
        rm -rf "$APP_DIR"
        git clone "$REPO_URL" "$APP_DIR" >> "$LOG_FILE" 2>&1
        log_success "Repositorio clonado nuevamente"
    else
        git fetch origin main 2>/dev/null || git fetch origin
        git reset --hard origin/main 2>/dev/null || git reset --hard origin/master
        git pull origin main 2>/dev/null || git pull
        log_success "Repositorio actualizado"
    fi
fi

cd "$APP_DIR" || exit 1
log_success "Ubicado en: $(pwd)"

# ============================================
# GENERAR CERTIFICADOS SSL (si no existen)
# ============================================

log_section "🔐 Verificando Certificados SSL"

CERTS_DIR="$(pwd)/certs"
CERT_FILE="$CERTS_DIR/cert.pem"
KEY_FILE="$CERTS_DIR/key.pem"

mkdir -p "$CERTS_DIR"

if [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ]; then
    log_info "Certificados SSL encontrados"
else
    log_warning "Certificados SSL no encontrados. Generando..."
    
    SERVER_IP="${EC2_PUBLIC_IP:-$(hostname -I | awk '{print $1}')}"
    SERVER_IP="${SERVER_IP:-localhost}"
    
    if openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$KEY_FILE" \
        -out "$CERT_FILE" \
        -subj "/C=CO/ST=Bogota/L=Bogota/O=SistemaAsistencia/CN=$SERVER_IP" \
        -addext "subjectAltName=IP:$SERVER_IP" >> "$LOG_FILE" 2>&1; then
        
        chmod 600 "$KEY_FILE"
        chmod 644 "$CERT_FILE"
        log_success "Certificados SSL generados"
    else
        log_error "Error al generar certificados SSL"
        exit 1
    fi
fi

# ============================================
# CARGAR VARIABLES DE ENTORNO
# ============================================

log_section "⚙️ Cargando Configuración"

if [ ! -f .env ]; then
    log_error ".env no existe"
    log_info "Crear .env basado en .env.example"
    exit 1
fi

if [ ! -f docker-compose.yml ]; then
    log_error "docker-compose.yml no encontrado"
    exit 1
fi

if [ ! -f nginx.conf ]; then
    log_error "nginx.conf no encontrado"
    exit 1
fi

source .env 2>/dev/null || true
log_success "Configuración cargada"

# ============================================
# ACTUALIZAR CONTENEDORES SELECTIVAMENTE
# ============================================

log_section "🔄 Iniciando Actualización Selectiva"

# Usar comando docker compose correcto
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
else
    DOCKER_COMPOSE_CMD="docker-compose"
fi

log_info "Usando: $DOCKER_COMPOSE_CMD"

case "$DEPLOY_TYPE" in
    client)
        log_info "Actualizando solo el contenedor CLIENT..."
        
        log "Descargando imagen del cliente..."
        if $DOCKER_COMPOSE_CMD pull client >> "$LOG_FILE" 2>&1; then
            log_success "Imagen descargada"
        fi
        
        log "Reiniciando contenedor client..."
        if $DOCKER_COMPOSE_CMD up -d --no-deps --build client >> "$LOG_FILE" 2>&1; then
            log_success "Contenedor client actualizado"
        else
            log_error "Error al actualizar contenedor client"
            exit 1
        fi
        
        # Esperar a que el cliente esté listo
        log "Esperando a que el cliente esté disponible..."
        for i in {1..30}; do
            if docker exec sistema-asistencia-client wget -q --tries=1 --spider http://localhost:3000 2>/dev/null; then
                log_success "Cliente listo"
                break
            fi
            sleep 2
        done
        ;;
        
    server)
        log_info "Actualizando solo el contenedor SERVER..."
        
        log "Descargando imagen del servidor..."
        if $DOCKER_COMPOSE_CMD pull api >> "$LOG_FILE" 2>&1; then
            log_success "Imagen descargada"
        fi
        
        log "Reiniciando contenedor api..."
        if $DOCKER_COMPOSE_CMD up -d --no-deps --build api >> "$LOG_FILE" 2>&1; then
            log_success "Contenedor api actualizado"
        else
            log_error "Error al actualizar contenedor api"
            exit 1
        fi
        
        # Esperar a que el servidor esté listo
        log "Esperando a que la API esté disponible..."
        for i in {1..30}; do
            if curl -s http://localhost:8000/health > /dev/null 2>&1; then
                log_success "API lista"
                break
            fi
            sleep 2
        done
        ;;
        
    both|*)
        log_info "Actualizando CLIENT + SERVER..."
        
        log "Descargando imágenes..."
        if $DOCKER_COMPOSE_CMD pull client api nginx >> "$LOG_FILE" 2>&1; then
            log_success "Imágenes descargadas"
        fi
        
        log "Iniciando todos los contenedores..."
        if $DOCKER_COMPOSE_CMD up -d --no-deps --build client api nginx >> "$LOG_FILE" 2>&1; then
            log_success "Contenedores actualizados"
        else
            log_error "Error al actualizar contenedores"
            exit 1
        fi
        
        # Esperar a servicios
        log "Esperando a que los servicios estén disponibles..."
        
        for i in {1..30}; do
            API_OK=false
            CLIENT_OK=false
            
            if curl -s http://localhost:8000/health > /dev/null 2>&1; then
                API_OK=true
                log_success "API lista"
            fi
            
            if docker exec sistema-asistencia-client wget -q --tries=1 --spider http://localhost:3000 2>/dev/null; then
                CLIENT_OK=true
                log_success "Cliente listo"
            fi
            
            if [ "$API_OK" = true ] && [ "$CLIENT_OK" = true ]; then
                break
            fi
            
            sleep 2
        done
        ;;
esac

# ============================================
# LIMPIAR RECURSOS
# ============================================

log_section "🧹 Limpiando Recursos"

log "Removiendo imágenes sin usar..."
if docker image prune -f --filter "until=24h" >> "$LOG_FILE" 2>&1; then
    log_success "Limpieza completada"
else
    log_warning "Error durante la limpieza (no crítico)"
fi

# ============================================
# VERIFICAR ESTADO
# ============================================

log_section "📊 Estado de Contenedores"

log "Contenedores en ejecución:"
$DOCKER_COMPOSE_CMD ps 2>&1 | tee -a "$LOG_FILE"

log_section "🎉 Despliegue Completado"

echo ""
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════════════════${RESET}"
log_success "Despliegue completado exitosamente"
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════════════════${RESET}"

log_info "Tipo de despliegue: $DEPLOY_TYPE"
log_info "🌐 Cliente: http://localhost"
log_info "⚙️ API: http://localhost/api/docs"
log_info "📡 WebSocket: ws://localhost/api/socket.io"
log_info "📋 Logs: $LOG_FILE"

echo ""
log_info "Últimos logs del despliegue:"
tail -10 "$LOG_FILE" 2>/dev/null || true

echo ""
log_success "¡Despliegue finalizado!"
echo ""
