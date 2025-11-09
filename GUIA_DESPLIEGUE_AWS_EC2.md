# 🚀 Guía Completa de Despliegue en AWS EC2

Esta guía detalla el proceso completo para desplegar el **Sistema de Asistencia** en un servidor AWS EC2 utilizando Docker, Docker Compose, Nginx y GitHub Actions para CI/CD automatizado.

---

## 📋 Tabla de Contenidos

1. [Requisitos Previos](#-requisitos-previos)
2. [Configuración del Servidor EC2](#-configuración-del-servidor-ec2)
3. [Configuración de GitHub Actions](#-configuración-de-github-actions)
4. [Configuración de Archivos de Entorno](#-configuración-de-archivos-de-entorno)
5. [Estructura del Proyecto](#-estructura-del-proyecto)
6. [Proceso de Despliegue](#-proceso-de-despliegue)
7. [Verificación y Monitoreo](#-verificación-y-monitoreo)
8. [Solución de Problemas](#-solución-de-problemas)

---

## 🔧 Requisitos Previos

### En tu máquina local:

- Git instalado
- Cuenta de GitHub con acceso al repositorio
- Clave privada de AWS EC2 (archivo `.pem`)

### En AWS:

- Instancia EC2 creada (Ubuntu 20.04/22.04 recomendado)
- Grupo de seguridad configurado con puertos abiertos:
  - **22** (SSH)
  - **80** (HTTP)
  - **443** (HTTPS - opcional)
  - **8000** (API - opcional, para debug)
  - **3000** (Client - opcional, para debug)

---

## 🖥️ Configuración del Servidor EC2

### Paso 1: Conectarse al Servidor EC2

```bash
# Cambiar permisos de la clave (solo primera vez)
chmod 400 tu-clave.pem

# Conectarse como usuario ubuntu (por defecto en EC2)
ssh -i tu-clave.pem ubuntu@ec2-XX-XX-XX-XX.compute-1.amazonaws.com
```

### Paso 2: Actualizar el Sistema

```bash
sudo apt update && sudo apt upgrade -y
```

### Paso 3: Instalar Docker y Docker Compose

```bash
# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Instalar Docker Compose v2
sudo apt install docker-compose-plugin -y

# Verificar instalación
docker --version
docker compose version

# Habilitar Docker al inicio
sudo systemctl enable docker
sudo systemctl start docker
```

### Paso 4: Crear Usuario de Despliegue

```bash
# Crear usuario deploy sin password ni login interactivo
sudo adduser deploy --disabled-password --disabled-login --gecos "Deploy User"

# Agregar usuario deploy al grupo docker
sudo usermod -aG docker deploy
```

### Paso 5: Generar Clave SSH para el Usuario Deploy

```bash
# Generar clave SSH ED25519
sudo -u deploy ssh-keygen -t ed25519 -C "deploy@ec2" -N "" -f /home/deploy/.ssh/id_ed25519
```

**Salida esperada:**

```bash
Generating public/private ed25519 key pair.
Created directory '/home/deploy/.ssh'.
Your identification has been saved in /home/deploy/.ssh/id_ed25519
Your public key has been saved in /home/deploy/.ssh/id_ed25519.pub
The key fingerprint is: SHA256:11V4kvntUvetwZbnw48PmzUM8loO7DeYkMLHa4kXg6A deploy@ec2
```

### Paso 6: Ver y Guardar las Claves SSH

```bash
# Ver la clave pública (la necesitarás en GitHub)
sudo cat /home/deploy/.ssh/id_ed25519.pub
```

**Guarda este valor**, lo usarás en GitHub Actions.

```bash
# Ver la clave privada
sudo cat /home/deploy/.ssh/id_ed25519
```

**Guarda este valor**, también lo necesitarás en GitHub (como Secret `EC2_SSH_KEY`).

### Paso 7: Agregar Clave Pública a authorized_keys

```bash
# Cambiar a usuario deploy
sudo -i -u deploy

# Crear directorio .ssh si no existe
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Agregar la clave pública generada a authorized_keys
cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Salir del usuario deploy
exit
```

### Paso 8: Crear Carpeta de Aplicación

```bash
# Crear directorio para la aplicación
sudo mkdir -p /home/deploy/app
sudo chown -R deploy:deploy /home/deploy/app
sudo chmod 755 /home/deploy/app
```

### Paso 9: Verificar que Funciona la Conexión SSH

```bash
# Salir del servidor
exit

# Probar conexión con la nueva clave (desde tu máquina local)
# Usa la clave privada que guardaste en el Paso 6
ssh -i /ruta/a/id_ed25519 deploy@ec2-XX-XX-XX-XX.compute-1.amazonaws.com
```

### Paso 10: Clonar el Repositorio

```bash
# Conectarse como usuario deploy
ssh -i /ruta/a/id_ed25519 deploy@ec2-XX-XX-XX-XX.compute-1.amazonaws.com

cd /home/deploy/app

# Clonar repositorio (HTTPS - recomendado)
git clone https://github.com/TU_USUARIO/sistema-de-asistencia.git

cd sistema-de-asistencia
```

### Paso 11: Configurar Archivos de Entorno

#### 📄 Crear `server/.env`

```bash
nano server/.env
```

**Contenido mínimo requerido:**

```env
# Base de datos
DATABASE_URL=postgresql://usuario:password@host:5432/nombre_db

# API
HOST=0.0.0.0
PORT=8000
TIMEZONE=America/Lima

# CORS y WebSockets
CORS_ORIGINS=*
SOCKETIO_CORS_ORIGINS=*

# Ambiente
ENVIRONMENT=production
AUTO_MIGRATE=true
DEBUG=false

# Seguridad JWT (CAMBIAR VALORES)
SECRET_KEY=tu-secret-key-super-seguro
JWT_SECRET_KEY=tu-jwt-secret-key-super-seguro

# Archivos
MAX_FILE_SIZE=10485760
UPLOAD_DIR=recognize/data
REPORTS_DIR=public/reports
TEMP_DIR=public/temp
PASSWORD_MIN_LENGTH=8

# Email
MAIL_API_URL=http://localhost:3001
MAIL_API_CLIENT_ID=tu-client-id
MAIL_API_SECRET=tu-secret
SMTP_FROM_EMAIL=noreply@tudominio.com
SMTP_FROM_NAME=Sistema de Asistencia

# Alertas
TARDANZAS_MAX_ALERTA=3
FALTAS_MAX_ALERTA=2
MINUTOS_TARDANZA=15
```

#### 📄 Crear `client/.env`

```bash
nano client/.env
```

**Contenido:**

```env
# URL del backend (ruta relativa)
NEXT_PUBLIC_URL_BACKEND=/api

# NextAuth (dejar vacío para autodetección)
NEXTAUTH_URL=
NEXTAUTH_SECRET=tu-nextauth-secret-super-seguro

# Socket.IO (dejar vacío para autodetección)
NEXT_PUBLIC_SOCKET_URL=

# Node.js
NODE_ENV=production
```

### Paso 12: Generar Certificados SSL

```bash
# Crear directorio para certificados
mkdir -p certs

# Generar certificados autofirmados
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certs/key.pem -out certs/cert.pem \
  -subj "/C=PE/ST=Lima/L=Lima/O=Sistema/CN=tudominio.com"
```

### Paso 13: Primer Despliegue Manual (Prueba)

```bash
# Hacer el script ejecutable
chmod +x deploy.sh

# Ejecutar despliegue completo
./deploy.sh
```

**El script automáticamente:**

- ✅ Verifica Docker y archivos `.env`
- ✅ Construye imágenes Docker
- ✅ Inicia contenedores con Docker Compose
- ✅ Ejecuta health checks

---

## 🔄 Configuración de GitHub Actions

### 📖 ¿Qué es GitHub Actions?

GitHub Actions ejecuta automáticamente:

1. **Detecta cambios** → Cuando haces `git push` a `main`
2. **Construye imágenes** → Solo del cliente y/o servidor que cambió
3. **Sube a GHCR** → GitHub Container Registry
4. **Despliega en EC2** → Conecta por SSH y actualiza

---

### Paso 1: Guardar la Clave Privada SSH como Secret

1. Ve a tu repositorio en GitHub
2. **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. **Name:** `EC2_SSH_KEY`
5. **Value:** Pega el contenido completo de `/home/deploy/.ssh/id_ed25519` (que guardaste en el Paso 6 del servidor)
6. Click **"Add secret"**

**Nota:** Copia TODO desde `-----BEGIN OPENSSH PRIVATE KEY-----` hasta `-----END OPENSSH PRIVATE KEY-----`

### Paso 2: Guardar el Usuario Deploy como Secret

1. Click **"New repository secret"**
2. **Name:** `EC2_USER`
3. **Value:** `deploy`
4. Click **"Add secret"**

### Paso 3: Guardar la IP o Dominio como Secret

1. Click **"New repository secret"**
2. **Name:** `EC2_HOST`
3. **Value:** Tu IP pública o dominio (ej: `3.141.24.38` o `ec2-3-141-24-38.us-east-2.compute.amazonaws.com`)
4. Click **"Add secret"**

### Paso 4: Verificar tus Secrets

En **Settings → Secrets and variables → Actions** deberías ver:

- ✅ `EC2_HOST`
- ✅ `EC2_SSH_KEY`
- ✅ `EC2_USER`

### Paso 5: Configurar Permisos del Workflow

1. En tu repositorio GitHub: **Settings** → **Actions** → **General**
2. **Workflow permissions**: Selecciona **"Read and write permissions"**
3. Marca **"Allow GitHub Actions to create and approve pull requests"**
4. Click **Save**

### Paso 6: Probar el Despliegue Automático

```bash
# En tu máquina local, hacer un cambio de prueba
cd /ruta/a/sistema-de-asistencia

# Hacer un cambio pequeño
echo "# Test" >> README.md

# Commit y push
git add .
git commit -m "test: probar GitHub Actions"
git push origin main
```

**Ver el proceso:**

1. Ve a **Actions** en tu repositorio GitHub
2. Verás el workflow ejecutándose
3. Click para ver logs detallados

### Paso 7: Entender los Resultados

**Colores en GitHub Actions:**

- 🟡 **Amarillo**: Ejecutándose
- 🟢 **Verde (✓)**: Completado exitosamente
- ⚪ **Gris (○)**: Saltado (no fue necesario)
- 🔴 **Rojo (✗)**: Falló con error

**Jobs que verás:**

1. `detect_changes` → Detecta qué cambió
2. `build_client` → Construye imagen del cliente (si cambió)
3. `build_server` → Construye imagen del servidor (si cambió)
4. `deploy` → Despliega en EC2

---

## 📦 GitHub Container Registry (GHCR)

### ¿Qué es GHCR?

GitHub Container Registry guarda las imágenes Docker de tu aplicación. Es automático, no necesitas configurar nada extra.

### Ver tus Imágenes

1. Ve a tu **perfil de GitHub**
2. Click en **Packages**
3. Verás: `sistema-asistencia-client` y `sistema-asistencia-server`

### Autenticar Docker en EC2

Para que el servidor pueda descargar las imágenes:

```bash
# Conectarte al servidor
ssh -i /ruta/a/id_ed25519 deploy@ec2-XX-XX-XX-XX

# Crear Personal Access Token en GitHub:
# Settings → Developer settings → Personal access tokens → Tokens (classic)
# → Generate new token → read:packages

# Autenticar Docker
echo "TU_TOKEN_AQUI" | docker login ghcr.io -u TU_USUARIO_GITHUB --password-stdin
```

**Esto solo se hace una vez.**

```

⚠️ **IMPORTANTE**: Los secrets son sensibles. GitHub nunca los muestra después de crearlos. Si cometiste un error, borra el secret y créalo de nuevo.

---

### 📦 Paso 3: Configurar GitHub Container Registry (GHCR)

GitHub Container Registry (GHCR) es donde se guardan las imágenes Docker de tu aplicación. Es como Docker Hub, pero integrado en GitHub.

#### 3.1. Verificar que GitHub Packages está Habilitado

1. Ve a tu repositorio en GitHub
2. Click en **Settings** → **Actions** → **General**
3. Baja hasta **Workflow permissions**
4. Verifica que esté seleccionado: **"Read and write permissions"**
5. Marca la casilla: **"Allow GitHub Actions to create and approve pull requests"**
6. Click **Save**

#### 3.2. Entender cómo Funciona GHCR

Cuando GitHub Actions construye tus imágenes Docker, las sube automáticamente a:

```

# Imagen del cliente (Next.js)

ghcr.io/TU_USUARIO_GITHUB/sistema-asistencia-client:main

# Imagen del servidor (FastAPI)

ghcr.io/TU_USUARIO_GITHUB/sistema-asistencia-server:main

```

**¿Dónde ver las imágenes?**

1. Ve a tu **perfil de GitHub** (no el repositorio)
2. Click en la pestaña **Packages**
3. Verás: `sistema-asistencia-client` y `sistema-asistencia-server`

#### 3.3. Configurar Visibilidad de Paquetes (Opcional)

Por defecto, los paquetes son **privados**. Si quieres hacerlos públicos:

1. Ve a tu perfil → **Packages**
2. Click en el paquete (ejemplo: `sistema-asistencia-client`)
3. Click **Package settings** (esquina derecha)
4. Baja hasta **Danger Zone** → **Change visibility**
5. Selecciona **Public** o **Private**

⚠️ **Recomendación**: Déjalos privados si el proyecto es privado.

#### 3.4. ¿Qué pasa con el `GITHUB_TOKEN`?

GitHub proporciona automáticamente un token llamado `GITHUB_TOKEN` que el workflow usa para:

- Subir imágenes a GHCR
- Descargar imágenes desde GHCR

**No necesitas hacer nada**. El token se genera automáticamente en cada ejecución del workflow.

---

### 🔑 Paso 4: Configurar Autenticación de Docker en el Servidor EC2

Para que tu servidor EC2 pueda descargar imágenes privadas de GHCR, necesitas autenticarlo.

#### 4.1. Crear un Personal Access Token (PAT) en GitHub

1. Ve a tu perfil de GitHub → **Settings**
2. Scroll hasta el final → **Developer settings**
3. Click **Personal access tokens** → **Tokens (classic)**
4. Click **Generate new token** → **Generate new token (classic)**
5. Configuración del token:
   - **Note**: `GHCR Access for EC2 Server`
   - **Expiration**: `No expiration` (o 90 días si prefieres)
   - **Select scopes**: Marca **SOLO** estas opciones:
     - ✅ `read:packages` (leer paquetes)
     - ✅ `write:packages` (escribir paquetes - opcional)
6. Click **Generate token**
7. **COPIA EL TOKEN INMEDIATAMENTE** (no podrás verlo de nuevo)

**Ejemplo de token:**

```

ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

````

#### 4.2. Autenticar Docker en el Servidor EC2

**Conéctate al servidor:**

```bash
ssh -i tu-clave.pem deploy@ec2-XX-XX-XX-XX.compute-1.amazonaws.com
````

**Autentica Docker con GHCR:**

```bash
# Formato:
echo "TU_TOKEN_AQUI" | docker login ghcr.io -u TU_USUARIO_GITHUB --password-stdin

# Ejemplo real:
echo "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" | docker login ghcr.io -u 2004Style --password-stdin

# Deberías ver:
# Login Succeeded
```

**Verificar autenticación:**

```bash
# Ver credenciales guardadas
cat ~/.docker/config.json

# Deberías ver algo como:
# {
#   "auths": {
#     "ghcr.io": {
#       "auth": "xxxxxxxxxx"
#     }
#   }
# }
```

⚠️ **NOTA**: Esta autenticación se guarda permanentemente. Solo necesitas hacerla **una vez**.

#### 4.3. ¿Por qué el Workflow también Autentica?

El workflow incluye este paso:

```yaml
- name: Autenticar en GitHub Container Registry en EC2
  run: |
    ssh deploy@ec2-host \
      "echo '${{ secrets.GITHUB_TOKEN }}' | docker login ghcr.io -u ${{ github.actor }} --password-stdin"
```

Esto **re-autentica** cada vez que hace deploy, usando el `GITHUB_TOKEN` temporal. Es redundante pero garantiza que siempre funcione, incluso si tu PAT expira.

---

### ✅ Paso 5: Probar el Workflow (Primera Ejecución)

Ahora que todo está configurado, vamos a probar que funciona.

#### 5.1. Hacer un Cambio Pequeño

En tu máquina local:

```bash
# Editar un archivo para forzar un despliegue
cd /ruta/a/sistema-de-asistencia

# Hacer un cambio pequeño (ejemplo: actualizar README)
echo "# Test deploy" >> README.md

# Commit y push
git add .
git commit -m "test: probar despliegue automático"
git push origin main
```

#### 5.2. Ver el Workflow en Acción

1. Ve a tu repositorio en GitHub
2. Click en la pestaña **Actions** (arriba)
3. Verás una nueva ejecución del workflow: **"test: probar despliegue automático"**
4. Click en la ejecución para ver detalles

#### 5.3. Entender la Vista del Workflow

Verás 4 jobs en el diagrama:

```
detect_changes → build_client ──┐
              → build_server ──┼→ deploy
                               │
```

**Colores:**

- 🟡 **Amarillo (animado)**: Ejecutándose ahora
- 🟢 **Verde (✓)**: Completado exitosamente
- ⚪ **Gris (○)**: Saltado (skipped) porque no fue necesario
- 🔴 **Rojo (✗)**: Falló con error

#### 5.4. Ver Logs Detallados

Click en cada job para ver los logs:

**detect_changes:**

```
✅ Cambios detectados en CLIENT
❌ Sin cambios en SERVER
📝 Archivos modificados:
README.md
```

**build_client:**

```
🐳 Set up Docker Buildx
🔐 Log in to Container Registry
📝 Extract metadata (Client)
🏗️ Build and push Docker image (Client)
  ✓ Building image...
  ✓ Pushing to ghcr.io/usuario/sistema-asistencia-client:main
```

**build_server:**

```
⚪ Skipped (no changes detected)
```

**deploy:**

```
🔑 Configurar SSH
📦 Determinar qué actualizar
  → 🌐 Se actualizará: CLIENT
🔐 Autenticar en GitHub Container Registry en EC2
🚀 Ejecutar script de despliegue selectivo
  → docker compose pull
  → bash deploy.sh client
✅ Notificar éxito
  🌐 Cliente disponible en: http://ec2-XX-XX-XX-XX.compute-1.amazonaws.com/
```

#### 5.5. Verificar en el Servidor

```bash
# Conectarte al servidor
ssh -i tu-clave.pem deploy@ec2-XX-XX-XX-XX.compute-1.amazonaws.com

# Ver contenedores actualizados
docker compose ps

# Ver logs del cliente (recién actualizado)
docker compose logs client --tail=50
```

---

### 🎯 Paso 6: Entender los Diferentes Escenarios de Despliegue

#### Escenario 1: Solo Cambió el Cliente

```bash
# Modificas algo en client/
git add client/
git commit -m "feat: nuevo componente de UI"
git push origin main

# GitHub Actions:
# ✓ detect_changes → client_changed=true, server_changed=false
# ✓ build_client   → Construye y sube nueva imagen
# ○ build_server   → Skipped
# ✓ deploy         → Ejecuta: deploy.sh client
```

**Resultado:** Solo el contenedor `cliente` se reinicia. El servidor sigue corriendo sin interrupciones.

#### Escenario 2: Solo Cambió el Servidor

```bash
# Modificas algo en server/
git add server/
git commit -m "fix: corregir endpoint de usuarios"
git push origin main

# GitHub Actions:
# ✓ detect_changes → client_changed=false, server_changed=true
# ○ build_client   → Skipped
# ✓ build_server   → Construye y sube nueva imagen
# ✓ deploy         → Ejecuta: deploy.sh server
```

**Resultado:** Solo el contenedor `api` se reinicia. El cliente sigue corriendo sin interrupciones.

#### Escenario 3: Cambiaron Ambos

```bash
# Modificas client/ y server/
git add .
git commit -m "feat: nueva funcionalidad completa"
git push origin main

# GitHub Actions:
# ✓ detect_changes → client_changed=true, server_changed=true
# ✓ build_client   → Construye y sube nueva imagen
# ✓ build_server   → Construye y sube nueva imagen
# ✓ deploy         → Ejecuta: deploy.sh (sin argumentos = full deploy)
```

**Resultado:** Ambos contenedores se reconstruyen y reinician.

#### Escenario 4: Cambió docker-compose.yml o nginx.conf

```bash
# Modificas configuración de Docker o Nginx
git add docker-compose.yml nginx.conf
git commit -m "config: actualizar nginx"
git push origin main

# GitHub Actions:
# ✓ detect_changes → client_changed=false, server_changed=false (pero se activa el workflow)
# ○ build_client   → Skipped
# ○ build_server   → Skipped
# ✓ deploy         → Ejecuta: deploy.sh (full deploy)
```

**Resultado:** Se reinician todos los contenedores con la nueva configuración.

---

### 🐛 Paso 7: Solución de Problemas de GitHub Actions

#### Problema 1: "Permission denied (publickey)"

**Error en el log:**

```
Permission denied (publickey).
```

**Causa:** El secret `EC2_SSH_KEY` está mal configurado.

**Solución:**

1. Verifica que copiaste **TODO** el contenido del `.pem` (incluyendo BEGIN y END)
2. Borra el secret `EC2_SSH_KEY` en GitHub
3. Créalo de nuevo:

```bash
# En tu máquina local
cat tu-clave.pem | pbcopy  # macOS
cat tu-clave.pem | xclip -selection clipboard  # Linux

# Pega en GitHub → New secret → EC2_SSH_KEY
```

#### Problema 2: "Host key verification failed"

**Error en el log:**

```
Host key verification failed.
```

**Causa:** GitHub Actions no tiene el host en known_hosts.

**Solución:** El workflow ya incluye `ssh-keyscan`. Si aún falla:

1. Ve a **Settings** → **Secrets** → Edita `EC2_HOST`
2. Asegúrate de que el hostname sea correcto (sin `http://` ni espacios)

#### Problema 3: "docker: command not found"

**Error en el log:**

```
bash: docker: command not found
```

**Causa:** El usuario `deploy` no tiene Docker instalado o no está en el grupo `docker`.

**Solución en el servidor:**

```bash
ssh -i tu-clave.pem ubuntu@ec2-host

# Verificar que deploy está en el grupo docker
groups deploy
# Debería incluir: deploy docker

# Si no está, agregarlo
sudo usermod -aG docker deploy

# Reiniciar sesión del usuario
sudo -u deploy newgrp docker

# Verificar
sudo -u deploy docker ps
```

#### Problema 4: "Failed to authenticate to ghcr.io"

**Error en el log:**

```
Error response from daemon: Get "https://ghcr.io/v2/": denied: denied
```

**Causa:** El servidor EC2 no puede autenticarse en GHCR.

**Solución:**

1. Crea un Personal Access Token (ver Paso 4.1)
2. Autentica manualmente en el servidor:

```bash
ssh -i tu-clave.pem deploy@ec2-host

echo "TU_TOKEN" | docker login ghcr.io -u TU_USUARIO --password-stdin
```

#### Problema 5: "No such file or directory: deploy.sh"

**Error en el log:**

```
bash: deploy.sh: No such file or directory
```

**Causa:** El repositorio no está clonado en `/home/deploy/app/sistema-de-asistencia`.

**Solución:**

```bash
ssh -i tu-clave.pem deploy@ec2-host

# Verificar ubicación del repositorio
ls -la /home/deploy/app/

# Si no existe, clonar
cd /home/deploy/app
git clone https://github.com/TU_USUARIO/sistema-de-asistencia.git

# Verificar que deploy.sh existe
ls -la sistema-de-asistencia/deploy.sh

# Hacerlo ejecutable
chmod +x sistema-de-asistencia/deploy.sh
```

#### Problema 6: Workflow no se Ejecuta

**Síntoma:** Haces push pero no aparece nada en Actions.

**Posibles causas:**

1. **El workflow está deshabilitado:**

   - Ve a **Actions** → Si ves un banner amarillo, click **Enable**

2. **Los cambios no están en la rama `main`:**

   - Verifica la rama: `git branch`
   - Cambia a main: `git checkout main`
   - Merge tu rama: `git merge tu-rama`

3. **Los archivos cambiados no están en `paths`:**
   - El workflow solo se activa si cambias `client/`, `server/`, etc.
   - Si cambias otros archivos (README.md, etc.), no se ejecuta
   - Para forzar ejecución, haz un cambio dummy en `client/` o `server/`

---

### 📊 Paso 8: Monitorear Despliegues

#### Ver Historial de Despliegues

1. Ve a **Actions** en tu repositorio
2. Verás lista de todas las ejecuciones
3. Filtros útiles:
   - **Status**: `success`, `failure`, `in progress`
   - **Event**: `push`
   - **Branch**: `main`

#### Notificaciones por Email

GitHub envía emails automáticamente cuando:

- ✅ Un workflow se completa exitosamente (primera vez o después de un fallo)
- ❌ Un workflow falla

Configurar notificaciones:

1. **Settings** → **Notifications** (en tu perfil personal, no el repo)
2. Bajo **GitHub Actions**, marca:
   - ✅ Email
   - ✅ Web
3. Selecciona: **"Send notifications for failed workflows only"** (recomendado)

#### Ver Métricas y Estadísticas

1. Ve a **Insights** → **Actions** en tu repositorio
2. Verás:
   - Tiempo promedio de ejecución
   - Tasa de éxito/fallo
   - Workflows más ejecutados

---

### 🎓 Resumen de la Configuración de GitHub Actions

#### ✅ Checklist Completo

- [ ] **Paso 1**: Verificar que `.github/workflows/deploy.yml` existe
- [ ] **Paso 2**: Configurar secrets en GitHub:
  - [ ] `EC2_SSH_KEY` (contenido del `.pem`)
  - [ ] `EC2_HOST` (DNS o IP de EC2)
  - [ ] `EC2_USER` (usuario `deploy`)
- [ ] **Paso 3**: Configurar permisos de workflow (Read and write)
- [ ] **Paso 4**: Crear Personal Access Token y autenticar Docker en EC2
- [ ] **Paso 5**: Hacer push de prueba y verificar que funciona
- [ ] **Paso 6**: Entender los diferentes escenarios de despliegue
- [ ] **Paso 7**: Conocer soluciones a problemas comunes
- [ ] **Paso 8**: Configurar notificaciones

#### 🎯 Flujo Completo Resumido

```
1. Desarrollas → Haces cambios en client/ o server/
2. Commit     → git add . && git commit -m "..."
3. Push       → git push origin main
                    ↓
4. GitHub Actions detecta el push
                    ↓
5. Ejecuta workflow (4 jobs):
   - detect_changes   🔍 ¿Qué cambió?
   - build_client     🏗️ Construir imagen (si cambió)
   - build_server     🏗️ Construir imagen (si cambió)
   - deploy          🚀 Desplegar en EC2
                    ↓
6. Tu servidor EC2 se actualiza automáticamente
                    ↓
7. Aplicación actualizada disponible en:
   http://ec2-XX-XX-XX-XX.compute-1.amazonaws.com/
```

**¡Listo! 🎉** Ahora tienes CI/CD completamente automatizado.

---

## 📦 Configuración de Archivos de Entorno

### Estructura de Variables de Entorno

```
proyecto/
├── .env (raíz) ❌ NO SE USA - solo por convención
├── server/.env ✅ REQUERIDO - variables del backend
└── client/.env ✅ REQUERIDO - variables del frontend
```

### Variables Clave por Servicio

#### Backend (server/.env)

| Variable             | Descripción                     | Ejemplo                               |
| -------------------- | ------------------------------- | ------------------------------------- |
| `DATABASE_URL`       | URL de conexión PostgreSQL      | `postgresql://user:pass@host:5432/db` |
| `SECRET_KEY`         | Clave para encriptación general | Generar con `openssl rand -base64 32` |
| `JWT_SECRET_KEY`     | Clave para tokens JWT           | Generar con `openssl rand -base64 32` |
| `CORS_ORIGINS`       | Orígenes permitidos             | `*` (desarrollo) o dominio específico |
| `MAIL_API_CLIENT_ID` | ID del cliente de email         | Obtener de tu servicio de email       |
| `MAIL_API_SECRET`    | Secret del servicio de email    | Obtener de tu servicio de email       |

#### Frontend (client/.env)

| Variable                  | Descripción          | Ejemplo                               |
| ------------------------- | -------------------- | ------------------------------------- |
| `NEXT_PUBLIC_URL_BACKEND` | URL del API          | `/api` (relativa - recomendado)       |
| `NEXTAUTH_SECRET`         | Secret para NextAuth | Generar con `openssl rand -base64 32` |
| `NEXT_PUBLIC_SOCKET_URL`  | URL de WebSocket     | Dejar vacío (autodetección)           |

### Generar Secrets Seguros

```bash
# Generar secrets aleatorios seguros
openssl rand -base64 32

# Ejemplo de output:
# kL9mN2pQ5rT8vW1xY4zA7bC0dE3fG6hJ9kM2nP5qR8s=
```

---

## 🏗️ Estructura del Proyecto

### Arquitectura de Despliegue

```
                    ┌─────────────────────────────────┐
                    │   Internet / Usuarios           │
                    └───────────────┬─────────────────┘
                                    │
                                    │ HTTP/HTTPS (80/443)
                                    ▼
                    ┌───────────────────────────────────┐
                    │   NGINX (Reverse Proxy)           │
                    │   - Enrutamiento                  │
                    │   - SSL/TLS                       │
                    │   - Load Balancing                │
                    └─────────┬─────────────────┬───────┘
                              │                 │
                    ┌─────────▼─────┐   ┌──────▼──────────┐
                    │  Next.js      │   │  FastAPI        │
                    │  (Client)     │   │  (Server)       │
                    │  Puerto: 3000 │   │  Puerto: 8000   │
                    └───────────────┘   └─────────┬───────┘
                                                   │
                                          ┌────────▼────────┐
                                          │  PostgreSQL DB  │
                                          │  (Externo)      │
                                          └─────────────────┘
```

### Contenedores Docker

El proyecto utiliza **3 contenedores principales**:

1. **nginx** - Reverse proxy y puerta de entrada única

   - Puerto expuesto: `80`, `443`
   - Rutas:
     - `/` → Next.js client
     - `/api/` → FastAPI server
     - `/api/socket.io/` → WebSocket

2. **client** - Aplicación Next.js (frontend)

   - Puerto interno: `3000`
   - Accesible solo desde nginx

3. **api** - Aplicación FastAPI (backend)
   - Puerto interno: `8000`
   - Accesible solo desde nginx

### Volúmenes Persistentes

```yaml
volumes:
  api_public: # Archivos públicos del API (reportes, etc.)
  api_recognize: # Datos de reconocimiento facial
```

---

## 🚀 Proceso de Despliegue

### Flujo de CI/CD con GitHub Actions

El workflow automatizado se activa en cada `push` a `main` y realiza:

#### 1. **Detección de Cambios** 🔍

Detecta qué carpetas fueron modificadas:

- `client/**` → Build del frontend
- `server/**` → Build del backend
- `docker-compose.yml`, `nginx.conf` → Rebuild completo

#### 2. **Build Selectivo** 🏗️

Solo construye las imágenes que cambiaron:

```yaml
# Si cambió el client:
build_client → ghcr.io/usuario/sistema-asistencia-client:main

# Si cambió el server:
build_server → ghcr.io/usuario/sistema-asistencia-server:main
```

Las imágenes se suben a **GitHub Container Registry (GHCR)**.

#### 3. **Deploy en EC2** 🚀

```bash
# GitHub Actions ejecuta en el servidor EC2:
ssh deploy@ec2-host "cd /home/deploy/app/sistema-de-asistencia && \
  docker compose pull && \
  bash deploy.sh [client|server]"
```

El script `deploy.sh` se encarga de:

- ✅ Verificar configuración (Docker, .env, certs)
- ✅ Detener contenedores actuales
- ✅ Actualizar solo los servicios modificados
- ✅ Iniciar contenedores
- ✅ Ejecutar health checks
- ✅ Limpiar imágenes antiguas

### Tipos de Despliegue

#### Despliegue Automático (GitHub Actions)

```bash
# Push a main → Despliegue automático
git add .
git commit -m "feat: nueva funcionalidad"
git push origin main

# GitHub Actions detecta cambios y despliega automáticamente
```

#### Despliegue Manual (SSH en servidor)

```bash
# Conectarse al servidor
ssh -i tu-clave.pem deploy@ec2-XX-XX-XX-XX.compute-1.amazonaws.com

cd /home/deploy/app/sistema-de-asistencia

# Actualizar código
git pull origin main

# Despliegue completo
./deploy.sh

# Despliegue selectivo
./deploy.sh client   # Solo frontend
./deploy.sh server   # Solo backend
```

### Comandos de Docker Compose

```bash
# Ver logs en tiempo real
docker compose logs -f

# Ver logs de un servicio específico
docker compose logs -f api
docker compose logs -f client
docker compose logs -f nginx

# Ver estado de contenedores
docker compose ps

# Reiniciar un servicio
docker compose restart api

# Detener todos los servicios
docker compose down

# Reconstruir e iniciar
docker compose up -d --build
```

---

## ✅ Verificación y Monitoreo

### Verificar que Todo Funciona

#### 1. Verificar contenedores activos

```bash
docker compose ps

# Output esperado:
# NAME                        STATUS        PORTS
# sistema-asistencia-nginx    Up           0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
# sistema-asistencia-api      Up (healthy) 0.0.0.0:8000->8000/tcp
# sistema-asistencia-client   Up (healthy) 0.0.0.0:3000->3000/tcp
```

#### 2. Verificar health checks

```bash
# API
curl http://localhost:8000/health

# Nginx
curl http://localhost/health

# Cliente (desde navegador)
curl http://localhost:3000
```

#### 3. Probar desde internet

```bash
# Reemplaza XX-XX-XX-XX con tu IP pública de EC2
curl http://ec2-XX-XX-XX-XX.compute-1.amazonaws.com/health

# Desde navegador:
# http://ec2-XX-XX-XX-XX.compute-1.amazonaws.com/
# http://ec2-XX-XX-XX-XX.compute-1.amazonaws.com/api/docs
```

### Monitorear Logs

```bash
# Logs de todos los servicios
docker compose logs -f

# Logs del API (útil para debug)
docker compose logs -f api --tail=100

# Logs del cliente
docker compose logs -f client --tail=100

# Logs de nginx (útil para ver requests)
docker compose logs -f nginx --tail=100

# Filtrar solo errores
docker compose logs -f api 2>&1 | grep -i error
```

### Inspeccionar Contenedores

```bash
# Entrar al contenedor del API
docker exec -it sistema-asistencia-api bash

# Dentro del contenedor:
ls -la
env | grep DATABASE_URL
python -c "import urllib.request; print(urllib.request.urlopen('http://localhost:8000/health').read())"
exit

# Entrar al contenedor del cliente
docker exec -it sistema-asistencia-client sh
```

### Ver Uso de Recursos

```bash
# Recursos en tiempo real
docker stats

# Espacio en disco de Docker
docker system df

# Limpiar recursos no usados
docker system prune -a --volumes
```

---

## 🔥 Solución de Problemas

### Problema 1: Contenedor no inicia

```bash
# Ver logs del contenedor fallido
docker compose logs api

# Verificar errores de configuración
docker compose config

# Verificar que .env existe
ls -la server/.env
ls -la client/.env

# Reiniciar desde cero
docker compose down -v
docker compose up -d
```

### Problema 2: Error de conexión a base de datos

```bash
# Verificar que DATABASE_URL es correcta
docker exec sistema-asistencia-api env | grep DATABASE_URL

# Probar conexión desde el contenedor
docker exec -it sistema-asistencia-api bash
python -c "import psycopg2; conn = psycopg2.connect('tu-connection-string'); print('OK')"
```

### Problema 3: Nginx devuelve 502 Bad Gateway

```bash
# Verificar que los servicios están corriendo
docker compose ps

# Ver logs de nginx
docker compose logs nginx

# Verificar conectividad interna
docker exec sistema-asistencia-nginx ping api
docker exec sistema-asistencia-nginx ping client

# Reiniciar nginx
docker compose restart nginx
```

### Problema 4: GitHub Actions falla en despliegue

```bash
# Verificar secrets en GitHub
# Settings → Secrets → Actions

# Verificar que el usuario deploy puede usar docker sin sudo
ssh -i tu-clave.pem deploy@ec2-host
docker ps  # No debería pedir sudo

# Verificar que el repositorio está actualizado en el servidor
cd /home/deploy/app/sistema-de-asistencia
git status
git log --oneline -5
```

### Problema 5: Error de permisos en volúmenes

```bash
# Cambiar permisos de volúmenes
docker compose down
sudo chown -R 1000:1000 /var/lib/docker/volumes/sistema-de-asistencia_api_public
sudo chown -R 1000:1000 /var/lib/docker/volumes/sistema-de-asistencia_api_recognize

docker compose up -d
```

### Problema 6: SSL no funciona

```bash
# Regenerar certificados
cd /home/deploy/app/sistema-de-asistencia
rm -rf certs/*

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certs/key.pem -out certs/cert.pem \
  -subj "/C=PE/ST=Lima/L=Lima/O=Sistema/CN=tudominio.com"

# Reiniciar nginx
docker compose restart nginx
```

### Comandos de Debug Útiles

```bash
# Ver todas las redes de Docker
docker network ls
docker network inspect sistema-de-asistencia_sistema-asistencia-network

# Ver todos los volúmenes
docker volume ls
docker volume inspect sistema-de-asistencia_api_public

# Ver procesos dentro de un contenedor
docker top sistema-asistencia-api

# Ver estadísticas de un contenedor
docker stats sistema-asistencia-api --no-stream

# Limpiar todo y empezar de cero (⚠️ CUIDADO: borra volúmenes)
docker compose down -v
docker system prune -a --volumes
./deploy.sh
```

---

## 📝 Comandos de Referencia Rápida

### Conexión SSH

```bash
# Conectar como deploy
ssh -i tu-clave.pem deploy@ec2-XX-XX-XX-XX.compute-1.amazonaws.com

# Conectar como ubuntu (si es necesario)
ssh -i tu-clave.pem ubuntu@ec2-XX-XX-XX-XX.compute-1.amazonaws.com
```

### Despliegue

```bash
cd /home/deploy/app/sistema-de-asistencia

# Actualizar código
git pull origin main

# Despliegue completo
./deploy.sh

# Despliegue selectivo
./deploy.sh client
./deploy.sh server
```

### Docker

```bash
# Ver contenedores
docker compose ps

# Ver logs
docker compose logs -f

# Reiniciar servicios
docker compose restart

# Detener todo
docker compose down

# Iniciar todo
docker compose up -d
```

### Verificación

```bash
# Health checks
curl http://localhost/health
curl http://localhost/api/docs

# Ver logs del API
docker compose logs -f api --tail=50

# Ver recursos
docker stats
```

---

## 🎯 Checklist de Despliegue

### Configuración Inicial (Una sola vez)

- [ ] Crear instancia EC2 en AWS
- [ ] Configurar Security Groups (puertos 22, 80, 443)
- [ ] Instalar Docker y Docker Compose
- [ ] Crear usuario `deploy`
- [ ] Configurar SSH para usuario `deploy`
- [ ] Clonar repositorio
- [ ] Crear `server/.env` con variables correctas
- [ ] Crear `client/.env` con variables correctas
- [ ] Generar certificados SSL
- [ ] Configurar secrets en GitHub
- [ ] Primer despliegue manual: `./deploy.sh`

### Cada Despliegue (Automatizado por GitHub Actions)

- [ ] Push a `main` activa workflow
- [ ] GitHub Actions detecta cambios
- [ ] Build de imágenes Docker
- [ ] Push a GHCR
- [ ] Deploy en EC2
- [ ] Health checks pasan
- [ ] Verificar aplicación funciona

### Verificación Post-Despliegue

- [ ] `docker compose ps` muestra todos los servicios `Up`
- [ ] `curl http://localhost/health` responde OK
- [ ] Aplicación accesible desde internet
- [ ] API docs disponible en `/api/docs`
- [ ] WebSocket funciona correctamente
- [ ] Logs no muestran errores críticos

---

## 🛡️ Seguridad y Mejores Prácticas

### Variables de Entorno

- ✅ **NUNCA** subir archivos `.env` al repositorio
- ✅ Usar secrets diferentes para desarrollo y producción
- ✅ Rotar secrets regularmente (cada 3-6 meses)
- ✅ Generar secrets con `openssl rand -base64 32`

### Servidor EC2

- ✅ Usar usuario `deploy` dedicado (no `root` ni `ubuntu`)
- ✅ Configurar firewall con Security Groups
- ✅ Mantener sistema actualizado: `sudo apt update && sudo apt upgrade`
- ✅ Hacer backups regulares de volúmenes Docker
- ✅ Monitorear logs regularmente

### Docker

- ✅ No exponer puertos 3000 y 8000 públicamente
- ✅ Solo Nginx (80/443) debe ser accesible desde internet
- ✅ Usar health checks en todos los servicios
- ✅ Limpiar imágenes antiguas regularmente

### GitHub Actions

- ✅ Usar secrets de GitHub, nunca hardcodear credenciales
- ✅ Limitar permisos del workflow al mínimo necesario
- ✅ Revisar logs de despliegue regularmente

---

## 📚 Recursos Adicionales

- **Docker Docs**: https://docs.docker.com/
- **Docker Compose**: https://docs.docker.com/compose/
- **Nginx Docs**: https://nginx.org/en/docs/
- **GitHub Actions**: https://docs.github.com/en/actions
- **AWS EC2**: https://docs.aws.amazon.com/ec2/
- **FastAPI**: https://fastapi.tiangolo.com/
- **Next.js**: https://nextjs.org/docs

---

**¡Listo! 🎉** Tu aplicación debería estar corriendo en producción con despliegue continuo automatizado.

Si encuentras problemas, revisa la sección de [Solución de Problemas](#-solución-de-problemas) o contacta al equipo de desarrollo.
