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
 
# Asegura que existan certificados TLS: usa Let's Encrypt si ya existen
# o certbot está instalado y hay dominio; en caso contrario genera un
# certificado auto-firmado y lo coloca en /etc/ssl/localcerts/
ensure_tls_certificates() {
    echo -e "${BLUE}→ Verificando certificados TLS...${NC}"

    DOMAIN=""
    EMAIL=""
    if [ -f "$SERVER_DIR/.env" ]; then
        DOMAIN=$(grep -E '^(DOMAIN|HOST|SERVER_NAME|DOMAIN_NAME)=' "$SERVER_DIR/.env" | head -n1 | cut -d'=' -f2- | tr -d '"' | tr -d "'" )
        EMAIL=$(grep -E '^EMAIL=' "$SERVER_DIR/.env" | head -n1 | cut -d'=' -f2- | tr -d '"' | tr -d "'" )
    fi

    # Fallback al hostname si no hay valor en .env
    if [ -z "$DOMAIN" ]; then
        DOMAIN=$(hostname -f 2>/dev/null || hostname)
    fi
    if [ -z "$DOMAIN" ]; then
        DOMAIN="localhost"
    fi

    echo -e "${BLUE}→ Dominio detectado para TLS: ${DOMAIN}${NC}"

    LE_PATH="/etc/letsencrypt/live/$DOMAIN"
    LOCAL_CERT="/etc/ssl/localcerts/sistema-asistencia.crt"
    LOCAL_KEY="/etc/ssl/localcerts/sistema-asistencia.key"

    # Si ya existen certs locales no hacemos nada
    if [ -f "$LOCAL_CERT" ] && [ -f "$LOCAL_KEY" ]; then
        echo -e "${GREEN}✓ Certificados locales ya presentes${NC}"
        return
    fi

    # Si existen certificados de Let's Encrypt para el dominio, enlazarlos
    if [ -d "$LE_PATH" ] && [ -f "$LE_PATH/fullchain.pem" ] && [ -f "$LE_PATH/privkey.pem" ]; then
        echo -e "${BLUE}→ Encontrado Let's Encrypt para $DOMAIN — creando enlaces${NC}"
        sudo ln -sf "$LE_PATH/fullchain.pem" "$LOCAL_CERT"
        sudo ln -sf "$LE_PATH/privkey.pem" "$LOCAL_KEY"
        sudo chmod 644 "$LOCAL_CERT" || true
        sudo chmod 600 "$LOCAL_KEY" || true
        echo -e "${GREEN}✓ Enlaces creados${NC}"
        return
    fi

    # Intentar usar certbot si está instalado y el dominio parece válido (no localhost)
    if command -v certbot >/dev/null 2>&1 && [ "$DOMAIN" != "localhost" ] && echo "$DOMAIN" | grep -q '\.'; then
        echo -e "${BLUE}→ Intentando solicitar certificado con certbot para $DOMAIN${NC}"
        CERT_EMAIL="${EMAIL:-admin@${DOMAIN}}"
        # Preferimos el plugin --nginx (no detiene nginx). Si falla, seguiremos con auto-firmado.
        if sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$CERT_EMAIL"; then
            if [ -f "$LE_PATH/fullchain.pem" ]; then
                sudo ln -sf "$LE_PATH/fullchain.pem" "$LOCAL_CERT"
                sudo ln -sf "$LE_PATH/privkey.pem" "$LOCAL_KEY"
                sudo chmod 644 "$LOCAL_CERT" || true
                sudo chmod 600 "$LOCAL_KEY" || true
                echo -e "${GREEN}✓ Certificado Let's Encrypt instalado y enlazado${NC}"
                return
            fi
        else
            echo -e "${YELLOW}⚠️  certbot falló o no pudo obtener el cert — se generará auto-firmado${NC}"
        fi
    else
        echo -e "${YELLOW}ℹ️  Certbot no disponible o dominio no apto para Let's Encrypt — generando certificado auto-firmado${NC}"
    fi

    # Generar certificado auto-firmado
    echo -e "${BLUE}→ Generando certificado auto-firmado en $LOCAL_CERT${NC}"
    sudo openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
        -keyout "$LOCAL_KEY" -out "$LOCAL_CERT" -subj "/CN=${DOMAIN}" >/dev/null 2>&1 || true
    sudo chmod 644 "$LOCAL_CERT" || true
    sudo chmod 600 "$LOCAL_KEY" || true
    echo -e "${GREEN}✓ Certificado auto-firmado creado${NC}"
}

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

    # Buscar y mover/eliminar cualquier archivo relacionado con el 'default' en sites-enabled
    sudo mkdir -p /etc/nginx/sites-available
    for f in /etc/nginx/sites-enabled/default*; do
        if [ -e "$f" ]; then
            NAME=$(basename "$f")
            BACKUP_TARGET="/etc/nginx/sites-available/${NAME}.disabled.$(date +%s)"
            echo -e "${YELLOW}→ Detectado $f — moviendo a $BACKUP_TARGET para deshabilitarlo...${NC}"
            if sudo mv "$f" "$BACKUP_TARGET" 2>/dev/null; then
                echo -e "${GREEN}✓ Movido $f → $BACKUP_TARGET${NC}"
            else
                sudo rm -f "$f" || true
                echo -e "${GREEN}✓ Eliminado $f${NC}"
            fi
        fi
    done

    if [ ! -f "$NGINX_CONF_SOURCE" ]; then
        echo -e "${RED}❌ No se encontró nginx-server.conf${NC}"
        exit 1
    fi

    echo -e "${BLUE}→ Copiando configuración de NGINX...${NC}"
    sudo cp "$NGINX_CONF_SOURCE" "$NGINX_CONF_TARGET"

        # Asegurar que exista carpeta para certificados locales
        sudo mkdir -p /etc/ssl/localcerts
        sudo chmod 755 /etc/ssl/localcerts

        # Intentar proveer certificados: Let's Encrypt (si existe para el dominio) o generar auto-firmado
        ensure_tls_certificates

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
