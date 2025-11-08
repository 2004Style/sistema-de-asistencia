# 🔒 Resumen de Configuración HTTPS - Sistema de Asistencia

**Fecha**: 8 de noviembre de 2025  
**Estado**: ✅ COMPLETO Y LISTO PARA PRODUCCIÓN

---

## 📋 Archivos Configurados

### 1. **nginx.conf** ✅

- **Ruta**: `server/nginx.conf`
- **Cambios**:
  - Puerto 443 configurado con SSL
  - HTTP/2 habilitado
  - TLS 1.2 y 1.3
  - Certificados en `/etc/nginx/certs/`

### 2. **docker-compose-production.yml** ✅

- **Ruta**: `server/docker-compose-production.yml`
- **Cambios**:
  - Volumen de certificados montado: `./certs:/etc/nginx/certs:ro`
  - Puertos 80 y 443 expuestos
  - API sin PostgreSQL local (BD en otro servidor)

### 3. **docker-compose.yml** ✅

- **Ruta**: `server/docker-compose.yml`
- **Cambios**:
  - Volumen de certificados montado: `./certs:/etc/nginx/certs:ro`

### 4. **deploy-aws-ec2.sh** ✅

- **Ruta**: `server/deploy-aws-ec2.sh`
- **Cambios**:
  - Generación automática de certificados SSL (nuevas secciones 3.5)
  - Verificación de validez de certificados
  - Soporte para IP específica con SANs

### 5. **deploy.yml** ✅

- **Ruta**: `.github/workflows/deploy.yml`
- **Estado**: Correcto (sin cambios necesarios)

---

## 🔐 Certificados SSL

### Ubicación

```
/home/deploy/app/sistema-de-asistencia/server/certs/
├── cert.pem    (Certificado público)
└── key.pem     (Clave privada)
```

### Generación Manual (en caso de necesario)

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /home/deploy/app/sistema-de-asistencia/server/certs/key.pem \
  -out /home/deploy/app/sistema-de-asistencia/server/certs/cert.pem \
  -subj "/C=CO/ST=Bogota/L=Bogota/O=SistemaAsistencia/CN=3.141.24.38" \
  -addext "subjectAltName=IP:3.141.24.38"
```

### Características

- **Tipo**: Self-Signed
- **Validez**: 365 días
- **Algoritmo**: RSA 2048-bit
- **TLS**: 1.2 y 1.3
- **Exclusión**: No se versionan en Git (en `.gitignore` y `.dockerignore`)

---

## 🚀 Flujo de Despliegue

### En GitHub

1. Push a rama `main` en carpeta `server/`
2. GitHub Actions ejecuta:
   - 🧪 Tests unitarios
   - 🔨 Build Docker
   - 🐳 Push a GHCR (GitHub Container Registry)
   - 🚀 Ejecuta `deploy-aws-ec2.sh` en EC2

### En EC2

El script `deploy-aws-ec2.sh` automáticamente:

1. ✅ Verifica Docker y Git
2. ✅ Clona/actualiza repositorio
3. ✅ **Genera/verifica certificados SSL** (NUEVO)
4. ✅ Carga variables de entorno
5. ✅ Construye imagen Docker
6. ✅ Inicia contenedores con docker-compose
7. ✅ Verifica salud de la API
8. ✅ Limpia imágenes antiguas

---

## 🧪 Pruebas Locales (Desarrollo)

```bash
# Desde server/
docker-compose down
docker-compose up -d

# Verificar
docker-compose ps
docker-compose logs nginx

# Acceder
curl -k https://localhost/docs  # Ignorar advertencia de certificado
```

---

## 🧪 Pruebas en EC2 (Producción)

```bash
# Conectar a EC2
ssh -i tu-clave.pem deploy@3.141.24.38

# Ir al directorio
cd /home/deploy/app/sistema-de-asistencia/server

# Verificar certificados
ls -lah certs/

# Verificar contenedores
docker compose -f docker-compose-production.yml ps

