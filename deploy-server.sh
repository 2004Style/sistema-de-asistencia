#!/bin/bash

# ============================================
# SCRIPT DE DESPLIEGUE - SERVIDOR (FastAPI)
# AUTO-INSTALL: OpenCV + Python + Venv + NGINX
# ============================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   DESPLIEGUE - SERVIDOR (FastAPI)${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Rutas reales basadas en estructura:
BASE_DIR="$(dirname "$0")"
SERVER_DIR="$BASE_DIR/server"
NGINX_DIR="$BASE_DIR/nginx"

cd "$BASE_DIR" || exit 1


# ============================================
# DETECCIÓN DE DISTRO + DEPENDENCIAS OPENCV
# ============================================
install_cv2_dependencies() {
    echo -e "${BLUE}→ Verificando dependencias del sistema para OpenCV...${NC}"

    if ldconfig -p | grep -q "libGL.so.1"; then
        echo -e "${GREEN}✓ Dependencias de OpenCV ya instaladas${NC}"
        return
    fi

    echo -e "${YELLOW}⚠️  Falta libGL.so.1 — instalando dependencias...${NC}"

    if [ -f /etc/os-release ]; then
        . /etc/os-release
        DISTRO=$ID
    else
        echo -e "${RED}❌ No se pudo detectar la distribución${NC}"
        exit 1
    fi

    echo -e "${BLUE}→ Distro detectada: $DISTRO${NC}"

    case "$DISTRO" in
        debian|ubuntu|linuxmint|pop|elementary)
            sudo apt update
            sudo apt install -y libgl1 libglib2.0-0 libsm6 libxext6 libxrender1 ffmpeg
            ;;
        arch|manjaro|endeavouros|garuda)
            sudo pacman -Syu --noconfirm
            sudo pacman -S --noconfirm mesa glib2 libsm libxext libxrender ffmpeg
            ;;
        fedora)
            sudo dnf install -y mesa-libGL glib2 libSM libXext libXrender ffmpeg
            ;;
        centos|rhel|rocky|almalinux)
            sudo yum install -y mesa-libGL glib2 libSM libXext libXrender ffmpeg || \
            sudo dnf install -y mesa-libGL glib2 libSM libXext libXrender ffmpeg
            ;;
        alpine)
            sudo apk update
            sudo apk add --no-cache mesa-gl glib libsm libxext libxrender ffmpeg
            ;;
        *)
            sudo apt update 2>/dev/null || true
            sudo apt install -y libgl1 libglib2.0-0 ffmpeg 2>/dev/null || true
            ;;
    esac

    echo -e "${GREEN}✓ Dependencias de OpenCV instaladas${NC}\n"
}

install_cv2_dependencies


# ============================================
# INSTALAR Y CONFIGURAR NGINX AUTOMÁTICAMENTE
# ============================================
setup_nginx() {
    echo -e "${BLUE}→ Configurando NGINX...${NC}"

    if [ -f /etc/os-release ]; then
        . /etc/os-release
        DISTRO=$ID
    fi

    echo -e "${BLUE}→ Distro detectada para nginx: $DISTRO${NC}"

    case "$DISTRO" in
        debian|ubuntu|linuxmint|pop|elementary)
            sudo apt update
            sudo apt install -y nginx
            ;;
        arch|manjaro|endeavouros|garuda)
            sudo pacman -Syu --noconfirm
            sudo pacman -S --noconfirm nginx
            ;;
        fedora)
            sudo dnf install -y nginx
            ;;
        centos|rhel|rocky|almalinux)
            sudo yum install -y epel-release
            sudo yum install -y nginx || sudo dnf install -y nginx
            ;;
        alpine)
            sudo apk add nginx
            ;;
        *)
            sudo apt install -y nginx 2>/dev/null || true
            ;;
    esac

    sudo systemctl enable nginx || true

    NGINX_CONF_SOURCE="$NGINX_DIR/nginx-server.conf"
    NGINX_CONF_TARGET="/etc/nginx/conf.d/sistema-asistencia.conf"

    if [ ! -f "$NGINX_CONF_SOURCE" ]; then
        echo -e "${RED}❌ No se encontró nginx-server.conf${NC}"
        exit 1
    fi

    echo -e "${BLUE}→ Copiando configuración de NGINX...${NC}"
    sudo cp "$NGINX_CONF_SOURCE" "$NGINX_CONF_TARGET"

    sudo mkdir -p /var/log/nginx

    echo -e "${BLUE}→ Probando configuración de NGINX...${NC}"
    if ! sudo nginx -t; then
        echo -e "${RED}❌ Error en la configuración de NGINX${NC}"
        exit 1
    fi

    echo -e "${BLUE}→ Reiniciando NGINX...${NC}"
    sudo systemctl restart nginx

    echo -e "${GREEN}✓ NGINX configurado correctamente${NC}\n"
}

setup_nginx


# ============================================
# Verificar archivo .env EN server/
# ============================================
if [ ! -f "$SERVER_DIR/.env" ]; then
    echo -e "${YELLOW}⚠️  No existe server/.env${NC}"

    if [ -f "$SERVER_DIR/.env.example" ]; then
        cp "$SERVER_DIR/.env.example" "$SERVER_DIR/.env"
        echo -e "${GREEN}✓ Archivo .env creado desde .env.example${NC}"
    else
        echo -e "${RED}❌ No existe server/.env.example${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Archivo .env detectado${NC}"
fi


# ============================================
# Crear entorno virtual EN server/
# ============================================
if [ ! -d "$SERVER_DIR/venv" ]; then
    echo -e "${BLUE}→ Creando entorno virtual (con sudo)...${NC}"
    sudo python3 -m venv "$SERVER_DIR/venv"
    echo -e "${GREEN}✓ Entorno virtual creado correctamente${NC}"
else
    echo -e "${GREEN}✓ venv existente${NC}"
fi



# ============================================
# Activar venv
# ============================================
echo -e "${BLUE}→ Activando entorno virtual...${NC}"
source "$SERVER_DIR/venv/bin/activate"
echo -e "${GREEN}✓ Entorno activado${NC}"


# ============================================
# Instalar dependencias Python (server/requirements.txt)
# ============================================
echo -e "${BLUE}→ Instalando dependencias Python...${NC}"
pip install --upgrade pip
pip install -r "$SERVER_DIR/requirements.txt"
echo -e "${GREEN}✓ Dependencias Python instaladas${NC}\n"


# ============================================
# Ejecutar proyecto (server/run.sh)
# ============================================
echo -e "${BLUE}→ Ejecutando run.sh ...${NC}\n"

RUNFILE="$SERVER_DIR/run.sh"

if [ ! -f "$RUNFILE" ]; then
    echo -e "${RED}❌ No existe server/run.sh${NC}"
    exit 1
fi

chmod +x "$RUNFILE"
cd "$SERVER_DIR"
./run.sh
