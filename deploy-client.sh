#!/bin/bash

# ============================================
# SCRIPT DE DESPLIEGUE - CLIENTE (Next.js)
# ============================================
# Uso: chmod +x deploy-client.sh && ./deploy-client.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  DESPLIEGUE - CLIENTE (Next.js)${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Detectar el ambiente
if [ -z "$ENVIRONMENT" ]; then
    echo -e "${YELLOW}¿Qué ambiente es?${NC}"
    echo "1) Desarrollo (localhost:3000)"
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

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Node.js: $(node --version)"
echo -e "${GREEN}✓${NC} npm: $(npm --version)\n"

# Ir a carpeta client
cd "$(dirname "$0")/client" || exit 1

# Instalar dependencias
echo -e "${BLUE}→${NC} Instalando dependencias..."
if command -v pnpm &> /dev/null; then
    pnpm install
else
    npm install
fi
echo -e "${GREEN}✓${NC} Dependencias instaladas\n"

# Verificar .env
if [ ! -f ".env.local" ] && [ "$ENVIRONMENT" = "development" ]; then
    echo -e "${YELLOW}⚠️  No existe .env.local${NC}"
    if [ -f ".env.local.example" ]; then
        cp .env.local.example .env.local
        echo -e "${GREEN}✓${NC} Creado .env.local desde template"
        echo -e "${YELLOW}📝 Edita .env.local y configura:${NC}"
        echo "   - NEXT_PUBLIC_API_URL"
        echo "   - NEXT_PUBLIC_SOCKET_URL\n"
        read -p "¿Editar .env.local ahora? (y/n): " EDIT_ENV
        if [ "$EDIT_ENV" = "y" ]; then
            nano .env.local
        fi
    fi
fi

# Desarrollo
if [ "$ENVIRONMENT" = "development" ]; then
    echo -e "${BLUE}→${NC} Iniciando en modo DESARROLLO...\n"
    echo -e "${YELLOW}📍 Servidor disponible en: http://localhost:3000${NC}"
    echo -e "${YELLOW}📡 Backend esperado en: http://\$API_URL${NC}\n"
    
    if command -v pnpm &> /dev/null; then
        pnpm dev
    else
        npm run dev
    fi

# Producción
else
    echo -e "${BLUE}→${NC} Generando build de PRODUCCIÓN...\n"
    
    if command -v pnpm &> /dev/null; then
        pnpm build
        echo -e "${GREEN}✓${NC} Build generado\n"
        
        echo -e "${BLUE}→${NC} Iniciando servidor...\n"
        pnpm start
    else
        npm run build
        echo -e "${GREEN}✓${NC} Build generado\n"
        
        echo -e "${BLUE}→${NC} Iniciando servidor...\n"
        npm start
    fi
fi
