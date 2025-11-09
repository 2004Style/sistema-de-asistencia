# 📝 Guía de Integración de Variables de Entorno (.env)

## 🏗️ Estructura de `.env` en el Proyecto

El proyecto tiene **3 niveles** de configuración con variables de entorno:

```
sistema-de-asistencia/
├── .env                      ← RAÍZ (Docker Compose)
├── server/
│   ├── .env                 ← API FastAPI (Backend)
│   └── .env.example
├── client/
│   ├── .env                 ← Next.js Frontend
│   └── (sin .env.example)
└── docker-compose.yml
```

---

## 🔄 Flujo de Integración

```
┌─────────────────────────────────────────────────────────────────┐
│                      .env ROOT (Docker Compose)                 │
│                                                                 │
│  - DATABASE_URL (para API)                                      │
│  - JWT_SECRET_KEY, SECRET_KEY (para API)                        │
│  - CORS_ORIGINS (para API)                                      │
│  - NGINX_HTTP_PORT, NGINX_HTTPS_PORT                            │
└─────────────────────────────────────────────────────────────────┘
                    │
         ┌──────────┼──────────┐
         │          │          │
         ▼          ▼          ▼
    ┌────────┐ ┌────────┐ ┌────────┐
    │ docker │ │ server │ │ client │
    │compose │ │  .env  │ │  .env  │
    │ (env_  │ │        │ │        │
    │ file:  │ │        │ │        │
    │ .env)  │ │        │ │        │
    └────────┘ └────────┘ └────────┘
        │          │          │
        │          ▼          ▼
        │      ┌────────┐ ┌────────┐
        │      │  API   │ │ CLIENT │
        │      │ :8000  │ │ :3000  │
        │      └────────┘ └────────┘
        │
        ▼
    ┌──────────────────┐
    │     NGINX        │
    │  (Proxy reverso) │
    │   Puertos 80/443 │
    └──────────────────┘
```

---

## 📋 Variables por Nivel

### 1️⃣ `.env` RAÍZ (Docker Compose)

**Ubicación:** `/home/deploy/app/sistema-de-asistencia/.env`

**Propósito:** Configurar servicios Docker y variables compartidas

**Variables importantes:**

```bash
# ============================================
# BASE DE DATOS
# ============================================
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require

# ============================================
# SEGURIDAD
# ============================================
SECRET_KEY=your-secret-key-here-change-in-production
JWT_SECRET_KEY=your-jwt-secret-key-here-change-in-production

# ============================================
# CORS (Comunicación entre servicios)
# ============================================
CORS_ORIGINS=https://tu-dominio.com,https://www.tu-dominio.com

# ============================================
# NGINX PORTS
# ============================================
NGINX_HTTP_PORT=80
NGINX_HTTPS_PORT=443

# ============================================
# TIMEZONE
# ============================================
TIMEZONE=America/Lima

# ============================================
# ENTORNO
# ============================================
ENVIRONMENT=production
DEBUG=false
NODE_ENV=production
```

**Cargado por:** `docker compose` (via `env_file` en docker-compose.yml)

---

### 2️⃣ `server/.env` (API FastAPI)

**Ubicación:** `/home/deploy/app/sistema-de-asistencia/server/.env`

**Propósito:** Configurar la API FastAPI con variables específicas

**Variables importantes:**

```bash
# ============================================
# BASE DE DATOS (heredada del .env raíz via docker-compose)
# ============================================
DATABASE_URL=postgresql://user:password@host:5432/dbname

# ============================================
# API CONFIG
# ============================================
HOST=0.0.0.0
PORT=8000
TIMEZONE=America/Lima

# ============================================
# SEGURIDAD (heredada del .env raíz)
# ============================================
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret-key

# ============================================
# CORS
# ============================================
CORS_ORIGINS=http://localhost:3000,https://tu-dominio.com

# ============================================
# EMAIL
# ============================================
MAIL_API_URL=https://tu-servidor-email.com
MAIL_API_CLIENT_ID=client_id_aqui
MAIL_API_SECRET=secret_aqui
SMTP_FROM_EMAIL=noreply@tu-dominio.com
SMTP_FROM_NAME="Sistema de Asistencia"

# ============================================
# OTRAS CONFIGURACIONES
# ============================================
AUTO_MIGRATE=false
DEBUG=false
ENVIRONMENT=production
```

**Cargado por:** `docker compose` (via `env_file: - .env` en docker-compose.yml)

---

### 3️⃣ `client/.env` (Next.js Frontend)

**Ubicación:** `/home/deploy/app/sistema-de-asistencia/client/.env`

**Propósito:** Configurar la aplicación Next.js

**Variables importantes:**

