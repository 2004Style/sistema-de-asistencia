# 📘 GUÍA RÁPIDA - DESPLIEGUE SEPARADO

## 🎯 Resumen de Configuración

Tu sistema ahora está separado en **2 servidores independientes**:

### Servidor 1: CLIENTE (Next.js)

```
├── Puerto Interno: 3000
├── Puerto Público: 80/443 (vía Nginx)
├── Archivos:
│   ├── nginx/nginx-client.conf
│   ├── .env.development
│   ├── .env.production
│   └── client/* (tu código Next.js)
└── Conecta a: http://IP_SERVIDOR_2:8000
```

### Servidor 2: BACKEND (FastAPI)

```
├── Puerto Interno: 8000
├── Puerto Público: 80/443 (vía Nginx)
├── Archivos:
│   ├── nginx/nginx-server.conf
│   ├── .env.development
│   ├── .env.production
│   └── server/* (tu código FastAPI)
└── Base de datos: PostgreSQL
```

---

## 🚀 Inicio Rápido

### SERVIDOR 1 - Cliente (Next.js)

#### Desarrollo:

```bash
cd client
pnpm install
pnpm dev
# Accede a: http://localhost:3000
```

#### Producción:

```bash
cd client
pnpm install
pnpm build
pnpm start
# Nginx redirige puerto 80/443 → 3000
```

---

### SERVIDOR 2 - Backend (FastAPI)

#### Desarrollo:

```bash
cd server
source venv/bin/activate
pip install -r requirements.txt
./run.sh
# O: uvicorn src.main:app --reload
# Accede a: http://localhost:8000
```

#### Producción:

```bash
cd server
source venv/bin/activate
pip install -r requirements.txt
gunicorn src.main:app --workers 4 --bind 0.0.0.0:8000
# Nginx redirige puerto 80/443 → 8000
```

---

## 📋 Variables de Entorno

### Cliente (.env.development / .env.production)

```bash
# IP del servidor backend
NEXT_PUBLIC_API_URL=http://IP_SERVIDOR_2:8000
NEXT_PUBLIC_SOCKET_URL=http://IP_SERVIDOR_2:8000
```

### Backend (.env.development / .env.production)

```bash
# Permite conexiones desde cliente
ALLOWED_ORIGINS=http://localhost:3000,http://IP_SERVIDOR_1:3000

# Base de datos
DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/asistencia
```

---

## 🔄 Flujo de Comunicación

### En Desarrollo (sin Nginx):

```
CLIENTE (3000)
    ↓
    → Solicitud HTTP a http://IP_SERVIDOR_2:8000/api/*
    ↓
SERVIDOR (8000)
    ↓
    → Respuesta JSON
    ↓
CLIENTE (actualiza UI)
```

### En Producción (con Nginx):

```
USUARIO (https://tudominio.com)
    ↓
    → NGINX Cliente (80/443)
    ├─ /          → Puerto 3000 (Next.js)
    └─ /health    → Health check

USUARIO (https://api.tudominio.com)
    ↓
    → NGINX Servidor (80/443)
    ├─ /api/*     → Puerto 8000 (FastAPI)
    ├─ /docs      → Swagger API
    └─ /socket.io → WebSocket
```

---

## 📊 Tabla de Puertos

| Componente        | Desarrollo | Producción (Interno) | Producción (Público) |
| ----------------- | ---------- | -------------------- | -------------------- |
| **Cliente**       | 3000       | 3000                 | 80/443               |
| **Backend**       | 8000       | 8000                 | 80/443               |
| **Nginx Cliente** | N/A        | -                    | 80/443               |
| **Nginx Backend** | N/A        | -                    | 80/443               |

---

## ✅ Checklist de Despliegue

### Servidor Cliente:

- [ ] Instalar Node.js 18+
- [ ] Instalar Nginx
- [ ] Copiar `nginx/nginx-client.conf`
- [ ] Configurar `.env.production`
- [ ] Generar certificado SSL
- [ ] Build: `pnpm build`
- [ ] Iniciar: `pnpm start` o PM2
- [ ] Verificar: `curl http://localhost/`

### Servidor Backend:

- [ ] Instalar Python 3.10+
- [ ] Instalar Nginx
- [ ] Instalar PostgreSQL
- [ ] Copiar `nginx/nginx-server.conf`
- [ ] Configurar `.env.production`
- [ ] Generar certificado SSL
- [ ] Crear base de datos
- [ ] Ejecutar migraciones: `alembic upgrade head`
- [ ] Iniciar: `gunicorn` o Supervisor
- [ ] Verificar: `curl http://localhost:8000/docs`

---

## 🔗 Conectar Servidores

### En Cliente (.env):

```
NEXT_PUBLIC_API_URL=http://192.168.1.101:8000
NEXT_PUBLIC_SOCKET_URL=http://192.168.1.101:8000
```

Reemplaza `192.168.1.101` con **IP real de tu servidor backend**

### En Backend (.env):

```
ALLOWED_ORIGINS=http://192.168.1.100:3000,https://tudominio.com
```

Reemplaza `192.168.1.100` con **IP real de tu servidor cliente**

---

## 📁 Archivos Creados

```
proyecto/
├── nginx/
│   ├── nginx-client.conf        ← Config Nginx para cliente
│   └── nginx-server.conf        ← Config Nginx para backend
├── client/
│   ├── .env.development         ← Vars desarrollo (cliente)
│   ├── .env.production          ← Vars producción (cliente)
│   └── .env.local.example       ← Template local
├── server/
│   ├── .env.development         ← Vars desarrollo (backend)
│   ├── .env.production          ← Vars producción (backend)
│   └── .env.local.example       ← Template local
├── GUIA_DESPLIEGUE_CLIENTE.md   ← Guía detallada cliente
├── GUIA_DESPLIEGUE_SERVIDOR.md  ← Guía detallada backend
└── GUIA_DESPLIEGUE_RAPIDA.md    ← Esta guía
```

---

## 🆘 Errores Comunes

### Cliente no conecta a Backend

```bash
# Verificar IP en .env
echo $NEXT_PUBLIC_API_URL

# Verificar conexión
curl http://IP_SERVIDOR:8000/health
```

### Backend no recibe conexiones

```bash
# Verificar CORS
cat .env | grep ALLOWED_ORIGINS

# Debe incluir: http://IP_CLIENTE:3000
```

### WebSocket no funciona

```bash
# Verificar que ambos están en HTTPS o HTTP (no mezclar)
# Verificar firewall permite puerto 8000
```

---

## 📞 URLs de Referencia

### Cliente:

- Desarrollo: `http://localhost:3000`
- Producción: `https://tudominio.com`

### Backend:

- Documentación: `http://localhost:8000/docs`
- Health: `http://localhost:8000/health`
- API: `http://localhost:8000/api/v1/*`
- WebSocket: `ws://localhost:8000/socket.io`

---

## 📚 Documentación Completa

Para información más detallada:

- Servidor Cliente: Ver `GUIA_DESPLIEGUE_CLIENTE.md`
- Servidor Backend: Ver `GUIA_DESPLIEGUE_SERVIDOR.md`
- Configuración Nginx: Revisar archivos en carpeta `nginx/`

---

**¡Listo! Tu sistema está configurado para despliegue separado.** 🎉
