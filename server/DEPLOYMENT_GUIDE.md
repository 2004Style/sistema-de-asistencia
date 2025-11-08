# 📋 Guía de Despliegue - Sistema de Asistencia

## 🏗️ Estructura de Configuración

### Archivos de Configuración

| Archivo                         | Propósito                         | Uso                     |
| ------------------------------- | --------------------------------- | ----------------------- |
| `.env`                          | Variables de entorno del proyecto | Desarrollo & Producción |
| `.env.example`                  | Plantilla de configuración        | Referencia              |
| `docker-compose.yml`            | Dev con PostgreSQL local          | Desarrollo              |
| `docker-compose-production.yml` | Prod sin PostgreSQL local         | Producción              |
| `.dockerignore`                 | Archivos excluidos de imagen      | Build de Docker         |

---

## 🚀 Despliegue en Desarrollo

### Preparación

```bash
cd server
cp .env.example .env
# Editar .env con tus valores locales

# Variables clave para desarrollo:
# - AUTO_MIGRATE=true
# - DEBUG=true
# - DATABASE_URL=postgresql://asistencia:changeme@postgres:5432/sistema_asistencia
```

### Ejecutar con Docker Compose

```bash
docker-compose up -d
```

**Qué sucede:**

- ✅ PostgreSQL se inicia localmente
- ✅ API se construye y ejecuta
- ✅ Variables de `.env` se cargan automáticamente
- ✅ Migraciones se ejecutan (AUTO_MIGRATE=true)

---

## 🌐 Despliegue en Producción

### Preparación

```bash
cd /ruta/produccion/server

# 1. Crear .env con valores de producción
cat > .env << 'EOF'
DATABASE_URL=postgresql://usuario:contraseña@host-externo:5432/asistencia
HOST=0.0.0.0
PORT=8000
TIMEZONE=America/Lima
AUTO_MIGRATE=true        # ← En .env (desarrollo)
DEBUG=true               # ← En .env (desarrollo)
SECRET_KEY=<generar-nuevo>
MAIL_API_URL=https://api.mail-service.com
MAIL_API_CLIENT_ID=cli_xxxxx
MAIL_API_SECRET=sk_live_xxxxx
SMTP_FROM_EMAIL=noreply@domain.com
SMTP_FROM_NAME=Sistema de Asistencia
MAX_FILE_SIZE=10485760
UPLOAD_DIR=recognize/data
REPORTS_DIR=public/reports
TEMP_DIR=public/temp
PASSWORD_MIN_LENGTH=8
TARDANZAS_MAX_ALERTA=3
FALTAS_MAX_ALERTA=2
MINUTOS_TARDANZA=15
EOF

# 2. Crear certificados SSL (si no existen)
mkdir -p certs
# ... copiar cert.pem y key.pem en ./certs/
```

### Ejecutar con Docker Compose Production

```bash
docker-compose -f docker-compose-production.yml up -d
```

**Qué sucede:**

- ✅ Lee `.env` (todas las variables)
- ✅ **Sobrescribe** `AUTO_MIGRATE=false` y `DEBUG=false` (docker-compose-production.yml)
- ✅ API se ejecuta sin PostgreSQL local
- ✅ Nginx actúa como reverse proxy (puertos 80/443)
- ✅ NO ejecuta migraciones automáticas

---

## 🔄 Cómo Docker Compose Carga Variables

### Orden de Precedencia

```
1. Variables en docker-compose.yml (environment:)
   ↓
2. Variables en docker-compose-production.yml (environment:)
   ↓
3. Variables en .env
   ↓
4. Valor por defecto (${VAR:-default})
```

### Ejemplo Práctico

**`.env`:**

```properties
AUTO_MIGRATE=true
DEBUG=true
SECRET_KEY=dev-secret
```

**`docker-compose-production.yml`:**

```yaml
environment:
  AUTO_MIGRATE: "false" # ← Sobrescribe el .env
  DEBUG: "false" # ← Sobrescribe el .env
  # SECRET_KEY viene del .env
```

**Resultado en contenedor:**

```
AUTO_MIGRATE=false       ✅ (del docker-compose-production.yml)
DEBUG=false              ✅ (del docker-compose-production.yml)
SECRET_KEY=dev-secret    ✅ (del .env)
```

---

## 📊 Comparativa: Desarrollo vs Producción

| Aspecto            | Desarrollo                    | Producción                      |
| ------------------ | ----------------------------- | ------------------------------- |
| **Docker Compose** | `docker-compose.yml`          | `docker-compose-production.yml` |
| **PostgreSQL**     | Local (en contenedor)         | Externo (otro servidor)         |
| **AUTO_MIGRATE**   | `true`                        | `false`                         |
| **DEBUG**          | `true`                        | `false`                         |
| **BD URL**         | `postgres:5432`               | IP/dominio externo              |
| **Nginx**          | Opcional                      | Requerido (reverse proxy)       |
| **Puertos**        | 80/443 (si Nginx está activo) | 80/443 (Nginx)                  |

---

## 🔐 Checklist Pre-Producción

- [ ] `.env` NO está commiteado en Git
- [ ] `SECRET_KEY` es una clave segura generada
- [ ] `DATABASE_URL` apunta a BD externa (no localhost)
- [ ] `AUTO_MIGRATE=false` en `docker-compose-production.yml`
- [ ] `DEBUG=false` en `docker-compose-production.yml`
- [ ] Certificados SSL en `./certs/`
- [ ] Backups de BD configurados
- [ ] Logs monitoreados
- [ ] Health checks funcionando

---

## 🛠️ Comandos Útiles

```bash
# Ver estado de contenedores
docker-compose -f docker-compose-production.yml ps

# Ver logs en tiempo real
docker-compose -f docker-compose-production.yml logs -f api

# Ejecutar migraciones manualmente (si AUTO_MIGRATE=false)
docker-compose -f docker-compose-production.yml exec api \
  alembic upgrade head

# Acceder a la shell del contenedor
docker-compose -f docker-compose-production.yml exec api /bin/bash

# Detener servicios
docker-compose -f docker-compose-production.yml down

# Restart de servicios
docker-compose -f docker-compose-production.yml restart api
```

---

## 📝 Notas Importantes

1. **El `.env` NO se excluye en Docker:** Aunque `.dockerignore` lo lista, Docker Compose lo inyecta como variables de entorno en tiempo de ejecución.

2. **BD Externa:** En producción, la BD está fuera del contenedor. Asegurar conectividad antes de deployar.

3. **Migraciones:** En producción, se recomienda ejecutarlas manualmente (CI/CD) antes de actualizar la aplicación.

4. **Secretos:** Para entornos empresariales, usar:
   - AWS Secrets Manager
   - HashiCorp Vault
   - Docker Secrets (en Swarm)

---

## 🆘 Troubleshooting

### ❌ Error: "Connection refused" a BD

- Verificar `DATABASE_URL` en `.env`
- Asegurar conectividad de red
- Revisar credenciales de BD

### ❌ Migraciones no se ejecutan

- Verificar `AUTO_MIGRATE` es `false` en producción
- Ejecutar manualmente: `alembic upgrade head`

### ❌ Variables no se cargan

- Verificar `.env` existe en el directorio correcto
- Revisar formato: `KEY=valor` (sin espacios)
- Recargar: `docker-compose down && docker-compose up`
