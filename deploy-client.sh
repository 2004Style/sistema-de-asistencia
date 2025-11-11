#!/bin/bash

# =====================================================================
#   SCRIPT DE DESPLIEGUE CLIENTE (Next.js) — COMPLETO + AUTO-INSTALADOR
# =====================================================================

set -euo pipefail

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}  DESPLIEGUE CLIENTE (Next.js)${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}\n"

BASE_DIR="$(cd "$(dirname "$0")" >/dev/null 2>&1 && pwd)"
CLIENT_DIR="$BASE_DIR/client"
NGINX_DIR="$BASE_DIR/nginx"
CLIENT_LOG="$BASE_DIR/client-start.log"

# =====================================================================
# Detectar distro
# =====================================================================
get_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        echo "$ID"
    else
        echo "unknown"
    fi
}

DISTRO=$(get_distro)

# =====================================================================
# VERIFICAR E INSTALAR: Node.js, npm y pnpm
# =====================================================================
install_node() {
    echo -e "${BLUE}→ Instalando Node.js 20 LTS...${NC}"
    case "$DISTRO" in
        debian|ubuntu|linuxmint|pop)
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
            sudo apt install -y nodejs
            ;;
        arch|manjaro|endeavouros)
            sudo pacman -Syu --noconfirm
            sudo pacman -S --noconfirm nodejs npm
            ;;
        fedora)
            sudo dnf install -y nodejs npm
            ;;
        centos|rhel|rocky|almalinux)
            curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
            sudo yum install -y nodejs || sudo dnf install -y nodejs
            ;;
        alpine)
            sudo apk add nodejs npm
            ;;
        *)
            echo -e "${RED}❌ Distro no soportada automáticamente para instalar Node${NC}"
            exit 1
            ;;
    esac
    echo -e "${GREEN}✓ Node.js instalado correctamente${NC}"
}

install_pnpm() {
    echo -e "${BLUE}→ Instalando pnpm global...${NC}"
    sudo npm install -g pnpm
    echo -e "${GREEN}✓ pnpm instalado${NC}"
}

check_and_install_node_stack() {
    echo -e "${BLUE}→ Verificando Node.js y paquetes necesarios...${NC}"
    if ! command -v node >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️ Node.js no está instalado${NC}"
        install_node
    else
        echo -e "${GREEN}✓ Node.js encontrado → $(node -v)${NC}"
    fi
    if ! command -v npm >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️ npm no está instalado${NC}"
        install_node
    else
        echo -e "${GREEN}✓ npm encontrado → $(npm -v)${NC}"
    fi
    if ! command -v pnpm >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️ pnpm no está instalado${NC}"
        install_pnpm
    else
        echo -e "${GREEN}✓ pnpm encontrado → $(pnpm -v)${NC}"
    fi
}

# =====================================================================
# LIBERAR PUERTO 3000
# =====================================================================
liberar_puerto_3000() {
    echo -e "${BLUE}→ Liberando puerto 3000...${NC}"
    sudo pkill -9 -f 'pnpm start' 2>/dev/null || true
    sudo pkill -9 -f 'npm start' 2>/dev/null || true
    sudo pkill -9 -f 'next start' 2>/dev/null || true
    sudo pkill -9 -f 'node.*3000' 2>/dev/null || true

    sleep 1

    if ss -tulpn | grep -q ":3000"; then
        sudo fuser -k 3000/tcp || true
        sleep 1
    fi

    echo -e "${GREEN}✓ Puerto 3000 liberado${NC}"
}

# =====================================================================
# CONFIGURACIÓN NGINX + TLS
# =====================================================================
ensure_tls_certificates_client() {
    echo -e "${BLUE}→ Verificando certificados TLS CLIENTE...${NC}"

    DOMAIN="${DOMAIN:-$(hostname -f || hostname)}"
    EMAIL="${EMAIL:-admin@$DOMAIN}"
    LOCAL_CERT="/etc/ssl/localcerts/client-sistema.crt"
    LOCAL_KEY="/etc/ssl/localcerts/client-sistema.key"
    sudo mkdir -p /etc/ssl/localcerts

    if [ -f "$LOCAL_CERT" ] && [ -f "$LOCAL_KEY" ]; then
        echo -e "${GREEN}✓ Certificados TLS ya existen${NC}"
        return
    fi

    echo -e "${BLUE}→ Generando certificado auto-firmado${NC}"
    sudo openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
        -keyout "$LOCAL_KEY" -out "$LOCAL_CERT" -subj "/CN=${DOMAIN}" >/dev/null 2>&1
    sudo chmod 644 "$LOCAL_CERT"
    sudo chmod 600 "$LOCAL_KEY"
    echo -e "${GREEN}✓ Certificado auto-firmado generado${NC}"
}

