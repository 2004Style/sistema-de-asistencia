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

## 🚀 Instrucciones de Despliegue (¡Muy Fácil!)

### ⚡ TODO AUTOMÁTICO - Solo 1 paso

**En tu máquina local:**

```bash
cd /home/ronald/Documentos/project-hibridos/sistema-de-asistencia

git add -A
git commit -m "🔧 Arreglar nginx DNS y health checks para HTTPS"
git push origin main
```

**¡Eso es todo! ✅**

---

### 🤖 Qué Sucede Automáticamente

Cuando haces push a `main`, GitHub Actions ejecuta:

1. **🧪 Tests** - Valida el código
2. **🔨 Build** - Construye la imagen Docker
3. **🚀 Deploy** - Ejecuta el script `deploy-aws-ec2.sh` que:
   - ✅ Genera certificados SSL (si no existen)
   - ✅ Carga variables de entorno
   - ✅ Construye imagen Docker
   - ✅ Inicia contenedores
   - ✅ Verifica salud de la API
   - ✅ Limpia imágenes antiguas

**Total: Todo funciona sin hacer nada manualmente en EC2 😎**

---

### 📱 Verificar después (Opcional)

```bash
# En tu navegador o terminal
https://3.141.24.38/docs

# Desde terminal con curl
curl -k https://3.141.24.38/docs
```

---

### 🔧 Si Necesitas Desplegar Manualmente

En caso de que quieras desplegar sin esperar a GitHub Actions:

```bash
ssh -i ~/.ssh/tu-clave.pem deploy@3.141.24.38

cd ~/app/sistema-de-asistencia/server

# Actualizar código
git pull origin main

# Desplegar (el script hace todo)
bash deploy-aws-ec2.sh
```

---

## ✅ Verificación Post-Despliegue

### Esperar a que GitHub Actions Termine

1. Ve a https://github.com/2004Style/sistema-de-asistencia/actions
2. Espera a que el workflow termine (verás ✅ si es exitoso)
3. Esto toma ~5-10 minutos normalmente

### ¿Funcionó? Verifica

```bash
# Opción 1: En tu navegador
https://3.141.24.38/docs

# Opción 2: Con curl
curl -k https://3.141.24.38/docs

# Opción 3: Desde EC2
ssh -i ~/.ssh/tu-clave.pem deploy@3.141.24.38
docker compose -f ~/app/sistema-de-asistencia/server/docker-compose-production.yml ps
```

### Resultado Esperado

```
NAME                       IMAGE          STATUS
sistema-asistencia-api     server-api     Up (healthy)
sistema-asistencia-nginx   nginx:alpine   Up (healthy)
```

Si ves esto ✅ **¡LISTO! Todo está funcionando**

---

### Si Algo Falla

```bash
ssh -i ~/.ssh/tu-clave.pem deploy@3.141.24.38

cd ~/app/sistema-de-asistencia/server

# Ver logs completos
docker compose -f docker-compose-production.yml logs --tail 100

# Ver logs de nginx específicamente
docker compose -f docker-compose-production.yml logs nginx --tail 50

# Probar conectividad desde nginx a API
docker exec sistema-asistencia-nginx curl -s http://api:8000/
```

---

## 🌐 URLs Disponibles (Post-Despliegue)

| URL                        | Status | Descripción             |
| -------------------------- | ------ | ----------------------- |
| `http://3.141.24.38`       | ✅     | API por HTTP            |
| `https://3.141.24.38`      | ✅     | API por HTTPS           |
| `http://3.141.24.38/docs`  | ✅     | Swagger UI (HTTP)       |
| `https://3.141.24.38/docs` | ✅     | Swagger UI (HTTPS)      |
| `http://3.141.24.38:8000`  | ✅     | API directa (sin Nginx) |
| `https://3.141.24.38:8000` | ❌     | No disponible (sin SSL) |

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
- **CN**: 3.141.24.38
- **SANs**: IP:3.141.24.38

### Renovación Manual

```bash
cd ~/app/sistema-de-asistencia/server

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certs/key.pem \
  -out certs/cert.pem \
  -subj "/C=CO/ST=Bogota/L=Bogota/O=SistemaAsistencia/CN=3.141.24.38" \
  -addext "subjectAltName=IP:3.141.24.38"

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
                    3.141.24.38:443
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
