#!/bin/bash

# ============================================
# Script de Despliegue con Docker Compose v2
# Sistema de Asistencia - Versión Mejorada y Robusta
# ============================================
# Uso:
#   ./deploy-compose.sh               → Redeploy completo (cliente + servidor + nginx)
#   ./deploy-compose.sh client        → Actualiza solo el cliente
#   ./deploy-compose.sh server        → Actualiza solo el servidor (API)
#   ./deploy-compose.sh both          → Actualiza cliente + servidor (sin nginx)

set -euo pipefail

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
FIRE="🔥"
GEAR="⚙️ "
CLOCK="⏱️ "

# ============================================
# CONFIGURACIÓN
# ============================================

APP_DIR="/home/deploy/app/sistema-de-asistencia"
REPO_URL="git@github.com:2004Style/sistema-de-asistencia.git"
LOG_DIR="${HOME}/.deploy/logs"
LOG_FILE="$LOG_DIR/deploy_$(date +%Y%m%d_%H%M%S).log"
DEPLOY_TYPE="${1:-both}"

# Crear directorio de logs
mkdir -p "$LOG_DIR" 2>/dev/null || LOG_DIR="/tmp/deploy-logs-$$" && mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/deploy_$(date +%Y%m%d_%H%M%S).log"

# ============================================
# FUNCIONES DE UTILIDAD
# ============================================

