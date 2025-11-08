# 🚀 Guía Completa: Despliegue con GitHub Actions en AWS EC2

## 📋 Tabla de Contenidos

1. [Preparación del servidor](#preparación-del-servidor)
2. [Configuración en GitHub](#configuración-en-github)
3. [Cómo funciona el despliegue](#cómo-funciona-el-despliegue)
4. [Solución de problemas](#solución-de-problemas)

---

## 🖥️ Preparación del Servidor

### Paso 1: Crear usuario `deploy` (si no existe)

```bash
# En tu servidor EC2
sudo adduser deploy --disabled-password --disabled-login --gecos "Deploy User"
```

### Paso 2: Generar clave SSH para el usuario `deploy`

```bash
# Ejecutar como usuario deploy
sudo -u deploy ssh-keygen -t ed25519 -C "deploy@ec2" -N "" -f /home/deploy/.ssh/id_ed25519
```

**Salida esperada:**

```
Generating public/private ed25519 key pair.
Created directory '/home/deploy/.ssh'.
Your identification has been saved in /home/deploy/.ssh/id_ed25519
Your public key has been saved in /home/deploy/.ssh/id_ed25519.pub
The key fingerprint is: SHA256:11V4kvntUvetwZbnw48PmzUM8loO7DeYkMLHa4kXg6A deploy@ec2
```

### Paso 3: Ver la clave pública (la necesitarás en GitHub)

```bash
sudo cat /home/deploy/.ssh/id_ed25519.pub
```

**Guarda este valor**, lo usarás en GitHub Actions.

### Paso 4: Ver la clave privada

```bash
sudo cat /home/deploy/.ssh/id_ed25519
```

**Guarda este valor**, también lo necesitarás en GitHub (como Secret).

### Paso 5: Crear carpeta de aplicación

```bash
sudo mkdir -p /home/deploy/app
sudo chown -R deploy:deploy /home/deploy/app
sudo chmod 755 /home/deploy/app
```

### Paso 6: Agregar clave pública a `authorized_keys` (si usas múltiples claves)

```bash
# Cambiar a usuario deploy
sudo -i -u deploy

# Crear directorio .ssh si no existe
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Agregar clave pública
echo "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDQOxsFd..." >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### Paso 7: Instalar Docker y Docker Compose

```bash
# Actualizar paquetes
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Agregar usuario deploy a grupo docker
sudo usermod -aG docker deploy

# Instalar Docker Compose
sudo apt install docker-compose -y

# Verificar instalación
docker --version
docker compose --version
```

### Paso 8: Configurar archivo `.env` en el servidor

```bash
# En el servidor, como usuario deploy
sudo -i -u deploy
cd /home/deploy/app/sistema-de-asistencia/server

# Crear .env basado en .env.example
cp .env.example .env

# Editar con valores reales
nano .env
```

**Contenido típico de `.env`:**

```env
# Database
DATABASE_URL=postgresql://user:password@db-host:5432/asistencia_db

# API
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=False

# JWT
JWT_SECRET=tu_secret_key_segura

# Email
MAIL_USERNAME=tu_email@gmail.com
MAIL_PASSWORD=tu_app_password

# AWS (si usas reconocimiento facial)
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret

# Otros
ENVIRONMENT=production
```

### Paso 9: Dar permisos para el script de despliegue

```bash
sudo chmod +x /home/deploy/app/sistema-de-asistencia/server/deploy-aws-ec2.sh
```

### Paso 10: Verificar conectividad desde GitHub Actions

```bash
# Probar SSH desde tu máquina local
ssh -i path/to/private/key deploy@your.ec2.ip.address

# Dentro del servidor, verificar que puede correr el script
sudo -i -u deploy
bash /home/deploy/app/sistema-de-asistencia/server/deploy-aws-ec2.sh
```

---

## 🐙 Configuración en GitHub

### Paso 1: Guardar la clave privada SSH como Secret

1. Ve a tu repositorio en GitHub
2. **Settings** → **Secrets and variables** → **Actions**
3. Clic en **"New repository secret"**
4. **Name:** `EC2_SSH_KEY`
5. **Value:** (pega el contenido completo de `/home/deploy/.ssh/id_ed25519`)
6. Clic en **"Add secret"**

### Paso 2: Guardar el usuario deploy como Secret

1. Clic en **"New repository secret"**
2. **Name:** `EC2_USER`
3. **Value:** `deploy`
4. Clic en **"Add secret"**

### Paso 3: Guardar el IP o dominio como Secret

1. Clic en **"New repository secret"**
2. **Name:** `EC2_HOST`
3. **Value:** Tu IP pública o dominio (ej: `18.225.34.130` o `api.ejemplo.com`)
4. Clic en **"Add secret"**

**Verificar tus secrets:**

```
Settings → Secrets and variables → Actions
```

Deberías ver:

- `EC2_HOST`
- `EC2_SSH_KEY`
- `EC2_USER`

---

## 🔄 Cómo Funciona el Despliegue

### Flujo del Workflow `deploy.yml`:

```
┌─────────────────────────────────────────────────────────────┐
│  1. Push a rama 'main' con cambios en 'server/'             │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  2. GitHub Actions dispara el workflow                       │
│     - Desactiva tests (comentados)                           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  3. Job BUILD: Construye imagen Docker                      │
│     - Clona el repositorio                                  │
│     - Construye imagen: sistema-asistencia:latest           │
│     - Empuja a GitHub Container Registry (GHCR)            │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  4. Job DEPLOY: Conecta a EC2 y ejecuta script             │
│     - Usa SSH con clave privada                            │
│     - Ejecuta: deploy-aws-ec2.sh                           │
│     - El script:                                            │
│       a) Clona/actualiza el repositorio                    │
│       b) Genera certificados SSL si falta                  │
│       c) Construye imagen Docker localmente                │
│       d) Para contenedor anterior                          │
│       e) Inicia nuevo contenedor                           │
│       f) Verifica salud de la API                          │
│       g) Limpia imágenes antiguas                          │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  5. Verificación final                                       │
│     - Comprueba que http://localhost:8000/docs responda    │
└─────────────────────────────────────────────────────────────┘
```

### Qué hace `deploy-aws-ec2.sh`:

| Paso | Acción                   | Descripción                        |
| ---- | ------------------------ | ---------------------------------- |
| 1    | Verifica requisitos      | Docker, Git, permisos              |
| 2    | Clona/actualiza repo     | Desde GitHub                       |
| 3    | Genera certificados SSL  | Auto-firmados si no existen        |
| 4    | Carga `.env`             | Variables de entorno de producción |
| 5    | Verifica BD              | Conectividad                       |
| 6    | Construye imagen Docker  | Desde Dockerfile del servidor      |
| 7    | Detiene contenedor viejo | Elimina contenedor anterior        |
| 8    | Inicia nuevo contenedor  | Con docker compose o docker run    |
| 9    | Verifica salud           | Espera a que API responda          |
| 10   | Limpia imágenes antiguas | Libera espacio disco               |

---

## 🧪 Prueba Manual del Despliegue

### Primera vez (despliegue manual de prueba):

```bash
# En tu servidor EC2, como usuario deploy
sudo -i -u deploy
cd /home/deploy/app

