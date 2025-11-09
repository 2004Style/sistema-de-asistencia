# 📘 GUÍA DE DESPLIEGUE - SERVIDOR BACKEND (FastAPI)

## 📋 Requisitos

- Python 3.10+
- PostgreSQL (base de datos)
- Nginx (para proxy reverso)
- Puerto 8000 disponible (interno)
- Puerto 80/443 disponibles (público)

## 🔧 Instalación Paso a Paso

### 1. Clonar repositorio

```bash
git clone https://github.com/2004Style/sistema-de-asistencia.git
cd sistema-de-asistencia/server
```

### 2. Crear entorno virtual

```bash
# Crear venv
python3 -m venv venv

# Activar venv
source venv/bin/activate
# En Windows: venv\Scripts\activate
```

### 3. Instalar dependencias

```bash
pip install -r requirements.txt
```

### 4. Configurar variables de entorno

#### Para DESARROLLO:

```bash
cp .env.local.example .env.local
# Editar .env.local y configurar:
# - DATABASE_URL: postgresql://usuario:contraseña@localhost:5432/asistencia_dev
# - ALLOWED_ORIGINS: http://localhost:3000,http://IP_CLIENTE:3000
# - SECRET_KEY: (generar clave segura)
```

#### Para PRODUCCIÓN:

```bash
cp .env.production .env.production.local
# Editar variables críticas:
# - DATABASE_URL: usar servidor PostgreSQL remoto
# - ALLOWED_ORIGINS: solo tudominio.com
# - SECRET_KEY: clave muy segura
```

### 5. Configurar Base de Datos

#### Crear base de datos PostgreSQL

```bash
# Conectarse a PostgreSQL
psql -U postgres

# Crear base de datos
CREATE DATABASE asistencia_dev;
CREATE DATABASE asistencia_prod;

# Crear usuario
CREATE USER asistencia_user WITH PASSWORD 'contraseña_segura';

# Otorgar permisos
GRANT ALL PRIVILEGES ON DATABASE asistencia_dev TO asistencia_user;
GRANT ALL PRIVILEGES ON DATABASE asistencia_prod TO asistencia_user;
```

#### Ejecutar migraciones

```bash
# Activar venv primero
source venv/bin/activate

# Ejecutar migraciones Alembic
alembic upgrade head
```

### 6. Ejecutar la aplicación

#### DESARROLLO (hot reload):

```bash
# Opción 1: Script automático
./run.sh

# Opción 2: Manualmente
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

#### PRODUCCIÓN (optimizado):

```bash
# Con Gunicorn + Uvicorn
gunicorn src.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## 🚀 Despliegue en Servidor Separado

### Opción 1: Con Nginx como Proxy Reverso (RECOMENDADO)

#### 1. Instalar Nginx

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install nginx

# RHEL/CentOS
sudo yum install nginx
```

#### 2. Instalar Gunicorn y dependencias

```bash
pip install gunicorn

# Agregar a requirements.txt si falta:
echo "gunicorn" >> requirements.txt
```

#### 3. Copiar configuración Nginx

```bash
# Copiar archivo de configuración
sudo cp nginx/nginx-server.conf /etc/nginx/sites-available/server
sudo ln -s /etc/nginx/sites-available/server /etc/nginx/sites-enabled/server

# O modificar archivo existente
sudo nano /etc/nginx/sites-available/default
# y pegar la configuración de nginx-server.conf
```

#### 4. Crear certificado SSL (PRODUCCIÓN)

```bash
# Con Let's Encrypt
sudo apt-get install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d api.tudominio.com

# O certificado autofirmado
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/certs/key.pem \
  -out /etc/nginx/certs/cert.pem
```

#### 5. Habilitar SSL en Nginx

En `/etc/nginx/sites-available/server`, descomenta:

```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /etc/nginx/certs/cert.pem;
    ssl_certificate_key /etc/nginx/certs/key.pem;
}
```

#### 6. Verificar y reiniciar Nginx

```bash
# Verificar sintaxis
sudo nginx -t

# Reiniciar
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### Opción 2: Despliegue con Supervisor + Gunicorn

#### 1. Instalar Supervisor

```bash
sudo apt-get install supervisor
```

#### 2. Crear archivo de configuración

```bash
sudo nano /etc/supervisor/conf.d/asistencia-server.conf
```

Contenido:

```ini
[program:asistencia-server]
directory=/ruta/a/sistema-de-asistencia/server
command=/ruta/a/sistema-de-asistencia/server/venv/bin/gunicorn \
    src.main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 127.0.0.1:8000
autostart=true
autorestart=true
stderr_logfile=/var/log/asistencia-server.err.log
stdout_logfile=/var/log/asistencia-server.out.log
environment=PYTHONUNBUFFERED=1
```

#### 3. Registrar y comenzar

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start asistencia-server
```

### Opción 3: Despliegue con PM2

```bash
# Instalar PM2
npm install -g pm2

