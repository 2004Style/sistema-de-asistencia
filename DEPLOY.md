# 🚀 Despliegue - Sistema de Asistencia

Script único y robusto para desplegar el sistema en producción.

## 📋 Pre-requisitos

1. **Docker y Docker Compose instalados**
2. **Archivos `.env` configurados:**
   - `server/.env` (base de datos, secrets)
   - `client/.env` (URLs públicas)

## ⚡ Uso Rápido

```bash
# Hacer el script ejecutable (solo primera vez)
chmod +x deploy.sh

# Despliegue completo
./deploy.sh

# Solo actualizar cliente
./deploy.sh client

# Solo actualizar servidor
./deploy.sh server

# Forzar rebuild completo (sin caché)
./deploy.sh --force
```

## 📝 Configuración Inicial

### 1️⃣ Crear archivos `.env`

```bash
# Servidor
cp server/.env.example server/.env
nano server/.env  # Configurar DATABASE_URL, SECRET_KEY, etc.

# Cliente
cp client/.env.example client/.env
nano client/.env  # Configurar NEXT_PUBLIC_URL_BACKEND, etc.
```

### 2️⃣ Variables Críticas

#### `server/.env`:

```env
DATABASE_URL=postgresql://usuario:password@host:5432/asistencia
SECRET_KEY=valor-aleatorio-seguro
JWT_SECRET_KEY=valor-aleatorio-seguro
CORS_ORIGINS=http://3.141.24.38
```

#### `client/.env`:

```env
NEXT_PUBLIC_URL_BACKEND=http://3.141.24.38/api
NEXTAUTH_URL=http://3.141.24.38
NEXTAUTH_SECRET=valor-aleatorio-seguro
```

### 3️⃣ Desplegar

```bash
./deploy.sh
```

El script automáticamente:

- ✅ Verifica archivos `.env`
- ✅ Genera certificados SSL si no existen
- ✅ Construye imágenes Docker
- ✅ Inicia todos los servicios
- ✅ Espera a que estén saludables
- ✅ Muestra estado final

## 🔍 Verificar Despliegue

```bash
# Ver estado de contenedores
docker compose ps

# Debería mostrar:
# sistema-asistencia-api      Up (healthy)
# sistema-asistencia-client   Up (healthy)
# sistema-asistencia-nginx    Up (healthy)

# Ver logs en tiempo real
docker compose logs -f

# Probar endpoints
curl http://3.141.24.38/health
curl http://3.141.24.38/api/docs
```

## 🌐 Acceso

- **Cliente:** http://3.141.24.38/
- **API Docs:** http://3.141.24.38/api/docs
- **WebSocket:** ws://3.141.24.38/api/socket.io

## 🛠️ Solución de Problemas

### Contenedor no inicia

```bash
# Ver logs del servicio
docker compose logs nginx
docker compose logs api
docker compose logs client

# Reiniciar servicio específico
docker compose restart nginx
```

### Healthcheck falla

Los healthchecks usan comandos nativos (sin curl/wget):

- **API:** `python3 -c` para verificar endpoint `/health`
- **Cliente:** `node -e` para verificar puerto 3000
- **Nginx:** `nc -z` para verificar puerto 80

### Reconstruir desde cero

```bash
# Detener y limpiar todo
docker compose down -v

# Rebuild completo
./deploy.sh --force
```

## 📊 Monitoreo

```bash
# Ver recursos
docker stats

# Ver logs continuos
docker compose logs -f --tail=100

# Ver solo errores
docker compose logs | grep -i error
```

## 🔥 Firewall (AWS/EC2)

Asegúrate de que el Security Group permita:

- Puerto **80** (HTTP)
- Puerto **443** (HTTPS)
- Puerto **22** (SSH)

## 📚 Archivos Importantes

```
.
├── deploy.sh              # ⭐ Script principal de despliegue
├── docker-compose.yml     # Configuración de servicios
├── nginx.conf            # Configuración del proxy
├── .env                  # Variables de docker-compose
├── server/
│   └── .env             # Variables del backend
├── client/
│   └── .env             # Variables del frontend
└── certs/
    ├── cert.pem         # Certificado SSL (generado automáticamente)
    └── key.pem          # Llave privada SSL
```

## 🆘 Ayuda

Para más detalles, ver: `INSTRUCCIONES_DESPLIEGUE.md`

---

**¡Éxito! 🎉**