# Si el repositorio NO existe
git clone git@github.com:2004Style/sistema-de-asistencia.git

# Navegar al servidor
cd sistema-de-asistencia/server

# Ejecutar el script de despliegue
bash deploy-aws-ec2.sh
```

### Después, con GitHub Actions:

```bash
# Solo haz push a main
git add .
git commit -m "Cambios en server"
git push origin main

# Monitorea el despliegue en:
# https://github.com/2004Style/sistema-de-asistencia/actions
```

---

## 📊 Ver logs del despliegue

### En GitHub Actions:

1. Ve a **Actions** en tu repositorio
2. Haz clic en el último workflow ejecutado
3. Abre el job **"🚀 Deploy a EC2"**
4. Desplega los steps para ver detalles

### En el servidor:

```bash
# Ver logs del script de despliegue
cat /var/log/deploy/deploy_*.log

# Ver últimos 50 líneas
tail -50 /var/log/deploy/deploy_*.log

# Ver logs del contenedor
docker logs -f sistema-asistencia-api

# Ver procesos Docker
docker ps

# Ver uso de recursos
docker stats
```

---

## 🔍 Verificar que el despliegue funcionó

```bash
# Desde tu máquina local:

# 1. Verificar SSH
ssh -i path/to/key deploy@ec2-ip-address

# 2. Dentro del servidor, verificar Docker
docker ps
docker logs -f sistema-asistencia-api

# 3. Probar API
curl http://ec2-ip:8000/docs
# O en navegador: http://ec2-ip:8000/docs

