#!/bin/bash

# ============================================
# Script de Despliegue Robusto y Completo
# Sistema de Asistencia - Producción
# ============================================
# Uso:
#   ./deploy.sh               → Despliegue completo
#   ./deploy.sh client        → Solo actualizar cliente
#   ./deploy.sh server        → Solo actualizar servidor
#   ./deploy.sh --force       → Forzar rebuild completo

set -euo pipefail

# ============================================
# CONFIGURACIÓN
# ============================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

DEPLOY_TYPE="${1:-full}"
LOG_DIR="$HOME/.deploy-logs"
LOG_FILE="$LOG_DIR/deploy_$(date +%Y%m%d_%H%M%S).log"

# Crear directorio de logs
mkdir -p "$LOG_DIR" 2>/dev/null || true

# ============================================
# COLORES Y SÍMBOLOS
# ============================================

if [ -t 1 ]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    MAGENTA='\033[0;35m'
    CYAN='\033[0;36m'
    BOLD='\033[1m'
    DIM='\033[2m'
    RESET='\033[0m'
else
    RED='' GREEN='' YELLOW='' BLUE='' MAGENTA='' CYAN='' BOLD='' DIM='' RESET=''
fi

SUCCESS="✅"
ERROR="❌"
WARNING="⚠️ "
INFO="ℹ️ "
ROCKET="🚀"
GEAR="⚙️ "
FIRE="🔥"

# ============================================
# FUNCIONES DE LOG
# ============================================

log() {
    echo -e "$@" | tee -a "$LOG_FILE"
}

log_success() {
    log "${GREEN}${SUCCESS} $1${RESET}"
}

log_error() {
    log "${RED}${ERROR} $1${RESET}"
}

log_warning() {
    log "${YELLOW}${WARNING}$1${RESET}"
}

log_info() {
    log "${CYAN}${INFO}$1${RESET}"
}

log_section() {
    log "\n${BLUE}${BOLD}▶ $1${RESET}"
    log "${DIM}────────────────────────────────────────────────────${RESET}"
}

print_banner() {
    clear
    log "${CYAN}${BOLD}"
    log "╔════════════════════════════════════════════════════════════════╗"
    log "║                                                                ║"
    log "║       ${FIRE} SISTEMA DE ASISTENCIA - DESPLIEGUE ${FIRE}                  ║"
    log "║                                                                ║"
    log "╚════════════════════════════════════════════════════════════════╝"
    log "${RESET}"
}

trap_error() {
    local line=$1
    log_error "Error en línea $line"
    log_error "Ver logs completos en: $LOG_FILE"
    exit 1
}

trap 'trap_error $LINENO' ERR

# ============================================
# INICIO
# ============================================

START_TIME=$(date +%s)
print_banner

log_info "Tipo de despliegue: ${BOLD}$DEPLOY_TYPE${RESET}"
log_info "Directorio: ${BOLD}$SCRIPT_DIR${RESET}"
log_info "Log: ${BOLD}$LOG_FILE${RESET}"

# ============================================
# VERIFICAR DOCKER
# ============================================

log_section "${GEAR} Verificando Docker"

if ! command -v docker &>/dev/null; then
    log_error "Docker no está instalado"
    exit 1
fi

# Detectar comando docker compose (v2) o docker-compose (v1)
if docker compose version &>/dev/null; then
    DC="docker compose"
    log_success "Usando: docker compose (v2)"
elif command -v docker-compose &>/dev/null; then
    DC="docker-compose"
    log_success "Usando: docker-compose (v1)"
else
    log_error "Docker Compose no está instalado"
    exit 1
fi

# ============================================
# VERIFICAR ARCHIVOS .env
# ============================================

log_section "📋 Verificando Configuración"

ERRORS=0

# .env raíz (opcional)
if [ ! -f ".env" ]; then
    log_warning ".env raíz no encontrado. Creando archivo mínimo..."
    cat > .env << 'EOF'
# Configuración para docker-compose.yml
# No necesita IP hardcodeada - Nginx acepta cualquier IP/dominio
EOF
    log_success ".env raíz creado"
else
    log_success ".env raíz encontrado"
fi

# server/.env (REQUERIDO)
if [ ! -f "server/.env" ]; then
    log_error "server/.env NO EXISTE - REQUERIDO"
    log_info "Copia server/.env.example a server/.env y configúralo"
    ERRORS=$((ERRORS + 1))
else
    log_success "server/.env encontrado"
    
    # Validar DATABASE_URL
    if ! grep -q "^DATABASE_URL=" server/.env; then
        log_error "DATABASE_URL no encontrado en server/.env"
        ERRORS=$((ERRORS + 1))
    elif grep -q "^DATABASE_URL=.*usuario:password" server/.env; then
        log_warning "DATABASE_URL parece tener valores de ejemplo"
    else
        log_success "DATABASE_URL configurado"
    fi
    
    # Validar SECRET_KEY
    if grep -q "^SECRET_KEY=.*CAMBIAR" server/.env; then
        log_warning "SECRET_KEY tiene valor de ejemplo - CAMBIAR EN PRODUCCIÓN"
    fi
