# 🚀 Guía Completa de Despliegue - Sistema de Asistencia

**Última actualización:** 8 de noviembre de 2025

---

## 📋 Tabla de Contenidos

1. [Setup Inicial en EC2](#setup-inicial-en-ec2)
2. [Estructura de Archivos](#estructura-de-archivos)
3. [Variables de Entorno](#variables-de-entorno)
4. [Docker y Docker Compose](#docker-y-docker-compose)
5. [CI/CD con GitHub Actions](#cicd-con-github-actions)
6. [Scripts de Despliegue](#scripts-de-despliegue)
7. [Nginx - Reverse Proxy](#nginx---reverse-proxy)
8. [Desarrollo Local](#desarrollo-local)
9. [Producción](#producción)
10. [Troubleshooting](#troubleshooting)
11. [Checklist](#checklist)

---

## Setup Inicial en EC2

### 1️⃣ Conexión Inicial

```bash
# Conectar a tu instancia EC2
ssh -i tu-clave.pem ubuntu@tu-ip-ec2

# Actualizar sistema
sudo apt-get update && sudo apt-get upgrade -y
```

### 2️⃣ Instalar Dependencias Esenciales

```bash
# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Agregar usuario al grupo docker (para no usar sudo)
sudo usermod -aG docker $USER
newgrp docker

# Instalar Git
sudo apt-get install -y git

# Crear directorios necesarios
mkdir -p /home/deploy/app
mkdir -p /var/log/deploy
```

### 3️⃣ Configurar Acceso a GitHub

```bash
# Generar clave SSH para GitHub
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N ""

# Ver la clave pública
cat ~/.ssh/id_ed25519.pub

# AGREGAR A GITHUB:
# 1. Ir a: GitHub > Settings > Deploy keys > Add deploy key
# 2. Pegar el contenido de id_ed25519.pub
# 3. Marcar "Allow write access"
```

### 4️⃣ Agregar GitHub a known_hosts

```bash
ssh-keyscan -H github.com >> ~/.ssh/known_hosts
```

### 5️⃣ Clonar Repositorio

```bash
cd /home/deploy/app
git clone git@github.com:2004Style/sistema-de-asistencia.git
cd sistema-de-asistencia/server
```

### 6️⃣ Configurar Variables de Entorno

```bash
# Copiar plantilla de ejemplo
cp .env.example .env

# Editar variables críticas
nano .env
```

**Variables críticas a cambiar:**

```env
# Base de datos EXTERNA (RDS en AWS)
DATABASE_URL=postgresql://rdev:PASSWORD_SEGURA@rds-endpoint.amazonaws.com:5432/asistencia

# Seguridad - GENERAR NUEVA CLAVE
# Comando: python -c "import secrets; print(secrets.token_urlsafe(32))"
SECRET_KEY=tu-clave-secreta-aleatoria-muy-larga-aqui

# Nunca activar en producción
DEBUG=false

# Mail API
MAIL_API_URL=https://api.mail-service.com
MAIL_API_CLIENT_ID=tu-client-id
MAIL_API_SECRET=tu-api-secret
SMTP_FROM_EMAIL=noreply@tudominio.com
```

### 7️⃣ Dar Permisos a Scripts

```bash
chmod +x deploy-aws-ec2.sh
chmod +x run.sh
chmod +x docker.sh
```

### 8️⃣ Verificar Instalación

```bash
docker --version
docker-compose --version
git --version
python3 --version
```

---

## Estructura de Archivos

```
/home/deploy/app/sistema-de-asistencia/
├── server/                                 # Carpeta principal
│   ├── DEPLOYMENT-COMPLETE.md             # Esta documentación
│   ├── .env                               # Variables de entorno (NO commitear)
│   ├── .env.example                       # Plantilla de ejemplo
│   ├── .env.production                    # Plantilla para producción
│   ├── .dockerignore                      # Archivos a ignorar en Docker
│   ├── .gitignore                         # Archivos a ignorar en Git
│   │
│   ├── Dockerfile                         # Construcción de imagen Docker
│   ├── docker-compose.yml                 # Compose para DESARROLLO
│   ├── docker-compose-production.yml      # Compose para PRODUCCIÓN
│   ├── nginx.conf                         # Configuración de Nginx (reverse proxy)
│   │
│   ├── docker.sh                          # CLI para Docker (helpers)
│   ├── run.sh                             # Script para iniciar servidor
│   ├── deploy-aws-ec2.sh                  # Script de despliegue en EC2
│   ├── migrations_helper.sh               # Helper para migraciones
│   ├── test_integration.sh                # Tests de integración
│   ├── test_unit.sh                       # Tests unitarios
│   │
│   ├── main.py                            # Entrada principal de FastAPI
│   ├── requirements.txt                   # Dependencias Python
│   ├── pytest.ini                         # Configuración de pytest
│   │
│   ├── seed_roles.py                      # Datos iniciales de roles
│   ├── seed_turnos.py                     # Datos iniciales de turnos
│   ├── seed_users.py                      # Datos iniciales de usuarios
│   │
│   ├── alembic.ini                        # Configuración de migraciones
│   ├── alembic/                           # Migraciones de BD
│   ├── src/                               # Código fuente
│   ├── tests/                             # Tests
│   ├── public/                            # Archivos estáticos/reportes
│   └── recognize/                         # Módulo de reconocimiento facial
│
├── client/                                 # Frontend Next.js
├── esp32/                                  # Firmware ESP32
└── .github/
    └── workflows/
        └── deploy.yml                      # Workflow de GitHub Actions
```

---

## Variables de Entorno

### 📁 Jerarquía de Archivos `.env`

| Archivo           | Propósito                      | Commitear          |
| ----------------- | ------------------------------ | ------------------ |
| `.env.example`    | Plantilla con documentación    | ✅ Sí              |
| `.env.production` | Plantilla para producción      | ✅ Sí              |
| `.env`            | Variables reales de desarrollo | ❌ No (.gitignore) |

### 🔐 Variables Críticas

#### Base de Datos

```env
# Desarrollo (PostgreSQL local)
DATABASE_URL=postgresql://rdev:rdev@localhost:5432/asistencia

# Producción (RDS externo)
DATABASE_URL=postgresql://rdev:PASSWORD@rds-endpoint.amazonaws.com:5432/asistencia

# Auto-migración
AUTO_MIGRATE=true  # Solo desarrollo
AUTO_MIGRATE=false # Producción (usar CI/CD)
```

#### Seguridad

```env
# JWT Secret Key - GENERAR CON:
# python -c "import secrets; print(secrets.token_urlsafe(32))"
SECRET_KEY=your-secret-key-change-in-production-REPLACE-ME

# Debug (NUNCA true en producción)
DEBUG=True   # Desarrollo
DEBUG=false  # Producción
```

#### API FastAPI

```env
HOST=0.0.0.0     # Escuchar en todas las interfaces
PORT=8000        # Puerto interno
TIMEZONE=America/Lima
```

#### Correo Electrónico

```env
MAIL_API_URL=http://localhost:3001          # Desarrollo
MAIL_API_URL=https://api.mail-service.com   # Producción

MAIL_API_CLIENT_ID=cli_xxxxx
MAIL_API_SECRET=sk_live_xxxxx

SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_FROM_NAME=Sistema de Asistencia
```

#### Archivos y Directorios

```env
MAX_FILE_SIZE=10485760          # 10 MB
UPLOAD_DIR=recognize/data        # Datos de reconocimiento
REPORTS_DIR=public/reports       # Reportes generados
TEMP_DIR=public/temp             # Archivos temporales
PASSWORD_MIN_LENGTH=8
```

#### Alertas y Umbrales

```env
TARDANZAS_MAX_ALERTA=3          # Máximo de tardanzas
FALTAS_MAX_ALERTA=2             # Máximo de faltas
MINUTOS_TARDANZA=15             # Minutos para contar como tardanza
```

---

## Docker y Docker Compose

### 🐳 Dockerfile

El Dockerfile utiliza **multi-stage build** para optimizar la imagen:

```dockerfile
# Stage 1: Builder
# - Instala build-essentials y libpq-dev
# - Instala dependencias Python

# Stage 2: Runtime
# - Copia dependencias del builder
# - Instala solo librerías necesarias en runtime
# - Expone puerto 8000
# - Ejecuta run.sh

HEALTHCHECK: Verifica http://localhost:8000/docs cada 30s
```

**Ventajas:**

- ✅ Imagen más pequeña (~800MB → ~400MB)
- ✅ Más seguro (sin herramientas de build en runtime)
- ✅ Inicia más rápido

### 📦 Docker Compose - Desarrollo

**Archivo:** `docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:15-alpine
    ports: 5432:5432
    environment:
      POSTGRES_USER: asistencia
      POSTGRES_PASSWORD: changeme
      POSTGRES_DB: sistema_asistencia
    healthcheck: Verifica estado de BD

  api:
    build: ./
    ports: 8000:8000
    environment:
      DATABASE_URL: postgresql://asistencia:changeme@postgres:5432/sistema_asistencia
      AUTO_MIGRATE: "true"
      SECRET_KEY: tu-clave
      DEBUG: false
    volumes:
      - ./public:/app/public
      - ./recognize/data:/app/recognize/data
    depends_on:
      postgres: condition: service_healthy

  nginx:
    image: nginx:alpine
    ports: 80:80 / 443:443
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - api
```

**Características:**

- ✅ PostgreSQL 15 Alpine (ligero)
- ✅ Espera a que BD esté lista
- ✅ Auto-migraciones habilitadas
- ✅ Volúmenes para persistencia
- ✅ Nginx como reverse proxy

### 📦 Docker Compose - Producción

**Archivo:** `docker-compose-production.yml`

**Cambios principales:**

```yaml
# ❌ SIN PostgreSQL local
# ✅ DATABASE_URL apunta a RDS externo

api:
  environment:
    DATABASE_URL: postgresql://rdev:PASSWORD@rds-endpoint:5432/asistencia
    AUTO_MIGRATE: false # Migraciones vía CI/CD
    DEBUG: false
    # Mail API real
    MAIL_API_URL: https://api.mail-service.com
# ✅ Nginx escucha en 80:80 (HTTP) y 443:443 (HTTPS con SSL)
```

### 🚀 Comandos Docker

```bash
# Desarrollo - Levantar todo
docker-compose up -d

# Desarrollo - Ver logs
docker-compose logs -f api
docker-compose logs -f postgres

# Desarrollo - Detener
docker-compose down

# Desarrollo - Rebuild
docker-compose build --no-cache

# Producción - Levantar
docker-compose -f docker-compose-production.yml up -d

# Ver estado
docker ps
docker ps -a

# Entrar a contenedor
docker exec -it sistema-asistencia-api bash

# BD - Entrar a consola PostgreSQL
docker exec -it sistema-asistencia-db psql -U asistencia -d sistema_asistencia
```

---

## CI/CD con GitHub Actions

### 📁 Archivo: `.github/workflows/deploy.yml`

El workflow está dividido en **3 jobs**:

#### Job 1: 🧪 Tests

```yaml
runs-on: ubuntu-latest

services:
  postgres:
    image: postgres:15-alpine
    env:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: test_db

steps:
  1. Checkout código
  2. Setup Python 3.11 con cache pip
  3. Instalar requirements.txt
  4. Ejecutar: pytest tests/ -v --cov=src
  5. Enviar cobertura a codecov.io
```

**Ejecuta:** Siempre que hay push a `main` o PR

**Falla:** El despliegue no continúa si tests fallan ❌

#### Job 2: 🔨 Build Docker

```yaml
needs: test  # Espera a que tests pasen

steps:
  1. Setup Docker Buildx
  2. Login a GitHub Container Registry (ghcr.io)
  3. Extraer metadata (tags, versiones)
  4. Build & Push imagen Docker
     - Tags: branch, semver, git sha
     - Cache: GitHub Actions cache
```

**Ejecuta:** Solo después de tests exitosos

**Push a:** ghcr.io/2004style/sistema-asistencia

#### Job 3: 🚀 Deploy a EC2

```yaml
needs: build
if: github.event_name == 'push' && github.ref == 'refs/heads/main'

steps: 1. Setup SSH
  - Crear ~/.ssh/deploy_key
  - ssh-keyscan github.com
  2. Ejecutar script remoto
  - ssh usuario@host deploy-aws-ec2.sh
  3. Notificar éxito/error
```

**Ejecuta:** Solo cuando:

- ✅ Build fue exitoso
- ✅ Es un push (no PR)
- ✅ Es rama `main`

### 🔐 Secrets Necesarios en GitHub

Ir a: **Settings > Secrets and variables > Actions**

Crear 3 secrets:

| Secret        | Valor             | Ejemplo                          |
| ------------- | ----------------- | -------------------------------- |
| `EC2_HOST`    | IP pública de EC2 | `54.123.45.67`                   |
| `EC2_USER`    | Usuario SSH       | `ubuntu`                         |
| `EC2_SSH_KEY` | Clave privada SSH | Contenido de `~/.ssh/id_ed25519` |

**Cómo obtener la clave privada:**

```bash
# En EC2
cat ~/.ssh/id_ed25519
# Copiar COMPLETO (incluir -----BEGIN----)
```

### 📊 Flujo de Despliegue

```
git push origin main
         ↓
GitHub Actions inicia
         ↓
├─→ Job 1: Tests (pytest)
│   ├─→ Setup BD test
│   ├─→ Instalar dependencias
│   ├─→ Ejecutar tests
│   └─→ Enviar cobertura
│
├─→ Job 2: Build Docker (después de Job 1)
│   ├─→ Build imagen
│   ├─→ Login a ghcr.io
│   └─→ Push imagen con tags
│
└─→ Job 3: Deploy (después de Job 2)
    ├─→ Setup SSH
    ├─→ Conectar a EC2
    ├─→ Ejecutar deploy-aws-ec2.sh
    └─→ Notificar resultado
```

---

## Scripts de Despliegue

### 📝 run.sh - Iniciador del Servidor

**Propósito:** Iniciar la API con validaciones y seeds

**Pasos:**

1. **Banner:** Mostrar información
2. **Verificar entorno virtual:** Activar si existe
3. **Verificar Python:** Mostrar versión
4. **Verificar dependencias:** Instalar si faltan
5. **Ejecutar seeds:**
   - `seed_roles.py` - Roles del sistema
   - `seed_turnos.py` - Turnos de trabajo
   - `seed_users.py` - Usuarios iniciales
6. **Iniciar servidor:** `uvicorn main:asgi_app --host 0.0.0.0 --port 8000`

**Uso:**

```bash
./run.sh  # Inicia el servidor
```

**En Docker:**

```yaml
# Dockerfile
CMD ["./run.sh"]
```

### 📝 docker.sh - CLI Helper

**Propósito:** Facilitar comandos docker-compose comunes

**Comandos disponibles:**

```bash
./docker.sh up           # Levanta servicios
./docker.sh down         # Detiene servicios
./docker.sh logs         # Ver logs de API
./docker.sh logs-db      # Ver logs de BD
./docker.sh restart      # Reiniciar servicios
./docker.sh build        # Reconstruir imágenes

# Base de datos
./docker.sh db-shell     # Consola PostgreSQL
./docker.sh db-backup    # Hacer backup
./docker.sh db-restore FILE.sql  # Restaurar backup

# Desarrollo
./docker.sh bash         # Bash en contenedor API
./docker.sh test         # Ejecutar tests
./docker.sh test-cov     # Tests con cobertura

# Estado
./docker.sh ps           # Ver contenedores
./docker.sh env          # Ver variables de entorno
./docker.sh clean        # Limpiar contenedores/volúmenes
./docker.sh help         # Ver esta ayuda
```

**Ejemplos:**

```bash
# Desarrollo
./docker.sh up
./docker.sh logs

# Backup de BD
./docker.sh db-backup
# Crea: backup_20251108_153045.sql

# Tests
./docker.sh test
./docker.sh test-cov  # Genera htmlcov/index.html
```

### 📝 deploy-aws-ec2.sh - Script de Despliegue

**Propósito:** Desplegar la aplicación en EC2 (ejecutado por GitHub Actions o manual)

**Flujo:**

```
1. Verificaciones iniciales
   ├─ Docker instalado
   ├─ Git instalado
   └─ Permisos en directorio

2. Clonar/actualizar repositorio
   ├─ Si no existe: git clone
   └─ Si existe: git pull

3. Navegar a carpeta server

4. Cargar variables de entorno (.env)

5. Verificar conectividad BD

6. Construir imagen Docker
   └─ docker build -t sistema-asistencia:latest .

7. Detener contenedor anterior
   └─ docker rm -f sistema-asistencia-api

8. Iniciar nuevo contenedor
   ├─ docker-compose up -d (RECOMENDADO)
   └─ O: docker run... (fallback)

9. Esperar a que API responda
   └─ Máximo 30 intentos (60 segundos)

10. Limpiar imágenes antiguas
    └─ docker image prune -f --filter "until=24h"

Salida: Logs en /var/log/deploy/deploy_TIMESTAMP.log
```

**Configuración:**

```bash
APP_DIR="/home/deploy/app/sistema-de-asistencia"
CONTAINER_NAME="sistema-asistencia-api"
LOG_DIR="/var/log/deploy"
API_PORT="8000"
```

**Usar:**

```bash
# Manual en EC2
cd /home/deploy/app/sistema-de-asistencia/server
./deploy-aws-ec2.sh

# Ver logs
tail -f /var/log/deploy/deploy_*.log

# Automático
# GitHub Actions ejecuta: ssh usuario@host 'bash /path/deploy-aws-ec2.sh'
```

---

## Nginx - Reverse Proxy

### 📝 nginx.conf

**Propósito:** Actuar como reverse proxy entre clientes e API

**Configuración:**

```nginx
upstream api {
    server api:8000;  # Apunta al contenedor API
}

server {
    listen 80;        # HTTP
    server_name _;    # Cualquier dominio
}
```

### 🔀 Rutas Configuradas

#### 1. `/health` - Monitoreo

```nginx
location /health {
    access_log off;
    proxy_pass http://api/docs;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

**Uso:** Verificar si API está viva

```bash
curl http://tu-servidor/health
```

#### 2. `/` - Todas las rutas

```nginx
location / {
    proxy_pass http://api;

    # Headers importantes
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # WebSocket support
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";

    # Timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
}
```

### 🔒 HTTPS (Opcional)

Descomentar en nginx.conf para habilitar:

```nginx
server {
    listen 443 ssl http2;
    server_name tu-dominio.com;

    ssl_certificate /etc/nginx/certs/cert.pem;
    ssl_certificate_key /etc/nginx/certs/key.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Mismas rutas que HTTP
}

# Redirección HTTP → HTTPS
server {
    listen 80;
    server_name tu-dominio.com;
    return 301 https://$server_name$request_uri;
}
```

### 📊 Compresión y Optimización

```nginx
# Compresión
gzip on;
gzip_types text/plain text/css text/javascript application/json;
gzip_min_length 1000;

# Límite de uploads
client_max_body_size 100M;

# Logs
access_log /var/log/nginx/access.log;
error_log /var/log/nginx/error.log;
```

---

## Desarrollo Local

### 🚀 Opción A: Con Docker Compose

```bash
# 1. Clonar repositorio
git clone git@github.com:2004Style/sistema-de-asistencia.git
cd sistema-de-asistencia/server

# 2. Crear .env
cp .env.example .env
# Editar si es necesario (por defecto funciona)

# 3. Levantar servicios
docker-compose up -d

# 4. Ver logs
docker-compose logs -f api

# 5. Acceder
# API: http://localhost:8000/docs
# Swagger UI: http://localhost:8000/redoc
# BD: localhost:5432 (user: asistencia, pass: changeme)
```

**Comandos útiles:**

```bash
# Entrar a consola BD
./docker.sh db-shell

# Backup BD
./docker.sh db-backup

# Reiniciar servicios
./docker.sh restart

# Ver logs
./docker.sh logs

# Limpiar todo
./docker.sh clean
```

### 🚀 Opción B: Sin Docker (Entorno Local)

```bash
# 1. Requisitos
# - Python 3.11+
# - PostgreSQL 15+
# - pip

# 2. Crear entorno virtual
python3.11 -m venv venv
source venv/bin/activate  # Linux/Mac
# o: venv\Scripts\activate  # Windows

# 3. Instalar dependencias
pip install -r requirements.txt

# 4. Configurar BD
# Editar .env
DATABASE_URL=postgresql://rdev:rdev@localhost:5432/asistencia

# 5. Crear BD (si no existe)
createdb -U rdev asistencia

# 6. Ejecutar migraciones
alembic upgrade head

# 7. Ejecutar seeds (opcional)
python seed_roles.py
python seed_turnos.py
python seed_users.py

# 8. Iniciar servidor
python main.py
# O: uvicorn main:asgi_app --reload

# 9. Acceder
# http://localhost:8000/docs
```

### ✅ Tests en Desarrollo

```bash
# Con Docker
./docker.sh test
./docker.sh test-cov

# Local (sin Docker)
pytest tests/ -v
pytest tests/ --cov=src --cov-report=html

# Ver cobertura
open htmlcov/index.html
```

---

## Producción

### 🏭 Arquitectura en EC2

```
┌─────────────────────────────────────┐
│  Clientes (Internet)                │
└───────────────┬─────────────────────┘
                │
        ┌───────▼─────────┐
        │ Nginx (80/443)  │  ◄─── Reverse Proxy
        │ (Container)     │
        └───────┬─────────┘
                │
        ┌───────▼──────────┐
        │ API FastAPI      │  ◄─── Docker Container
        │ (puerto 8000)    │       run.sh → uvicorn
        └───────┬──────────┘
                │
        ┌───────▼──────────────┐
        │ PostgreSQL (RDS)     │  ◄─── Base de datos
        │ Servidor externo     │       en AWS RDS
        └──────────────────────┘
```

### 🔧 Setup Producción

#### Paso 1: EC2 Preparada

```bash
# Verificar que EC2 tiene:
✅ Docker instalado
✅ Git instalado
✅ Repositorio clonado en /home/deploy/app
✅ .env configurado con:
   - DATABASE_URL de RDS
   - SECRET_KEY segura
   - DEBUG=false
   - MAIL_API credenciales reales
✅ Scripts ejecutables (chmod +x)
```

#### Paso 2: Desplegar

**Opción A: Manual**

```bash
ssh -i clave.pem ubuntu@tu-ip-ec2
cd /home/deploy/app/sistema-de-asistencia/server
./deploy-aws-ec2.sh

# Ver logs
tail -f /var/log/deploy/deploy_*.log
```

**Opción B: Automático (Recomendado)**

```bash
# Local
git add server/
git commit -m "cambios producción"
git push origin main

# GitHub Actions ejecuta automáticamente:
# 1. Tests
# 2. Build Docker
# 3. Deploy a EC2 vía SSH
```

#### Paso 3: Verificar Despliegue

```bash
# Ver contenedores
docker ps

# Ver logs
docker logs -f sistema-asistencia-api

# Ver estado de BD
docker exec sistema-asistencia-api python -c \
  "from src.utils.db import check_connection; check_connection()"

# Probar API
curl http://localhost:8000/docs
curl http://localhost:8000/health

# Probar Nginx
curl http://tu-ip-ec2/docs
```

### 📊 Monitoreo en Producción

```bash
# Ver estado de contenedores
docker ps
docker stats

# Ver logs
docker logs -f sistema-asistencia-api | grep -i "error"

# Ver uso de disco
df -h

# Backup BD (cron job recomendado)
docker exec sistema-asistencia-api pg_dump -U rdev \
  asistencia > /backups/asistencia_$(date +%Y%m%d).sql

# Monitoreo de CloudWatch (AWS)
# 1. Ir a AWS > CloudWatch
# 2. Ver logs de EC2
# 3. Configurar alertas
```

### 🔄 Updates en Producción

```bash
# Local - hacer cambios
git add .
git commit -m "Descripción de cambios"
git push origin main

# GitHub Actions hace el resto automáticamente:
# ✅ Tests
# ✅ Build nueva imagen
# ✅ Deploy a EC2

# Manual si necesario
./deploy-aws-ec2.sh
```

---

## Troubleshooting

### ❌ Error: "Connection refused" - Base de Datos

**Síntoma:**

```
psycopg2.OperationalError: could not connect to server
```

**Soluciones:**

```bash
# 1. Verificar BD con Docker
docker-compose ps postgres
docker-compose logs postgres

# 2. Verificar DATABASE_URL
grep DATABASE_URL .env

# 3. Probar conexión
docker-compose exec api python -c \
  "import psycopg2; psycopg2.connect(os.getenv('DATABASE_URL'))"

# 4. Si usa RDS:
# - Verificar security group permite conexión desde EC2
# - Verificar endpoint RDS es correcto
# - Verificar credenciales

# 5. Reiniciar servicios
docker-compose down
docker-compose up -d
```

### ❌ Error: "Permission denied" - Scripts

**Síntoma:**

```
bash: ./deploy-aws-ec2.sh: Permission denied
```

**Solución:**

```bash
chmod +x deploy-aws-ec2.sh
chmod +x run.sh
chmod +x docker.sh

# Verificar
ls -la *.sh
```

### ❌ Error: "Cannot find Dockerfile"

**Síntoma:**

```
ERROR: failed to build: docker.io/docker/dockerfile:1 error
```

**Solución:**

```bash
# Verificar ubicación
pwd  # Debe ser: /ruta/a/servidor

# Verificar archivo existe
ls -la Dockerfile

# Reconstruir
docker-compose build --no-cache
```

### ❌ Error: "Tests failing" - CI/CD

**Síntoma:** GitHub Actions falla en Job 1 (Tests)

**Solución:**

```bash
# 1. Ejecutar tests localmente
docker-compose exec api pytest tests/ -v

# 2. Ver qué falla
docker-compose logs api

# 3. Revisar .env de test
# En deploy.yml se usa BD test en postgres:15-alpine

# 4. Commit fix localmente
git add .
git commit -m "fix tests"
git push origin main
```

### ❌ Error: "SSH key rejected" - Deploy

**Síntoma:** GitHub Actions falla en Job 3 (Deploy)

**Solución:**

```bash
# 1. Verificar secrets en GitHub
# Settings > Secrets > EC2_HOST, EC2_USER, EC2_SSH_KEY

# 2. Verificar clave privada es correcta
cat ~/.ssh/id_ed25519 | head -5
# Debe empezar con: -----BEGIN OPENSSH PRIVATE KEY-----

# 3. Agregar clave pública a authorized_keys en EC2
ssh-copy-id -i ~/.ssh/id_ed25519.pub ubuntu@tu-ip

# 4. Probar SSH local
ssh -i tu-clave.pem ubuntu@tu-ip

# 5. Si falla, regenerar clave:
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N ""
# Actualizar GitHub secret
```

### ⚠️ API lenta en Producción

**Síntoma:** Requests tardan >5s

**Diagnóstico:**

```bash
# Ver logs
docker logs --tail 50 sistema-asistencia-api

# Ver recursos
docker stats sistema-asistencia-api

# Profiling
docker exec sistema-asistencia-api python -c \
  "import cProfile; cProfile.run('main()')"

# Verificar BD
docker exec sistema-asistencia-api python -c \
  "from src.utils.db import get_connection_pool; print(get_connection_pool().size())"
```

**Soluciones:**

```bash
# 1. Aumentar recursos de contenedor
# docker-compose.yml > api > deploy.resources.limits

# 2. Optimizar queries (ORM)
# Agregue indexes, eager loading

# 3. Caché (Redis)
# Implementar caching en endpoints

# 4. Connection pooling
# Aumentar max_overflow en SQLAlchemy
```

### 🗜️ Imagen Docker muy grande

**Síntoma:** Build tarda >5min, imagen >1GB

**Solución:**

```bash
# Verificar layers
docker history sistema-asistencia:latest

# Optimizar Dockerfile:
# 1. Multi-stage build ✅ (ya está)
# 2. Usar alpine ✅ (ya está)
# 3. Minimizar layers
# 4. .dockerignore ✅ (ya está)

# Reconstruir sin cache
docker-compose build --no-cache

# Ver tamaño
docker images sistema-asistencia
```

---

## Checklist

### ✅ Pre-Despliegue (Desarrollo)

- [ ] Código funciona localmente
- [ ] Tests pasan: `./docker.sh test`
- [ ] No hay secretos en código (revisar .env)
- [ ] `.gitignore` está actualizado
- [ ] Dependencias en `requirements.txt`
- [ ] Migraciones creadas si BD cambió

### ✅ Pre-Despliegue (EC2)

- [ ] EC2 tiene Docker instalado
- [ ] EC2 tiene Git instalado
- [ ] Repositorio clonado en `/home/deploy/app/`
- [ ] `.env` configurado con valores reales
- [ ] `SECRET_KEY` es único y seguro
- [ ] `DEBUG=false`
- [ ] `DATABASE_URL` apunta a RDS
- [ ] Scripts son ejecutables: `chmod +x *.sh`
- [ ] Clave SSH de deploy está en EC2: `~/.ssh/id_ed25519`
- [ ] Clave pública en GitHub deploy keys
- [ ] GitHub secrets configurados: `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY`

### ✅ Despliegue Manual

```bash
# 1. En tu máquina local
git add .
git commit -m "cambios"
git push origin main

# 2. Ver GitHub Actions
# https://github.com/2004Style/sistema-de-asistencia/actions

# 3. Esperar a que terminen los 3 jobs:
# ✅ Tests
# ✅ Build Docker
# ✅ Deploy EC2

# 4. Verificar en EC2
ssh -i clave.pem ubuntu@tu-ip
docker ps
docker logs -f sistema-asistencia-api

# 5. Probar API
curl http://tu-ip/docs
```

### ✅ Post-Despliegue

- [ ] API responde: `curl http://tu-ip:8000/docs`
- [ ] Nginx responde: `curl http://tu-ip/docs`
- [ ] BD conecta: Ver logs sin errores de conexión
- [ ] Health check pasa: `curl http://tu-ip/health`
- [ ] WebSocket funciona (si aplica)
- [ ] Logs limpios: `docker logs sistema-asistencia-api`

---

## 📞 Contacto y Soporte

**Repositorio:** https://github.com/2004Style/sistema-de-asistencia

**Issues:** Crear en GitHub con etiqueta `deployment`

**Changelog:**

- v1.0 (8 Nov 2025): Documentación inicial completa

---

**¡Listo para desplegar! 🚀**