print_banner() {
    echo -e "${CYAN}${BOLD}"
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                                                                ║"
    echo "║   ${FIRE} SISTEMA DE ASISTENCIA - DOCKER COMPOSE DEPLOY ${FIRE}       ║"
    echo "║                                                                ║"
    echo "║   Versión 2.0 - Mejorada y Robusta                           ║"
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

# Función para capturar errores
trap_error() {
    local line_number=$1
    log_error "Error en línea $line_number del script"
    log "📋 Ver logs completos en: $LOG_FILE"
    exit 1
}

trap "trap_error $LINENO" ERR

# ============================================
# VALIDACIONES INICIALES
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
if ! command -v docker &>/dev/null; then
    log_error "Docker no está instalado"
    exit 1
fi

if ! command -v git &>/dev/null; then
    log_error "Git no está instalado"
    exit 1
fi

if ! docker compose version &>/dev/null && ! command -v docker-compose &>/dev/null; then
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
        log_error "Repositorio git corrupto. Limpiando..."
        cd /
        rm -rf "$APP_DIR"
        git clone "$REPO_URL" "$APP_DIR" >> "$LOG_FILE" 2>&1
        log_success "Repositorio clonado nuevamente"
    else
        git fetch origin main 2>/dev/null || git fetch origin 2>/dev/null || true
        git reset --hard origin/main 2>/dev/null || git reset --hard origin/master 2>/dev/null || true
        git pull origin main 2>/dev/null || git pull 2>/dev/null || true
        log_success "Repositorio actualizado"
    fi
fi

cd "$APP_DIR" || exit 1
log_success "Ubicado en: $(pwd)"

# ============================================
# VERIFICAR CONFIGURACIÓN
# ============================================

log_section "⚙️ Verificando Configuración"

if [ ! -f .env ]; then
    log_error ".env no existe. Necesario para producción"
    log_info "Crear .env basado en .env.example"
    exit 1
fi

if [ ! -f docker-compose.yml ]; then
    log_error "docker-compose.yml no encontrado"
    exit 1
fi

if [ ! -f nginx.conf ]; then
    log_warning "nginx.conf no encontrado (pode que no sea crítico)"
fi

# Cargar variables de entorno
if source .env 2>/dev/null; then
    log_success "Configuración (.env) cargada correctamente"
else
    log_error "Error al cargar .env"
    exit 1
fi

# Validar variables críticas
WARNINGS_COUNT=0

# Verificar DATABASE_URL - método alternativo más robusto
if grep -q "^DATABASE_URL=" .env 2>/dev/null; then
    DB_VALUE=$(grep "^DATABASE_URL=" .env | cut -d'=' -f2- | tr -d ' ')
    if [ -n "$DB_VALUE" ] && [ "$DB_VALUE" != "your-database-url-here" ]; then
        log_success "DATABASE_URL configurada ✓"
    else
        log_warning "DATABASE_URL está vacía o es un placeholder (necesaria para producción)"
        WARNINGS_COUNT=$((WARNINGS_COUNT + 1))
    fi
else
    log_warning "DATABASE_URL no está configurada en .env (necesaria para producción)"
    WARNINGS_COUNT=$((WARNINGS_COUNT + 1))
fi

# Verificar SECRET_KEY y JWT_SECRET_KEY
if grep -q "^SECRET_KEY=" .env 2>/dev/null && grep -q "^JWT_SECRET_KEY=" .env 2>/dev/null; then
    SECRET_VAL=$(grep "^SECRET_KEY=" .env | cut -d'=' -f2- | tr -d ' ')
    JWT_VAL=$(grep "^JWT_SECRET_KEY=" .env | cut -d'=' -f2- | tr -d ' ')
    
    if ([ -z "$SECRET_VAL" ] || [ "$SECRET_VAL" = "your-secret-key-change-in-production-REPLACE-ME" ]) || \
       ([ -z "$JWT_VAL" ] || [ "$JWT_VAL" = "your-jwt-secret-key-change-in-production-REPLACE-ME" ]); then
        log_warning "SECRET_KEY o JWT_SECRET_KEY son placeholders (cambiar en producción)"
        WARNINGS_COUNT=$((WARNINGS_COUNT + 1))
    else
        log_success "Claves de seguridad configuradas ✓"
    fi
else
    log_warning "SECRET_KEY o JWT_SECRET_KEY no están en .env"
    WARNINGS_COUNT=$((WARNINGS_COUNT + 1))
fi

if [ $WARNINGS_COUNT -gt 0 ]; then
    log_warning "Se encontraron $WARNINGS_COUNT advertencia(s) en la configuración"
    log_info "⏳ Continuando con despliegue... (verifica que .env sea válido)"
else
    log_success "Todas las variables críticas están configuradas ✓"
fi

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
        log_success "Certificados SSL generados para: $SERVER_IP"
    else
        log_error "Error al generar certificados SSL"
        exit 1
    fi
fi

# ============================================
# SELECCIONAR DOCKER COMPOSE CMD
# ============================================

if docker compose version &>/dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
else
    DOCKER_COMPOSE_CMD="docker-compose"
fi

log_info "Usando: $DOCKER_COMPOSE_CMD"

# ============================================
# DESPLIEGUE SELECTIVO
# ============================================

log_section "🔄 Iniciando Actualización Selectiva"

case "$DEPLOY_TYPE" in
    client)
        log_info "Actualizando solo el contenedor CLIENT (Next.js)..."
        
        log "Descargando imagen del cliente..."
        if $DOCKER_COMPOSE_CMD pull client >> "$LOG_FILE" 2>&1; then
            log_success "Imagen descargada"
        else
            log_warning "No se pudo descargar imagen (continuando con caché local)"
        fi
        
        log "Deteniendo cliente anterior..."
        $DOCKER_COMPOSE_CMD stop client >> "$LOG_FILE" 2>&1 || true
        
        log "Compilando e iniciando cliente..."
        if $DOCKER_COMPOSE_CMD up -d --build client >> "$LOG_FILE" 2>&1; then
            log_success "Contenedor client iniciado"
        else
            log_error "Error al actualizar contenedor client"
            $DOCKER_COMPOSE_CMD logs client | tail -20 | tee -a "$LOG_FILE"
            exit 1
        fi
        
        # Esperar a que el cliente esté listo (máximo 120 segundos)
        log "Esperando a que el cliente esté disponible..."
        WAIT_TIME=0
        while [ $WAIT_TIME -lt 120 ]; do
            if docker exec sistema-asistencia-client curl -sf http://localhost:3000 >/dev/null 2>&1; then
                log_success "Cliente disponible ✓"
                break
            fi
            
            WAIT_TIME=$((WAIT_TIME + 2))
            sleep 2
        done
        
        if [ $WAIT_TIME -ge 120 ]; then
            log_warning "Timeout esperando al cliente, pero el contenedor puede estar funcionando"
        fi
        ;;
        
    server)
        log_info "Actualizando solo el contenedor SERVER (FastAPI)..."
        
        log "Descargando imagen del servidor..."
        if $DOCKER_COMPOSE_CMD pull api >> "$LOG_FILE" 2>&1; then
            log_success "Imagen descargada"
        else
            log_warning "No se pudo descargar imagen (continuando con caché local)"
        fi
        
        log "Deteniendo servidor anterior..."
        $DOCKER_COMPOSE_CMD stop api >> "$LOG_FILE" 2>&1 || true
        
        log "Compilando e iniciando servidor..."
        if $DOCKER_COMPOSE_CMD up -d --build api >> "$LOG_FILE" 2>&1; then
            log_success "Contenedor api iniciado"
        else
            log_error "Error al actualizar contenedor api"
            $DOCKER_COMPOSE_CMD logs api | tail -20 | tee -a "$LOG_FILE"
            exit 1
        fi
        
        # Esperar a que la API esté lista (máximo 120 segundos)
        log "Esperando a que la API esté disponible..."
        WAIT_TIME=0
        while [ $WAIT_TIME -lt 120 ]; do
            if curl -sf http://localhost:8000/health >/dev/null 2>&1; then
                log_success "API disponible ✓"
                break
            fi
            
            WAIT_TIME=$((WAIT_TIME + 2))
            sleep 2
        done
        
        if [ $WAIT_TIME -ge 120 ]; then
            log_warning "Timeout esperando a la API, pero el servicio puede estar funcionando"
        fi
        ;;
        
    both|*)
        log_info "Actualizando CLIENT + SERVER + NGINX (despliegue completo)..."
        
        log "Descargando imágenes..."
        if $DOCKER_COMPOSE_CMD pull >> "$LOG_FILE" 2>&1; then
            log_success "Imágenes descargadas"
        else
            log_warning "Algunas imágenes no se descargaron (continuando con caché)"
        fi
        
        log "Detener y removiendo servicios anteriores..."
        $DOCKER_COMPOSE_CMD down >> "$LOG_FILE" 2>&1 || true
        
        log "Compilando e iniciando todos los servicios..."
        if $DOCKER_COMPOSE_CMD up -d --build >> "$LOG_FILE" 2>&1; then
            log_success "Todos los servicios iniciados"
        else
            log_error "Error al iniciar servicios"
            log "Mostrando logs de error:"
            $DOCKER_COMPOSE_CMD logs | tail -50 | tee -a "$LOG_FILE"
            exit 1
        fi
        
        # Esperar a que todos los servicios estén listos
        log "Esperando a que todos los servicios estén disponibles..."
        
        SERVICES=("api" "client" "nginx")
        MAX_WAIT_TIME=180
        WAIT_TIME=0
        ALL_READY=false
        
        while [ $WAIT_TIME -lt $MAX_WAIT_TIME ]; do
            ALL_READY=true
            READY_COUNT=0
            
            # Verificar API
            if curl -sf http://localhost:8000/health >/dev/null 2>&1; then
                log_success "✓ API disponible"
                READY_COUNT=$((READY_COUNT + 1))
            else
                ALL_READY=false
                log "⏳ API aún iniciándose..."
            fi
            
            # Verificar Cliente
            if curl -sf http://localhost:3000 >/dev/null 2>&1; then
                log_success "✓ Cliente disponible"
                READY_COUNT=$((READY_COUNT + 1))
            else
                ALL_READY=false
                log "⏳ Cliente aún iniciándose..."
            fi
            
            # Verificar Nginx
            if curl -sf http://localhost/health >/dev/null 2>&1; then
                log_success "✓ Nginx disponible"
                READY_COUNT=$((READY_COUNT + 1))
            else
                ALL_READY=false
                log "⏳ Nginx aún iniciándose..."
            fi
            
            if [ $READY_COUNT -eq 3 ]; then
                ALL_READY=true
                break
            fi
            
            WAIT_TIME=$((WAIT_TIME + 2))
            sleep 2
        done
        
        if [ "$ALL_READY" = true ]; then
            log_success "Todos los servicios están disponibles"
        else
            log_warning "Timeout esperando a los servicios, pero pueden estar funcionando parcialmente"
            log "Verificar con: $DOCKER_COMPOSE_CMD ps"
        fi
        ;;
