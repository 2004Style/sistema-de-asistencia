# 🎯 DIAGRAMA VISUAL - ARQUITECTURA SEPARADA

## 📊 Arquitectura Completa

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                          USUARIOS EN INTERNET                         ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
        ┌─────────────────────────┐      ┌──────────────────────┐
        │  SERVIDOR 1: CLIENTE    │      │  SERVIDOR 2: BACKEND │
        │  (diferentes máquina)   │      │ (diferentes máquina)  │
        └─────────────────────────┘      └──────────────────────┘
                    │                               │
        ┌───────────┴──────────────┐               │
        │                          │               │
        ▼                          ▼               ▼
    ┌─────────────┐        ┌──────────────┐  ┌────────────────┐
    │   NGINX     │        │    NGINX     │  │   FastAPI      │
    │ :80 / :443  │        │  :80 / :443  │  │   :8000        │
    └──────┬──────┘        └──────┬───────┘  └────────────────┘
           │                      │               │
           │ redirige a           │ redirige a    │
           │ localhost:3000       │ localhost:8000
           │                      │               │
           ▼                      ▼               ▼
    ┌─────────────┐        ┌──────────────┐  ┌────────────────┐
    │  Next.js    │        │   (?)        │  │  PostgreSQL    │
    │  :3000      │        │              │  │   :5432        │
    │  (Cliente)  │        └──────────────┘  │  (Base datos)  │
    └─────────────┘                          └────────────────┘
           │
           │ Peticiones HTTP
           │
           └──────────────────────►  http://IP_SERVIDOR2:8000/api/*
```

---

## 🔄 Flujo de Comunicación - DESARROLLO

```
USUARIO (navegador)
    │
    ▼
http://localhost:3000  (Next.js - Cliente)
    │
    ├─────────────────────────────────────────────────────┐
    │                                                     │
    │ Petición a:  http://localhost:8000/api/v1/usuarios │
    │                                                     │
    ▼                                                     ▼
FastAPI (:8000)                                   WebSocket/Socket.io
│                                                 │
├─ Valida token                                   ├─ Conexión persistente
├─ Conecta BD                                     ├─ Eventos en tiempo real
├─ Retorna JSON                                   └─ Actualiza UI
│
▼
http://localhost:3000  (Actualiza pantalla)
│
▼
USUARIO (ve cambios)
```

---

## 🔄 Flujo de Comunicación - PRODUCCIÓN

```
USUARIO (navegador)
    │
    ▼
https://tudominio.com  (NGINX - Reverse Proxy Cliente)
    │
    ├─ SSL/TLS
    ├─ Compresión GZIP
    ├─ Caché de archivos
    │
    ▼
localhost:3000 interno (Next.js - Cliente)
    │
    ├─────────────────────────────────────────────────────┐
    │                                                     │
    │ Petición a:  https://tudominio.com/api/v1/usuarios │
    │                                                     │
    │ NGINX lo redirige internamente a:                  │
    │ http://localhost:8000/api/v1/usuarios              │
    │                                                     │
    ▼                                                     ▼
https://tudominio.com/api  (NGINX - Reverse Proxy Servidor)
    │
    ├─ SSL/TLS
    ├─ Headers de seguridad
    │
    ▼
localhost:8000 interno (FastAPI - Servidor)
    │
    ├─ Valida token
    ├─ Conecta BD PostgreSQL
    ├─ Retorna JSON
    │
    ▼
localhost:3000 interno (actualiza)
    │
    ▼
https://tudominio.com (renderiza)
    │
    ▼
