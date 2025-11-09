# 🚀 GUÍA COMPLETA DE DESPLIEGUE - Sistema de Asistencia

> **Documento único y consolidado** para despliegue con GitHub Actions + Docker Compose en AWS EC2

---

## ⚡ RESUMEN EJECUTIVO - DESPLIEGUE AUTOMÁTICO

> 🎯 **IMPORTANTE:** Desde v2.0, el script `deploy-compose.sh` automatiza TODO el proceso de Docker. No necesitas compilar manualmente.

### 📌 Para Usuarios con Prisa

**Si tu servidor ya está preparado, solo necesitas:**

```bash
# 1. Conectar al servidor
ssh deploy@tu-ip

# 2. Navegar al directorio
cd /home/deploy/app/sistema-de-asistencia

# 3. Crear .env (ÚNICO paso manual obligatorio)
cp server/.env.example .env
nano .env  # Editar variables críticas (DATABASE_URL, JWT_SECRET, etc.)

# 4. Ejecutar script AUTOMÁTICO (TODO se hace por sí solo)
bash deploy-compose.sh both

# ¡Listo! El script se encarga de:
# ✅ Actualizar repositorio
# ✅ Verificar Docker y dependencias
# ✅ Generar certificados SSL (si faltan)
# ✅ Compilar imágenes Docker
# ✅ Iniciar todos los contenedores
# ✅ Esperar a que estén listos
# ✅ Limpiar recursos antiguos

# Servicios disponibles en:
# - Cliente: http://tu-ip
# - API: http://tu-ip/api/docs
# - WebSocket: ws://tu-ip/api/socket.io
```

### ⚡ Opciones del Script

```bash
# Despliegue completo (cliente + servidor + nginx)
bash deploy-compose.sh both

# Solo actualizar cliente
bash deploy-compose.sh client

# Solo actualizar servidor (API)
bash deploy-compose.sh server

# Sin argumentos = despliegue completo
bash deploy-compose.sh
```

### ✅ Checklist Pre-despliegue

Antes de ejecutar el script, verificar:

- [ ] Usuario `deploy` creado en servidor
- [ ] Docker + Docker Compose instalados
- [ ] GitHub Actions configurado con secrets (EC2_HOST, EC2_USER, EC2_SSH_KEY)
- [ ] Archivo `.env` creado con valores de producción
- [ ] Clave SSH (`/home/deploy/.ssh/authorized_keys`) configurada
- [ ] Conexión SSH probada desde tu máquina local
- [ ] Permisos: usuario `deploy` en grupo `docker` y `sudo`

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

## ⚡ INICIO RÁPIDO - Despliegue Automático

> 🚀 **Si ya tienes el servidor preparado**, usa el script de despliegue automático que hace TODO por ti.

### Opción A: Despliegue Selectivo (Recomendado)

```bash
# En el servidor, desde /home/deploy/app/sistema-de-asistencia/

# Actualizar SOLO el cliente (Next.js)
bash deploy-compose.sh client

# Actualizar SOLO el servidor (FastAPI)
bash deploy-compose.sh server

# Actualizar CLIENTE + SERVIDOR + NGINX (completo)
bash deploy-compose.sh both

# O sin parámetro (por defecto: both)
bash deploy-compose.sh
```

### Qué hace el script automáticamente:

✅ Valida requisitos (Docker, Git, Docker Compose)  
✅ Actualiza el repositorio  
✅ Genera certificados SSL autofirmados (si no existen)  
✅ Valida archivos de configuración (.env, docker-compose.yml, nginx.conf)  
✅ Detiene y remueve contenedores antiguos  
✅ Compila las imágenes Docker  
✅ Inicia los servicios en orden correcto  
✅ Espera a que todos los servicios estén healthy  
✅ Verifica disponibilidad de endpoints  
✅ Limpia recursos innecesarios  
✅ Muestra resumen de acceso a servicios

### Salida esperada:

```
╔════════════════════════════════════════════════════════════════╗
║   🔥 SISTEMA DE ASISTENCIA - DOCKER COMPOSE DEPLOY 🔥       ║
╚════════════════════════════════════════════════════════════════╝

▶ 🔍 Validaciones Iniciales
├─ ✅ Requisitos verificados
├─ ✅ Repositorio actualizado
├─ ✅ Certificados SSL generados
└─ ✅ Configuración cargada

▶ 🔄 Actualizando Servicios
├─ ✅ Contenedores compilados
├─ ✅ Servicios iniciados
└─ ✅ Todos los servicios operacionales

🌐 ACCESO A SERVICIOS
├─ Cliente: http://tu-ip
├─ API: http://tu-ip/api/docs
└─ WebSocket: ws://tu-ip/api/socket.io
```