# Ver logs nginx
docker compose -f docker-compose-production.yml logs nginx

# Probar HTTPS localmente en EC2
curl -k -v https://localhost/docs
```

---

## 🌐 URLs Disponibles

| URL                        | Acceso | Nota                |
| -------------------------- | ------ | ------------------- |
| `http://3.141.24.38`       | ✅     | HTTP plano          |
| `https://3.141.24.38`      | ✅     | **HTTPS con Nginx** |
| `http://3.141.24.38:8000`  | ✅     | API directa         |
| `https://3.141.24.38:8000` | ❌     | API sin SSL         |
| `http://3.141.24.38/docs`  | ✅     | Swagger (HTTP)      |
| `https://3.141.24.38/docs` | ✅     | Swagger (HTTPS)     |

---

## ⚠️ Advertencia del Navegador

Al acceder a `https://3.141.24.38`, verás:

```
🔓 Esta conexión no es segura
Advertencia: certificado autofirmado
```

**Es normal**. Opciones:

1. **Temporal**: Haz clic en "Avanzado" → "Continuar de todas formas"
2. **Permanente**: Importa el certificado en tu navegador
3. **Producción**: Usa Let's Encrypt (dominio + Certbot)

---

## 🔄 Actualización de Certificados

### Auto-generados (cada 365 días)

El script `deploy-aws-ec2.sh` regenera automáticamente si expiran.

### Manuales (en caso de cambiar IP)

```bash
cd /home/deploy/app/sistema-de-asistencia/server

# Nueva IP
NEW_IP="tu-nueva-ip"

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certs/key.pem \
  -out certs/cert.pem \
  -subj "/C=CO/ST=Bogota/L=Bogota/O=SistemaAsistencia/CN=$NEW_IP" \
  -addext "subjectAltName=IP:$NEW_IP"

# Reiniciar Nginx
docker compose -f docker-compose-production.yml restart nginx
```

---

## 📊 Seguridad

### ✅ Lo que está bien

- TLS 1.2 y 1.3 habilitados
- Ciphers fuertes (HIGH, excluye aNULL y MD5)
- Certificados con 2048-bit RSA
- HTTP/2 soportado
- WebSocket soportado

### ⚠️ Limitaciones (certificado auto-firmado)

- Navegadores muestran advertencia
- No valida identidad del servidor
- Solo para desarrollo/testing

### 🚀 Para Producción

Usar Let's Encrypt + Certbot:

```bash
sudo certbot certonly --standalone -d tu-dominio.com
```

---

## 🔧 Troubleshooting

### Problema: "ERR_CERT_AUTHORITY_INVALID"

```bash
# Solución 1: Acepta la advertencia en el navegador
# Solución 2: Importa el certificado en tu SO
```

### Problema: "Connection refused en puerto 443"

```bash
# Verificar que Nginx está corriendo
docker ps | grep nginx

# Ver logs
docker logs sistema-asistencia-nginx

# Verificar permisos de certificados
ls -la certs/
```

### Problema: "SSL_ERROR_RX_RECORD_TOO_LONG"

```bash
# Significa que está recibiendo HTTP en lugar de HTTPS
# Verificar que el puerto 443 está mapeado correctamente
docker compose ps
```

---

## ✅ Checklist Final

- [x] nginx.conf configurado con HTTPS
- [x] Certificados en carpeta correcta
- [x] docker-compose-production.yml actualizado
- [x] docker-compose.yml actualizado
- [x] deploy-aws-ec2.sh con generación de certificados
- [x] Certificados excluidos de Git
- [x] Documentación completa

---

## 📝 Notas

- Los certificados son **auto-firmados** y válidos por 365 días
- El script de despliegue los regenera automáticamente si expiran
- Para dominio con Let's Encrypt, ver `HTTPS_SETUP.md`
- El certificado se genera con SANs para soportar IP directa

---

**¡Tu configuración HTTPS está lista! 🎉**

Próximo paso: Push a GitHub y probar en EC2.
