# 📘 GUÍA DE DESPLIEGUE - SERVIDOR CLIENTE (Next.js)

## 📋 Requisitos

- Node.js 18+ y npm/pnpm
- Nginx (para proxy reverso)
- Puerto 3000 disponible (interno)
- Puerto 80/443 disponibles (público)

## 🔧 Instalación Paso a Paso

### 1. Clonar repositorio

```bash
git clone https://github.com/2004Style/sistema-de-asistencia.git
cd sistema-de-asistencia/client
```

### 2. Instalar dependencias

```bash
pnpm install
# o con npm
npm install
```

### 3. Configurar variables de entorno

#### Para DESARROLLO:

```bash
cp .env.local.example .env.local
# Editar .env.local y configurar:
# - NEXT_PUBLIC_API_URL: http://IP_SERVIDOR_BACKEND:8000
# - NEXT_PUBLIC_SOCKET_URL: http://IP_SERVIDOR_BACKEND:8000
```

#### Para PRODUCCIÓN:

```bash
# No necesita .env.local, usa automáticamente .env.production
# Pero personaliza:
nano .env.production
# Cambiar "tudominio.com" por tu dominio real
```

### 4. Build de la aplicación

#### DESARROLLO (sin optimizar):

```bash
pnpm dev
# Servidor disponible en http://localhost:3000
```

#### PRODUCCIÓN (optimizado):

```bash
pnpm build
pnpm start
# Servidor disponible en http://localhost:3000
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

#### 2. Copiar configuración Nginx

```bash
# Copiar archivo de configuración
sudo cp nginx/nginx-client.conf /etc/nginx/sites-available/client
sudo ln -s /etc/nginx/sites-available/client /etc/nginx/sites-enabled/client

# O modificar archivo existente
sudo nano /etc/nginx/sites-available/default
# y pegar la configuración de nginx-client.conf
```

#### 3. Crear certificado SSL (PRODUCCIÓN)

```bash
# Con Let's Encrypt (recomendado)
sudo apt-get install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d tudominio.com

# O certificado autofirmado (desarrollo)
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/certs/key.pem \
  -out /etc/nginx/certs/cert.pem
```

#### 4. Habilitar SSL en Nginx

En `/etc/nginx/sites-available/client`, descomenta la sección:

```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /etc/nginx/certs/cert.pem;
    ssl_certificate_key /etc/nginx/certs/key.pem;
    # ... resto de configuración
}
```

#### 5. Verificar y reiniciar Nginx

```bash
# Verificar sintaxis
sudo nginx -t

# Reiniciar
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### Opción 2: Despliegue Directo (sin Nginx)

```bash
# Instalar PM2 (gestor de procesos)
npm install -g pm2

# Crear el build
pnpm build

# Iniciar con PM2
pm2 start "pnpm start" --name "cliente-asistencia"
pm2 save
pm2 startup
```

## 📊 Estructura de Despliegue Separado

```
SERVIDOR CLIENTE (IP: 192.168.1.100)
├── Puerto 80 → Nginx → Puerto 3000 (Next.js)
├── Puerto 443 → Nginx (HTTPS)
└── /etc/nginx/sites-available/client ← Configuración

Conexión a SERVIDOR BACKEND:
└── http://IP_BACKEND:8000/api/*
```

## 🧪 Verificar Despliegue

### Test de conectividad

```bash
# Verificar que Nginx está corriendo
curl http://localhost

# Verificar conexión a backend
curl http://IP_BACKEND:8000/health

# Verificar WebSocket
# Abre en navegador: http://localhost (debería conectar a WS)
```

## 📝 Configuración de Dominio

### Con nginx-client.conf actual:

**En DESARROLLO:**

```
http://localhost:3000 → Tu aplicación
```

**En PRODUCCIÓN (necesita cambios):**

1. Editar `.env.production`:

```
NEXT_PUBLIC_API_URL=https://api.tudominio.com/api
NEXT_PUBLIC_SOCKET_URL=https://api.tudominio.com
NEXTAUTH_URL=https://tudominio.com
```

2. O editar `nginx-client.conf`:

```nginx
server_name tudominio.com www.tudominio.com;
```

## 🔒 Seguridad

### Recomendaciones:

1. ✅ Usar HTTPS (SSL/TLS) en producción
2. ✅ Configurar CORS correctamente
3. ✅ Usar variables de entorno para secretos
4. ✅ Habilitar HSTS en Nginx
5. ✅ Usar firewall para restringir puertos

### Headers de seguridad agregados:

```nginx
add_header X-Content-Type-Options "nosniff";
add_header X-Frame-Options "SAMEORIGIN";
add_header X-XSS-Protection "1; mode=block";
add_header Referrer-Policy "no-referrer-when-downgrade";
```

## 📈 Logs y Monitoreo

```bash
# Ver logs de Nginx
sudo tail -f /var/log/nginx/client-access.log
sudo tail -f /var/log/nginx/client-error.log

# Ver logs de Next.js
pm2 logs cliente-asistencia
```

## 🆘 Troubleshooting

### Problema: "Connection refused"

```bash
# Verificar que Next.js está corriendo
lsof -i :3000

# Verificar que Nginx está corriendo
sudo systemctl status nginx
```

### Problema: "502 Bad Gateway"

```bash
# Verificar configuración Nginx
sudo nginx -t

# Revisar logs
sudo tail -100 /var/log/nginx/client-error.log
```

### Problema: CORS en producción

```bash
# Verificar headers en nginx-client.conf
# Agregar si falta:
add_header Access-Control-Allow-Origin "*";
```

## 📞 Contacto

Para dudas sobre este servidor cliente, revisa:

- `.env.production` - Variables de entorno
- `nginx/nginx-client.conf` - Configuración Nginx
- `package.json` - Scripts de npm
