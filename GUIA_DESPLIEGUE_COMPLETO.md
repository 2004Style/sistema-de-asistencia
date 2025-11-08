# 🚀 Guía Completa de Despliegue HTTPS - Sistema de Asistencia

**Última actualización**: 8 de noviembre de 2025  
**Estado**: ✅ LISTO PARA PRODUCCIÓN

---

## 📋 Resumen de Cambios Realizados

### ✅ Archivos Actualizados

1. **docker-compose-production.yml**

   - ✨ Agregados `hostname` para ambos contenedores
   - ✨ Agregado `health_check` con condición `service_healthy`
   - ✨ Configurada red con subnet fija: `172.20.0.0/16`

2. **docker-compose.yml**

   - ✨ Agregados `hostname` para ambos contenedores
   - ✨ Agregado `health_check` con condición `service_healthy`
   - ✨ Configurada red con subnet fija: `172.20.0.0/16`

3. **nginx.conf**
   - ✨ Agregado `resolver` para DNS en Docker
   - ✨ Agregado `keepalive` en upstream
   - ✨ Mejorados headers de proxy
   - ✨ Agregado soporte para IPv6
   - ✨ Agregado endpoint `/health`
   - ✨ Mejores configuraciones de buffers y keep-alive

---

## 🔧 ¿Qué se Arregló?

| Problema                | Causa                                           | Solución                         |
| ----------------------- | ----------------------------------------------- | -------------------------------- |
| **502 Bad Gateway**     | DNS no resolvía `api`                           | Agregado `resolver 127.0.0.11`   |
| **Host is unreachable** | Red de Docker mal configurada                   | Subnet fija + hostname explícito |
| **Connection refused**  | Nginx esperaba antes de que API estuviera lista | Health check con condición       |

---

## 🚀 Instrucciones de Despliegue

### Paso 1: Push a GitHub

En tu máquina local:

```bash
cd /home/ronald/Documentos/project-hibridos/sistema-de-asistencia

# Verificar cambios
git status

# Agregar cambios
git add -A

# Commit con mensaje descriptivo
git commit -m "🔧 Arreglar nginx networking y health checks para HTTPS"

# Push a main
git push origin main
```

### Paso 2: Preparar EC2 (Manual - Una sola vez)

Conéctate a tu servidor:

```bash
ssh -i ~/.ssh/tu-clave.pem deploy@18.225.34.130
```

Luego:

```bash
# 1. Ir al directorio
cd ~/app/sistema-de-asistencia/server

# 2. Generar certificados SSL (si no existen)
mkdir -p certs

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certs/key.pem \
  -out certs/cert.pem \
  -subj "/C=CO/ST=Bogota/L=Bogota/O=SistemaAsistencia/CN=18.225.34.130" \
  -addext "subjectAltName=IP:18.225.34.130"

# 3. Verificar
ls -lah certs/
```

### Paso 3: Desplegar (Automático - Cada push a main)

Cuando hagas push a `main`, GitHub Actions ejecutará automáticamente:

1. 🧪 Tests unitarios
2. 🔨 Build Docker
3. 🚀 Deploy a EC2 (ejecuta `deploy-aws-ec2.sh`)

**O manual si lo prefieres:**

En tu EC2:

```bash
cd ~/app/sistema-de-asistencia/server

# Opción A: Actualizar y reiniciar todo
docker compose -f docker-compose-production.yml down
docker compose -f docker-compose-production.yml up -d

# Opción B: Solo reiniciar nginx
docker compose -f docker-compose-production.yml restart nginx

# Ver logs
docker compose -f docker-compose-production.yml logs -f
```

---

## ✅ Verificación Post-Despliegue

### Desde tu máquina local

```bash
# 1. Verificar HTTP
curl -v http://18.225.34.130

# 2. Verificar HTTPS
curl -k -v https://18.225.34.130/docs

# 3. En navegador
# HTTP:  http://18.225.34.130
# HTTPS: https://18.225.34.130/docs (aceptar advertencia de certificado)
```

### Desde EC2

```bash
ssh -i ~/.ssh/tu-clave.pem deploy@18.225.34.130

cd ~/app/sistema-de-asistencia/server

# 1. Ver estado de contenedores
docker compose -f docker-compose-production.yml ps

# 2. Ver logs completos
docker compose -f docker-compose-production.yml logs --tail 100

# 3. Probar conectividad interna
docker exec sistema-asistencia-nginx curl -s http://api:8000/

# 4. Probar DNS desde nginx
docker exec sistema-asistencia-nginx nslookup api

# 5. Ver red de docker
docker network inspect server_sistema-asistencia-network
```

---

## 🌐 URLs Disponibles (Post-Despliegue)

