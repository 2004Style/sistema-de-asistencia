#!/bin/bash

# ============================================
# Script de Despliegue en AWS EC2
# Sistema de Asistencia
# ============================================

set -e  # Salir si hay un error

# Configuración
APP_DIR="/home/deploy/app"
REPO_URL="git@github.com:2004Style/sistema-de-asistencia.git"
CONTAINER_NAME="sistema-asistencia-api"
IMAGE_NAME="sistema-asistencia:latest"
API_PORT="8000"
LOG_DIR="/var/log/deploy"
LOG_FILE="$LOG_DIR/deploy_$(date +%Y%m%d_%H%M%S).log"

# Crear directorio de logs
mkdir -p "$LOG_DIR"

# Función para loguear
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$LOG_FILE" >&2
}

log_success() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ✓ $1" | tee -a "$LOG_FILE"
}

# ============================================
# 1. VERIFICACIONES INICIALES
# ============================================

log "🔍 Verificando requisitos..."

# Verificar si Docker está instalado
if ! command -v docker &> /dev/null; then
    log_error "Docker no está instalado"
    exit 1
fi

# Verificar si Git está instalado
if ! command -v git &> /dev/null; then
    log_error "Git no está instalado"
    exit 1
fi

# Verificar permisos
if [ ! -w "$APP_DIR" ] && [ -d "$APP_DIR" ]; then
    log_error "No hay permisos de escritura en $APP_DIR"
    exit 1
fi

log_success "Requisitos verificados"

# ============================================
# 2. CLONAR O ACTUALIZAR REPOSITORIO
# ============================================

log "📥 Actualizando código del repositorio..."

if [ ! -d "$APP_DIR" ]; then
    log "Clonando repositorio..."
    mkdir -p "$(dirname "$APP_DIR")"
    git clone "$REPO_URL" "$APP_DIR"
    log_success "Repositorio clonado"
else
    log "Actualizando repositorio existente..."
    cd "$APP_DIR"
    git fetch origin main
    git reset --hard origin/main
    git pull origin main
    log_success "Repositorio actualizado"
fi

# ============================================
# 3. IR A LA CARPETA DEL SERVIDOR
# ============================================

cd "$APP_DIR/servidor" || {
    log_error "No se encontró la carpeta 'servidor'"
    exit 1
}

log_success "Ubicado en: $(pwd)"

# ============================================
# 4. CARGAR VARIABLES DE ENTORNO
# ============================================

log "⚙️ Cargando variables de entorno..."

if [ ! -f .env ]; then
    # Verificar si existe .env.example
    if [ -f .env.example ]; then
        log_error ".env no existe, crear uno basado en .env.example"
        exit 1
    else
        log_error ".env no existe y no hay .env.example"
        exit 1
    fi
fi

source .env
log_success "Variables de entorno cargadas"

# ============================================
# 5. VERIFICAR CONECTIVIDAD A BD
# ============================================

log "🔗 Verificando conectividad..."

# Esperar a que la BD esté disponible si usa docker-compose
if command -v docker-compose &> /dev/null; then
    log "Verificando servicios previos..."
    docker-compose ps 2>/dev/null || true
fi

log_success "Verificación completada"

# ============================================
# 6. CONSTRUIR IMAGEN DOCKER
# ============================================

log "🔨 Construyendo imagen Docker..."

if docker build -t "$IMAGE_NAME" . >> "$LOG_FILE" 2>&1; then
    log_success "Imagen Docker construida: $IMAGE_NAME"
else
    log_error "Error al construir la imagen Docker"
    exit 1
fi

# ============================================
# 7. DETENER CONTENEDOR ANTERIOR
# ============================================

log "🛑 Deteniendo contenedor anterior..."

if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    log "Parando contenedor $CONTAINER_NAME..."
    docker stop "$CONTAINER_NAME" 2>/dev/null || true
    docker rm "$CONTAINER_NAME" 2>/dev/null || true
    sleep 2  # Esperar a que se liberen recursos
    log_success "Contenedor anterior eliminado"
else
    log "No hay contenedor previo"
fi

# ============================================
# 8. INICIAR NUEVO CONTENEDOR
# ============================================

log "🚀 Iniciando nuevo contenedor..."

# Opción A: Usar Docker Compose (RECOMENDADO)
if [ -f docker-compose.yml ]; then
    log "Usando Docker Compose..."
    if docker-compose up -d >> "$LOG_FILE" 2>&1; then
        log_success "Servicios iniciados con Docker Compose"
    else
        log_error "Error al iniciar con Docker Compose"
        exit 1
    fi
else
    # Opción B: Usar Docker run (si no hay docker-compose.yml)
    log "Usando Docker run..."
    
    if docker run -d \
        --name "$CONTAINER_NAME" \
        --restart unless-stopped \
        -p "${API_PORT}:8000" \
        --env-file .env \
        -v "$(pwd)/public:/app/public" \
        -v "$(pwd)/recognize/data:/app/recognize/data" \
        "$IMAGE_NAME" >> "$LOG_FILE" 2>&1; then
        log_success "Contenedor iniciado: $CONTAINER_NAME"
    else
        log_error "Error al iniciar contenedor"
        exit 1
    fi
fi

# ============================================
# 9. VERIFICAR SALUD DEL CONTENEDOR
# ============================================

log "💚 Esperando a que la aplicación esté lista..."

max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if curl -s http://localhost:${API_PORT}/docs > /dev/null 2>&1; then
        log_success "✓ Aplicación está lista en http://localhost:${API_PORT}/docs"
        break
    fi
    
    attempt=$((attempt + 1))
    log "Intento $attempt/$max_attempts..."
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    log_error "La aplicación no respondió a tiempo"
    log "Logs del contenedor:"
    docker logs "$CONTAINER_NAME" --tail=50
    exit 1
fi

# ============================================
# 10. LIMPIAR IMÁGENES ANTIGUAS
# ============================================

log "🧹 Limpiando imágenes antiguas..."

docker image prune -f --filter "until=24h" >> "$LOG_FILE" 2>&1 || true
log_success "Limpieza completada"

# ============================================
# 11. RESUMEN
# ============================================

log "════════════════════════════════════════"
log_success "✓ DESPLIEGUE COMPLETADO EXITOSAMENTE"
log "════════════════════════════════════════"
log "Contenedor: $CONTAINER_NAME"
log "Imagen: $IMAGE_NAME"
log "Puerto: $API_PORT"
log "URL: http://localhost:${API_PORT}/docs"
log "Logs: $LOG_FILE"
log "════════════════════════════════════════"

# Mostrar logs del contenedor
log "📋 Últimos logs del contenedor:"
docker logs "$CONTAINER_NAME" --tail=20

exit 0