USUARIO (ve cambios)
```

---

## 📁 Estructura de Archivos Creada

```
proyecto-hibridos/sistema-de-asistencia/
│
├── 📁 client/
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── next.config.ts
│   ├── .env.development         ← NUEVO
│   ├── .env.production          ← NUEVO
│   └── .env.local.example       ← NUEVO
│
├── 📁 server/
│   ├── src/
│   ├── requirements.txt
│   ├── main.py
│   ├── .env.development         ← NUEVO
│   ├── .env.production          ← NUEVO
│   └── .env.local.example       ← NUEVO
│
├── 📁 nginx/
│   ├── nginx-client.conf        ← NUEVO (Config Nginx Cliente)
│   └── nginx-server.conf        ← NUEVO (Config Nginx Servidor)
│
├── 📖 CONFIGURACION_SEPARADA.md ← NUEVO (Este resumen)
├── 📖 GUIA_DESPLIEGUE_RAPIDA.md ← NUEVO (Referencia rápida)
├── 📖 GUIA_DESPLIEGUE_CLIENTE.md ← NUEVO (Guía completa cliente)
├── 📖 GUIA_DESPLIEGUE_SERVIDOR.md ← NUEVO (Guía completa servidor)
│
├── 🚀 deploy-client.sh          ← NUEVO (Script automatizado)
├── 🚀 deploy-server.sh          ← NUEVO (Script automatizado)
│
└── ... (otros archivos existentes)
```

---

## 🎯 Matriz de Configuración

```
                    │  DESARROLLO  │  PRODUCCIÓN  │
────────────────────┼──────────────┼──────────────┤
Cliente URL         │ localhost:   │ tudominio.   │
                    │ 3000         │ com          │
────────────────────┼──────────────┼──────────────┤
Server URL          │ localhost:   │ api.tudominio│
                    │ 8000         │ .com         │
────────────────────┼──────────────┼──────────────┤
Protocolo           │ HTTP         │ HTTPS        │
────────────────────┼──────────────┼──────────────┤
Nginx               │ No necesario │ Requerido    │
────────────────────┼──────────────┼──────────────┤
SSL/TLS             │ No           │ Sí           │
────────────────────┼──────────────┼──────────────┤
CORS                │ Habilitado   │ Solo dominio │
────────────────────┼──────────────┼──────────────┤
Archivo .env        │ .env.dev     │ .env.prod    │
────────────────────┼──────────────┼──────────────┤
Base datos          │ Local        │ Remota       │
────────────────────┼──────────────┼──────────────┤
Debug               │ Activado     │ Desactivado  │
```

---

## 🔗 Conectar Servidores

### Paso 1: Obtener IPs

**En Servidor Cliente:**

```bash
hostname -I
# Resultado: 192.168.1.100
```

**En Servidor Backend:**

```bash
hostname -I
# Resultado: 192.168.1.101
```

### Paso 2: Configurar Cliente

**Archivo: `client/.env.development`**

```env
NEXT_PUBLIC_API_URL=http://192.168.1.101:8000
NEXT_PUBLIC_SOCKET_URL=http://192.168.1.101:8000
```

### Paso 3: Configurar Servidor

**Archivo: `server/.env.development`**

```env
ALLOWED_ORIGINS=http://192.168.1.100:3000,http://localhost:3000
```

### Paso 4: Verificar Conexión

```bash
# Desde Cliente, verificar conexión a Server
curl http://192.168.1.101:8000/health

# Debe responder con JSON (no error)
```

---

## 🚀 Scripts de Inicio

### Sistema Automático

```bash
# Hacer ejecutables
chmod +x deploy-client.sh deploy-server.sh

# En Terminal 1 - Cliente
./deploy-client.sh
# Elige: 1 (Desarrollo)
# Se instala, configura y abre en http://localhost:3000

# En Terminal 2 - Servidor
./deploy-server.sh
# Elige: 1 (Desarrollo)
# Se instala, configura y abre en http://localhost:8000
```

### Sistema Manual

```bash
# Terminal 1 - Cliente
cd client && pnpm install && pnpm dev

# Terminal 2 - Servidor
cd server && source venv/bin/activate && pip install -r requirements.txt && ./run.sh
```

---

## 📊 Comparativa de Despliegue

### OPCIÓN 1: Local (Desarrollo)

```
Tu PC
├── Puerto 3000 ← Cliente
└── Puerto 8000 ← Servidor
```

### OPCIÓN 2: Servidores Separados (Producción)

```
Servidor 1 (IP: 1.1.1.1)        Servidor 2 (IP: 2.2.2.2)
├── Nginx :80/443               ├── Nginx :80/443
├── Cliente :3000 (interno)     ├── Server :8000 (interno)
└── Acceso: tudominio.com       ├── PostgreSQL
                                └── Acceso: api.tudominio.com