---

## 🖥️ Preparación del Servidor AWS

### Paso 1: Requisitos del Servidor

**Especificaciones mínimas:**

- AMI: Ubuntu 22.04 LTS
- Tipo: t3.medium (2 vCPU, 4GB RAM)
- Disco: 30GB SSD
- Puertos abiertos: 22 (SSH), 80 (HTTP), 443 (HTTPS)

### Paso 2: Conectarse al Servidor y Crear Usuario Deploy

**Conectar al servidor:**

```bash
# SSH al servidor
ssh -i tu-clave.pem ubuntu@ec2-XX-XX-XX-XX.compute-1.amazonaws.com
```

**Crear usuario de despliegue (seguro para CI/CD):**

```bash
# ⚠️ IMPORTANTE: Este es el comando CORRECTO para usuarios de despliegue
# NO usa --disabled-password --disabled-login para mayor seguridad

sudo adduser deploy --disabled-password --disabled-login --gecos "Deploy User"

# Explicación:
# --disabled-password    → No se puede hacer login con contraseña interactiva
# --disabled-login       → Deshabilita el shell login interactivo completamente
# --gecos "Deploy User"  → Comentario descriptivo del usuario
# Beneficio: Solo SSH con clave pública es permitido (ideal para GitHub Actions)
```

**Agregar usuario a grupos necesarios:**

```bash
sudo usermod -aG docker deploy
sudo usermod -aG sudo deploy
```

**Crear estructura de directorios:**

```bash
sudo mkdir -p /home/deploy/app
sudo mkdir -p /home/deploy/.ssh
sudo chown -R deploy:deploy /home/deploy
sudo chmod 700 /home/deploy/.ssh
```

**Verificar que el usuario se creó correctamente:**

```bash
# En el servidor, verificar usuario
grep deploy /etc/passwd
# Salida: deploy:x:1001:1001:Deploy User:/home/deploy:/usr/sbin/nologin
#                                                              ↑ importante: nologin

# Verificar grupos
groups deploy
# Salida: deploy : docker sudo

# Verificar permisos de .ssh
ls -la /home/deploy/.ssh
# Salida: drwx------ (permisos 700)
```

**Cambiar a usuario deploy (opcional, solo si necesitas probar):**

```bash
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

**⚠️ IMPORTANTE: Este es el ÚNICO paso manual. El script automatiza el resto.**

```bash
cd /home/deploy/app/sistema-de-asistencia

# Copiar archivo ejemplo
cp server/.env.example .env

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

### Paso 6: Ejecutar Script de Despliegue Automático

**✅ El script automatiza TODO lo siguiente:**

```bash
cd /home/deploy/app/sistema-de-asistencia

# Ejecutar el script (elige una opción)
bash deploy-compose.sh both    # Despliegue completo (CLIENT + SERVER + NGINX)
bash deploy-compose.sh client  # Solo actualizar cliente
bash deploy-compose.sh server  # Solo actualizar servidor
```

**El script hace automáticamente:**

1. ✅ Genera certificados SSL autofirmados (si no existen)
2. ✅ Valida todas las configuraciones
3. ✅ Compila las imágenes Docker
4. ✅ Inicia todos los servicios en orden correcto
5. ✅ Espera a que todos los servicios estén healthy
6. ✅ Limpia recursos innecesarios
7. ✅ Muestra resumen de URLs de acceso

**Salida del script:**

```
[2025-11-09 04:20:36] ✅ Requisitos verificados
[2025-11-09 04:20:37] ✅ Repositorio actualizado
[2025-11-09 04:20:37] ℹ️ Certificados SSL encontrados
[2025-11-09 04:20:37] ✅ Configuración cargada
[2025-11-09 04:20:38] ✅ Todos los servicios compilados
[2025-11-09 04:20:45] ✅ API está healthy
[2025-11-09 04:20:48] ✅ Cliente está healthy
[2025-11-09 04:20:50] ✅ Nginx está operacional

🌐 ACCESO A SERVICIOS
├─ Cliente: http://tu-ip
├─ API Docs: http://tu-ip/api/docs
└─ WebSocket: ws://tu-ip/api/socket.io
```