```bash
# ============================================
# URLs PÚBLICAS (visible en el navegador)
# ============================================
NEXT_PUBLIC_URL_BACKEND=https://tu-dominio.com/
NEXT_PUBLIC_API_URL=https://tu-dominio.com/api

# ============================================
# AUTENTICACIÓN
# ============================================
NEXTAUTH_URL=https://tu-dominio.com
NEXTAUTH_SECRET=your-nextauth-secret-key-here-long-random-string

# ============================================
# CONFIGURACIÓN DEL BUILD
# ============================================
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

**Cargado por:** `docker compose` (via `env_file: - client/.env` en docker-compose.yml)

**IMPORTANTE:** 
- Variables prefijadas con `NEXT_PUBLIC_*` son visibles en el navegador
- NO incluir secrets sensibles en variables `NEXT_PUBLIC_*`
- El cliente se comunica con el API via Nginx (puerto 80/443)

---

## 🔗 Flujo de Comunicación

```
1. CLIENTE (Next.js :3000)
   ├─ Lee: NEXT_PUBLIC_URL_BACKEND, NEXTAUTH_URL, NEXTAUTH_SECRET
   └─ Se comunica con: http://nginx/api (internamente)
        │
        ▼
2. NGINX (Reverse Proxy)
   ├─ Puerto 80/443 (público)
   ├─ Recibe peticiones del cliente
   └─ Las redirecciona internamente a:
        ├─ http://client:3000 (por defecto)
        └─ http://api:8000/api (para /api/*)
             │
             ▼
3. API (FastAPI :8000)
   ├─ Lee: DATABASE_URL, SECRET_KEY, JWT_SECRET_KEY
   ├─ Se conecta a: PostgreSQL (via DATABASE_URL)
   └─ Responde al cliente via Nginx
```

---

## ✅ Checklist de Configuración

### En Desarrollo (Local)

- [ ] `.env` (raíz) con valores locales
- [ ] `server/.env` con valores locales (ej: localhost:5432)
- [ ] `client/.env` con `NEXT_PUBLIC_URL_BACKEND=http://localhost`
- [ ] PostgreSQL corriendo en localhost:5432

### En Producción (AWS EC2)

- [ ] `.env` (raíz) con valores de producción
- [ ] `server/.env` con DATABASE_URL de RDS
- [ ] `client/.env` con dominio público
- [ ] Certificados SSL en `./certs/`
- [ ] Secretos NO en git (usar GitHub Secrets)

---

## 🚀 Despliegue con Variables

### Script Automático

El script `deploy-compose.sh` ahora valida:

```bash
✅ .env (raíz)        → DATABASE_URL, SECRET_KEY, JWT_SECRET_KEY
✅ server/.env        → Encontrado
✅ client/.env        → Encontrado
```

### Ejecución

```bash
cd /home/deploy/app/sistema-de-asistencia

# 1. Crear archivos .env necesarios
cp .env.example .env
cp server/.env.example server/.env
# (client no tiene .env.example, crear manualmente)

# 2. Editar con valores de producción
nano .env
nano server/.env
nano client/.env

# 3. Ejecutar despliegue (valida todo automáticamente)
bash deploy-compose.sh both
```

---

## 🔐 Notas de Seguridad

### ✅ Hacer

- ✅ Usar variables de entorno para secrets
- ✅ Generar claves criptográficamente seguras:
  ```bash
  openssl rand -hex 32  # Para SECRET_KEY, JWT_SECRET_KEY, NEXTAUTH_SECRET
  ```
- ✅ Almacenar secrets en GitHub Secrets (no en .env del repo)
- ✅ Usar HTTPS en producción (Nginx con certificados SSL)
- ✅ Limitar CORS_ORIGINS a dominios conocidos

### ❌ NO Hacer

- ❌ Subir .env a git
- ❌ Hardcodear secrets en código
- ❌ Usar placeholders en producción
- ❌ Compartir DATABASE_URL en canales públicos
- ❌ Usar HTTP en producción

---

## 🐛 Troubleshooting

### Error: "DATABASE_URL no está configurada"

**Solución:** Verificar que `.env` raíz tiene DATABASE_URL válida:

```bash
grep "^DATABASE_URL=" .env
```

### Error: "Cannot connect to database"

**Solución:** Verificar que `server/.env` tiene la misma DATABASE_URL:

```bash
diff <(grep "^DATABASE_URL=" .env) <(grep "^DATABASE_URL=" server/.env)
```

### Cliente no se conecta a la API

**Solución:** Verificar que `client/.env` tiene URL correcta:

```bash
cat client/.env | grep NEXT_PUBLIC_URL_BACKEND
```

Debe ser la URL pública (dominio), NO localhost en producción.

---

## 📚 Referencias

- [Docker Compose env_file](https://docs.docker.com/compose/env-file/)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [FastAPI Configuration](https://fastapi.tiangolo.com/advanced/security/)
