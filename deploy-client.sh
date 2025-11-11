#!/bin/bash
set -euo pipefail

# ============================
#    DESPLIEGUE CLIENTE
# ============================

# ------- Estilo -------
NC='\033[0m'
BOLD='\033[1m'
BLUE='\033[34m'
GREEN='\033[32m'
YELLOW='\033[33m'
RED='\033[31m'

line() { echo -e "${BLUE}${BOLD}────────────────────────────────────────────${NC}"; }
title() {
    line
    echo -e "${BLUE}${BOLD}  $1${NC}"
    line
}
info()  { echo -e "  ${BLUE}•${NC} $1"; }
ok()    { echo -e "  ${GREEN}✓${NC} $1"; }
warn()  { echo -e "  ${YELLOW}⚠${NC} $1"; }
fail()  { echo -e "  ${RED}✗${NC} $1"; }

# Paths
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
CLIENT_DIR="$BASE_DIR/client"
NGINX_DIR="$BASE_DIR/nginx"
CLIENT_LOG="$BASE_DIR/client-start.log"


# ============================
# Detectar distro
# ============================
get_distro() {
    [ -f /etc/os-release ] && . /etc/os-release && echo "$ID" || echo "unknown"
}
DISTRO=$(get_distro)


# ============================
# Instalación Node, npm, pnpm
# ============================
install_node() {
    info "Instalando Node.js 20 LTS…"

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
            fail "Distro no soportada automáticamente"
            exit 1
            ;;
    esac

    ok "Node.js instalado"
}

install_pnpm() {
    info "Instalando pnpm…"
    sudo npm install -g pnpm >/dev/null 2>&1
    ok "pnpm instalado"
}

check_node_stack() {
    title "Comprobando entorno Node"

    command -v node >/dev/null 2>&1 \
        && ok "Node.js $(node -v)" \
        || { warn "Node.js no está instalado"; install_node; }

    command -v npm >/dev/null 2>&1 \
        && ok "npm $(npm -v)" \
        || warn "npm no encontrado (se instala con Node)"

    command -v pnpm >/dev/null 2>&1 \
        && ok "pnpm $(pnpm -v)" \
        || install_pnpm

    echo
}


# ============================
# Puerto 3000
# ============================
liberar_puerto_3000() {
    title "Liberando puerto 3000"

    sudo pkill -9 -f "pnpm start" >/dev/null 2>&1 || true
    sudo pkill -9 -f "npm start"  >/dev/null 2>&1 || true
    sudo pkill -9 -f "next start" >/dev/null 2>&1 || true
    sudo pkill -9 -f "node.*3000" >/dev/null 2>&1 || true

    sleep 1

    ss -tulpn | grep -q ":3000" && sudo fuser -k 3000/tcp >/dev/null 2>&1 || true

    ok "Puerto 3000 libre"
    echo
}


# ============================
# Configurar NGINX + TLS
# ============================
ensure_tls() {
    title "Certificados TLS"

    DOMAIN="${DOMAIN:-$(hostname -f)}"
    CERT="/etc/ssl/localcerts/client.crt"
    KEY="/etc/ssl/localcerts/client.key"

    sudo mkdir -p /etc/ssl/localcerts

    if [[ -f "$CERT" && -f "$KEY" ]]; then
        ok "Certificados existentes"
        return
    fi

    info "Generando certificado auto-firmado…"
    sudo openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
        -keyout "$KEY" -out "$CERT" \
        -subj "/CN=$DOMAIN" >/dev/null 2>&1

    ok "Certificado generado"
    echo
}

setup_nginx() {
    title "Configurando NGINX"

    case "$DISTRO" in
        debian|ubuntu|linuxmint|pop) sudo apt install -y nginx >/dev/null 2>&1 ;;
        arch|manjaro|endeavouros)    sudo pacman -S --noconfirm nginx >/dev/null 2>&1 ;;
        fedora)                      sudo dnf install -y nginx >/dev/null 2>&1 ;;
        centos|rhel|rocky|almalinux) sudo yum install -y nginx >/dev/null 2>&1 || sudo dnf install -y nginx >/dev/null 2>&1 ;;
        alpine)                      sudo apk add nginx >/dev/null 2>&1 ;;
        *)                           sudo apt install -y nginx >/dev/null 2>&1 ;;
    esac

    sudo systemctl enable nginx >/dev/null 2>&1
    sudo cp "$NGINX_DIR/nginx-client.conf" /etc/nginx/conf.d/client.conf

    ensure_tls

    sudo nginx -t >/dev/null 2>&1
    sudo systemctl restart nginx

    ok "NGINX configurado"
    echo
}


# ============================
# Build + Start Next.js
# ============================
start_client() {
    title "Iniciando cliente"

    cd "$CLIENT_DIR" || { fail "No existe carpeta client"; exit 1; }

    info "Instalando dependencias…"
    pnpm install >/dev/null 2>&1 || npm install >/dev/null 2>&1
    ok "Dependencias instaladas"

    info "Construyendo…"
    pnpm build >/dev/null 2>&1 || npm run build >/dev/null 2>&1
    ok "Build completado"

    rm -f "$CLIENT_LOG"

    info "Levantando servidor…"
    nohup pnpm start --hostname 0.0.0.0 --port 3000 \
        > "$CLIENT_LOG" 2>&1 &

    PID=$!

    sleep 2

    ss -tulpn | grep -q ":3000" || {
        fail "El cliente no inició"
        tail -n 20 "$CLIENT_LOG"
        exit 1
    }

    ok "Cliente escuchando en puerto 3000"
    echo

    title "✅ CLIENTE INICIADO"
    info "PID: $PID"
    info "Log: $CLIENT_LOG"
    info "URL: http://localhost:3000"
    echo
}


# ============================
# RUN
# ============================
clear
title "DESPLIEGUE CLIENTE"
check_node_stack
liberar_puerto_3000
setup_nginx
start_client
