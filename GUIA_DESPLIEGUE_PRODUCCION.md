# 🚀 GUÍA DE DESPLIEGUE EN PRODUCCIÓN - AWS EC2

## 📋 Requisitos Previos

### Infraestructura

- [ ] Instancia EC2 corriendo (Amazon Linux 2 o Ubuntu)
- [ ] Base de datos PostgreSQL 13+ (RDS, Cloud SQL o VPS)
- [ ] Dominio configurado con DNS apuntando a EC2
- [ ] Certificados SSL (Let's Encrypt o proporcionados)

### En tu máquina local

- [ ] Git configurado con SSH key
- [ ] Docker instalado y funcionando
- [ ] Repositorio clonado: `git clone git@github.com:2004Style/sistema-de-asistencia.git`

---

## 🔧 Paso 1: Preparar EC2

### 1.1 Instalar Docker y Docker Compose

```bash
# Conectar a EC2
ssh -i tu-key.pem ubuntu@tu-ec2-ip

# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
sudo apt install -y docker.io docker-compose

# Agregar usuario al grupo docker
sudo usermod -aG docker $USER
sudo usermod -aG docker ubuntu

# Verificar Docker
docker --version
docker-compose --version
```

### 1.2 Crear directorios

```bash
# Directorio de aplicación
mkdir -p ~/app/sistema-de-asistencia
cd ~/app/sistema-de-asistencia

# Clonar repositorio
git clone git@github.com:2004Style/sistema-de-asistencia.git .

# Navegar a server
cd server
```

### 1.3 Generar certificados SSL (si es necesario)

```bash
# Si usas Let's Encrypt
sudo apt install -y certbot python3-certbot-nginx

# Generar certificado (reemplaza tu-dominio.com)
sudo certbot certonly --standalone -d tu-dominio.com -d www.tu-dominio.com

# Copiar certificados
sudo cp /etc/letsencrypt/live/tu-dominio.com/fullchain.pem certs/cert.pem
sudo cp /etc/letsencrypt/live/tu-dominio.com/privkey.pem certs/key.pem
sudo chown $USER:$USER certs/*
```

---

## 📝 Paso 2: Configurar Base de Datos

### 2.1 Obtener cadena de conexión

Según tu proveedor de BD:

```bash
# AWS RDS
DATABASE_URL="postgresql://admin:password@mydb.rds.amazonaws.com:5432/asistencia"

# Google Cloud SQL
DATABASE_URL="postgresql://postgres:password@35.192.123.45:5432/asistencia"

# VPS/Servidor propio
DATABASE_URL="postgresql://user:password@tu-servidor.com:5432/asistencia"
```

### 2.2 Crear `.env.production`

En tu máquina local, crear archivo `.env.production`:

```bash
# En /home/ronald/Documentos/project-hibridos/sistema-de-asistencia/server/
cat > .env.production << 'EOF'
# BASE DE DATOS - SERVIDOR EXTERNO
DATABASE_URL=postgresql://admin:TuContraseña123@mydb.rds.amazonaws.com:5432/asistencia

# API
HOST=0.0.0.0
PORT=8000
TIMEZONE=America/Lima

# PRODUCCIÓN
AUTO_MIGRATE=false
DEBUG=false

# SEGURIDAD - CAMBIAR ESTOS VALORES
SECRET_KEY=generar-clave-segura-aqui-PRODUCCION-123456
JWT_SECRET_KEY=generar-jwt-clave-segura-aqui-PRODUCCION-123456

# ARCHIVOS
MAX_FILE_SIZE=10485760
UPLOAD_DIR=recognize/data
REPORTS_DIR=public/reports
TEMP_DIR=public/temp

# EMAIL
MAIL_API_URL=http://mail-service:3001
MAIL_API_CLIENT_ID=your-client-id
MAIL_API_SECRET=your-secret-key
SMTP_FROM_EMAIL=noreply@tudominio.com
SMTP_FROM_NAME=Sistema de Asistencia

# ALERTAS
TARDANZAS_MAX_ALERTA=3
FALTAS_MAX_ALERTA=2
MINUTOS_TARDANZA=15

# NGINX
NGINX_HTTP_PORT=80
NGINX_HTTPS_PORT=443
EOF
```

### 2.3 Cargar en EC2

```bash
# Desde tu máquina, copiar a EC2
scp -i tu-key.pem .env.production ubuntu@tu-ec2-ip:~/app/sistema-de-asistencia/server/

# Verificar
ssh -i tu-key.pem ubuntu@tu-ec2-ip "cat ~/app/sistema-de-asistencia/server/.env.production"
```

---

## 🐳 Paso 3: Desplegar con Docker Compose

### 3.1 Construir y ejecutar

```bash
# En EC2
cd ~/app/sistema-de-asistencia/server

# Limpiar (si no es primera vez)
docker compose -f docker-compose-production.yml down

# Construir y ejecutar
docker compose -f docker-compose-production.yml up -d --build

# Esperar 45-60 segundos para que se carguen los modelos
sleep 60

# Verificar
docker ps
```

### 3.2 Monitorear logs

```bash
# Ver logs en tiempo real
docker logs sistema-asistencia-api -f

# Búsqueda específica
docker logs sistema-asistencia-api | grep -i "error\|warning\|database"

# Ver últimas 50 líneas
docker logs sistema-asistencia-api --tail 50
```

### 3.3 Verificar estado

```bash
# Verificar contenedores
docker ps

# Esperado:
# - sistema-asistencia-api: (healthy)
# - sistema-asistencia-nginx: (running)

# Probar API
curl http://localhost:8000/health
curl https://tu-dominio.com/health  # Si tienes SSL
```

---

## ✅ Paso 4: Validaciones Post-Deploy

### 4.1 API funciona

```bash
# Health check
curl -s http://localhost:8000/health | jq

# Documentación
curl -s http://localhost:8000/docs | head -20

# API funcionando
curl -X GET http://localhost:8000/api/roles | jq
```

### 4.2 Base de datos conectada

```bash
# Desde EC2 (si tienes psql)
psql postgresql://admin:password@mydb.rds.amazonaws.com:5432/asistencia \
  -c "SELECT version();"

# O desde el contenedor
docker exec sistema-asistencia-api python -c \
  "from src.config.database import engine; print('✅ BD OK')"
```

### 4.3 Modelos de ML cargados

```bash
# Ver logs
docker logs sistema-asistencia-api | grep -i "recognition\|facial\|deepface"

# Esperado:
# ✅ Facial recognition system initialized successfully
# ✅ Reconocedor cargado exitosamente
```

### 4.4 Seeds ejecutados

```bash
# Ver logs
docker logs sistema-asistencia-api | grep -i "seed\|ejecutando"

# Esperado:
# 🌱 Ejecutando seeds...
# ✅ seed_roles completado
# ✅ seed_turnos completado
# ✅ seed_users completado
```

---

## 🔄 Actualizaciones (Deployment Continuo)

### Opción 1: GitHub Actions (Automático)

```bash
# Solo hacer push a main
git add -A
git commit -m "Fix: cambios en producción"
git push origin main

# GitHub Actions ejecuta automáticamente:
# 1. Build Docker image
# 2. Push a registry
# 3. SSH a EC2
# 4. Ejecuta deploy-aws-ec2.sh
```

### Opción 2: Manual

```bash
# En EC2
cd ~/app/sistema-de-asistencia
git pull origin main

cd server
docker compose -f docker-compose-production.yml down
docker compose -f docker-compose-production.yml up -d --build
```

---

## 🛡️ Seguridad

### Variables sensibles

```bash
# ❌ NUNCA
DATABASE_URL=postgresql://admin:password123@host/db  # En git

# ✅ SÍ
# Usar .env.production (en .gitignore)
# Usar GitHub Secrets para CI/CD
# Usar AWS Secrets Manager o similar
```

### Firewall

```bash
# Solo permitir puertos necesarios
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 5432/tcp  # PostgreSQL (si es necesario)

sudo ufw enable
sudo ufw status
```

### Certificados SSL

```bash
# Renovar automáticamente (Let's Encrypt)
sudo certbot renew --dry-run

# Verificar
curl -I https://tu-dominio.com
```

---

## 🐛 Troubleshooting

### Contenedor no inicia

```bash
# Ver logs
docker logs sistema-asistencia-api

# Errores comunes:
# 1. DATABASE_URL incorrecto → Verificar cadena conexión
# 2. No hay espacio → docker system prune -a
# 3. Puerto en uso → docker ps | grep 8000
```

### BD no conecta

```bash
# Verificar desde EC2
telnet mydb.rds.amazonaws.com 5432

# Verificar credenciales
psql postgresql://admin:password@host:5432/asistencia

# Ver error específico
docker exec sistema-asistencia-api python -c \
  "import os; from sqlalchemy import create_engine; \
  engine = create_engine(os.environ['DATABASE_URL']); \
  engine.connect()"
```

### API lenta

```bash
# Ver recursos
docker stats

# Ver logs
docker logs sistema-asistencia-api | grep -i "warning\|error"

# Reiniciar
docker restart sistema-asistencia-api
```

---

## 📊 Monitoreo Continuo

### Health Check

```bash
# Monitoreo automático (cron cada 5 min)
*/5 * * * * curl -f http://localhost:8000/health || \
  docker restart sistema-asistencia-api
```

### Logs

```bash
# Guardar logs localmente
docker logs sistema-asistencia-api > api.log 2>&1

# Rotación de logs
docker run --log-driver json-file --log-opt max-size=10m ...
```

### Backups BD

```bash
# Backup manual
pg_dump postgresql://admin:password@host/asistencia \
  > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurar
psql postgresql://admin:password@host/asistencia < backup.sql
```

---

## 📚 Referencias

- [AWS EC2 Documentation](https://docs.aws.amazon.com/ec2/)
- [Docker Compose Production](https://docs.docker.com/compose/production/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)

---

## ✅ Checklist Final

- [ ] EC2 levantado y accesible
- [ ] Docker y Docker Compose instalado
- [ ] BD externa verificada
- [ ] `.env.production` configurado
- [ ] Certificados SSL en lugar
- [ ] `docker-compose-production.yml` corriendo
- [ ] API respondiendo en `/health`
- [ ] Logs sin errores críticos
- [ ] Firewall configurado
- [ ] Backups de BD configurados

**Sistema listo para producción ✅**
