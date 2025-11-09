#!/bin/bash

# ============================================
# SCRIPT DE DESPLIEGUE - SERVIDOR (FastAPI)
# ============================================
# Uso: chmod +x deploy-server.sh && ./deploy-server.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  DESPLIEGUE - SERVIDOR (FastAPI)${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Detectar el ambiente
if [ -z "$ENVIRONMENT" ]; then
    echo -e "${YELLOW}¿Qué ambiente es?${NC}"
    echo "1) Desarrollo (localhost:8000)"
    echo "2) Producción (HTTPS con Nginx)"
    read -p "Elige opción (1 o 2): " ENV_CHOICE
    
    if [ "$ENV_CHOICE" = "1" ]; then
        ENVIRONMENT="development"
    elif [ "$ENV_CHOICE" = "2" ]; then
        ENVIRONMENT="production"
    else
        echo -e "${RED}❌ Opción inválida${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓${NC} Ambiente: ${YELLOW}$ENVIRONMENT${NC}\n"

# Verificar Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 no está instalado${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Python: $(python3 --version)"

# Ir a carpeta server
cd "$(dirname "$0")/server" || exit 1

# Crear venv si no existe
if [ ! -d "venv" ]; then
    echo -e "${BLUE}→${NC} Creando entorno virtual..."
    python3 -m venv venv
    echo -e "${GREEN}✓${NC} Entorno virtual creado\n"
fi

# Activar venv
echo -e "${BLUE}→${NC} Activando entorno virtual..."
source venv/bin/activate
echo -e "${GREEN}✓${NC} Entorno activado\n"

# Instalar dependencias
echo -e "${BLUE}→${NC} Instalando dependencias..."
pip install --upgrade pip
pip install -r requirements.txt
echo -e "${GREEN}✓${NC} Dependencias instaladas\n"

# Verificar .env
if [ ! -f ".env.local" ] && [ "$ENVIRONMENT" = "development" ]; then
    echo -e "${YELLOW}⚠️  No existe .env.local${NC}"
    if [ -f ".env.local.example" ]; then
        cp .env.local.example .env.local
        echo -e "${GREEN}✓${NC} Creado .env.local desde template"
        echo -e "${YELLOW}📝 Edita .env.local y configura:${NC}"
        echo "   - DATABASE_URL"
        echo "   - ALLOWED_ORIGINS"
        echo "   - SECRET_KEY\n"
        read -p "¿Editar .env.local ahora? (y/n): " EDIT_ENV
        if [ "$EDIT_ENV" = "y" ]; then
            nano .env.local
        fi
    fi
fi

# Verificar base de datos
echo -e "${BLUE}→${NC} Verificando base de datos..."
if ! python3 -c "import psycopg2" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  psycopg2 no está disponible${NC}"
    echo -e "${YELLOW}   Instala: pip install psycopg2-binary${NC}"
fi

# Ejecutar migraciones
echo -e "${BLUE}→${NC} Ejecutando migraciones..."
if [ -d "alembic" ]; then
    alembic upgrade head 2>/dev/null && echo -e "${GREEN}✓${NC} Migraciones completadas" || echo -e "${YELLOW}⚠️  Verifica la conexión a BD${NC}"
else
    echo -e "${YELLOW}⚠️  Carpeta 'alembic' no encontrada${NC}"
fi

echo ""

# Desarrollo
if [ "$ENVIRONMENT" = "development" ]; then
    echo -e "${BLUE}→${NC} Iniciando en modo DESARROLLO...\n"
    echo -e "${YELLOW}📍 Servidor disponible en: http://localhost:8000${NC}"
    echo -e "${YELLOW}📖 Documentación: http://localhost:8000/docs${NC}"
    echo -e "${YELLOW}📍 WebSocket: ws://localhost:8000/socket.io\n${NC}"
    
    if [ -f "run.sh" ]; then
        bash run.sh
    else
        uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
    fi

# Producción
else
    echo -e "${BLUE}→${NC} Iniciando en modo PRODUCCIÓN...\n"
    echo -e "${YELLOW}📍 Servidor escucha en: 0.0.0.0:8000${NC}"
    echo -e "${YELLOW}📍 Nginx redirige: 80/443 → 8000${NC}\n"
    
    # Verificar Gunicorn
    if ! pip show gunicorn > /dev/null; then
        echo -e "${BLUE}→${NC} Instalando Gunicorn..."
        pip install gunicorn
    fi
    
    # Iniciar con Gunicorn
    gunicorn src.main:app \
        --workers 4 \
        --worker-class uvicorn.workers.UvicornWorker \
        --bind 0.0.0.0:8000 \
        --timeout 120 \
        --access-logfile - \
        --error-logfile -
fi