fi

# client/.env (REQUERIDO)
if [ ! -f "client/.env" ]; then
    log_error "client/.env NO EXISTE - REQUERIDO"
    log_info "Copia client/.env.example a client/.env y configúralo"
    ERRORS=$((ERRORS + 1))
else
    log_success "client/.env encontrado"
    
    # Validar NEXT_PUBLIC_URL_BACKEND
    if ! grep -q "^NEXT_PUBLIC_URL_BACKEND=" client/.env; then
        log_error "NEXT_PUBLIC_URL_BACKEND no encontrado en client/.env"
        ERRORS=$((ERRORS + 1))
    else
        log_success "NEXT_PUBLIC_URL_BACKEND configurado"
    fi
fi

if [ $ERRORS -gt 0 ]; then
    log_error "Encontrados $ERRORS errores críticos. Abortando."
    exit 1
fi

# ============================================
# VERIFICAR CERTIFICADOS SSL
# ============================================

log_section "🔐 Verificando Certificados SSL"

if [ ! -f "certs/cert.pem" ] || [ ! -f "certs/key.pem" ]; then
    log_warning "Certificados SSL no encontrados. Generando..."
    
    mkdir -p certs
    
    # Obtener hostname o usar genérico
    SERVER_CN="$(hostname 2>/dev/null || echo 'sistema-asistencia')"
    
    log_info "Generando certificados autofirmados..."
    
    if openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout certs/key.pem \
        -out certs/cert.pem \
        -subj "/C=PE/ST=Lima/L=Lima/O=SistemaAsistencia/CN=$SERVER_CN" \
        >> "$LOG_FILE" 2>&1; then
        
        chmod 600 certs/key.pem
        chmod 644 certs/cert.pem
        log_success "Certificados SSL generados"
    else
        log_warning "No se pudieron generar certificados SSL (continuando sin HTTPS)"
    fi
else
    log_success "Certificados SSL encontrados"
fi

# ============================================
# ACTUALIZAR CÓDIGO (si es repositorio git)
# ============================================

if [ -d ".git" ]; then
    log_section "📥 Actualizando Código"
    
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
    log_info "Rama actual: $CURRENT_BRANCH"
    
    if git pull origin "$CURRENT_BRANCH" >> "$LOG_FILE" 2>&1; then
        log_success "Código actualizado"
    else
        log_warning "No se pudo actualizar el código (puede estar al día)"
    fi
else
    log_info "No es un repositorio Git (omitiendo git pull)"
fi

# ============================================
# DETENER SERVICIOS ACTUALES
# ============================================

log_section "🛑 Deteniendo Servicios Actuales"

if $DC ps -q &>/dev/null; then
    case "$DEPLOY_TYPE" in
        client)
            log_info "Deteniendo solo cliente..."
            $DC stop client >> "$LOG_FILE" 2>&1 || true
            ;;
        server|api)
            log_info "Deteniendo solo servidor..."
            $DC stop api >> "$LOG_FILE" 2>&1 || true
            ;;
        --force)
            log_info "Deteniendo y removiendo todos los servicios..."
            $DC down -v >> "$LOG_FILE" 2>&1 || true
            ;;
        *)
            log_info "Deteniendo todos los servicios..."
            $DC down >> "$LOG_FILE" 2>&1 || true
            ;;
    esac
    log_success "Servicios detenidos"
else
    log_info "No hay servicios corriendo"
fi

# ============================================
# CONSTRUIR E INICIAR SERVICIOS
# ============================================

log_section "${ROCKET} Construyendo e Iniciando Servicios"

case "$DEPLOY_TYPE" in
    client)
        log_info "Actualizando solo el cliente..."
        if $DC up -d --build client >> "$LOG_FILE" 2>&1; then
            log_success "Cliente iniciado"
        else
            log_error "Error al iniciar cliente"
            $DC logs client | tail -20 | tee -a "$LOG_FILE"
            exit 1
        fi
        SERVICES_TO_CHECK=("client")
        ;;
        
    server)
        log_info "Actualizando solo el servidor..."
        if $DC up -d --build api >> "$LOG_FILE" 2>&1; then
            log_success "Servidor iniciado"
        else
            log_error "Error al iniciar servidor"
            $DC logs api | tail -20 | tee -a "$LOG_FILE"
            exit 1
        fi
        SERVICES_TO_CHECK=("api")
        ;;
        
    --force)
        log_info "Reconstruyendo todo desde cero..."
        if $DC build --no-cache >> "$LOG_FILE" 2>&1; then
            log_success "Build completado"
        else
            log_error "Error en build"
            exit 1
        fi
        
        if $DC up -d >> "$LOG_FILE" 2>&1; then
            log_success "Todos los servicios iniciados"
        else
            log_error "Error al iniciar servicios"
            $DC logs | tail -50 | tee -a "$LOG_FILE"
            exit 1
        fi
        SERVICES_TO_CHECK=("api" "client" "nginx")
        ;;
        
    *)
        log_info "Iniciando todos los servicios..."
        if $DC up -d --build >> "$LOG_FILE" 2>&1; then
            log_success "Todos los servicios iniciados"
        else
            log_error "Error al iniciar servicios"
            $DC logs | tail -50 | tee -a "$LOG_FILE"
            exit 1
        fi
        SERVICES_TO_CHECK=("api" "client" "nginx")
        ;;
