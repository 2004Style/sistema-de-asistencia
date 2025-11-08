# 🔒 Configuración HTTPS para AWS EC2

## 📋 Índice

1. [Problema](#problema)
2. [Solución](#solución)
3. [Pasos de Implementación](#pasos-de-implementación)
4. [Verificación](#verificación)
5. [Troubleshooting](#troubleshooting)

---

## ❌ Problema

Actualmente tu servidor tiene:

- ✅ HTTP funciona: `http://3.141.24.38:8000`
- ❌ HTTPS NO funciona: `https://3.141.24.38:8000`

**Razón**: No hay certificado SSL configurado para servir HTTPS.

---

## ✅ Solución

Usaremos **Nginx (ya está en tu docker-compose) + Certificado Self-Signed**.

```
Cliente HTTPS
    ↓
https://3.141.24.38:443 (Nginx con SSL)
    ↓
http://localhost:8000 (API FastAPI)
```

---

## 🔧 Pasos de Implementación

### Paso 1: Generar Certificado SSL

Conéctate a tu EC2 por SSH:

```bash
ssh -i tu-clave-privada.pem ec2-user@3.141.24.38
```

Luego ejecuta:

```bash
# 1. Crear directorio para certificados
mkdir -p /home/deploy/app/sistema-de-asistencia/server/certs

# 2. Generar certificado self-signed válido por 1 año
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /home/deploy/app/sistema-de-asistencia/server/certs/key.pem \
  -out /home/deploy/app/sistema-de-asistencia/server/certs/cert.pem \
  -subj "/C=CO/ST=Bogota/L=Bogota/O=SistemaAsistencia/CN=3.141.24.38"

# 3. Verificar que se crearon correctamente
ls -lah /home/deploy/app/sistema-de-asistencia/server/certs/
```

**Salida esperada:**

```
-rw-r--r-- cert.pem
-rw-r--r-- key.pem
```

---

### Paso 2: Actualizar Configuración Local

En tu máquina local, actualiza los archivos de configuración:

#### 2a. Actualizar `nginx.conf`

Reemplaza la sección de HTTPS comentada con esto:

```nginx
# ============================================
# SERVIDOR HTTPS (puerto 443)
# ============================================
server {
    listen 443 ssl http2;
    server_name _;

    # Certificados SSL
    ssl_certificate /etc/nginx/certs/cert.pem;
    ssl_certificate_key /etc/nginx/certs/key.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    location / {
        proxy_pass http://api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

#### 2b. Actualizar `docker-compose-production.yml`

Busca la sección de `nginx` y actualiza:

```yaml
nginx:
  image: nginx:alpine
  container_name: sistema-asistencia-nginx

  ports:
    - "${NGINX_HTTP_PORT:-80}:80" # HTTP
    - "${NGINX_HTTPS_PORT:-443}:443" # HTTPS

  volumes:
    - ./nginx.conf:/etc/nginx/nginx.conf:ro
    - ./certs:/etc/nginx/certs:ro # ← AGREGAR ESTA LÍNEA
```

---

### Paso 3: Hacer Push a GitHub

```bash
cd /home/ronald/Documentos/project-hibridos/sistema-de-asistencia

git add -A
git commit -m "🔒 Configurar HTTPS con Nginx"
git push origin main
```

---

### Paso 4: Desplegar en EC2

Regresa a tu EC2 y ejecuta:

```bash
ssh -i tu-clave-privada.pem ec2-user@3.141.24.38

# Ir al directorio
cd /home/deploy/app/sistema-de-asistencia

# Actualizar código del repositorio
git pull origin main

# Ir al servidor
cd server

# Detener contenedores actuales
docker-compose -f docker-compose-production.yml down

# Iniciar con la nueva configuración
docker-compose -f docker-compose-production.yml up -d

# Verificar que los contenedores están corriendo
docker-compose -f docker-compose-production.yml ps
```

---

### Paso 5: Abrir Puerto 443 en AWS Security Group

En AWS Console:

1. Ve a **EC2 → Security Groups**
2. Selecciona el security group de tu instancia
3. Click en **Inbound Rules → Edit inbound rules**
4. Agrega una nueva regla:
   - **Type**: HTTPS
   - **Protocol**: TCP
   - **Port Range**: 443
   - **Source**: 0.0.0.0/0 (desde cualquier lugar)
5. Click **Save rules**

---

## ✅ Verificación

### Opción 1: Desde tu máquina local

```bash
# Probar HTTP (debe redirigir o funcionar)
curl -v http://3.141.24.38

# Probar HTTPS (ignorar certificado self-signed)
curl -k -v https://3.141.24.38

# En navegador: https://3.141.24.38
# Verás advertencia ⚠️ (normal con self-signed)
```

### Opción 2: Desde EC2

```bash
ssh -i tu-clave-privada.pem ec2-user@3.141.24.38

# Verificar logs de Nginx
docker logs sistema-asistencia-nginx

# Ver estado de contenedores
docker-compose -f /home/deploy/app/sistema-de-asistencia/server/docker-compose-production.yml ps

# Probar localmente
curl -k -v https://localhost
```

### Resultado esperado

```
HTTP/1.1 200 OK
Content-Type: application/json
...
```

---

## 🌐 URLs Disponibles

Después de completar, tendrás:

| URL                        | Estado | Nota                                  |
| -------------------------- | ------ | ------------------------------------- |
| `http://3.141.24.38`       | ✅     | HTTP plano (puedes redirigir a HTTPS) |
| `https://3.141.24.38`      | ✅     | **HTTPS seguro**                      |
| `http://3.141.24.38:8000`  | ✅     | API directa (sin Nginx)               |
| `https://3.141.24.38:8000` | ❌     | No funciona (API no tiene SSL)        |

---

## 🔐 Características del Certificado

- **Tipo**: Self-Signed (generado localmente)
- **Validez**: 365 días
- **Algoritmo**: RSA 2048-bit
- **TLS**: 1.2 y 1.3

### ⚠️ Advertencia del navegador

Verás esto en el navegador:

```
Esta conexión no es segura
Advertencia: certificado autofirmado
```

**Es normal y esperado**. Para eliminarla necesitarías:

- Comprar un certificado SSL válido
- O usar Let's Encrypt (requiere dominio)

---

## 🚀 Próximos Pasos (Opcional)

### Si tienes un dominio (RECOMENDADO)

Instala **Certbot** en EC2 para obtener certificados gratis de Let's Encrypt:

```bash
ssh -i tu-clave-privada.pem ec2-user@3.141.24.38

# Instalar Certbot
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# Obtener certificado (reemplaza tu-dominio.com)
sudo certbot certonly --standalone -d tu-dominio.com

# Los certificados se guardan en:
# /etc/letsencrypt/live/tu-dominio.com/fullchain.pem
# /etc/letsencrypt/live/tu-dominio.com/privkey.pem

# Actualizar nginx.conf con las nuevas rutas y crear symlink
sudo ln -sf /etc/letsencrypt/live/tu-dominio.com/fullchain.pem \
  /home/deploy/app/sistema-de-asistencia/server/certs/cert.pem
sudo ln -sf /etc/letsencrypt/live/tu-dominio.com/privkey.pem \
  /home/deploy/app/sistema-de-asistencia/server/certs/key.pem

# Renovación automática cada 3 meses
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

## 🐛 Troubleshooting

### 1. Error: "Connection refused"

```bash
# Verificar que Nginx está corriendo
docker ps | grep nginx

# Ver logs
docker logs sistema-asistencia-nginx

# Reiniciar
docker restart sistema-asistencia-nginx
```

### 2. Error: "SSL certificate problem"

```bash
# Verificar certificados existen
ls -la /home/deploy/app/sistema-de-asistencia/server/certs/

# Si no existen, generarlos de nuevo (Paso 1)
```

### 3. Error: "File not found" en Nginx

```bash
# Verificar que el volumen está montado correctamente
docker inspect sistema-asistencia-nginx | grep -A5 "Mounts"

# El path debe ser:
# Source: /home/deploy/app/sistema-de-asistencia/server/certs
# Destination: /etc/nginx/certs
```

### 4. Puerto 443 no responde

```bash
# Verificar que está abierto en Security Group (AWS Console)
# Verificar firewall de EC2
sudo ufw status
sudo ufw allow 443/tcp

# Probar conectividad local
curl -k https://localhost
```

### 5. Nginx no inicia

```bash
# Validar configuración
docker run --rm -v $(pwd)/nginx.conf:/etc/nginx/nginx.conf:ro nginx:alpine nginx -t

# Si hay error, revisar nginx.conf syntax
```

---

## 📚 Archivos Modificados

1. ✅ `server/nginx.conf` - Sección HTTPS habilitada
2. ✅ `server/docker-compose-production.yml` - Volumen de certificados
3. ✅ `server/certs/cert.pem` - Certificado (generar en EC2)
4. ✅ `server/certs/key.pem` - Clave privada (generar en EC2)

---

## 📞 Resumen Rápido

```bash
# En EC2
mkdir -p /home/deploy/app/sistema-de-asistencia/server/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /home/deploy/app/sistema-de-asistencia/server/certs/key.pem \
  -out /home/deploy/app/sistema-de-asistencia/server/certs/cert.pem \
  -subj "/C=CO/ST=Bogota/L=Bogota/O=SistemaAsistencia/CN=3.141.24.38"

cd /home/deploy/app/sistema-de-asistencia/server
docker-compose -f docker-compose-production.yml down
docker-compose -f docker-compose-production.yml up -d

# Verificar
curl -k https://3.141.24.38
```

---

**¡Listo! 🎉 Ya tienes HTTPS configurado.**
