#!/bin/bash

# =====================================================================
#   SCRIPT DE DESPLIEGUE CLIENTE (Next.js) — LIMPIO Y PROFESIONAL
# =====================================================================

set -euo pipefail

# --------------------------------------------------
# Colores y helpers
# --------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

title() {
    echo -e "\n${BLUE}════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}════════════════════════════════════════${NC}\n"
}

step() { echo -e "→ ${YELLOW}$1${NC}"; }
ok() { echo -e "  ${GREEN}✓ $1${NC}"; }
error() { echo -e "  ${RED}❌ $1${NC}"; }

title "DESPLIEGUE CLIENTE (Next.js)"

# --------------------------------------------------
# Rutas
# --------------------------------------------------
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
    step "Instalando Node.js 20 LTS..."

    case "$DISTRO" in
        debian|ubuntu|linuxmint|pop)
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - >/dev/null 2>&1
            sudo apt install -y nodejs >/dev/null 2>&1
            ;;
        arch|manjaro|endeavouros)
            sudo pacman -Syu --noconfirm >/dev/null 2>&1
            sudo pacman -S --noconfirm nodejs npm >/dev/null 2>&1
            ;;
        fedora)
            sudo dnf install -y nodejs npm >/dev/null 2>&1
            ;;
        centos|rhel|rocky|almalinux)
            curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash - >/dev/null 2>&1
            sudo yum install -y nodejs >/dev/null 2>&1 || sudo dnf install -y nodejs >/dev/null 2>&1
            ;;
        alpine)
            sudo apk add nodejs npm >/dev/null 2>&1
            ;;
        *)
            error "Distro no soportada automáticamente."
            exit 1
            ;;
    esac
    ok "Node.js instalado"
}

install_pnpm() {
    step "Instalando pnpm global..."
    sudo npm install -g pnpm >/dev/null 2>&1
    ok "pnpm instalado"
}

check_and_install_node_stack() {
    title "VERIFICAR NODE.JS / PNPM"

    if ! command -v node >/dev/null 2>&1; then
        step "Node.js no encontrado"
        install_node
    else
        ok "Node.js encontrado → $(node -v)"
    fi

    if ! command -v npm >/dev/null 2>&1; then
        step "npm no encontrado"
        install_node
    else
        ok "npm encontrado → $(npm -v)"
    fi

    if ! command -v pnpm >/dev/null 2>&1; then
        step "pnpm no encontrado"
        install_pnpm
    else
        ok "pnpm encontrado → $(pnpm -v)"
    fi
}


# =====================================================================
# LIBERAR PUERTO 3000 (Sin output feo)
# =====================================================================
liberar_puerto_3000() {
    title "LIBERANDO PUERTO 3000"

    sudo pkill -9 -f 'pnpm start' >/dev/null 2>&1 || true
    sudo pkill -9 -f 'npm start' >/dev/null 2>&1 || true
    sudo pkill -9 -f 'next start' >/dev/null 2>&1 || true
    sudo pkill -9 -f 'node.*3000' >/dev/null 2>&1 || true

    sleep 1

    if ss -tulpn | grep -q ":3000"; then
        sudo fuser -k 3000/tcp >/dev/null 2>&1 || true
        sleep 1
    fi

    ok "Puerto 3000 completamente libre"
}


# =====================================================================
# TLS + NGINX
# =====================================================================
ensure_tls_certificates_client() {
    title "CERTIFICADOS TLS CLIENTE"

    DOMAIN="${DOMAIN:-$(hostname -f || hostname)}"
    EMAIL="${EMAIL:-admin@$DOMAIN}"
    LOCAL_CERT="/etc/ssl/localcerts/client-sistema.crt"
    LOCAL_KEY="/etc/ssl/localcerts/client-sistema.key"

    sudo mkdir -p /etc/ssl/localcerts

    if [[ -f "$LOCAL_CERT" && -f "$LOCAL_KEY" ]]; then
        ok "Certificados ya existen"
        return
    fi

    step "Generando certificado auto-firmado..."
    sudo openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
        -keyout "$LOCAL_KEY" -out "$LOCAL_CERT" \
        -subj "/CN=${DOMAIN}" >/dev/null 2>&1

    sudo chmod 644 "$LOCAL_CERT"
    sudo chmod 600 "$LOCAL_KEY"

    ok "Certificado generado"
}

setup_nginx_client() {
    title "CONFIGURANDO NGINX"

    case "$DISTRO" in
        debian|ubuntu|linuxmint|pop)
            sudo apt update >/dev/null 2>&1
            sudo apt install -y nginx >/dev/null 2>&1
            ;;
        arch|manjaro|endeavouros)
            sudo pacman -Syu --noconfirm >/dev/null 2>&1
            sudo pacman -S --noconfirm nginx >/dev/null 2>&1
            ;;
        fedora)
            sudo dnf install -y nginx >/dev/null 2>&1
            ;;
        centos|rhel|rocky|almalinux)
            sudo yum install -y nginx >/dev/null 2>&1 || sudo dnf install -y nginx >/dev/null 2>&1
            ;;
        alpine)
            sudo apk add nginx >/dev/null 2>&1
            ;;
    esac

    sudo systemctl enable nginx >/dev/null 2>&1

    sudo cp "$NGINX_DIR/nginx-client.conf" /etc/nginx/conf.d/sistema-client.conf

    ensure_tls_certificates_client

    sudo nginx -t >/dev/null 2>&1
    sudo systemctl restart nginx

    ok "NGINX configurado correctamente"
}


# =====================================================================
# BUILD Y START CLIENTE
# =====================================================================
build_and_start_client() {
    title "BUILD & START CLIENTE"

    cd "$CLIENT_DIR" || { error "No existe directorio cliente"; exit 1; }

    liberar_puerto_3000

    step "Instalando dependencias..."
    if command -v pnpm >/dev/null 2>&1; then
        pnpm install --silent
        step "Compilando cliente…"
        pnpm build 2>&1 | sed 's/^/   /'
        rm -f "$CLIENT_LOG"
        nohup pnpm start --hostname 0.0.0.0 --port 3000 > "$CLIENT_LOG" 2>&1 &
        CLIENT_PID=$!
    else
        npm ci --silent || npm install --silent
        step "Compilando cliente…"
        npm run build 2>&1 | sed 's/^/   /'
        rm -f "$CLIENT_LOG"
        nohup npm start --hostname 0.0.0.0 --port 3000 > "$CLIENT_LOG" 2>&1 &
        CLIENT_PID=$!
    fi

    step "Esperando a que escuche en :3000…"

    for _ in {1..40}; do
        sleep 1
        if ss -tulpn | grep -q ":3000"; then
            ok "Cliente escuchando en puerto 3000"
            break
        fi
    done

    if ! ss -tulpn | grep -q ":3000"; then
        error "Timeout esperando al cliente"
        tail -n 50 "$CLIENT_LOG"
        exit 1
    fi

    title "✅ CLIENTE INICIADO EXITOSAMENTE"

    echo -e "${BLUE}📊 INFO${NC}"
    printf "  %-18s %s\n" "PID:" "$CLIENT_PID"
    printf "  %-18s %s\n" "Puerto:" "3000"
    printf "  %-18s %s\n" "Log:" "$CLIENT_LOG"

    echo -e "\n${BLUE}🔗 Acceso${NC}"
    echo -e "  ${GREEN}http://localhost:3000${NC}\n"
}


# =====================================================================
# EJECUCIÓN
# =====================================================================
check_and_install_node_stack
setup_nginx_client
build_and_start_client
