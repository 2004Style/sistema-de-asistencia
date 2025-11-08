# 🔒 Configuración HTTPS con Dominio y Let's Encrypt

## 📋 Índice

1. [Requisitos](#requisitos)
2. [Paso 1: Apuntar Dominio a AWS](#paso-1-apuntar-dominio-a-aws)
3. [Paso 2: Generar Certificado SSL Gratis](#paso-2-generar-certificado-ssl-gratis)
4. [Paso 3: Configurar Nginx](#paso-3-configurar-nginx)
5. [Paso 4: Configurar Docker](#paso-4-configurar-docker)
6. [Paso 5: Desplegar](#paso-5-desplegar)
7. [Verificación](#verificación)
8. [Renovación Automática](#renovación-automática)

---

## ✅ Requisitos

- ✅ Dominio comprado (ej: `tudominio.com`)
- ✅ EC2 en AWS con puerto 80 y 443 abiertos
- ✅ Acceso SSH a tu EC2

---

## 🔧 Paso 1: Apuntar Dominio a AWS

### 1a. Obtén la IP elástica de tu EC2

En AWS Console:

1. Ve a **EC2 → Instances**
2. Selecciona tu instancia
3. Busca **Elastic IPs** o **Public IPv4 address** (debe ser `3.141.24.38`)

### 1b. Apunta tu dominio a esta IP

En el panel de tu proveedor de dominio (GoDaddy, Namecheap, etc.):

1. Ve a **DNS Management** o **Registros DNS**
2. Agrega/Modifica el registro **A**:

   - **Host**: `@` (raíz del dominio)
   - **Type**: `A`
   - **Value**: `3.141.24.38`
   - **TTL**: `3600` (1 hora)

3. Agrega un registro **CNAME** (opcional, para www):
   - **Host**: `www`
   - **Type**: `CNAME`
   - **Value**: `tudominio.com`
   - **TTL**: `3600`

**Espera 15-30 minutos** para que se propague el DNS.

**Verifica que funciona:**

```bash
nslookup tudominio.com
# Debe mostrar: 3.141.24.38

# O desde EC2
curl http://tudominio.com
# Debe conectar a tu API
```

---

## 🔐 Paso 2: Generar Certificado SSL Gratis

Conecta a tu EC2:

```bash
ssh -i tu-clave-privada.pem ec2-user@3.141.24.38
```

### 2a. Instalar Certbot (Let's Encrypt)

```bash
# Actualizar sistema
sudo apt update
sudo apt upgrade -y

# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Verificar instalación
certbot --version
```

### 2b. Crear directorio para certificados

```bash
mkdir -p /home/deploy/app/sistema-de-asistencia/server/certs
cd /home/deploy/app/sistema-de-asistencia/server
```

### 2c. Generar certificado con Certbot

```bash
# IMPORTANTE: Los puertos 80 y 443 deben estar disponibles
# Si tienes Docker corriendo, detén Nginx temporalmente:
# docker-compose -f docker-compose-production.yml down

# Generar certificado (reemplaza "tudominio.com" con tu dominio real)
sudo certbot certonly --standalone \
  -d tudominio.com \
  -d www.tudominio.com \
  --agree-tos \
  --no-eff-email \
  --email tu-email@gmail.com

# Salida esperada:
# Successfully received certificate.
# Certificate is saved at: /etc/letsencrypt/live/tudominio.com/fullchain.pem
# Key is saved at: /etc/letsencrypt/live/tudominio.com/privkey.pem
```

### 2d. Crear symlinks a tu carpeta de certs

```bash
# Crear symlinks para que Docker pueda acceder
sudo ln -sf /etc/letsencrypt/live/tudominio.com/fullchain.pem \
  /home/deploy/app/sistema-de-asistencia/server/certs/cert.pem

sudo ln -sf /etc/letsencrypt/live/tudominio.com/privkey.pem \
  /home/deploy/app/sistema-de-asistencia/server/certs/key.pem

# Dar permisos a deploy para leer
sudo chown -R deploy:deploy /home/deploy/app/sistema-de-asistencia/server/certs/
sudo chmod -R 755 /home/deploy/app/sistema-de-asistencia/server/certs/

# Verificar que existen
ls -la /home/deploy/app/sistema-de-asistencia/server/certs/
```

---

## ⚙️ Paso 3: Configurar Nginx

En tu **máquina local**, actualiza `server/nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    # Upstream a la API
    upstream api {
        server api:8000;
    }

    # Límites
    client_max_body_size 100M;

    # Compresión
    gzip on;
    gzip_types text/plain text/css text/javascript application/json;
    gzip_min_length 1000;

    # Logs
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # ============================================
    # REDIRECCIÓN HTTP → HTTPS
    # ============================================
    server {
        listen 80;
        server_name tudominio.com www.tudominio.com;

        # Let's Encrypt verification
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        # Redirigir TODO a HTTPS
        location / {
            return 301 https://$server_name$request_uri;
        }
    }

    # ============================================
    # SERVIDOR HTTPS (PRODUCCIÓN)
    # ============================================
    server {
        listen 443 ssl http2;
        server_name tudominio.com www.tudominio.com;

        # Certificados SSL de Let's Encrypt
        ssl_certificate /etc/nginx/certs/cert.pem;
        ssl_certificate_key /etc/nginx/certs/key.pem;

        # Configuración SSL optimizada
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # Headers de seguridad
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-Frame-Options "SAMEORIGIN" always;

        # Proxy a la API
        location / {
            proxy_pass http://api;

            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Forwarded-Host $host;
            proxy_set_header X-Forwarded-Port $server_port;

            # WebSocket
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";

            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Endpoint de salud
        location /health {
            access_log off;
            proxy_pass http://api/docs;
        }
    }
}
```

---

## 🐳 Paso 4: Configurar Docker

### 4a. Actualizar `docker-compose-production.yml`

Verifica que Nginx tenga los puertos correctos:

```yaml
nginx:
  image: nginx:alpine
  container_name: sistema-asistencia-nginx

  ports:
    - "80:80" # HTTP (para Let's Encrypt)
    - "443:443" # HTTPS

  volumes:
    - ./nginx.conf:/etc/nginx/nginx.conf:ro
    - ./certs:/etc/nginx/certs:ro

  depends_on:
    - api

  networks:
    - sistema-asistencia-network

  restart: unless-stopped
```

### 4b. Actualizar `.env` de producción

Agrega/verifica estas variables:

```bash
# NGINX
NGINX_HTTP_PORT=80
NGINX_HTTPS_PORT=443

# API
API_HOST=0.0.0.0
API_PORT=8000

# Security
SECRET_KEY=tu-clave-secreta-super-segura-aqui
```

---

## 🚀 Paso 5: Desplegar

### 5a. Hacer push a GitHub

En tu máquina local:

```bash
cd /home/ronald/Documentos/project-hibridos/sistema-de-asistencia

git add -A
git commit -m "🔒 Configurar HTTPS con dominio y Let's Encrypt"
git push origin main
```

### 5b. Desplegar en EC2

En tu EC2:

```bash
ssh -i tu-clave-privada.pem ec2-user@3.141.24.38

# Ir al directorio
cd /home/deploy/app/sistema-de-asistencia

# Actualizar código
git pull origin main

# Ir a server
cd server

# Detener contenedores antiguos
docker-compose -f docker-compose-production.yml down

# Iniciar con la nueva configuración
docker-compose -f docker-compose-production.yml up -d

# Ver estado
docker-compose -f docker-compose-production.yml ps

# Ver logs de Nginx
docker logs sistema-asistencia-nginx

# Ver logs de API
docker logs sistema-asistencia-api
```

---

## ✅ Verificación

### Opción 1: Desde tu máquina local

```bash
# Probar HTTP (debe redirigir a HTTPS)
curl -v http://tudominio.com
# Resultado: 301 Moved Permanently

# Probar HTTPS (debe funcionar perfecto)
curl -v https://tudominio.com
# Resultado: 200 OK

# Con headers
curl -i https://tudominio.com/docs

# En navegador
# https://tudominio.com
# ✅ Debe mostrar candado verde y "Conexión segura"
```

### Opción 2: Desde EC2

```bash
ssh -i tu-clave-privada.pem ec2-user@3.141.24.38

# Prueba local
curl -v https://localhost

# Ver estado de certificados
sudo certbot certificates

# Ver logs
docker logs sistema-asistencia-nginx
```

### Resultado esperado

```
* Connected to tudominio.com (3.141.24.38) port 443 (#0)
* SSL connection using TLSv1.3 / TLS_AES_256_GCM_SHA384
* subject: CN=tudominio.com
* Issuer: C=US, O=Let's Encrypt, CN=R3
> GET /docs HTTP/1.1
< HTTP/1.1 200 OK
< Server: nginx
< X-Forwarded-Proto: https
```

---

## 🔄 Renovación Automática

Let's Encrypt expira cada **90 días**. Configura renovación automática:

### Opción 1: Cron job manual

```bash
# Editar crontab
sudo crontab -e

# Agregar línea:
0 3 * * * certbot renew --quiet && docker-compose -f /home/deploy/app/sistema-de-asistencia/server/docker-compose-production.yml restart nginx

# Guarda con Ctrl+O → Enter → Ctrl+X
```

### Opción 2: Systemd timer (RECOMENDADO)

```bash
# Habilitar timer de Certbot
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Verificar estado
sudo systemctl status certbot.timer

# Ver si hay renovación pendiente
sudo certbot renew --dry-run
```

### Verificar renovación

```bash
# Ver certificados y fecha de expiración
sudo certbot certificates

# Salida esperada:
# Certificate Name: tudominio.com
# Domains: tudominio.com, www.tudominio.com
# Expiry Date: 2026-02-08
# Valid for: 89 more days
```

---

## 🌐 URLs Finales

Después de completar:

| URL                         | Estado | Descripción          |
| --------------------------- | ------ | -------------------- |
| `http://tudominio.com`      | ✅     | Redirige a HTTPS     |
| `https://tudominio.com`     | ✅     | **HTTPS Seguro** 🔒  |
| `https://www.tudominio.com` | ✅     | Con www              |
| `http://3.141.24.38`        | ✅     | Por IP (sin dominio) |
| `https://3.141.24.38`       | ❌     | No funcionará        |

---

## 🔐 Características del Certificado

- **Tipo**: Let's Encrypt (gratuito y válido)
- **Validez**: 90 días (renovación automática)
- **Dominio**: `tudominio.com` + `www.tudominio.com`
- **TLS**: 1.2 y 1.3
- **Autoridad**: Let's Encrypt R3

### ✅ En el navegador verás

```
✅ Conexión segura
🔒 Candado verde
https://tudominio.com
```

---

## 🐛 Troubleshooting

### 1. "Connection refused" en el dominio

```bash
# Verificar que DNS se propagó
nslookup tudominio.com

# Debe mostrar: 3.141.24.38

# Si no, espera más tiempo o verifica tu proveedor de dominio
```

### 2. "Certificate error" en HTTPS

```bash
# Verificar que Certbot fue exitoso
sudo certbot certificates

# Si falta el certificado, generalo de nuevo:
sudo certbot certonly --standalone -d tudominio.com

# Luego actualiza los symlinks
sudo ln -sf /etc/letsencrypt/live/tudominio.com/fullchain.pem \
  /home/deploy/app/sistema-de-asistencia/server/certs/cert.pem
sudo ln -sf /etc/letsencrypt/live/tudominio.com/privkey.pem \
  /home/deploy/app/sistema-de-asistencia/server/certs/key.pem
```

### 3. "Port 80 or 443 already in use"

```bash
# Ver qué usa los puertos
sudo netstat -tulpn | grep -E ':(80|443)'

# Si Nginx ya corre, detenerlo:
docker-compose -f docker-compose-production.yml down

# O matar el proceso
sudo lsof -i :80
sudo kill -9 <PID>
```

### 4. "Nginx not starting"

```bash
# Validar configuración
docker run --rm -v $(pwd)/nginx.conf:/etc/nginx/nginx.conf:ro nginx:alpine nginx -t

# Ver logs detallados
docker logs sistema-asistencia-nginx

# Reintentar
docker restart sistema-asistencia-nginx
```

### 5. Certificado no se renueva

```bash
# Probar renovación manual
sudo certbot renew --force-renewal

# Ver logs
sudo tail -f /var/log/letsencrypt/letsencrypt.log

# Asegurar que puertos 80/443 están abiertos durante renovación
```

---

## 📚 Archivos Modificados

1. ✅ `server/nginx.conf` - Configuración HTTPS y redirección
2. ✅ `server/docker-compose-production.yml` - Volúmenes de certificados
3. ✅ `.env` - Variables de producción
4. ✅ `/etc/letsencrypt/live/tudominio.com/` - Certificados (en EC2)

---

## 📞 Resumen Rápido - Todo en Uno

```bash
# ============================================
# EN EC2
# ============================================

# 1. Instalar Certbot
sudo apt update && sudo apt install -y certbot python3-certbot-nginx

# 2. Generar certificado (reemplaza "tudominio.com")
sudo certbot certonly --standalone \
  -d tudominio.com \
  -d www.tudominio.com \
  --agree-tos --no-eff-email --email tu-email@gmail.com

# 3. Crear symlinks
sudo ln -sf /etc/letsencrypt/live/tudominio.com/fullchain.pem \
  /home/deploy/app/sistema-de-asistencia/server/certs/cert.pem
sudo ln -sf /etc/letsencrypt/live/tudominio.com/privkey.pem \
  /home/deploy/app/sistema-de-asistencia/server/certs/key.pem
sudo chown -R deploy:deploy /home/deploy/app/sistema-de-asistencia/server/certs/
sudo chmod -R 755 /home/deploy/app/sistema-de-asistencia/server/certs/

# 4. Desplegar
cd /home/deploy/app/sistema-de-asistencia/server
git pull origin main
docker-compose -f docker-compose-production.yml down
docker-compose -f docker-compose-production.yml up -d

# 5. Habilitar renovación automática
sudo systemctl enable certbot.timer && sudo systemctl start certbot.timer

# 6. Verificar
curl -v https://tudominio.com
sudo certbot certificates
```

---

## ✨ Resultado Final

```
✅ https://tudominio.com → HTTPS Seguro 🔒
✅ Certificado válido y renovación automática
✅ HTTP redirige a HTTPS
✅ API funcionando en producción
```

**¡Listo! Tu aplicación está en HTTPS con certificado válido.** 🎉

---

## 📖 Referencias

- [Let's Encrypt Official](https://letsencrypt.org)
- [Certbot Documentation](https://certbot.eff.org)
- [Nginx SSL Guide](https://nginx.org/en/docs/http/ngx_http_ssl_module.html)
- [AWS EC2 Security Groups](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_SecurityGroups.html)
