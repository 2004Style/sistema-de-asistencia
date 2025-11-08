#!/bin/bash

# ============================================
# Script de Despliegue en AWS EC2 - MEJORADO
# Sistema de Asistencia
# ============================================

set -e  # Salir si hay un error

# Configuración
APP_DIR="/home/deploy/app/sistema-de-asistencia"
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
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ❌ ERROR: $1" | tee -a "$LOG_FILE" >&2
}

log_success() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  ADVERTENCIA: $1" | tee -a "$LOG_FILE"
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

log_success "Requisitos verificados ✓ Docker, Git, Permisos"

# ============================================
# 2. CLONAR O ACTUALIZAR REPOSITORIO
# ============================================

log "📥 Actualizando código del repositorio..."

if [ ! -d "$APP_DIR" ]; then
    # Carpeta no existe, clonar
    log "Clonando repositorio..."
    mkdir -p "$(dirname "$APP_DIR")"
    if git clone "$REPO_URL" "$APP_DIR" >> "$LOG_FILE" 2>&1; then
        log_success "Repositorio clonado exitosamente"
    else
        log_error "Error al clonar el repositorio"
        exit 1
    fi

elif [ ! -d "$APP_DIR/.git" ]; then
    # Carpeta existe pero NO es repo git
    log_warning "Carpeta existe pero NO es repositorio git válido"
    log "Removiendo carpeta y clonando nuevamente..."
    
    if rm -rf "$APP_DIR" 2>/dev/null; then
        mkdir -p "$(dirname "$APP_DIR")"
        if git clone "$REPO_URL" "$APP_DIR" >> "$LOG_FILE" 2>&1; then
            log_success "Repositorio clonado exitosamente"
        else
            log_error "Error al clonar el repositorio"
            exit 1
        fi
    else
        log_error "No se puede remover $APP_DIR"
        exit 1
    fi

else
    # Carpeta existe Y es repo git, actualizar
    log "Actualizando repositorio existente..."
    
    cd "$APP_DIR" || { log_error "No se puede acceder a $APP_DIR"; exit 1; }
    
    # Verificar que git esté funcionando
    if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        log_error "Repositorio git corrupto"
        cd /
        rm -rf "$APP_DIR"
        git clone "$REPO_URL" "$APP_DIR" >> "$LOG_FILE" 2>&1
        log_success "Repositorio clonado nuevamente"
    else
        # Git está bien, actualizar
        git fetch origin main 2>/dev/null || git fetch origin
        git reset --hard origin/main 2>/dev/null || git reset --hard origin/master
        git pull origin main 2>/dev/null || git pull
        log_success "Repositorio actualizado exitosamente"
    fi
fi

# ============================================
# 3. IR A LA CARPETA DEL SERVIDOR
# ============================================

cd "$APP_DIR/server" || {
    log_error "No se puede acceder a $APP_DIR/server"
    exit 1
}

log_success "Ubicado en: $(pwd)"

# ============================================
# 3.5. GENERAR/VERIFICAR CERTIFICADOS SSL
# ============================================

log "🔐 Verificando certificados SSL..."

CERTS_DIR="$(pwd)/certs"
CERT_FILE="$CERTS_DIR/cert.pem"
KEY_FILE="$CERTS_DIR/key.pem"

# Crear directorio de certificados si no existe
mkdir -p "$CERTS_DIR"

# Verificar si los certificados existen y son válidos
if [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ]; then
    # Certificados existen, verificar validez
    cert_expiry=$(openssl x509 -enddate -noout -in "$CERT_FILE" 2>/dev/null | cut -d= -f2)
    log "Certificados encontrados. Validez: $cert_expiry"
else
    # Generar nuevos certificados auto-firmados
    log_warning "Certificados no encontrados. Generando nuevos..."
    
    # Obtener el IP o hostname
    SERVER_IP="${EC2_PUBLIC_IP:-$(hostname -I | awk '{print $1}')}"
    SERVER_IP="${SERVER_IP:-18.225.34.130}"
    
    if openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$KEY_FILE" \
        -out "$CERT_FILE" \
        -subj "/C=CO/ST=Bogota/L=Bogota/O=SistemaAsistencia/CN=$SERVER_IP" \
        -addext "subjectAltName=IP:$SERVER_IP" >> "$LOG_FILE" 2>&1; then
        log_success "Certificados SSL generados: $CERT_FILE, $KEY_FILE"
        chmod 600 "$KEY_FILE"
        chmod 644 "$CERT_FILE"
    else
        log_error "Error al generar certificados SSL"
        exit 1
    fi
fi

log_success "Certificados SSL verificados ✓"

# ============================================
# 4. CARGAR VARIABLES DE ENTORNO
# ============================================

log "⚙️ Cargando variables de entorno..."

if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        log_error ".env no existe. Crear uno basado en .env.example:"
        log "  cp .env.example .env"
        log "  nano .env"
        exit 1
    else
        log_error ".env no existe y no hay .env.example"
        exit 1
    fi