esac

# ============================================
# ESPERAR A QUE SERVICIOS ESTÉN SALUDABLES
# ============================================

log_section "⏱️  Esperando a que los servicios estén listos"

MAX_WAIT=180
ELAPSED=0
CHECK_INTERVAL=5

log_info "Verificando cada $CHECK_INTERVAL segundos (máximo ${MAX_WAIT}s)..."

while [ $ELAPSED -lt $MAX_WAIT ]; do
    ALL_HEALTHY=true
    STATUS_LINE=""
    
    for service in "${SERVICES_TO_CHECK[@]}"; do
        HEALTH=$($DC ps -q "$service" 2>/dev/null | xargs docker inspect -f '{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
        
        case "$HEALTH" in
            healthy)
                STATUS_LINE="$STATUS_LINE ${GREEN}✓ $service${RESET}"
                ;;
            starting)
                STATUS_LINE="$STATUS_LINE ${YELLOW}⏳ $service${RESET}"
                ALL_HEALTHY=false
                ;;
            unhealthy)
                STATUS_LINE="$STATUS_LINE ${RED}✗ $service${RESET}"
                ALL_HEALTHY=false
                ;;
            *)
                # Si no tiene healthcheck, verificar que esté corriendo
                if $DC ps "$service" 2>/dev/null | grep -q "Up"; then
                    STATUS_LINE="$STATUS_LINE ${GREEN}✓ $service${RESET}"
                else
                    STATUS_LINE="$STATUS_LINE ${RED}✗ $service${RESET}"
                    ALL_HEALTHY=false
                fi
                ;;
        esac
    done
    
    echo -ne "\r$STATUS_LINE"
    
    if [ "$ALL_HEALTHY" = true ]; then
        echo ""
        log_success "Todos los servicios están listos"
        break
    fi
    
    sleep $CHECK_INTERVAL
    ELAPSED=$((ELAPSED + CHECK_INTERVAL))
done

echo ""

if [ $ELAPSED -ge $MAX_WAIT ]; then
    log_warning "Timeout esperando a los servicios"
    log_info "Verifica el estado manualmente con: $DC ps"
fi

# ============================================
# LIMPIAR RECURSOS ANTIGUOS
# ============================================

log_section "🧹 Limpiando Recursos"

log_info "Removiendo imágenes sin usar..."
if docker image prune -f >> "$LOG_FILE" 2>&1; then
    log_success "Limpieza completada"
else
    log_warning "Error durante limpieza (no es crítico)"
fi

# ============================================
# ESTADO FINAL
# ============================================

log_section "📊 Estado Final de Contenedores"

$DC ps

# ============================================
# VERIFICAR CONECTIVIDAD
# ============================================

log_section "🔍 Verificando Conectividad"

# Verificar API
if docker exec sistema-asistencia-api python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health').read()" &>/dev/null; then
    log_success "API respondiendo correctamente"
else
    log_warning "API no responde (puede estar iniciándose)"
fi

# Verificar Cliente
if docker exec sistema-asistencia-client node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200 && r.statusCode !== 304) process.exit(1)}).on('error', () => process.exit(1))" &>/dev/null; then
    log_success "Cliente respondiendo correctamente"
else
    log_warning "Cliente no responde (puede estar iniciándose)"
fi

# ============================================
# RESUMEN FINAL
# ============================================

END_TIME=$(date +%s)
TOTAL_TIME=$((END_TIME - START_TIME))

log_section "🎉 Despliegue Completado"

log "${GREEN}${BOLD}════════════════════════════════════════════════════════════════${RESET}"
log_success "Despliegue finalizado en ${TOTAL_TIME}s"
log "${GREEN}${BOLD}════════════════════════════════════════════════════════════════${RESET}"

log ""
log_info "🌐 URLs de acceso:"
log "   ${CYAN}Cliente:${RESET}   http://TU_IP_ACTUAL/"
log "   ${CYAN}API Docs:${RESET}  http://TU_IP_ACTUAL/api/docs"
log "   ${CYAN}WebSocket:${RESET} ws://TU_IP_ACTUAL/api/socket.io"

log ""
log_info "📝 Comandos útiles:"
log "   Ver logs:       ${GREEN}$DC logs -f${RESET}"
log "   Ver estado:     ${GREEN}$DC ps${RESET}"
log "   Reiniciar:      ${GREEN}$DC restart${RESET}"
log "   Detener:        ${GREEN}$DC down${RESET}"

log ""
log_info "📋 Log completo: ${BOLD}$LOG_FILE${RESET}"

log ""
log_success "¡Todo listo! ${FIRE}"
log ""

exit 0