### Paso 7: Verificar Despliegue

```bash
cd /home/deploy/app/sistema-de-asistencia

# Ver estado de contenedores
docker compose ps

# Ver logs en tiempo real
docker compose logs -f

# Ver logs de un servicio específico
docker compose logs -f api
docker compose logs -f client
docker compose logs -f nginx

# Verificar que nginx está funcionando
curl http://localhost/health

# Verificar API
curl http://localhost/api/docs

# Probar WebSocket (si tienes wscat instalado)
npm install -g wscat
wscat -c ws://localhost/api/socket.io
```

### Paso 8: Comandos Útiles de Mantenimiento

```bash
cd /home/deploy/app/sistema-de-asistencia

# Detener todos los servicios
docker compose down

# Detener e incluir volúmenes (CUIDADO: elimina datos)
docker compose down -v

# Reiniciar un servicio específico
docker compose restart api
docker compose restart client

# Reconstruir y reiniciar todo
docker compose up -d --build

# Limpiar imágenes sin usar
docker image prune -f

# Limpiar todo (contenedores, redes, volúmenes)
docker system prune -a --volumes
```

---

## 🔐 Configuración de GitHub Secrets

### Paso 1: Generar Clave SSH para Deploy

```bash
# En tu máquina LOCAL (no en el servidor)
ssh-keygen -t ed25519 -f ~/github-deploy-key -C "GitHub Deploy" -N ""

# Opciones:
# -t ed25519        → Algoritmo moderno y seguro
# -f ~/github-deploy-key → Ubicación del archivo
# -C "GitHub Deploy"     → Comentario para identificar
# -N ""              → Sin contraseña (importante para CI/CD)

# Verificar que se creó correctamente
ls -lh ~/github-deploy-key*

# Salida esperada:
# -rw------- github-deploy-key      (clave privada - 464 bytes)
# -rw-r--r-- github-deploy-key.pub  (clave pública - 104 bytes)
```

**Paso 1B: Copiar clave pública al servidor**

```bash
# OPCIÓN A: Si ya tienes SSH acceso (primer setup)
ssh-copy-id -i ~/github-deploy-key.pub deploy@tu-ip

# OPCIÓN B: Manual (desde la máquina con las claves)
cat ~/github-deploy-key.pub | ssh deploy@tu-ip "cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"

# OPCIÓN C: Manual paso a paso en el servidor
# 1. Editar archivo manualmente
ssh deploy@tu-ip
nano ~/.ssh/authorized_keys

# 2. Pegar el contenido de github-deploy-key.pub
# 3. Guardar (Ctrl+O, Enter, Ctrl+X)

# Verificar en servidor
ssh deploy@tu-ip "cat ~/.ssh/authorized_keys"
```

**Verificar que SSH funciona sin contraseña:**

```bash
# Desde tu máquina local
ssh -i ~/github-deploy-key deploy@tu-ip "echo '✅ SSH sin contraseña funciona'"

# Debe mostrar: ✅ SSH sin contraseña funciona
```

**¿Por qué `--disabled-password --disabled-login`?**

- `--disabled-password`: No se puede hacer login con contraseña (es una contraseña más segura)
- `--disabled-login`: Deshabilita el shell login interactivo
- **Beneficio**: Solo SSH con clave es permitido (ideal para CI/CD)

**Verificar que el usuario se creó correctamente:**

```bash
# En el servidor
grep deploy /etc/passwd
# Debe mostrar: deploy:x:1001:1001:Deploy User:/home/deploy:/usr/sbin/nologin

# Verificar grupos
groups deploy
# Debe mostrar: deploy : docker sudo
```

### Paso 2: Crear Secrets en GitHub

En **GitHub → Settings → Secrets and variables → Actions**, agregar estos 3 secrets:

#### **Secret 1: EC2_HOST**

```
Nombre:  EC2_HOST
Valor:   tu-ip-publica  (ej: 54.123.45.67)
         o tu-dominio   (ej: deploy.tu-dominio.com)
```

#### **Secret 2: EC2_USER**

```
Nombre:  EC2_USER
Valor:   deploy
```

#### **Secret 3: EC2_SSH_KEY** ⚠️ MÁS IMPORTANTE

```bash
# En tu máquina LOCAL
# Copiar contenido COMPLETO de la clave privada
cat ~/github-deploy-key
```

