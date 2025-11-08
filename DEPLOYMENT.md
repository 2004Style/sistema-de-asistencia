# 📚 Guía Completa de Despliegue - Sistema de Asistencia

## 📖 Tabla de Contenidos

1. [Introducción](#introducción)
2. [Requisitos Previos](#requisitos-previos)
3. [Arquitectura de Despliegue](#arquitectura-de-despliegue)
4. [Despliegue en Desarrollo](#despliegue-en-desarrollo)
5. [Despliegue en Producción AWS EC2](#despliegue-en-producción-aws-ec2)
6. [Pipeline CI/CD](#pipeline-cicd)
7. [Explicación del Script deploy-aws-ec2.sh](#explicación-del-script-deploy-aws-ec2sh)
8. [Troubleshooting](#troubleshooting)
9. [Monitoreo y Mantenimiento](#monitoreo-y-mantenimiento)

---

## Introducción

Este documento describe cómo desplegar el **Sistema de Asistencia** en diferentes ambientes. El proyecto utiliza:

- **Backend**: FastAPI (Python 3.11)
- **Base de Datos**: PostgreSQL 15
- **Containerización**: Docker & Docker Compose
- **Orquestación**: Docker Compose (desarrollo) / EC2 (producción)
- **CI/CD**: GitHub Actions
- **Proxy Inverso**: Nginx

### Ambientes Soportados

| Ambiente       | Uso     | Base de Datos      | Descripción                     |
| -------------- | ------- | ------------------ | ------------------------------- |
| **Desarrollo** | Local   | PostgreSQL local   | Desarrollo con docker-compose   |
| **Producción** | AWS EC2 | PostgreSQL externa | Despliegue automático con CI/CD |

---

## Requisitos Previos

### Para Desarrollo Local

```bash
# Obligatorio
- Docker Desktop o Docker CLI + Docker Daemon
- Docker Compose (v2.0+)
- Git
- Terminal compatible (bash/zsh)

# Opcional pero recomendado
- Python 3.11 (para ejecutar scripts locales)
- PostgreSQL Client (psql) para debugging
```

### Para Producción (AWS EC2)

```bash
# En la instancia EC2
- Docker (última versión)
- Docker Compose (v2.0+)
- Git (para clonar el repositorio)
- SSH configurado en GitHub (deploy key)
- Acceso a Internet para descargar imágenes
- PostgreSQL externa (no local en la instancia)
```

### Requisitos de Repositorio GitHub

```bash
# Secrets configurados en GitHub (Settings > Secrets)
- EC2_HOST: dirección IP o dominio del servidor
- EC2_USER: usuario SSH (ej: ubuntu, ec2-user)
- EC2_SSH_KEY: clave privada SSH para acceso
```

---

## Arquitectura de Despliegue

### Diagrama General

```
┌─────────────────────────────────────────────────────────────┐
│                      USUARIO FINAL                          │
└────────────────────────────┬────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   NGINX Port 80 │
                    │   (Reverse Proxy)│
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ FastAPI Port 8000│
                    │  (API Server)    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────────────┐
                    │  PostgreSQL Port 5432   │
                    │  (Base de Datos)        │
                    └─────────────────────────┘
```

### Estructura de Contenedores en Producción

```
Docker Host (AWS EC2)
├── sistema-asistencia-nginx (Puerto 80)
│   └── Proxy hacia API:8000
├── sistema-asistencia-api (Puerto 8000, interno)
│   ├── FastAPI Server
│   ├── Uvicorn Workers
│   └── Volúmenes: /public, /recognize/data
└── PostgreSQL (EXTERNA - otro servidor)
    └── Base de datos compartida
```

---

## Despliegue en Desarrollo

### 1. Configuración Inicial

#### Paso 1: Clonar el Repositorio

```bash
git clone https://github.com/2004Style/sistema-de-asistencia.git
cd sistema-de-asistencia
```

#### Paso 2: Preparar Archivo de Configuración

```bash
cd server

# Copiar el archivo de ejemplo
cp .env.example .env

# Editar .env con tus valores (opcional para desarrollo)
nano .env
```

**Variables Importantes en .env:**

```env
# Base de datos LOCAL (desarrollo)
DATABASE_URL=postgresql://asistencia:changeme@postgres:5432/sistema_asistencia

# API
HOST=0.0.0.0
PORT=8000
DEBUG=True

# Mail API (Servicio externo de correos)
MAIL_API_URL=http://localhost:3001
MAIL_API_CLIENT_ID=cli_xxxxx
MAIL_API_SECRET=sk_live_xxxxx
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_FROM_NAME=Sistema de Asistencia
```

### 2. Iniciar Servicios en Desarrollo

#### Opción A: Usar el Script docker.sh (Recomendado)

```bash
cd server

# Hacer el script ejecutable
chmod +x docker.sh

# Iniciar servicios
./docker.sh up

# Ver logs en tiempo real
./docker.sh logs

# Detener servicios
./docker.sh down
```

#### Opción B: Usar Docker Compose Directamente

```bash
cd server

# Iniciar en background
docker-compose up -d

# Ver logs
docker-compose logs -f api

# Detener
docker-compose down
```

### 3. Acceder a los Servicios

```
API Swagger: http://localhost:8000/docs
API ReDoc:   http://localhost:8000/redoc
API Health:  http://localhost:8000/health
```

### 4. Entrar a la Base de Datos

```bash
# Usar el script
./docker.sh db-shell

# O usar psql directamente
psql -h localhost -U asistencia -d sistema_asistencia
```

### 5. Ver Estado de Servicios

```bash
# Ver contenedores
docker-compose ps

# Ver logs completos
./docker.sh logs

# Ver logs de BD
./docker.sh logs-db
```

---

## Despliegue en Producción AWS EC2

### 1. Configuración Previa en AWS

#### Paso 1: Crear Instancia EC2

```bash
# Requisitos mínimos:
- AMI: Ubuntu 22.04 LTS o 20.04 LTS
- Instance Type: t3.medium (mínimo recomendado)
- Storage: 30GB+ (gp3)
- Security Group:
  - Puerto 22 (SSH) - tu IP
  - Puerto 80 (HTTP) - 0.0.0.0/0
  - Puerto 443 (HTTPS) - 0.0.0.0/0 (opcional)
```

#### Paso 2: Crear Instancia de Base de Datos RDS

```bash
# AWS RDS PostgreSQL
- Engine: PostgreSQL 15
- Instance Class: db.t3.micro (desarrollo) o db.t3.small (producción)
- Storage: 20GB+ (gp3)
- Backup retention: 7 días
- Multi-AZ: No (desarrollo) / Sí (producción)
- Publicly accessible: No (solo desde EC2)

# Nota: Guardar endpoint, usuario y contraseña
```

#### Paso 3: Configurar Security Groups

```bash
# RDS Security Group (entrada):
- Inbound Rule: PostgreSQL (5432) desde EC2 Security Group

# EC2 Security Group (entrada):
- SSH (22): Tu IP (restricción recomendada)
- HTTP (80): 0.0.0.0/0
- HTTPS (443): 0.0.0.0/0
```

### 2. Preparación de Servidor EC2

#### Paso 1: Conectarse al Servidor

```bash
# Conectarse via SSH
ssh -i tu-clave.pem ubuntu@tu-instancia-ip

# O si usas el archivo de configuración SSH
ssh deploy@tu-instancia-ip
```

#### Paso 2: Instalar Dependencias

```bash
# Actualizar sistema
sudo apt-get update
sudo apt-get upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Agregar usuario al grupo docker
sudo usermod -aG docker $USER
newgrp docker

# Verificar instalación
docker --version
docker-compose --version

# Instalar Git
sudo apt-get install -y git

# Instalar curl (para health checks)
sudo apt-get install -y curl
```

#### Paso 3: Crear Directorio de Aplicación

```bash
# Crear estructura de directorios
sudo mkdir -p /home/deploy/app
sudo chown $USER:$USER /home/deploy/app

cd /home/deploy/app

# Crear directorio de logs
sudo mkdir -p /var/log/deploy
sudo chown $USER:$USER /var/log/deploy
```

#### Paso 4: Configurar Claves SSH para GitHub

```bash
# Generar clave SSH para GitHub (si no existe)
ssh-keygen -t ed25519 -C "deploy@tu-dominio.com" -f ~/.ssh/id_ed25519 -N ""

# Mostrar la clave pública
cat ~/.ssh/id_ed25519.pub

# Agregar a GitHub:
# 1. Ir a GitHub > Settings > Deploy keys
# 2. Agregar la clave pública con acceso de lectura
# 3. Configurar SSH para acepar que es host conocido
ssh-keyscan -H github.com >> ~/.ssh/known_hosts
```

### 3. Configuración del Repositorio

#### Paso 1: Clonar Repositorio

```bash
cd /home/deploy/app

# Clonar usando SSH
git clone git@github.com:2004Style/sistema-de-asistencia.git .

# Verificar que se clonó correctamente
ls -la server/
```

#### Paso 2: Configurar Variables de Entorno

```bash
cd /home/deploy/app/servidor

# Copiar archivo de ejemplo
cp .env.example .env
cp .env.production .env  # O editar directamente

# Editar con tus valores
nano .env
```

**Variables Críticas para Producción:**

```env
# ⭐ BASE DE DATOS EXTERNA (punto crítico)
DATABASE_URL=postgresql://rdev:tu-password@tu-rds-endpoint:5432/asistencia

# Seguridad
SECRET_KEY=una-clave-super-secreta-generada-aleatoriamente-cambiar
DEBUG=false

# Configuración API
HOST=0.0.0.0
PORT=8000
TIMEZONE=America/Lima

# Mail API (Servicio externo de correos)
MAIL_API_URL=https://api.mail-service.com
MAIL_API_CLIENT_ID=tu-client-id
MAIL_API_SECRET=tu-api-secret
SMTP_FROM_EMAIL=tu-email@yourdomain.com
SMTP_FROM_NAME=Sistema de Asistencia

# Migraciones
AUTO_MIGRATE=false  # Usar CI/CD para migrations

# Directorios
UPLOAD_DIR=recognize/data
REPORTS_DIR=public/reports
TEMP_DIR=public/temp
```

#### Paso 3: Hacer Ejecutable el Script de Despliegue

```bash
cd /home/deploy/app/server

chmod +x deploy-aws-ec2.sh
chmod +x run.sh
chmod +x docker.sh
```

### 4. Configurar GitHub Actions (CI/CD)

#### Paso 1: Agregar Secrets a GitHub

```bash
# En GitHub > Settings > Secrets and variables > Actions > New repository secret

EC2_HOST: tu-instancia-ip
EC2_USER: ubuntu (o ec2-user)
EC2_SSH_KEY: [contenido completo de tu clave privada]
```

#### Paso 2: Trigger del Pipeline

El pipeline se ejecuta automáticamente cuando:

```bash
- Haces push a la rama 'main'
- Se modifican archivos en la carpeta 'server/'
```

### 5. Primer Despliegue Manual

```bash
# En tu máquina local
cd /home/deploy/app/server

# Hacer cambios en una rama
git checkout -b deploy/initial-setup
git add .
git commit -m "Initial production setup"
git push origin deploy/initial-setup

# Crear Pull Request y mergear a main
# O directamente:
git checkout main
git merge deploy/initial-setup
git push origin main

# El GitHub Actions pipeline se ejecutará automáticamente
```

#### Monitorear el Despliegue

```bash
# En GitHub:
1. Ir a Actions
2. Ver el pipeline ejecutándose
3. Revisar logs en cada paso
4. Si hay error, revisar la salida
```

---

## Pipeline CI/CD

### Flujo Automático

```
┌─────────────────┐
│  git push main  │
└────────┬────────┘
         │
    ┌────▼────────┐
    │  Test Job   │
    │ - Pytest    │
    │ - Coverage  │
    └────┬────────┘
         │
    ┌────▼────────┐
    │  Build Job  │
    │ - Docker    │
    │   Build     │
    │ - Push GHCR │
    └────┬────────┘
         │
    ┌────▼────────┐
    │ Deploy Job  │
    │ - SSH to EC2│
    │ - Run script│
    │ - Health    │
    │   check     │
    └────┬────────┘
         │
    ┌────▼──────────────┐
    │ ✅ Completado     │
    │ API disponible     │
    └───────────────────┘
```

### Detalles del Pipeline

#### 1. Job: Test

```yaml
# Ejecuta en: Ubuntu Latest
# Duración: ~3-5 minutos

Pasos:
1. Checkout del código
2. Instalar Python 3.11
3. Instalar dependencias (pip)
4. Ejecutar tests (pytest)
5. Generar reporte de cobertura
6. Subir reporte a Codecov

Si FALLA: Se detiene el pipeline (no continúa a build)
```

#### 2. Job: Build

```yaml
# Ejecuta en: Ubuntu Latest
# Duración: ~5-10 minutos
# Requiere: Test pasados

Pasos:
1. Checkout del código
2. Configurar Docker Buildx
3. Autenticar en GHCR (GitHub Container Registry)
4. Construir imagen Docker
5. Empujar imagen a GHCR

Imagen: ghcr.io/2004Style/sistema-asistencia:main
```

#### 3. Job: Deploy

```yaml
# Ejecuta en: Ubuntu Latest
# Duración: ~5-15 minutos
# Requiere: Build completado

Pasos:
1. Configurar SSH (claves privadas)
2. Conectar a EC2 via SSH
3. Ejecutar deploy-aws-ec2.sh
4. Verificar salud
5. Notificar resultado

Solo se ejecuta en: push a main (no en PRs)
```

---

## Explicación del Script deploy-aws-ec2.sh

### ¿Qué Hace?

El script `deploy-aws-ec2.sh` automatiza el despliegue de la aplicación en AWS EC2. Es el corazón del pipeline CI/CD.

### Desglose Detallado

```bash
#!/bin/bash
set -e  # Salir si hay cualquier error
```

**Causa que el script se detenga si hay un error. Esto previene despliegues parciales.**

### SECCIÓN 1: Configuración Inicial

```bash
APP_DIR="/home/deploy/app"
REPO_URL="git@github.com:2004Style/sistema-de-asistencia.git"
CONTAINER_NAME="sistema-asistencia-api"
IMAGE_NAME="sistema-asistencia:latest"
API_PORT="8000"
LOG_DIR="/var/log/deploy"
LOG_FILE="$LOG_DIR/deploy_$(date +%Y%m%d_%H%M%S).log"
```

| Variable         | Propósito                               |
| ---------------- | --------------------------------------- |
| `APP_DIR`        | Dónde se clona/actualiza el repositorio |
| `REPO_URL`       | URL del repositorio en GitHub           |
| `CONTAINER_NAME` | Nombre del contenedor Docker            |
| `IMAGE_NAME`     | Nombre de la imagen Docker              |
| `API_PORT`       | Puerto en el que corre la API           |
| `LOG_FILE`       | Archivo para guardar logs con timestamp |

**Log Storage:**

- Los logs se guardan en `/var/log/deploy/` con timestamp
- Ejemplo: `deploy_20251107_143022.log`

### SECCIÓN 2: Funciones de Logging

```bash
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$LOG_FILE" >&2
}

log_success() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ✓ $1" | tee -a "$LOG_FILE"
}
```

**Funciones para logueo consistente:**

- `log`: Mensaje normal (se guarda en archivo + pantalla)
- `log_error`: Mensaje de error (STDERR + archivo)
- `log_success`: Mensaje de éxito (con checkmark)

Todos incluyen timestamp para auditoría.

### SECCIÓN 3: Verificaciones Iniciales

```bash
print_message "🔍 Verificando requisitos..."

# Verificar si Docker está instalado
if ! command -v docker &> /dev/null; then
    log_error "Docker no está instalado"
    exit 1
fi

# Verificar si Git está instalado
if ! command -v git &> /dev/null; then
    log_error "Git no está instalado"
    exit 1
fi

# Verificar permisos
if [ ! -w "$APP_DIR" ] && [ -d "$APP_DIR" ]; then
    log_error "No hay permisos de escritura en $APP_DIR"
    exit 1
fi
```

**¿Por qué verifica esto?**

- **Docker**: Necesario para ejecutar contenedores
- **Git**: Necesario para clonar/actualizar repositorio
- **Permisos**: Sin permisos de escritura no puede actualizar código

**Si algo falta, el script falla y avisa claramente**

### SECCIÓN 4: Clonar o Actualizar Repositorio

```bash
log "📥 Actualizando código del repositorio..."

if [ ! -d "$APP_DIR" ]; then
    # Primera vez: clonar
    log "Clonando repositorio..."
    mkdir -p "$(dirname "$APP_DIR")"
    git clone "$REPO_URL" "$APP_DIR"
    log_success "Repositorio clonado"
else
    # Siguientes veces: actualizar
    log "Actualizando repositorio existente..."
    cd "$APP_DIR"
    git fetch origin main
    git reset --hard origin/main
    git pull origin main
    log_success "Repositorio actualizado"
fi
```

**Lógica:**

1. **Primera ejecución**: Clona el repositorio completo
2. **Ejecuciones posteriores**: Actualiza al código más reciente

**Importante**: Usa `git reset --hard` para descartar cambios locales y obtener el código limpio

### SECCIÓN 5: Navegar a Carpeta del Servidor

```bash
cd "$APP_DIR/server" || {
    log_error "No se encontró la carpeta 'server'"
    exit 1
}
```

**Verifica que existe la carpeta `server/` dentro del proyecto**

### SECCIÓN 6: Cargar Variables de Entorno

```bash
log "⚙️ Cargando variables de entorno..."

if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        log_error ".env no existe, crear uno basado en .env.example"
        exit 1
    else
        log_error ".env no existe y no hay .env.example"
        exit 1
    fi
fi

source .env
log_success "Variables de entorno cargadas"
```

**¿Qué hace?**

- Verifica que existe el archivo `.env`
- Si no existe, avisa que hay que crearlo
- Carga las variables en la sesión actual

**Crítico**: Sin `.env` válido, la aplicación no tendrá configuración

### SECCIÓN 7: Verificar Conectividad a BD

```bash
log "🔗 Verificando conectividad..."

if command -v docker-compose &> /dev/null; then
    log "Verificando servicios previos..."
    docker-compose ps 2>/dev/null || true
fi

log_success "Verificación completada"
```

**Verifica que hay servicios Docker existentes**

### SECCIÓN 8: Construir Imagen Docker

```bash
log "🔨 Construyendo imagen Docker..."

if docker build -t "$IMAGE_NAME" . >> "$LOG_FILE" 2>&1; then
    log_success "Imagen Docker construida: $IMAGE_NAME"
else
    log_error "Error al construir la imagen Docker"
    exit 1
fi
```

**¿Qué ocurre?**

1. Ejecuta `docker build` para crear la imagen
2. Los logs se guardan en el archivo de log
3. Si falla, se detiene el script completamente

**Tiempo**: Puede tomar 5-10 minutos en primera ejecución

### SECCIÓN 9: Detener Contenedor Anterior

```bash
log "🛑 Deteniendo contenedor anterior..."

if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    log "Parando contenedor $CONTAINER_NAME..."
    docker stop "$CONTAINER_NAME" 2>/dev/null || true
    docker rm "$CONTAINER_NAME" 2>/dev/null || true
    sleep 2  # Esperar a que se liberen recursos
    log_success "Contenedor anterior eliminado"
else
    log "No hay contenedor previo"
fi
```

**Importancia**:

- Detiene la versión anterior antes de iniciar la nueva
- Libera el puerto 8000 (que usará el nuevo contenedor)
- Usa `sleep 2` para dar tiempo al sistema de liberar recursos

**Variantes**: `docker ps -a` ve todos los contenedores, aunque estén detenidos

### SECCIÓN 10: Iniciar Nuevo Contenedor

```bash
log "🚀 Iniciando nuevo contenedor..."

if [ -f docker-compose.yml ]; then
    log "Usando Docker Compose..."
    if docker-compose up -d >> "$LOG_FILE" 2>&1; then
        log_success "Servicios iniciados con Docker Compose"
    else
        log_error "Error al iniciar con Docker Compose"
        exit 1
    fi
else
    # Opción alternativa: docker run
    log "Usando Docker run..."
    if docker run -d \
        --name "$CONTAINER_NAME" \
        --restart unless-stopped \
        -p "${API_PORT}:8000" \
        --env-file .env \
        -v "$(pwd)/public:/app/public" \
        -v "$(pwd)/recognize/data:/app/recognize/data" \
        "$IMAGE_NAME" >> "$LOG_FILE" 2>&1; then
        log_success "Contenedor iniciado: $CONTAINER_NAME"
    else
        log_error "Error al iniciar contenedor"
        exit 1
    fi
fi
```

**Dos opciones:**

1. **Con Docker Compose** (preferido):

   - Usa el archivo `docker-compose-production.yml`
   - Inicia múltiples servicios (API + Nginx)
   - Más fácil de mantener

2. **Con Docker run** (fallback):
   - Inicia solo la API
   - Uso manual de flags
   - Menos flexible

**Flags importantes en `docker run`:**

| Flag                       | Descripción              |
| -------------------------- | ------------------------ |
| `-d`                       | Ejecutar en background   |
| `--name`                   | Nombre del contenedor    |
| `--restart unless-stopped` | Reiniciar si falla       |
| `-p`                       | Mapeo de puertos         |
| `--env-file .env`          | Cargar variables de .env |
| `-v`                       | Montar volúmenes         |

### SECCIÓN 11: Verificar Salud del Contenedor

```bash
log "💚 Esperando a que la aplicación esté lista..."

max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if curl -s http://localhost:${API_PORT}/docs > /dev/null 2>&1; then
        log_success "✓ Aplicación está lista en http://localhost:${API_PORT}/docs"
        break
    fi

    attempt=$((attempt + 1))
    log "Intento $attempt/$max_attempts..."
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    log_error "La aplicación no respondió a tiempo"
    log "Logs del contenedor:"
    docker logs "$CONTAINER_NAME" --tail=50
    exit 1
fi
```

**¿Qué ocurre?**

1. Intenta conectar a `http://localhost:8000/docs` (Swagger)
2. Si responde: ¡Éxito! Aplicación está lista
3. Si no: Espera 2 segundos e intenta nuevamente
4. Máximo 30 intentos (60 segundos de espera total)

**¿Por qué es importante?**

- Verifica que la aplicación realmente inició
- No solo que el contenedor está corriendo
- Valida que la base de datos está accesible

**Si falla**: Muestra los últimos 50 logs para debugging

### SECCIÓN 12: Limpiar Imágenes Antiguas

```bash
log "🧹 Limpiando imágenes antiguas..."

docker image prune -f --filter "until=24h" >> "$LOG_FILE" 2>&1 || true
log_success "Limpieza completada"
```

**Mantenimiento**:

- Borra imágenes que no se usan hace 24 horas
- Libera espacio en disco
- `-f` = forzar sin preguntar
- `|| true` = no fallar si no hay imágenes a borrar

### SECCIÓN 13: Resumen Final

```bash
log "════════════════════════════════════════"
log_success "✓ DESPLIEGUE COMPLETADO EXITOSAMENTE"
log "════════════════════════════════════════"
log "Contenedor: $CONTAINER_NAME"
log "Imagen: $IMAGE_NAME"
log "Puerto: $API_PORT"
log "URL: http://localhost:${API_PORT}/docs"
log "Logs: $LOG_FILE"
log "════════════════════════════════════════"

# Mostrar logs del contenedor
log "📋 Últimos logs del contenedor:"
docker logs "$CONTAINER_NAME" --tail=20
```

**Muestra un resumen completo del despliegue**

---

## Archivo run.sh

### ¿Qué es?

El script `run.sh` se ejecuta **dentro del contenedor Docker** (no en el host). Se define en el `Dockerfile` como el comando principal.

### Flujo de Ejecución

```
1. Dockerfile ejecuta: CMD ["./run.sh"]
   ↓
2. run.sh se ejecuta dentro del contenedor
   ├─ Valida entorno virtual (si existe)
   ├─ Verifica dependencias
   ├─ Ejecuta migraciones (si AUTO_MIGRATE=true)
   ├─ Ejecuta seeds (seed_roles.py, seed_turnos.py)
   └─ Inicia uvicorn (servidor API)
```

### Detalles del run.sh

```bash
# Activar entorno virtual si existe
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Verificar Python
PYTHON_VERSION=$(python --version 2>&1)

# Instalar dependencias si faltan
if ! pip show fastapi > /dev/null 2>&1; then
    pip install -r requirements.txt
fi

# Ejecutar seeds
python seed_roles.py 2>/dev/null
python seed_turnos.py 2>/dev/null

# Iniciar servidor
exec uvicorn main:app --host 0.0.0.0 --port 8000
```

**Responsabilidades:**

1. **Validación**: Verifica que todo esté en orden
2. **Inicialización**: Instala dependencias si es necesario
3. **Seeds**: Carga datos iniciales (roles, turnos)
4. **Startup**: Inicia el servidor API

---

## Troubleshooting

### Problema: El despliegue falla en Tests

```bash
# Ver logs del error
# En GitHub Actions: Ver en Actions > El job fallido

# Soluciones:
1. Revisar que el código tenga tests válidos
2. Verificar que la base de datos de test está disponible
3. Revisar las dependencias en requirements.txt

# Para ejecutar localmente:
cd server
pytest tests/ -v
```

### Problema: El contenedor no inicia

```bash
# Ver logs del contenedor
docker logs sistema-asistencia-api

# Verificar que está corriendo
docker ps | grep sistema-asistencia-api

# Si no está corriendo:
docker ps -a | grep sistema-asistencia-api

# Ver detalles del error
docker inspect sistema-asistencia-api
```

### Problema: Base de datos sin conectar

```bash
# Verificar que la BD está accesible
psql -h tu-rds-endpoint -U rdev -d asistencia -c "SELECT 1;"

# Verificar variable de entorno
echo $DATABASE_URL

# Revisar que el archivo .env existe
ls -la /home/deploy/app/server/.env

# Verificar conectividad desde EC2
curl -v telnet://tu-rds-endpoint:5432
```

### Problema: Puerto 8000 ya está en uso

```bash
# Ver qué está usando el puerto
sudo lsof -i :8000

# Detener contenedor anterior
docker stop sistema-asistencia-api
docker rm sistema-asistencia-api

# O cambiar el puerto en docker-compose.yml
```

### Problema: GitHub Actions no tiene permisos

```bash
# Verificar que los Secrets existen
# GitHub > Settings > Secrets

# Verificar formato de EC2_SSH_KEY
# Debe ser la clave PRIVADA (BEGIN RSA PRIVATE KEY)
# No la clave pública

# Regenerar clave si es necesario
ssh-keygen -t ed25519 -C "deploy@domain.com"
```

### Problema: Los cambios locales no se reflejan

```bash
# El script usa 'git reset --hard'
# Esto descarta cambios locales

# Solución: no hacer cambios en el servidor
# Todo debe venir del repositorio

# Para actualizar:
git push origin main
# Esperar que el pipeline se ejecute automáticamente
```

---

## Monitoreo y Mantenimiento

### Verificar Estado de Servicios

```bash
# En el servidor
ssh ubuntu@tu-ec2-ip

# Ver contenedores
docker ps

# Ver logs en tiempo real
docker logs -f sistema-asistencia-api

# Ver estadísticas
docker stats

# Ver eventos
docker events
```

### Backup de Base de Datos

```bash
# En desarrollo (local)
./docker.sh db-backup

# En producción (RDS)
# AWS maneja backups automáticamente
# Pero puede hacer un dump manual:

pg_dump -h tu-rds-endpoint \
  -U rdev \
  -d asistencia \
  > backup_$(date +%Y%m%d).sql
```

### Actualizar a Nueva Versión

```bash
# En local:
git add .
git commit -m "Nueva versión"
git push origin main

# GitHub Actions:
# 1. El pipeline se ejecuta automáticamente
# 2. Tests se ejecutan
# 3. Si pasan: imagen se construye y sube
# 4. Se ejecuta deploy en EC2
# 5. Verificar en http://tu-ec2-ip/docs
```

### Ver Logs de Despliegue

```bash
# En el servidor
tail -f /var/log/deploy/deploy_*.log

# O especificar uno en particular
tail -f /var/log/deploy/deploy_20251107_143022.log
```

### Limpiar Espacio en Disco

```bash
# Ver uso de disco
docker system df

# Limpiar todo sin usar
docker system prune

# Limpiar con volúmenes
docker system prune -a --volumes
```

### Reiniciar Servicios

```bash
# Opción 1: Con Docker Compose
cd /home/deploy/app/server
docker-compose restart

# Opción 2: Manual
docker restart sistema-asistencia-api
docker restart sistema-asistencia-nginx

# Opción 3: Script
./docker.sh restart
```

---

## Checklist de Despliegue

### Pre-Despliegue ✓

- [ ] Código está en rama `main`
- [ ] Tests pasan localmente (`pytest tests/`)
- [ ] Archivo `.env` está configurado
- [ ] Base de datos está accesible
- [ ] Secrets están configurados en GitHub
- [ ] Security groups en AWS permiten conexiones

### Post-Despliegue ✓

- [ ] API responde en `/docs`
- [ ] Swagger carga correctamente
- [ ] Base de datos tiene conexión
- [ ] Logs no muestran errores
- [ ] Seeds se ejecutaron (roles, turnos)
- [ ] Nginx proxy funciona (si está configurado)

### Verificación de Producción ✓

```bash
# Ejecutar estos comandos después de desplegar
curl -s http://tu-ec2-ip:8000/docs | head -20
curl -s http://tu-ec2-ip:8000/health
docker logs sistema-asistencia-api --tail=50
```

---

## Resumen

Este documento cubre:

1. **Desarrollo local** con Docker Compose
2. **Despliegue en AWS EC2** con scripts automatizados
3. **Pipeline CI/CD** con GitHub Actions
4. **Explicación detallada** del script deploy-aws-ec2.sh
5. **Troubleshooting** y solución de problemas
6. **Monitoreo** y mantenimiento

### Comandos Rápidos

```bash
# Desarrollo
./docker.sh up              # Iniciar todo
./docker.sh logs            # Ver logs
./docker.sh down            # Detener todo

# Producción
git push origin main        # Trigger CI/CD
ssh ubuntu@ec2-ip "tail -f /var/log/deploy/deploy_*.log"  # Ver despliegue

# Troubleshooting
docker logs sistema-asistencia-api
docker ps
docker-compose ps
```

---

**Última actualización**: 7 de noviembre de 2025
**Versión**: 1.0
**Autor**: Equipo de Desarrollo - Sistema de Asistencia