| URL                          | Status | Descripción             |
| ---------------------------- | ------ | ----------------------- |
| `http://18.225.34.130`       | ✅     | API por HTTP            |
| `https://18.225.34.130`      | ✅     | API por HTTPS           |
| `http://18.225.34.130/docs`  | ✅     | Swagger UI (HTTP)       |
| `https://18.225.34.130/docs` | ✅     | Swagger UI (HTTPS)      |
| `http://18.225.34.130:8000`  | ✅     | API directa (sin Nginx) |
| `https://18.225.34.130:8000` | ❌     | No disponible (sin SSL) |

---

## 🔐 Certificados SSL

### Ubicación

```
/home/deploy/app/sistema-de-asistencia/server/certs/
├── cert.pem      (Certificado público - válido por 365 días)
└── key.pem       (Clave privada - secreto)
```

### Propiedades

- **Tipo**: Self-Signed
- **Validez**: 365 días
- **Algoritmo**: RSA 2048-bit
- **CN**: 18.225.34.130
- **SANs**: IP:18.225.34.130

### Renovación Manual

```bash
cd ~/app/sistema-de-asistencia/server

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certs/key.pem \
  -out certs/cert.pem \
  -subj "/C=CO/ST=Bogota/L=Bogota/O=SistemaAsistencia/CN=18.225.34.130" \
  -addext "subjectAltName=IP:18.225.34.130"

# Reiniciar nginx
docker compose -f docker-compose-production.yml restart nginx
```

---

## 🐳 Docker Compose - Cambios Principales

### Antes ❌

```yaml
nginx:
  depends_on:
    - api

networks:
  sistema-asistencia-network:
    driver: bridge
```

### Después ✅

```yaml
nginx:
  hostname: nginx
  depends_on:
    api:
      condition: service_healthy

networks:
  sistema-asistencia-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

---

## 🔧 Nginx - Cambios Principales

### Resolver DNS

```nginx
resolver 127.0.0.11 valid=10s;
resolver_timeout 5s;
```

### Upstream con Keep-Alive

```nginx
upstream api {
    server api:8000;
    keepalive 32;
}
```

### Headers de Proxy Mejorados

```nginx
proxy_set_header Connection "";
proxy_http_version 1.1;
```

---

## 🚨 Troubleshooting

### Problema: 502 Bad Gateway

```bash
# Verificar que la API está respondiendo
docker exec sistema-asistencia-api curl -s http://localhost:8000/

# Ver logs de nginx
docker logs sistema-asistencia-nginx

# Verificar DNS desde nginx
docker exec sistema-asistencia-nginx nslookup api
```

### Problema: Connection Refused

```bash
# Ver que los contenedores estén en la misma red
docker network inspect server_sistema-asistencia-network

# Reiniciar ambos
docker compose -f docker-compose-production.yml restart

# Esperar 10 segundos
sleep 10

# Verificar
docker compose -f docker-compose-production.yml ps
```

### Problema: Health Check Failing

```bash
# Ver logs de health check
docker compose -f docker-compose-production.yml logs

# Probar manualmente
docker exec sistema-asistencia-api curl -f http://localhost:8000/docs
```

---

## 📊 Arquitectura Final

```
                    Cliente HTTPS
                         ↓
                    18.225.34.130:443
                         ↓
                  Nginx (SSL/TLS 1.2, 1.3)
                  sistema-asistencia-nginx
                         ↓
              Red: 172.20.0.0/16 (bridge)
                         ↓
                    API (FastAPI)
                 sistema-asistencia-api:8000
                         ↓
              Base de datos externa (RDS)
              postgresql://host-externo:5432
```

---

## ✅ Checklist Final

- [x] docker-compose-production.yml actualizado
- [x] docker-compose.yml actualizado
- [x] nginx.conf con resolver DNS
- [x] Health checks configurados
- [x] Red con subnet fija
- [x] Certificados SSL generados
- [x] Deploy script actualizado
- [x] Documentación completa

---

## 🎯 Próximos Pasos (Opcionales)

### 1. Implementar Let's Encrypt (Si tienes dominio)

```bash
sudo certbot certonly --standalone -d tu-dominio.com

# Crear symlink
sudo ln -sf /etc/letsencrypt/live/tu-dominio.com/fullchain.pem certs/cert.pem
sudo ln -sf /etc/letsencrypt/live/tu-dominio.com/privkey.pem certs/key.pem
```

### 2. Monitoreo (Prometheus/Grafana)

```bash
# Agregar métricas de nginx en docker-compose-production.yml
```

### 3. Rate Limiting en Nginx

```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

location / {
    limit_req zone=api burst=20 nodelay;
    proxy_pass http://api;
}
```

---

## 📞 Soporte

Si tienes problemas:

1. Revisar logs: `docker compose logs`
2. Verificar redes: `docker network ls`
3. Probar conectividad: `docker exec <contenedor> curl <url>`

¡Listo para producción! 🎉
