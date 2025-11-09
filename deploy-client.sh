#!/bin/bash

# ============================================
# SCRIPT DE DESPLIEGUE - CLIENTE (Next.js)
# AUTO-INSTALL: Node.js (opcional), NGINX, Certs, Build
# ============================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  DESPLIEGUE - CLIENTE (Next.js)${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Resolve BASE_DIR to an absolute path (so script works when called from any CWD)
BASE_DIR="$(cd "$(dirname "$0")" >/dev/null 2>&1 && pwd || printf '%s' "$(dirname "$0")")"
CLIENT_DIR="$BASE_DIR/client"
NGINX_DIR="$BASE_DIR/nginx"

# Detect distro helper
get_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        echo "$ID"
    else
        echo "unknown"
    fi
}

# Ensure TLS certs for client
ensure_tls_certificates_client() {
    echo -e "${BLUE}→ Verificando certificados TLS para CLIENTE...${NC}"

    DOMAIN=""
    EMAIL=""
    if [ -f "$CLIENT_DIR/.env.local" ]; then
        DOMAIN=$(grep -E '^(NEXT_PUBLIC_DOMAIN|DOMAIN|HOST|SERVER_NAME)=' "$CLIENT_DIR/.env.local" | head -n1 | cut -d'=' -f2- | tr -d '"' | tr -d "'" || true)
        EMAIL=$(grep -E '^EMAIL=' "$CLIENT_DIR/.env.local" | head -n1 | cut -d'=' -f2- | tr -d '"' | tr -d "'" || true)
    fi

    if [ -z "$DOMAIN" ]; then
        DOMAIN=$(hostname -f 2>/dev/null || hostname)
    fi
    if [ -z "$DOMAIN" ]; then
        DOMAIN="localhost"
    fi

    echo -e "${BLUE}→ Dominio detectado para CLIENT TLS: ${DOMAIN}${NC}"

    LE_PATH="/etc/letsencrypt/live/$DOMAIN"
    LOCAL_CERT="/etc/ssl/localcerts/client-sistema.crt"
    LOCAL_KEY="/etc/ssl/localcerts/client-sistema.key"

    if [ -f "$LOCAL_CERT" ] && [ -f "$LOCAL_KEY" ]; then
        echo -e "${GREEN}✓ Certificados locales del cliente ya presentes${NC}"
        return
    fi

    if [ -d "$LE_PATH" ] && [ -f "$LE_PATH/fullchain.pem" ] && [ -f "$LE_PATH/privkey.pem" ]; then
        echo -e "${BLUE}→ Encontrado Let's Encrypt para $DOMAIN — creando enlaces (cliente)${NC}"
        sudo ln -sf "$LE_PATH/fullchain.pem" "$LOCAL_CERT"
        sudo ln -sf "$LE_PATH/privkey.pem" "$LOCAL_KEY"
        sudo chmod 644 "$LOCAL_CERT" || true
        sudo chmod 600 "$LOCAL_KEY" || true
        echo -e "${GREEN}✓ Enlaces creados (cliente)${NC}"
        return
    fi

    if command -v certbot >/dev/null 2>&1 && [ "$DOMAIN" != "localhost" ] && echo "$DOMAIN" | grep -q '\.'; then
        echo -e "${BLUE}→ Intentando solicitar certificado con certbot para $DOMAIN (cliente)${NC}"
        CERT_EMAIL="${EMAIL:-admin@${DOMAIN}}"
        if sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$CERT_EMAIL"; then
            if [ -f "$LE_PATH/fullchain.pem" ]; then
                sudo ln -sf "$LE_PATH/fullchain.pem" "$LOCAL_CERT"
                sudo ln -sf "$LE_PATH/privkey.pem" "$LOCAL_KEY"
                sudo chmod 644 "$LOCAL_CERT" || true
                sudo chmod 600 "$LOCAL_KEY" || true
                echo -e "${GREEN}✓ Certificado Let's Encrypt instalado y enlazado (cliente)${NC}"
                return
            fi
        else
            echo -e "${YELLOW}⚠️  certbot falló o no pudo obtener el cert — se generará auto-firmado (cliente)${NC}"
        fi
    else
        echo -e "${YELLOW}ℹ️  Certbot no disponible o dominio no apto para Let's Encrypt (cliente) — generando certificado auto-firmado${NC}"
    fi

    echo -e "${BLUE}→ Generando certificado auto-firmado (cliente) en $LOCAL_CERT${NC}"
    sudo openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
        -keyout "$LOCAL_KEY" -out "$LOCAL_CERT" -subj "/CN=${DOMAIN}" >/dev/null 2>&1 || true
    sudo chmod 644 "$LOCAL_CERT" || true
    sudo chmod 600 "$LOCAL_KEY" || true
    echo -e "${GREEN}✓ Certificado auto-firmado cliente creado${NC}"
}