# 4. Ver variables de entorno cargadas
docker exec sistema-asistencia-api env | grep DATABASE_URL

# 5. Ver estado de contenedor
docker inspect sistema-asistencia-api | grep -A 5 State
```

---

## ⚠️ Solución de Problemas

### Error: "Permission denied (publickey)"

**Causa:** La clave SSH no está configurada correctamente.

**Solución:**

```bash
# En GitHub, verifica que EC2_SSH_KEY sea la CLAVE PRIVADA (sin encriptar)
# Debe empezar con: -----BEGIN OPENSSH PRIVATE KEY-----

# En el servidor, verifica permisos
sudo -i -u deploy
ls -la ~/.ssh/authorized_keys  # Debe ser 600
ls -la ~/.ssh                  # Debe ser 700
```

### Error: "Host key verification failed"

**Causa:** El servidor no está en `known_hosts`.

**Solución:** El workflow ya maneja esto con `ssh-keyscan`, pero si persiste:

```bash
# En tu máquina local
ssh-keyscan ec2-ip >> ~/.ssh/known_hosts
```

### Error: "Cannot connect to Docker daemon"

**Causa:** El usuario `deploy` no tiene permisos de Docker.

**Solución:**

```bash
# En el servidor
sudo usermod -aG docker deploy
sudo usermod -aG sudo deploy
```

### Error: "docker: command not found"

**Causa:** Docker no está instalado.

**Solución:**

```bash
# En el servidor
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo apt install docker-compose -y
```

### La API no responde después del despliegue

**Causa:** El contenedor podría estar teniendo problemas.

**Solución:**

```bash
# En el servidor
docker ps -a  # Ver todos los contenedores
docker logs sistema-asistencia-api  # Ver errores
docker inspect sistema-asistencia-api  # Ver estado

# Reiniciar manualmente
docker restart sistema-asistencia-api

# O detener e iniciar
docker stop sistema-asistencia-api
docker rm sistema-asistencia-api
bash /home/deploy/app/sistema-de-asistencia/server/deploy-aws-ec2.sh
```

### Error: ".env no existe"

**Causa:** No creaste el archivo `.env` en el servidor.

**Solución:**

```bash
# En el servidor como deploy
cd /home/deploy/app/sistema-de-asistencia/server
cp .env.example .env
nano .env
# Llenar con valores reales
```

### Puerto 8000 ya está en uso

**Causa:** Hay otro contenedor o proceso usando el puerto.

**Solución:**

```bash
# Ver qué está usando el puerto
sudo lsof -i :8000

# Detener todos los contenedores
docker stop $(docker ps -q)

# Cambiar puerto en .env
nano .env
# Cambiar API_PORT a otro (ej: 8001)
```

---

## 🔐 Seguridad

### Checklist:

- [ ] La clave privada (`EC2_SSH_KEY`) está guardada como Secret en GitHub
- [ ] El servidor tiene firewall habilitado
- [ ] Solo el puerto 22 (SSH) y 8000 (API) están abiertos
- [ ] Las credenciales de BD están en `.env` (no en código)
- [ ] La clave privada NO está commitida en el repositorio
- [ ] Se usan certificados SSL (el script los genera automáticamente)

### Rotación de claves SSH:

Cada 6-12 meses, genera nuevas claves:

```bash
# En el servidor
sudo -u deploy ssh-keygen -t ed25519 -C "deploy@ec2" -f /home/deploy/.ssh/id_ed25519 -N ""

# Actualiza el Secret en GitHub con la nueva clave privada
```

---

## 📚 Referencias

- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Docker SSH Key Guide](https://docs.docker.com/engine/security/protect-access/)
- [AWS EC2 Security Groups](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-security-groups.html)

---

## 📝 Resumen Rápido

### Tareas en el servidor (una sola vez):

1. ✅ Crear usuario `deploy`
2. ✅ Generar clave SSH ED25519
3. ✅ Crear carpeta `/home/deploy/app`
4. ✅ Instalar Docker + Docker Compose
5. ✅ Crear `.env` con valores reales

### Tareas en GitHub (una sola vez):

1. ✅ Guardar `EC2_SSH_KEY` como Secret
2. ✅ Guardar `EC2_USER` como Secret
3. ✅ Guardar `EC2_HOST` como Secret

### Después (automático):

- 🔄 Push a `main` → GitHub Actions → Despliegue automático a EC2

---

**¡Listo!** Tu despliegue automatizado está configurado. 🎉
