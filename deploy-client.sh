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

    # Node
    if ! command -v node >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️ Node.js no está instalado${NC}"
        install_node
    else
        echo -e "${GREEN}✓ Node.js encontrado → $(node -v)${NC}"
    fi

    # npm
    if ! command -v npm >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️ npm no está instalado, reinstalando Node.js${NC}"
        install_node
    else
        echo -e "${GREEN}✓ npm encontrado → $(npm -v)${NC}"
    fi

    # pnpm
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

    pkill -9 -f 'pnpm start' 2>/dev/null || true
    pkill -9 -f 'npm start' 2>/dev/null || true
    pkill -9 -f 'next start' 2>/dev/null || true
    pkill -9 -f 'node.*3000' 2>/dev/null || true

    MAX_WAIT=12
    WAITED=0

    while [ $WAITED -lt $MAX_WAIT ]; do
        if ! lsof -i :3000 >/dev/null 2>&1; then
            echo -e "${GREEN}✓ Puerto 3000 liberado${NC}"
            return 0
        fi

        echo -ne "${YELLOW}  Esperando... ($WAITED/$MAX_WAIT)\r${NC}"
        sudo fuser -k 3000/tcp 2>/dev/null || true
        sleep 1
        WAITED=$((WAITED+1))
    done

    echo -e "${RED}❌ No se pudo liberar puerto 3000${NC}"
    exit 1
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
        nohup pnpm start > "$CLIENT_LOG" 2>&1 &
        CLIENT_PID=$!
    else
        npm ci || npm install
        npm run build
        rm -f "$CLIENT_LOG"
        nohup npm start > "$CLIENT_LOG" 2>&1 &
        CLIENT_PID=$!
    fi

    echo -e "${BLUE}→ Cliente iniciado (PID: $CLIENT_PID)${NC}"
    echo -e "${BLUE}→ Esperando a que escuche en puerto 3000...${NC}"

    # Esperar a que el puerto esté listo
    MAX_RETRIES=40
    RETRY=0

    while [ $RETRY -lt $MAX_RETRIES ]; do
        sleep 1

        # Verificar si puerto está escuchando
        if lsof -i :3000 >/dev/null 2>&1; then
            echo -e "${GREEN}✓ Cliente escuchando en puerto 3000${NC}\n"
            
            # Mostrar resumen
            echo -e "${BLUE}════════════════════════════════════════${NC}"
            echo -e "${GREEN}✅ CLIENTE INICIADO EXITOSAMENTE${NC}"
            echo -e "${BLUE}════════════════════════════════════════${NC}\n"
            echo -e "${BLUE}📊 INFO:${NC}"
            echo -e "  PID:              $CLIENT_PID"
            echo -e "  Puerto:           3000"
            echo -e "  Log:              $CLIENT_LOG"
            echo -e "  Build:            Completado\n"
            
            echo -e "${BLUE}🔗 Acceder:${NC}"
            echo -e "  ${GREEN}http://localhost:3000${NC}\n"
            
            echo -e "${BLUE}📋 MONITOREO Y CONTROL:${NC}"
            echo -e "  Ver logs en tiempo real:"
            echo -e "    ${GREEN}tail -f $CLIENT_LOG${NC}"
            echo -e "  Ver últimas líneas:"
            echo -e "    ${GREEN}tail -n 50 $CLIENT_LOG${NC}"
            echo -e "  Buscar errores:"
            echo -e "    ${GREEN}grep -i error $CLIENT_LOG${NC}"
            echo -e "  Detener cliente:"
            echo -e "    ${GREEN}pkill -f 'pnpm start'${NC}"
            echo -e "  Reiniciar cliente:"
            echo -e "    ${GREEN}./deploy-client.sh${NC}\n"
            
            return 0
        fi

        # Verificar si proceso murió
        if ! ps -p $CLIENT_PID > /dev/null 2>&1; then
            echo -e "${RED}❌ Proceso cliente murió (PID $CLIENT_PID)${NC}"
            echo -e "${RED}→ Últimas líneas del log:${NC}\n"
            tail -n 30 "$CLIENT_LOG" || echo "No se pudo leer log"
            exit 1
        fi

        RETRY=$((RETRY + 1))
        if [ $((RETRY % 10)) -eq 0 ]; then
            echo -ne "${YELLOW}  Esperando... ($RETRY/$MAX_RETRIES)\r${NC}"
        fi
    done

    echo -e "${RED}❌ Timeout esperando puerto 3000${NC}"
    echo -e "${RED}→ Verificando logs...${NC}\n"
    tail -n 50 "$CLIENT_LOG" || true
    exit 1
}


# =====================================================================
# EJECUCIÓN
# =====================================================================
check_and_install_node_stack
setup_nginx_client
build_and_start_client