esac

# ============================================
# LIMPIAR RECURSOS
# ============================================

log_section "🧹 Limpiando Recursos"

log "Removiendo imágenes antiguas sin usar..."
if docker image prune -f --filter "until=24h" >> "$LOG_FILE" 2>&1; then
    log_success "Limpieza completada"
else
    log_warning "Error durante la limpieza (no es crítico)"
fi

# ============================================
# VERIFICAR ESTADO
# ============================================

log_section "📊 Estado de Contenedores"

log "Contenedores en ejecución:"
$DOCKER_COMPOSE_CMD ps 2>&1 | tee -a "$LOG_FILE"

# ============================================
# RESUMEN FINAL
# ============================================

log_section "🎉 Despliegue Completado"

echo ""
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════════════════${RESET}"
log_success "Despliegue completado exitosamente"
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════════════════${RESET}"

echo ""
log_info "Tipo de despliegue: $DEPLOY_TYPE"
log_info "🌐 Cliente: http://localhost (o tu dominio)"
log_info "⚙️  API: http://localhost/api/docs"
log_info "📡 WebSocket: ws://localhost/api/socket.io"
log_info "📋 Logs: $LOG_FILE"

echo ""
log_info "Comandos útiles:"
echo "  Ver logs en tiempo real:   $DOCKER_COMPOSE_CMD logs -f"
echo "  Detener servicios:         $DOCKER_COMPOSE_CMD stop"
echo "  Reiniciar servicios:       $DOCKER_COMPOSE_CMD restart"
echo "  Ver estado:                $DOCKER_COMPOSE_CMD ps"

echo ""
log_success "¡Despliegue finalizado!"
echo ""