# Setup nginx for client
setup_nginx_client() {
    echo -e "${BLUE}→ Configurando NGINX para CLIENTE...${NC}"

    DISTRO=$(get_distro)
    echo -e "${BLUE}→ Distro detectada: $DISTRO${NC}"

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

    NGINX_CONF_SOURCE="$NGINX_DIR/nginx-client.conf"
    NGINX_CONF_TARGET="/etc/nginx/conf.d/sistema-client.conf"

    if [ ! -f "$NGINX_CONF_SOURCE" ]; then
        echo -e "${YELLOW}ℹ️  No se encontró nginx-client.conf en $NGINX_CONF_SOURCE — buscando rutas alternativas...${NC}"
        alt_paths=(
            "$BASE_DIR/nginx/nginx-client.conf"
            "$PWD/nginx/nginx-client.conf"
            "$BASE_DIR/../nginx/nginx-client.conf"
        )
        found=""
        for p in "${alt_paths[@]}"; do
            if [ -f "$p" ]; then
                found="$p"
                break
            fi
        done
        if [ -n "$found" ]; then
            NGINX_CONF_SOURCE="$found"
            echo -e "${GREEN}✓ Encontrado nginx-client.conf en: $found — usando esa ruta${NC}"
        else
            echo -e "${RED}❌ No se encontró nginx-client.conf. Rutas buscadas:${NC}"
            for p in "${alt_paths[@]}"; do echo "  - $p"; done
            echo -e "${BLUE}→ Contenido del directorio $BASE_DIR/nginx:${NC}"
            ls -la "$BASE_DIR/nginx" 2>/dev/null || true
            exit 1
        fi
    fi

    # Deshabilitar cualquier default site que cause conflicto
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

    echo -e "${BLUE}→ Copiando configuración de NGINX (cliente)...${NC}"
    sudo cp "$NGINX_CONF_SOURCE" "$NGINX_CONF_TARGET"

    sudo mkdir -p /etc/ssl/localcerts
    sudo chmod 755 /etc/ssl/localcerts

    ensure_tls_certificates_client

    sudo mkdir -p /var/log/nginx

    echo -e "${BLUE}→ Probando configuración de NGINX...${NC}"
    if ! sudo nginx -t; then
        echo -e "${RED}❌ Error en la configuración de NGINX (cliente)${NC}"
        sudo tail -n 200 /var/log/nginx/error.log || true
        exit 1
    fi

    echo -e "${BLUE}→ Reiniciando NGINX...${NC}"
    sudo systemctl restart nginx || true
    echo -e "${GREEN}✓ NGINX configurado correctamente (cliente)${NC}\n"
}

# Build and run client (optional)
build_and_start_client() {
    cd "$CLIENT_DIR" || { echo -e "${RED}❌ No existe $CLIENT_DIR${NC}"; return 1; }

    # Install deps if needed
    if command -v pnpm &> /dev/null; then
        pnpm install --frozen-lockfile || pnpm install
    elif command -v npm &> /dev/null; then
        npm ci || npm install
    fi

    # Build
    if command -v pnpm &> /dev/null; then
        pnpm build
    else
        npm run build
    fi

    echo -e "${GREEN}✓ Build del cliente completado${NC}"

    # Start (simple) - user can replace with pm2/systemd
    # Avoid permission issues writing to /var/log when not running as root.
    CLIENT_LOG="$BASE_DIR/client-start.log"
    if command -v pnpm &> /dev/null; then
        nohup pnpm start &>"$CLIENT_LOG" &
    else
        nohup npm start &>"$CLIENT_LOG" &
    fi
    echo -e "${GREEN}✓ Cliente iniciado (ver $CLIENT_LOG)${NC}"
}

# Main
MODE=${1:-deploy} # deploy | build-only | nginx-only

case "$MODE" in
    nginx-only)
        setup_nginx_client
        ;;
    build-only)
        build_and_start_client
        ;;
    deploy)
        # By default: build client then setup nginx
        build_and_start_client
        setup_nginx_client
        ;;
    *)
        echo "Usage: $0 [deploy|build-only|nginx-only]"
        exit 1
        ;;
esac

exit 0