**Salida (ejemplo):**

```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUtbm9uZS1ub25lAAAAAAAAABIAAAAzAAAAC2Vj
ZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABIBBzUd5xhSoKlT0Qy...
[muchas líneas más]
-----END OPENSSH PRIVATE KEY-----
```

**En GitHub:**

1. Ir a Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Nombre: `EC2_SSH_KEY`
4. Valor: Pegar **TODOS LOS CARACTERES** (desde `-----BEGIN` hasta `-----END`)
5. Click "Add secret"

**Verificar Secrets creados:**

```bash
# En terminal
gh secret list

# Salida esperada:
# EC2_HOST       Updated 2 minutes ago
# EC2_SSH_KEY    Updated 1 minute ago
# EC2_USER       Updated 1 minute ago
```

### Paso 3: Verificar Configuración SSH

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

### Script de Despliegue: `deploy-compose.sh` (AUTOMÁTICO)

**Ubicación:** `/home/deploy/app/sistema-de-asistencia/deploy-compose.sh`

**El script hace TODO automáticamente. Solo necesitas ejecutar:**

```bash
cd /home/deploy/app/sistema-de-asistencia
bash deploy-compose.sh [opción]
```

### Opciones Disponibles

```bash
# Opción 1: Despliegue completo (recomendado)
bash deploy-compose.sh both
# o sin parámetro (por defecto es 'both')
bash deploy-compose.sh

# Opción 2: Actualizar solo el cliente
bash deploy-compose.sh client

# Opción 3: Actualizar solo la API
bash deploy-compose.sh server
```

### Qué hace el Script Automáticamente

El script realiza estos pasos **sin intervención manual:**

1. ✅ **Valida requisitos**

   - Docker ¿instalado?
   - Git ¿instalado?
   - Docker Compose ¿disponible?

2. ✅ **Actualiza repositorio**

   - `git fetch` desde origin
   - `git reset --hard`
   - Siempre sincronizado con main