fi

# Validar que .env no esté vacío
if ! grep -q "DATABASE_URL" .env; then
    log_error ".env no tiene DATABASE_URL configurado"
    exit 1
fi

source .env
log_success "Variables de entorno cargadas ✓"

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
# 7. CONSTRUIR IMAGEN DOCKER
# ============================================

log "🔨 Construyendo imagen Docker..."

if docker build -t "$IMAGE_NAME" . >> "$LOG_FILE" 2>&1; then
    log_success "Imagen Docker construida: $IMAGE_NAME"
else
    log_error "Error al construir la imagen Docker. Ver logs: $LOG_FILE"
    exit 1
fi

# ============================================
# 8. DETENER CONTENEDOR ANTERIOR
# ============================================

log "🛑 Deteniendo contenedor anterior..."

if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    log "Parando contenedor $CONTAINER_NAME..."
    docker stop "$CONTAINER_NAME" 2>/dev/null || true
    docker rm "$CONTAINER_NAME" 2>/dev/null || true
    sleep 2
    log_success "Contenedor anterior eliminado"
else
    log "No hay contenedor previo"
fi

# ============================================
# 9. INICIAR NUEVO CONTENEDOR
# ============================================

log "🚀 Iniciando nuevo contenedor..."

# Opción A: Usar Docker Compose (RECOMENDADO)
if [ -f docker-compose-production.yml ]; then
    log "Usando docker-compose-production.yml..."
    if docker-compose -f docker-compose-production.yml up -d >> "$LOG_FILE" 2>&1; then
        log_success "Contenedor iniciado con docker-compose"
    else
        log_error "Error al iniciar docker-compose. Intentando docker run..."
        
        # Fallback: docker run manual
        docker run -d \
            --name "$CONTAINER_NAME" \
            --env-file .env \
            -p "$API_PORT:8000" \
            -v "$(pwd)/public:/app/public" \
            -v "$(pwd)/recognize/data:/app/recognize/data" \
            "$IMAGE_NAME" >> "$LOG_FILE" 2>&1 || {
            log_error "Error al iniciar contenedor"
            exit 1
        }
        log_success "Contenedor iniciado con docker run"
    fi

# Opción B: Docker Compose regular
elif [ -f docker-compose.yml ]; then
    log "Usando docker-compose.yml..."
    docker-compose up -d >> "$LOG_FILE" 2>&1 || {
        log_error "Error al iniciar docker-compose"
        exit 1
    }
    log_success "Contenedor iniciado con docker-compose"

# Opción C: Docker run manual
else
    log "Usando docker run manual..."
    docker run -d \
        --name "$CONTAINER_NAME" \
        --env-file .env \
        -p "$API_PORT:8000" \
        -v "$(pwd)/public:/app/public" \
        -v "$(pwd)/recognize/data:/app/recognize/data" \
        "$IMAGE_NAME" >> "$LOG_FILE" 2>&1 || {
        log_error "Error al iniciar contenedor"
        exit 1
    }
    log_success "Contenedor iniciado con docker run"
fi

# ============================================
# 10. VERIFICAR SALUD DEL CONTENEDOR
# ============================================

log "💚 Esperando a que la aplicación esté lista..."

max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if curl -s http://localhost:$API_PORT/docs > /dev/null 2>&1; then
        log_success "✓ API respondiendo en puerto $API_PORT"
        break
    fi
    
    attempt=$((attempt + 1))
    if [ $attempt -lt $max_attempts ]; then
        log "Intento $attempt/$max_attempts..."
        sleep 2
    fi
done

if [ $attempt -eq $max_attempts ]; then
    log_error "La API no respondió después de $(($max_attempts * 2))s"
    log "Ver logs: docker logs -f $CONTAINER_NAME"
    exit 1
fi

# ============================================
# 11. LIMPIAR IMÁGENES ANTIGUAS
# ============================================

log "🧹 Limpiando imágenes antiguas..."

docker image prune -f --filter "until=24h" >> "$LOG_FILE" 2>&1 || true
log_success "Limpieza completada"

# ============================================
# 12. RESUMEN FINAL
# ============================================

echo ""
echo "════════════════════════════════════════════════════════════════"
log_success "✓ DESPLIEGUE COMPLETADO EXITOSAMENTE"
echo "════════════════════════════════════════════════════════════════"
log "Contenedor: $CONTAINER_NAME"
log "Imagen: $IMAGE_NAME"
log "Puerto: $API_PORT"
log "URL: http://localhost:${API_PORT}/docs"
log "Logs: $LOG_FILE"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Mostrar algunos logs del contenedor
log "Últimos logs del contenedor:"
docker logs --tail 20 "$CONTAINER_NAME" 2>/dev/null | head -20

echo ""
log_success "¡Despliegue completado! Accede a: http://localhost:${API_PORT}/docs"
