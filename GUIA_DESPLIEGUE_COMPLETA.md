# 🚀 GUÍA COMPLETA DE DESPLIEGUE - Sistema de Asistencia

> **Documento único y consolidado** para despliegue con GitHub Actions + Docker Compose en AWS EC2

---

## 📋 Tabla de Contenidos

1. [Arquitectura del Sistema](#arquitectura-del-sistema)
2. [Preparación del Servidor AWS](#preparación-del-servidor-aws)
3. [Configuración de GitHub Secrets](#configuración-de-github-secrets)
4. [Flujo de Despliegue en GitHub Actions](#flujo-de-despliegue-en-github-actions)
5. [Despliegue Selectivo en Servidor](#despliegue-selectivo-en-servidor)
6. [Configuración de WebSockets (Sin restricción CORS)](#configuración-de-websockets-sin-restricción-cors)
7. [Verificación y Monitoreo](#verificación-y-monitoreo)

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                         INTERNET PÚBLICO                        │
│                      (Puerto 80 y 443)                          │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
        ┌──────────────────┐
        │   NGINX 🌐       │
        │ (Reverse Proxy)  │
        │                  │
        │ • HTTP → 80      │
        │ • HTTPS → 443    │
        │ • SSL/TLS        │
        └──────────────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
    ▼            ▼            ▼
┌────────┐ ┌────────┐ ┌─────────────┐
│ Cliente│ │  API   │ │ WebSocket   │
│ Next.js│ │FastAPI │ │ Socket.IO   │
│ 3000   │ │ 8000   │ │ (en API)    │
└────────┘ └────────┘ └─────────────┘
    │            │            │
    └────────────┼────────────┘
                 │
        ┌────────▼────────┐
        │  PostgreSQL DB  │
        │  (Externo)      │
        └─────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│             CONTENEDORES EN DOCKER COMPOSE                      │
│                                                                 │
│  • nginx (Puerto 80/443) → Punto de entrada único              │
│  • api (Puerto 8000) → FastAPI + Socket.IO                     │
│  • client (Puerto 3000) → Next.js Frontend                     │
│                                                                 │
│  Red privada: 172.20.0.0/16                                    │
│  Comunicación interna: api:8000, client:3000                   │
└─────────────────────────────────────────────────────────────────┘
```

**Puntos clave:**

- ✅ **Nginx** es el ÚNICO punto de acceso público (puertos 80/443)
- ✅ Cliente y API son internos (solo accesibles desde Nginx)
- ✅ WebSockets pasan por Nginx sin restricción de origen
- ✅ Base de datos externa (recomendado para producción)

---

## 🖥️ Preparación del Servidor AWS

### Paso 1: Requisitos del Servidor

**Especificaciones mínimas:**

- AMI: Ubuntu 22.04 LTS
- Tipo: t3.medium (2 vCPU, 4GB RAM)
- Disco: 30GB SSD
- Puertos abiertos: 22 (SSH), 80 (HTTP), 443 (HTTPS)

### Paso 2: Conectarse al Servidor

```bash
# SSH al servidor
ssh -i tu-clave.pem ubuntu@ec2-XX-XX-XX-XX.compute-1.amazonaws.com

# Crear usuario de despliegue
sudo useradd -m -s /bin/bash deploy
sudo usermod -aG docker deploy
sudo usermod -aG sudo deploy

# Crear estructura de directorios
sudo mkdir -p /home/deploy/app
sudo chown -R deploy:deploy /home/deploy

# Cambiar a usuario deploy
sudo su - deploy
```

### Paso 3: Instalar Docker y Docker Compose

```bash
# Actualizar sistema
sudo apt-get update && sudo apt-get upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Agregar usuario deploy a grupo docker
sudo usermod -aG docker deploy

# Verificar instalación
docker --version
docker compose version

# Aplicar cambios de grupo
newgrp docker
```

### Paso 4: Clonar el Repositorio

```bash
cd /home/deploy/app

# Clonar con clave SSH
git clone git@github.com:2004Style/sistema-de-asistencia.git
cd sistema-de-asistencia

# Listar contenido
ls -la
```

### Paso 5: Crear Archivo `.env` para Producción

```bash
# Copiar archivo ejemplo
cp server/.env.example server/.env

# Editar variables de producción
nano .env
```

**Contenido mínimo de `.env`:**

```bash
# ============================================
# BASE DE DATOS
# ============================================
# ⚠️ CAMBIAR: Usar servidor PostgreSQL externo
DATABASE_URL=postgresql://usuario:contraseña@db-prod.example.com:5432/asistencia_prod

# ============================================
# CONFIGURACIÓN DE LA API
# ============================================
HOST=0.0.0.0
PORT=8000
TIMEZONE=America/Bogota

# ============================================
# SEGURIDAD JWT - GENERAR NUEVOS VALORES
# ============================================
# Generar con: openssl rand -hex 32
SECRET_KEY=GENERAR-CON-OPENSSL-RAND-HEX-32-AQUI
JWT_SECRET_KEY=GENERAR-CON-OPENSSL-RAND-HEX-32-AQUI

# ============================================
# CORS - ORIGINAL CON RESTRICCIONES (si aplica)
# ============================================
CORS_ORIGINS=https://tu-dominio.com,https://www.tu-dominio.com

# ============================================
# AMBIENTE
# ============================================
AUTO_MIGRATE=false
DEBUG=false
ENVIRONMENT=production

# ============================================
# ARCHIVOS
# ============================================
MAX_FILE_SIZE=10485760
UPLOAD_DIR=recognize/data
REPORTS_DIR=public/reports
TEMP_DIR=public/temp
PASSWORD_MIN_LENGTH=8

# ============================================
# EMAIL - CONFIGURAR SEGÚN PROVEEDOR
# ============================================
MAIL_API_URL=https://tu-servidor.com
MAIL_API_CLIENT_ID=tu-client-id
MAIL_API_SECRET=tu-api-secret
SMTP_FROM_EMAIL=noreply@tu-dominio.com
SMTP_FROM_NAME=Sistema de Asistencia

# ============================================
# ALERTAS
# ============================================
TARDANZAS_MAX_ALERTA=3
FALTAS_MAX_ALERTA=2
MINUTOS_TARDANZA=15
```

### Paso 6: Generar Certificados SSL

```bash
# Crear carpeta de certificados
mkdir -p /home/deploy/app/sistema-de-asistencia/certs

# Generar certificados autofirmados (temporal)
cd /home/deploy/app/sistema-de-asistencia/certs

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout key.pem \
  -out cert.pem \
  -subj "/C=CO/ST=Bogota/L=Bogota/O=Sistema/CN=tu-ip-o-dominio.com" \
  -addext "subjectAltName=IP:tu-ip,DNS:tu-dominio.com"

# Permisos
chmod 600 key.pem
chmod 644 cert.pem

# Verificar
ls -lh
```

### Paso 7: Prueba Local de Docker Compose

```bash
cd /home/deploy/app/sistema-de-asistencia

# Construir imágenes
docker compose build

# Iniciar servicios
docker compose up -d

# Verificar estado
docker compose ps

# Ver logs
docker compose logs -f nginx

# Verificar endpoints
curl http://localhost/health
curl http://localhost/api/docs

# Probar WebSocket
# Desde otra terminal: npm install -g wscat
# wscat -c ws://localhost/api/socket.io/
```

---

## 🔐 Configuración de GitHub Secrets

### Paso 1: Generar Clave SSH para Deploy

```bash
# En tu máquina local
ssh-keygen -t ed25519 -f ~/github-deploy-key -C "GitHub Deploy"

# Sin contraseña
# Copiar clave privada
cat ~/github-deploy-key

# Copiar clave pública al servidor
cat ~/github-deploy-key.pub >> /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
```

### Paso 2: Crear Secrets en GitHub

En **GitHub → Settings → Secrets and variables → Actions**:

```
EC2_HOST=tu-ip-o-dominio.com
EC2_USER=deploy
EC2_SSH_KEY=<contenido-de-github-deploy-key>
```

**Donde:**

- `EC2_HOST`: IP pública o dominio del servidor
- `EC2_USER`: Usuario `deploy` creado en el servidor
- `EC2_SSH_KEY`: Clave privada sin contraseña (contenido completo)

### Paso 3: Verificar Configuración

```bash
# En el servidor
ssh -i ~/.ssh/deploy_key deploy@tu-ip "echo '✅ SSH funciona'"

# Desde GitHub Actions (manual)
gh secret list
```

---

## 🔄 Flujo de Despliegue en GitHub Actions

### Arquitectura del Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│             PUSH A RAMA MAIN (GitHub)                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │ 1️⃣ DETECTAR CAMBIOS        │
        │ detect_changes job         │
        │ - Comparar client/server   │
        │ - Outputs: cambios detect  │
        └────────────────┬───────────┘
                         │
        ┌────────────────┴────────────┐
        │                             │
   ❌ Sin cambios              ✅ Con cambios
        │                             │
        │                    ┌────────┴──────────┐
        │                    │                   │
        ▼                    ▼                   ▼
    (Skip)          BUILD CLIENT        BUILD SERVER
                    build_client job     build_server job
                    - Docker login       - Docker login
                    - Build imagen       - Build imagen
                    - Push a GHCR        - Push a GHCR
                         │                   │
                         └───────────┬───────┘
                                     │
                                     ▼
                        ┌────────────────────────┐
                        │ 3️⃣ DEPLOY A EC2        │
                        │ deploy job             │
                        │ - SSH al servidor      │
                        │ - Ejecutar script      │
                        │ - Actualización selectiva
                        └────────────┬───────────┘
                                     │
                         ✅ Éxito   ⚠️ Error
                                     │
                    ┌────────────────┴──────────┐
                    │                           │
                    ▼                           ▼
              Notificar éxito           Notificar error
              URLs disponibles           Ver logs
```

### Archivos GitHub Actions

**Archivo:** `.github/workflows/deploy.yml`

```yaml
name: 🚀 Desplegar a AWS EC2 (Docker Compose)

on:
  push:
    branches:
      - main
    paths:
      - "client/**"
      - "server/**"
      - "docker-compose.yml"
      - "nginx.conf"
      - ".github/workflows/deploy.yml"

env:
  REGISTRY: ghcr.io

jobs:
  # ============================================
  # PASO 1: DETECTAR CAMBIOS
  # ============================================
  detect_changes:
    name: 🔍 Detectar cambios
    runs-on: ubuntu-latest
    outputs:
      client_changed: ${{ steps.changes.outputs.client_changed }}
      server_changed: ${{ steps.changes.outputs.server_changed }}

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: 🔍 Detectar archivos modificados
        id: changes
        run: |
          # Obtener lista de archivos cambiados
          CHANGED_FILES=$(git diff --name-only origin/main HEAD)

          # Verificar cambios en client
          if echo "$CHANGED_FILES" | grep -q "^client/"; then
            echo "client_changed=true" >> $GITHUB_OUTPUT
            echo "✅ Cambios detectados en CLIENT"
          else
            echo "client_changed=false" >> $GITHUB_OUTPUT
            echo "❌ Sin cambios en CLIENT"
          fi

          # Verificar cambios en server
          if echo "$CHANGED_FILES" | grep -q "^server/"; then
            echo "server_changed=true" >> $GITHUB_OUTPUT
            echo "✅ Cambios detectados en SERVER"
          else
            echo "server_changed=false" >> $GITHUB_OUTPUT
            echo "❌ Sin cambios en SERVER"
          fi

          echo ""
          echo "📝 Archivos modificados:"
          echo "$CHANGED_FILES"

  # ============================================
  # PASO 2A: BUILD CLIENT
  # ============================================
  build_client:
    name: 🏗️ Build Client (Next.js)
    runs-on: ubuntu-latest
    needs: detect_changes
    if: needs.detect_changes.outputs.client_changed == 'true'

    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: 🐳 Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: 🔐 Log in to Container Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: 📝 Extract metadata (Client)
        id: meta
        uses: docker/metadata-action@v4
        with:
          images: ${{ env.REGISTRY }}/${{ github.repository_owner }}/sistema-asistencia-client
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha,prefix={{branch}}-

      - name: 🏗️ Build and push Docker image (Client)
        uses: docker/build-push-action@v4
        with:
          context: ./client
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # ============================================
  # PASO 2B: BUILD SERVER
  # ============================================
  build_server:
    name: 🏗️ Build Server (FastAPI)
    runs-on: ubuntu-latest
    needs: detect_changes
    if: needs.detect_changes.outputs.server_changed == 'true'

    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: 🐳 Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: 🔐 Log in to Container Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: 📝 Extract metadata (Server)
        id: meta
        uses: docker/metadata-action@v4
        with:
          images: ${{ env.REGISTRY }}/${{ github.repository_owner }}/sistema-asistencia-server
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha,prefix={{branch}}-

      - name: 🏗️ Build and push Docker image (Server)
        uses: docker/build-push-action@v4
        with:
          context: ./server
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # ============================================
  # PASO 3: DEPLOY A EC2
  # ============================================
  deploy:
    name: 🚀 Deploy a EC2
    runs-on: ubuntu-latest
    needs: [detect_changes, build_client, build_server]
    if: always() && (needs.detect_changes.outputs.client_changed == 'true' || needs.detect_changes.outputs.server_changed == 'true')

    steps:
      - uses: actions/checkout@v4

      - name: 🔑 Configurar SSH
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.EC2_SSH_KEY }}" > ~/.ssh/deploy_key
          chmod 600 ~/.ssh/deploy_key
          ssh-keyscan ${{ secrets.EC2_HOST }} >> ~/.ssh/known_hosts 2>/dev/null
          chmod 644 ~/.ssh/known_hosts

      - name: 📊 Determinar qué actualizar
        id: deploy_type
        run: |
          CLIENT_CHANGED=${{ needs.detect_changes.outputs.client_changed }}
          SERVER_CHANGED=${{ needs.detect_changes.outputs.server_changed }}

          if [ "$CLIENT_CHANGED" = "true" ] && [ "$SERVER_CHANGED" = "true" ]; then
            echo "deploy_type=both" >> $GITHUB_OUTPUT
            echo "🔄 Se actualizarán: CLIENT + SERVER"
          elif [ "$CLIENT_CHANGED" = "true" ]; then
            echo "deploy_type=client" >> $GITHUB_OUTPUT
            echo "🌐 Se actualizará: CLIENT"
          else
            echo "deploy_type=server" >> $GITHUB_OUTPUT
            echo "⚙️ Se actualizará: SERVER"
          fi

      - name: 🚀 Ejecutar script de despliegue selectivo
        run: |
          ssh -i ~/.ssh/deploy_key ${{ secrets.EC2_USER }}@${{ secrets.EC2_HOST }} \
            'bash /home/deploy/app/sistema-de-asistencia/deploy-compose.sh ${{ steps.deploy_type.outputs.deploy_type }}'

      - name: ✅ Notificar éxito
        if: success()
        run: |
          echo "✅ Despliegue completado exitosamente"
          echo "🌐 Cliente: http://${{ secrets.EC2_HOST }}"
          echo "⚙️ API: http://${{ secrets.EC2_HOST }}/api/docs"
          echo "📡 WebSocket: ws://${{ secrets.EC2_HOST }}/api/socket.io"

      - name: ❌ Notificar error
        if: failure()
        run: |
          echo "❌ Error en el despliegue"
          echo "Ver logs en: https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }}"
```

### Pasos Detallados del Workflow

#### **1️⃣ Detectar Cambios** (`detect_changes`)

**¿Qué hace?**

- Compara archivos entre `main` y HEAD
- Detecta si hay cambios en `client/` o `server/`
- Genera outputs: `client_changed` y `server_changed`

**Salida típica:**

```
✅ Cambios detectados en CLIENT
❌ Sin cambios en SERVER

📝 Archivos modificados:
client/src/components/Login.tsx
client/package.json
```

#### **2️⃣ Build Client** (`build_client`)

**Condición:** Solo si `client_changed == true`

**Pasos:**

1. Login a GitHub Container Registry (GHCR)
2. Build imagen Docker de Next.js
3. Push a `ghcr.io/2004style/sistema-asistencia-client:main`

**Tags generados:**

```
ghcr.io/2004style/sistema-asistencia-client:main
ghcr.io/2004style/sistema-asistencia-client:sha-abc123
```

#### **2️⃣ Build Server** (`build_server`)

**Condición:** Solo si `server_changed == true`

**Pasos:**

1. Login a GHCR
2. Build imagen Docker de FastAPI
3. Push a `ghcr.io/2004style/sistema-asistencia-server:main`

#### **3️⃣ Deploy** (`deploy`)

**Condición:** Ejecuta si hay cambios en client O server

**Pasos:**

```
1. Configurar SSH
   - Crear archivo de clave privada
   - Agregar host a known_hosts
   - Permisos 600

2. Determinar tipo de deploy
   - Si ambos cambiaron → deploy_type=both
   - Solo client → deploy_type=client
   - Solo server → deploy_type=server

3. Ejecutar script en servidor
   ssh deploy@tu-ip 'bash deploy-compose.sh [both|client|server]'

4. Notificaciones
   - Éxito: URLs de acceso
   - Error: Link a logs de GitHub
```

---

## 🎯 Despliegue Selectivo en Servidor

### Script de Despliegue: `deploy-compose.sh`

**Ubicación:** `/home/deploy/app/sistema-de-asistencia/deploy-compose.sh`

**Uso:**

```bash
# Desde GitHub Actions (automático)
bash deploy-compose.sh both      # Actualizar client + server
bash deploy-compose.sh client    # Solo Next.js
bash deploy-compose.sh server    # Solo FastAPI

# Manual en servidor
cd /home/deploy/app/sistema-de-asistencia
./deploy-compose.sh both
```

### Flujo del Script

```
┌─────────────────────────────────────────┐
│  Validaciones                           │
│  - Docker instalado ✓                   │
│  - Git instalado ✓                      │
│  - Docker Compose ✓                     │
│  - .env existe ✓                        │
└────────────────┬────────────────────────┘
                 │
                 ▼
        ┌────────────────────┐
        │ Actualizar repo    │
        │ git pull origin    │
        │ git reset --hard   │
        └────────────────┬───┘
                         │
                         ▼
        ┌────────────────────────┐
        │ Generar certificados   │
        │ SSL/TLS (si no existen)│
        └────────────────┬───────┘
                         │
        ┌────────────────┴─────────────┐
        │                              │
        ▼                              ▼
    deploy=client             deploy=server
    docker compose pull        docker compose pull
    client                     api
        │                          │
        ▼                          ▼
    docker compose up          docker compose up
    -d client                  -d api
        │                          │
        ▼                          ▼
    Esperar listo              Esperar listo
    health check               curl /health
        │                          │
        └────────────────┬─────────┘
                         │
                         ▼
                ┌──────────────────┐
                │ Limpiar recursos │
                │ docker prune     │
                │ Mostrar estado   │
                └──────────────────┘
```

### Comandos Principales

#### **Caso 1: Actualizar solo CLIENT**

```bash
./deploy-compose.sh client

# Salida esperada:
# ✅ Descargando imagen del cliente...
# ✅ Reiniciando contenedor client...
# ✅ Esperando a que el cliente esté disponible...
# ✅ Cliente listo
```

#### **Caso 2: Actualizar solo SERVER**

```bash
./deploy-compose.sh server

# Salida esperada:
# ✅ Descargando imagen del servidor...
# ✅ Reiniciando contenedor api...
# ✅ Esperando a que la API esté disponible...
# ✅ API lista
```

#### **Caso 3: Actualizar AMBOS (por defecto)**

```bash
./deploy-compose.sh both
# o simplemente
./deploy-compose.sh

# Salida esperada:
# ✅ Imágenes descargadas
# ✅ Contenedores actualizados
# ✅ API lista
# ✅ Cliente listo
```

### Verificar Estado

```bash
# Ver contenedores en ejecución
docker compose ps

# Ver logs en tiempo real
docker compose logs -f nginx

# Ver logs específicos
docker compose logs -f api
docker compose logs -f client

# Acceso rápido a documentación
curl http://localhost/api/docs    # Swagger API
curl http://localhost/health      # Health check
```

---

## 📡 Configuración de WebSockets (Sin restricción CORS)

### Problema Original

El archivo `.env` tenía:

```bash
SOCKETIO_CORS_ORIGINS=https://tu-dominio.com,https://www.tu-dominio.com
```

Esto **restringía** las conexiones WebSocket solo a esos orígenes.

### Solución: Permitir Cualquier Cliente

#### **Paso 1: Actualizar `.env`**

```bash
# CAMBIAR DE ESTO:
SOCKETIO_CORS_ORIGINS=https://tu-dominio.com,https://www.tu-dominio.com

# A ESTO (permite cualquier origen):
SOCKETIO_CORS_ORIGINS=*
```

#### **Paso 2: Configuración en FastAPI** (`server/src/socketsio/__init__.py`)

**Buscar y actualizar:**

```python
# ANTES:
sio = AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=[os.getenv('SOCKETIO_CORS_ORIGINS', '*')]
)

# DESPUÉS (permitir cualquier origen):
sio = AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',  # ✅ Permite cualquier origen
    cors_credentials=True,     # ✅ Permite credenciales
    cors_methods=['GET', 'POST', 'OPTIONS'],
    cors_headers=['Content-Type', 'Authorization']
)
```

#### **Paso 3: Configuración en Nginx** (`nginx.conf`)

```nginx
# UBICACIÓN: Bloque para Socket.IO

location /api/socket.io {
    proxy_pass http://api_backend/socket.io;
    proxy_http_version 1.1;

    # ✅ Headers sin restricción de origen
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # ✅ Sin CORS headers restrictivos
    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;

    # Buffers para streaming
    proxy_buffering off;

    # Timeouts agresivos para conexiones persistentes
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
    proxy_connect_timeout 60s;

    # Caché deshabilitado
    proxy_cache off;
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}
```

### Ejemplo de Cliente Conectándose (Cualquier origen)

```javascript
// Cliente desde localhost, servidor remoto, etc.
// Funciona sin importar el origen

import io from "socket.io-client";

const socket = io("http://tu-dominio.com/api/socket.io", {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
});

socket.on("connect", () => {
  console.log("✅ Conectado a WebSocket");
});

socket.on("asistencia:nueva", (data) => {
  console.log("📢 Nueva asistencia:", data);
});

socket.emit("asistencia:registrar", {
  usuario_id: 123,
  timestamp: new Date(),
});
```

### Conexión desde ESP32 (Ejemplo)

```cpp
#include <WebSocketsClient.h>

WebSocketsClient webSocket;

void setup() {
  // Conectar a WebSocket (sin restricción de origen)
  webSocket.begin("tu-dominio.com", 80, "/api/socket.io/?EIO=4&transport=websocket");
  webSocket.onEvent(webSocketEvent);
}

void loop() {
  webSocket.loop();
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  if (type == WStype_CONNECTED) {
    Serial.println("✅ Conectado a servidor de asistencia");
  }
}
```

---

## ✅ Verificación y Monitoreo

### Checklist Post-Despliegue

```bash
# 1. Verificar contenedores
docker compose ps

# Estado esperado:
# NAME                    STATUS          PORTS
# sistema-asistencia-nginx  Up (healthy)  0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
# sistema-asistencia-api    Up (healthy)  127.0.0.1:8000->8000/tcp
# sistema-asistencia-client Up (healthy)  127.0.0.1:3000->3000/tcp

# 2. Verificar endpoints
echo "🌐 Cliente:"
curl -s http://localhost/ | head -5

echo "📚 Documentación API:"
curl -s http://localhost/api/docs | head -5

echo "❤️ Health check:"
curl -s http://localhost/health

# 3. Verificar WebSocket
echo "📡 WebSocket (debe mostrar contenido):"
timeout 3 websocat ws://localhost/api/socket.io || echo "✅ WebSocket activo"

# 4. Ver logs
docker compose logs --tail=50 nginx
docker compose logs --tail=50 api
docker compose logs --tail=50 client
```

### Monitoreo Continuo

```bash
# Terminal 1: Logs de Nginx
docker compose logs -f nginx

# Terminal 2: Logs de API
docker compose logs -f api

# Terminal 3: Recursos
docker stats

# Terminal 4: Verificación de puertos
netstat -tulpn | grep LISTEN
# o
ss -tulpn | grep LISTEN
```

### Troubleshooting Común

#### **Problema: Conexión rechazada en puerto 80**

```bash
# Verificar si nginx está corriendo
docker compose ps nginx

# Ver logs de nginx
docker compose logs nginx

# Reiniciar nginx
docker compose restart nginx

# Verificar que puerto está escuchando
docker exec sistema-asistencia-nginx netstat -tulpn | grep 80
```

#### **Problema: WebSocket no conecta**

```bash
# Verificar que Socket.IO está en la API
curl http://localhost:8000/socket.io/

# Ver headers de respuesta
curl -i http://localhost/api/socket.io

# Verificar CORS en nginx
docker exec sistema-asistencia-nginx cat /etc/nginx/nginx.conf | grep -A5 "socket.io"
```

#### **Problema: Certificados SSL vencidos**

```bash
# Regenerar certificados
cd /home/deploy/app/sistema-de-asistencia/certs

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout key.pem \
  -out cert.pem \
  -subj "/C=CO/ST=Bogota/L=Bogota/O=Sistema/CN=tu-dominio.com"

# Reiniciar nginx
docker compose restart nginx
```

### Comandos Útiles de Mantenimiento

```bash
# Ver estadísticas de uso
docker stats

# Limpiar imágenes sin usar
docker image prune -a

# Limpiar volúmenes sin usar
docker volume prune

# Backup de base de datos
pg_dump postgresql://user:pass@db:5432/asistencia > backup.sql

# Actualizar una sola imagen
docker pull ghcr.io/2004style/sistema-asistencia-client:main

# Rebuild completo
docker compose build --no-cache
docker compose up -d
```

---

## 📞 Resumen: Flujo Completo End-to-End

```
1. DESARROLLADOR
   ├─ Hacer cambios en código
   ├─ git add .
   ├─ git commit -m "Descripción"
   └─ git push origin main
        │
        ▼
2. GITHUB ACTIONS (Automático)
   ├─ 🔍 Detectar cambios (client/server)
   ├─ 🏗️ Build imagen(es)
   ├─ 📤 Push a GHCR
   └─ 🚀 Ejecutar deploy-compose.sh
        │
        ▼
3. SERVIDOR AWS (EC2)
   ├─ 📥 git pull origen
   ├─ 🐳 docker compose pull
   ├─ ↩️ docker compose up -d
   ├─ ✅ Health checks
   └─ 📊 Mostrar estado
        │
        ▼
4. APLICACIÓN EN VIVO
   ├─ 🌐 Cliente: http://tu-dominio/
   ├─ ⚙️ API: http://tu-dominio/api/docs
   ├─ 📡 WebSocket: ws://tu-dominio/api/socket.io
   └─ ✅ Sistema funcionando
```

---

## 🎓 Tips Finales

### Buenas Prácticas

✅ **DO:**

- Usar secrets para credenciales (nunca en `.env` del repo)
- Generar certificados SSL válidos en producción
- Hacer backups regulares de la BD
- Monitorear logs constantemente
- Usar deploy selectivo (client/server) cuando sea posible

❌ **DON'T:**

- Subir `.env` al repositorio
- Usar certificados autofirmados en producción
- Permitir SSH sin clave SSH
- Dejar `DEBUG=true` en producción
- Ignorar health checks

### Comandos Rápidos en Servidor

```bash
# Acceder al servidor
ssh -i ~/github-deploy-key.pem deploy@tu-ip

# Cambiar a directorio de app
cd /home/deploy/app/sistema-de-asistencia

# Ver estado actual
docker compose ps

# Redeploy completo (sin cambios reales)
./deploy-compose.sh both

# Ver últimos logs
docker compose logs --tail=100 nginx

# Ejecutar comando en contenedor
docker exec sistema-asistencia-api python -c "import os; print(os.getenv('SECRET_KEY'))"
```

### Recursos Útiles

- 📖 [Docker Compose Docs](https://docs.docker.com/compose/)
- 📖 [GitHub Actions Docs](https://docs.github.com/en/actions)
- 📖 [Nginx Reverse Proxy](https://nginx.org/en/docs/)
- 📖 [Socket.IO CORS](https://socket.io/docs/v4/handling-cors/)
- 🐳 [GHCR Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)

---

**Documento actualizado:** 8 de noviembre, 2025  
**Versión:** 1.0 - Despliegue con Sockets sin restricción CORS