setup_nginx_client() {
    echo -e "${BLUE}→ Configurando NGINX CLIENTE...${NC}"
    case "$DISTRO" in
        debian|ubuntu|linuxmint|pop)
            sudo apt update && sudo apt install -y nginx ;;
        arch|manjaro|endeavouros)
            sudo pacman -Syu --noconfirm && sudo pacman -S --noconfirm nginx ;;
        fedora)
            sudo dnf install -y nginx ;;
        centos|rhel|rocky|almalinux)
            sudo yum install -y nginx || sudo dnf install -y nginx ;;
        alpine)
            sudo apk add nginx ;;
        *)
            sudo apt install -y nginx || true ;;
    esac

    sudo systemctl enable nginx || true
    sudo cp "$NGINX_DIR/nginx-client.conf" /etc/nginx/conf.d/sistema-client.conf
    ensure_tls_certificates_client
    sudo nginx -t
    sudo systemctl restart nginx
}

# =====================================================================
# BUILD Y START NEXT.JS
# =====================================================================
build_and_start_client() {
    cd "$CLIENT_DIR" || { echo -e "${RED}❌ No existe $CLIENT_DIR${NC}"; exit 1; }
    liberar_puerto_3000
    echo -e "${BLUE}→ Instalando dependencias del cliente...${NC}"
    if command -v pnpm >/dev/null 2>&1; then
        pnpm install --frozen-lockfile || pnpm install
        pnpm build
        rm -f "$CLIENT_LOG"
        nohup pnpm start --hostname 0.0.0.0 --port 3000 > "$CLIENT_LOG" 2>&1 &
        CLIENT_PID=$!
    else
        npm ci || npm install
        npm run build
        rm -f "$CLIENT_LOG"
        nohup npm start --hostname 0.0.0.0 --port 3000 > "$CLIENT_LOG" 2>&1 &
        CLIENT_PID=$!
    fi

    echo -e "${BLUE}→ Cliente iniciado (PID: $CLIENT_PID)${NC}"
    echo -e "${BLUE}→ Esperando a que escuche en puerto 3000...${NC}"

    MAX_RETRIES=40
    RETRY=0
    while [ $RETRY -lt $MAX_RETRIES ]; do
        sleep 1
        if ss -tulpn | grep -q ":3000"; then
            echo -e "${GREEN}✓ Cliente escuchando en puerto 3000${NC}\n"
            echo -e "${BLUE}════════════════════════════════════════${NC}"
            echo -e "${GREEN}✅ CLIENTE INICIADO EXITOSAMENTE${NC}"
            echo -e "${BLUE}════════════════════════════════════════${NC}\n"
            echo -e "${BLUE}📊 INFO:${NC}"
            echo -e "  PID:              $CLIENT_PID"
            echo -e "  Puerto:           3000"
            echo -e "  Log:              $CLIENT_LOG"
            echo -e "${BLUE}🔗 Acceder:${NC}"
            echo -e "  ${GREEN}http://localhost:3000${NC}\n"
            return 0
        fi

        if ! ps -p $CLIENT_PID > /dev/null 2>&1; then
            echo -e "${RED}❌ Proceso cliente murió (PID $CLIENT_PID)${NC}"
            echo -e "${RED}→ Últimas líneas del log:${NC}\n"
            tail -n 30 "$CLIENT_LOG"
            exit 1
        fi
        RETRY=$((RETRY + 1))
    done

    echo -e "${RED}❌ Timeout esperando puerto 3000${NC}"
    tail -n 50 "$CLIENT_LOG"
    exit 1
}

# =====================================================================
# EJECUCIÓN
# =====================================================================
check_and_install_node_stack
setup_nginx_client
build_and_start_client