```

### OPCIÓN 3: Cloud + Servicios Manejados

```
AWS/Google Cloud/Azure
├── Load Balancer (80/443)
├── EC2/VM (Cliente) :3000
├── EC2/VM (Servidor) :8000
└── RDS (PostgreSQL Manejado)
```

---

## 🔐 Seguridad por Capas

```
USUARIO (Internet)
    │
    ├─ Firewall ISP
    │
    ▼
NGINX (Reverse Proxy)
    ├─ SSL/TLS Encryption
    ├─ Headers de seguridad
    ├─ Rate limiting
    └─ Compresión
    │
    ▼
Next.js (Cliente)
    ├─ CSRF tokens
    ├─ Cookies seguras
    └─ Validación de entrada
    │
    ▼
FastAPI (Servidor)
    ├─ JWT Authentication
    ├─ CORS Validation
    ├─ Input validation
    └─ Rate limiting
    │
    ▼
PostgreSQL
    ├─ Contraseña fuerte
    ├─ Firewall local
    ├─ Prepared statements
    └─ Encriptación de BD
```

---

## 📈 Escalamiento Futuro

### Opción A: Múltiples Clientes

```
Load Balancer
├─ Cliente 1 :3000
├─ Cliente 2 :3000
├─ Cliente 3 :3000
└── Un solo Servidor :8000
```

### Opción B: Múltiples Servidores

```
Servidor único
└─ Cliente :3000

Load Balancer (Backend)
├─ Server 1 :8000
├─ Server 2 :8000
└─ Server 3 :8000 (todos con replicación BD)
```

### Opción C: Full Horizontal Scale

```
Load Balancer (Cliente)     Load Balancer (Servidor)
├─ C1 :3000                 ├─ S1 :8000
├─ C2 :3000                 ├─ S2 :8000
└─ C3 :3000                 └─ S3 :8000

        ↓                           ↓
    Caché (Redis)           PostgreSQL Replicado
```

---

## ✨ Beneficios de Esta Arquitectura

| Aspecto           | Beneficio                             |
| ----------------- | ------------------------------------- |
| **Independencia** | Cada servidor se deploya por separado |
| **Escalabilidad** | Escala cada componente según demanda  |
| **Resiliencia**   | Fallo de cliente ≠ fallo de servidor  |
| **Rendimiento**   | Optimización independiente            |
| **Equipo**        | Diferentes equipos pueden trabajar    |
| **Despliegue**    | Cambios sin afectar otro servidor     |
| **Testing**       | Tests independientes                  |
| **Monitoring**    | Monitoreo por componente              |

---

## 🎓 Conceptos Importantes

### **Reverse Proxy (NGINX)**

- Cliente hace petición a NGINX
- NGINX la redirige internamente al servidor real
- Protege IP real, agrega seguridad

### **Puerto Interno vs Público**

- **Interno** (3000, 8000): Solo acceso local
- **Público** (80, 443): Acceso desde internet

### **CORS**

- Permite que cliente comunique con servidor
- Necesario incluso en mismo dominio si puertos diferentes
- Restringe seguridad

### **WebSocket**

- Conexión persistente (no cierra después de respuesta)
- Permite comunicación bidireccional
- Socket.io encima de WebSocket

---

## 📞 Soporte Rápido

**Problema: "Connection refused"**

```
Causa: Servidor no está escuchando
Solución: Verifica que el puerto está activo
lsof -i :8000  # Ver procesos en puerto 8000
```

**Problema: "CORS error"**

```
Causa: ALLOWED_ORIGINS no incluye origen del cliente
Solución: Agrega IP/dominio en .env
ALLOWED_ORIGINS=http://IP_CLIENTE:3000
```

**Problema: "WebSocket connection failed"**

```
Causa: Nginx sin soporte WebSocket
Solución: Verifica nginx.conf tenga:
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection $connection_upgrade;
```

---

## 🎯 Próximos Pasos Recomendados

1. ✅ **Entender la arquitectura** (leer este archivo)
2. ✅ **Revisar .env files** (variables de entorno)
3. ✅ **Ejecutar deploy scripts** (test automático)
4. ✅ **Verificar conectividad** (curl/ping)
5. ✅ **Leer guías detalladas** (según necesidad)
6. ✅ **Desplegar en producción** (seguir guías)

---

**¡Felicidades!** Ahora tienes una arquitectura profesional lista para escalar 🚀