# Crear archivo de configuración (ecosystem.config.js)
pm2 start "gunicorn src.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000" --name "backend-asistencia"

# Guardar configuración
pm2 save
pm2 startup
```

## 📊 Estructura de Despliegue Separado

```
SERVIDOR BACKEND (IP: 192.168.1.101)
├── Puerto 80 → Nginx → Puerto 8000 (FastAPI)
├── Puerto 443 → Nginx (HTTPS)
├── PostgreSQL (Base de datos)
└── /etc/nginx/sites-available/server ← Configuración

Acceso desde CLIENTE:
└── http://IP_BACKEND:8000/api/v1/*
```

## 🧪 Verificar Despliegue

### Test de conectividad

```bash
# Verificar que FastAPI está corriendo
curl http://localhost:8000/docs

# Health check
curl http://localhost:8000/health

# Test API específico
curl -X GET "http://localhost:8000/api/v1/usuarios" \
  -H "Authorization: Bearer tu_token"

# Test WebSocket (desde JavaScript)
io('http://localhost:8000', { path: '/socket.io' })
```

## 🗄️ Administración de Base de Datos

### Backup y Restore

```bash
# Backup completo
pg_dump -U asistencia_user asistencia_prod > backup.sql

# Restore
psql -U asistencia_user asistencia_prod < backup.sql

# Backup automático (cron)
0 2 * * * pg_dump -U asistencia_user asistencia_prod > /backups/asistencia_prod_$(date +\%Y\%m\%d).sql
```

### Ver estado

```bash
# Conectarse a PostgreSQL
psql -U asistencia_user -d asistencia_prod

# Listar tablas
\dt

# Ver usuarios
\du

# Ver bases de datos
\l
```

## 📈 Logs y Monitoreo

### Nginx

```bash
# Access log
sudo tail -f /var/log/nginx/server-access.log

# Error log
sudo tail -f /var/log/nginx/server-error.log
```

### FastAPI

```bash
# Con Supervisor
sudo tail -f /var/log/asistencia-server.out.log

# Con PM2
pm2 logs backend-asistencia
```

### PostgreSQL

```bash
# Ver conexiones activas
psql -U asistencia_user -d asistencia_prod -c "SELECT * FROM pg_stat_activity;"
```

## 🔒 Seguridad

### Recomendaciones:

1. ✅ Usar HTTPS (SSL/TLS) en producción
2. ✅ Configurar firewall para limitar puertos
3. ✅ Usar claves secretas fuertes
4. ✅ Habilitar CORS solo para dominios permitidos
5. ✅ Configurar JWT con expiración
6. ✅ Usar PostgreSQL con autenticación fuerte
7. ✅ Habilitar HSTS en Nginx

### Headers de seguridad en nginx-server.conf:

```nginx
add_header X-Content-Type-Options "nosniff";
add_header X-Frame-Options "DENY";
add_header X-XSS-Protection "1; mode=block";
add_header Strict-Transport-Security "max-age=31536000";
```

## 🆘 Troubleshooting

### Problema: "PostgreSQL connection refused"

```bash
# Verificar PostgreSQL está corriendo
sudo systemctl status postgresql

# Verificar DATABASE_URL en .env
cat .env.local | grep DATABASE_URL
```

### Problema: "502 Bad Gateway desde Nginx"

```bash
# Verificar que FastAPI está corriendo
lsof -i :8000

# Verificar logs de Nginx
sudo tail -100 /var/log/nginx/server-error.log
```

### Problema: WebSocket no funciona

```bash
# Verificar header Connection en nginx-server.conf
grep "proxy_set_header Connection" /etc/nginx/sites-available/server

# Debe tener:
# proxy_set_header Connection $connection_upgrade;
```

### Problema: CORS bloqueado

```bash
# Verificar ALLOWED_ORIGINS en .env
cat .env.local | grep ALLOWED_ORIGINS

# Debe incluir origen del cliente
# ALLOWED_ORIGINS=http://localhost:3000,https://tudominio.com
```

## 📞 Variables Importantes

### .env.development

- `DATABASE_URL` - Conexión base de datos
- `ALLOWED_ORIGINS` - Orígenes CORS permitidos
- `SECRET_KEY` - Clave para JWT
- `DEBUG` - Modo debug (True/False)

### .env.production

- `DATABASE_URL` - Servidor PostgreSQL remoto
- `ALLOWED_ORIGINS` - Solo dominios producción
- `SECRET_KEY` - Clave segura para JWT
- `DEBUG` - SIEMPRE False en producción

## 📞 Contacto

Para dudas sobre este servidor backend, revisa:

- `.env.production` - Variables de entorno
- `nginx/nginx-server.conf` - Configuración Nginx
- `src/main.py` - Punto de entrada
- `requirements.txt` - Dependencias