3. ✅ **Genera certificados SSL**

   - Crea `/certs/cert.pem` y `/certs/key.pem` (si no existen)
   - Válidos por 365 días
   - Autofirmados (reemplaza con Let's Encrypt en producción)

4. ✅ **Valida configuración**

   - ¿Existe `.env`?
   - ¿Existe `docker-compose.yml`?
   - ¿Existe `nginx.conf`?
   - ¿Variables críticas seteadas?

5. ✅ **Maneja contenedores**

   - Detiene contenedores antiguos
   - Los remueve completamente
   - Compila nuevas imágenes
   - Inicia servicios en orden correcto

6. ✅ **Verifica salud de servicios**

   - Espera a que API esté `healthy`
   - Espera a que Cliente esté `healthy`
   - Verifica Nginx está operacional
   - Timeout automático después de 3 minutos

7. ✅ **Limpia recursos**

   - Remueve imágenes sin usar
   - Optimiza espacio en disco

8. ✅ **Muestra resumen final**
   - URLs de acceso
   - Estado de contenedores
   - Ubicación de logs

### Salida Típica del Script

```
╔════════════════════════════════════════════════════════════════╗
║   🔥 SISTEMA DE ASISTENCIA - DOCKER COMPOSE DEPLOY 🔥       ║
╚════════════════════════════════════════════════════════════════╝

▶ 🔍 Validaciones Iniciales
[2025-11-09 04:20:36] ℹ️ Tipo de despliegue: both
[2025-11-09 04:20:36] ✅ Requisitos verificados: Docker, Git, Docker Compose

▶ 📥 Actualizando Repositorio
[2025-11-09 04:20:37] ✅ Repositorio actualizado
[2025-11-09 04:20:37] ✅ Ubicado en: /home/deploy/app/sistema-de-asistencia

▶ 🔐 Verificando Certificados SSL
[2025-11-09 04:20:37] ℹ️ Certificados SSL encontrados

▶ ⚙️ Cargando Configuración
[2025-11-09 04:20:37] ✅ Configuración cargada correctamente

▶ 🔄 Iniciando Actualización Selectiva
[2025-11-09 04:20:37] ℹ️ Usando: docker compose
[2025-11-09 04:20:37] ℹ️ Actualizando CLIENT + SERVER + NGINX...
[2025-11-09 04:20:38] ✅ Todos los servicios compilados e iniciados
[2025-11-09 04:20:45] ✅ api está listo
[2025-11-09 04:20:48] ✅ client está listo
[2025-11-09 04:20:50] ✅ Todos los servicios están operacionales ✓

▶ 🧹 Limpiando Recursos
[2025-11-09 04:20:51] ✅ Limpieza completada

▶ 📊 Estado de Contenedores
CONTAINER ID   IMAGE                    STATUS
a1b2c3d4       sistema-asistencia-api   Up 10s (healthy)
e5f6g7h8       sistema-asistencia-client Up 8s (healthy)
i9j0k1l2       nginx:alpine             Up 5s (healthy)

🌐 ACCESO A SERVICIOS
├─ Cliente (Frontend): http://54.123.45.67
├─ API (Backend): http://54.123.45.67/api/docs
└─ WebSocket: ws://54.123.45.67/api/socket.io

🎉 ¡Despliegue finalizado!
```

### Troubleshooting del Script

```bash
# Si el script falla, ver logs completos
tail -100 ~/.deploy/logs/deploy_*.log

# Ver log del último despliegue
ls -lt ~/.deploy/logs/ | head -1

# Detener todo y reintentar
docker compose down
bash deploy-compose.sh both
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

---

## 🐛 Troubleshooting - Errores Comunes

### ❌ Advertencia: `DATABASE_URL no está configurada`

**Causa:** El script utiliza validación robusta mediante `grep` para verificar que `DATABASE_URL` esté presente y no sea un placeholder.

**Situaciones:**

- ✅ **DATABASE_URL realmente está configurada** → Se muestra en los logs como `DATABASE_URL configurada ✓`
- ⚠️ **DATABASE_URL es un placeholder** (ej: `your-database-url-here`) → Se muestra advertencia
- ❌ **DATABASE_URL está vacía o falta** → Se muestra advertencia

**Solución:**

```bash
# Verificar que .env tiene DATABASE_URL configurada:
grep "^DATABASE_URL=" .env

# Si sale vacío, agregar una URL válida
# Ejemplo con Neon PostgreSQL:
DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require

# Luego redeploy
./deploy-compose.sh both
```

**IMPORTANTE:** La advertencia es **informativa**, el deploy continúa porque:

- En desarrollo, puede ser `sqlite://`
- En producción, debe ser una URL PostgreSQL válida
- El API puede tener defaults internos

**Causa:** `docker-compose.yml` tiene la línea `version: '3.8'` que ya no es necesaria.

**Solución:**

```bash
# Ya está corregido en este proyecto
# Si lo ves, simplemente elimina la línea version: del docker-compose.yml
```

### ❌ Error: `docker: command not found`

**Causa:** Docker no está instalado en el servidor.

**Solución:**

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker deploy
```

### ❌ Error: `Cannot connect to Docker daemon`

**Causa:** El usuario `deploy` no está en el grupo `docker`.

**Solución:**

```bash
# En el servidor como root
sudo usermod -aG docker deploy

# O como usuario deploy
newgrp docker
```

### ❌ Error: `database connection refused`

**Causa:** DATABASE_URL no está configurada o es incorrecta en `.env`.

**Solución:**

```bash
# Verificar .env
cat .env | grep DATABASE_URL

# Debe ser algo como:
# DATABASE_URL=postgresql://user:pass@db-host:5432/dbname

# Luego redeploy
./deploy-compose.sh server
```

### ❌ Error: `SSL: CERTIFICATE_VERIFY_FAILED`

**Causa:** Certificados SSL no existen o son inválidos.

**Solución:**

```bash
# El script genera automáticamente certificados autofirmados
# Para usar certificados válidos en producción:
# 1. Obtener certificados de Let's Encrypt
# 2. Copiar a ./certs/cert.pem y ./certs/key.pem
# 3. Reiniciar nginx

docker compose restart nginx
```

### ❌ Error: `Port 80 already in use`

**Causa:** Otro proceso está usando el puerto 80.

**Solución:**

```bash
# Verificar qué está usando el puerto 80
sudo lsof -i :80

# Detener el servicio conflictivo o cambiar puerto en docker-compose.yml
# En docker-compose.yml, cambiar:
#   ports:
#     - "8080:80"  # Cambiar 80 por 8080 (o cualquier otro)
```

### ❌ Error: `Timeout esperando servicios`

**Causa:** Servicios tardando más de 180 segundos en iniciarse (pueden ser recursos insuficientes o errores en healthchecks).

**Solución:**

```bash
# Ver logs detallados
docker compose logs -f

# Verificar recursos disponibles
free -h
df -h

# Si es insuficiente, aumentar especificaciones de EC2
```

### ⏱️ Error: `No space left on device`

**Causa:** El disco está lleno.

**Solución:**

```bash
# Limpiar imágenes y volúmenes Docker antiguos
docker system prune -a --volumes

# Ver uso de disco
du -sh /var/lib/docker/*

# Aumentar volumen de EBS en AWS
```

---

## 🔒 Notas de Seguridad - Vulnerabilidades Resueltas

### ✅ Vulnerabilidades Docker (RESUELTAS en v2.0)

| Problema                   | Anterior                     | Ahora                     | Estado      |
| -------------------------- | ---------------------------- | ------------------------- | ----------- |
| **Node.js Image**          | `node:20-alpine` (HIGH vuln) | `node:22-alpine`          | ✅ Resuelto |
| **Python Runtime**         | `python:3.11-slim`           | `python:3.12-slim`        | ✅ Resuelto |
| **Docker Compose Version** | `version: '3.8'` (obsoleto)  | Sin versión (v2 nativa)   | ✅ Resuelto |
| **Healthcheck Logic**      | Complejo y frágil            | Simple y robusto con curl | ✅ Mejorado |
| **Error Handling**         | Sin trap handlers            | Con `trap_error`          | ✅ Mejorado |

### 🔐 Recomendaciones Adicionales

**Para Producción:**

1. **Certificados SSL válidos:**

   ```bash
   # Usar Let's Encrypt en lugar de autofirmados
   sudo apt-get install certbot python3-certbot-nginx
   sudo certbot certonly --standalone -d tu-dominio.com
   # Copiar a ./certs/
   ```

2. **Firewall:**

   ```bash
   # En AWS Security Groups, permitir solo:
   # - Puerto 80 (HTTP) desde 0.0.0.0/0
   # - Puerto 443 (HTTPS) desde 0.0.0.0/0
   # - Puerto 22 (SSH) desde tu IP solamente
   ```

3. **Database:**

   ```bash
   # Usar AWS RDS en lugar de contenedor local
   # En .env:
   DATABASE_URL=postgresql://admin:SecurePass@db-prod.123456789.us-east-1.rds.amazonaws.com:5432/asistencia
   ```

4. **Monitoreo:**

   ```bash
   # Ver logs en tiempo real
   docker compose logs -f

   # Alertas automáticas (requiere configuración adicional)
   # Considerar: CloudWatch, DataDog, New Relic
   ```

---

## ✅ Checklist de Despliegue Exitoso

Después de ejecutar `./deploy-compose.sh both`, verificar:

- [ ] `docker compose ps` muestra todos los servicios en estado `Up`
- [ ] `curl http://localhost` retorna HTML del cliente (código 200)
- [ ] `curl http://localhost/api/health` retorna `{"status": "ok"}`
- [ ] WebSocket accesible: `wscat -c ws://localhost/api/socket.io`
- [ ] Logs sin errores críticos: `docker compose logs`
- [ ] Base de datos conectada: `curl http://localhost/api/users`
- [ ] Certificados generados: `ls -la ./certs/`
- [ ] .env contiene valores de producción (no hardcoded en código)

---

## 🎯 Próximos Pasos

**Después del primer despliegue exitoso:**

1. ✅ Configurar dominio en DNS
2. ✅ Obtener certificados SSL válidos (Let's Encrypt)
3. ✅ Configurar backups automáticos de base de datos
4. ✅ Monitoreo y alertas (CloudWatch, DataDog, etc.)
5. ✅ Documentar runbooks para emergencias
6. ✅ Entrenar equipo en CI/CD y troubleshooting

### Recursos Útiles

- 📖 [Docker Compose Docs](https://docs.docker.com/compose/)
- 📖 [GitHub Actions Docs](https://docs.github.com/en/actions)
- 📖 [Nginx Reverse Proxy](https://nginx.org/en/docs/)
- 📖 [Socket.IO CORS](https://socket.io/docs/v4/handling-cors/)
- 🐳 [GHCR Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)

---

**Documento actualizado:** 8 de noviembre, 2025  
**Versión:** 1.0 - Despliegue con Sockets sin restricción CORS
