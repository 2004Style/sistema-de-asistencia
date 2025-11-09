# 🎯 INICIO RÁPIDO - CONFIGURACIÓN SEPARADA

## 📚 Archivos Más Importantes

```
✨ NUEVO - Configuración Separada
├── nginx/
│   ├── nginx-client.conf        ← Nginx para Cliente
│   └── nginx-server.conf        ← Nginx para Servidor Backend
│
├── .env files
│   ├── client/.env.development      ← Variables cliente desarrollo
│   ├── client/.env.production       ← Variables cliente producción
│   ├── server/.env.development      ← Variables servidor desarrollo
│   └── server/.env.production       ← Variables servidor producción
│
├── 📖 Guías de Despliegue
│   ├── CONFIGURACION_SEPARADA.md    ← Resumen ejecutivo (LEER PRIMERO)
│   ├── DIAGRAMA_ARQUITECTURA.md     ← Diagramas visuales
│   ├── GUIA_DESPLIEGUE_RAPIDA.md    ← Cheat sheet rápido
│   ├── GUIA_DESPLIEGUE_CLIENTE.md   ← Paso a paso cliente
│   └── GUIA_DESPLIEGUE_SERVIDOR.md  ← Paso a paso servidor
│
└── 🚀 Scripts Automáticos
    ├── deploy-client.sh             ← Ejecutable automáticamente
    └── deploy-server.sh             ← Ejecutable automáticamente
```

---

## 🚀 Inicio en 3 Pasos

### 1️⃣ Leer la documentación

```bash
# Recomendado: Leer en este orden
1. Este archivo (README inicio rápido)
2. CONFIGURACION_SEPARADA.md (resumen ejecutivo)
3. DIAGRAMA_ARQUITECTURA.md (entender arquitectura)
```

### 2️⃣ Configurar variables de entorno

**Cliente:**

```bash
cp client/.env.local.example client/.env.local
# Edita y configura NEXT_PUBLIC_API_URL
```

**Servidor:**

```bash
cp server/.env.local.example server/.env.local
# Edita y configura DATABASE_URL y ALLOWED_ORIGINS
```

### 3️⃣ Ejecutar servidores

```bash
# Terminal 1 - Cliente
./deploy-client.sh
# Elige opción 1 (Desarrollo)

# Terminal 2 - Servidor
./deploy-server.sh
# Elige opción 1 (Desarrollo)
```

---

## 📊 Lo Que Tienes Ahora

### ✅ Configuración Separada

- Cada servidor en puerto diferente (3000 y 8000)
- Variables de entorno por servidor
- Nginx preconfigurable para ambos

### ✅ Desarrollo Local

```
Cliente  → http://localhost:3000
Server   → http://localhost:8000
```

### ✅ Producción Separada

```
Cliente  → https://tudominio.com (cualquier IP/servidor)
Server   → https://api.tudominio.com (diferente IP/servidor)
```

### ✅ Escalable

- Agregar más clientes: multiplica instancias de Next.js
- Agregar más servidores: multiplica instancias de FastAPI
- Agregar BD: migra PostgreSQL a servidor dedicado

---

## 🔧 Comandos Rápidos

```bash
# Desarrollo automático
./deploy-client.sh     # Cliente Next.js
./deploy-server.sh     # Servidor FastAPI

# Desarrollo manual - Cliente
cd client && pnpm dev

# Desarrollo manual - Servidor
cd server && source venv/bin/activate && ./run.sh

# Producción - Cliente
cd client && pnpm build && pnpm start

# Producción - Servidor
cd server && gunicorn src.main:app --workers 4 --bind 0.0.0.0:8000
```

---

## 📍 URLs por Ambiente

| Recurso       | Desarrollo                    | Producción                        |
| ------------- | ----------------------------- | --------------------------------- |
| **Cliente**   | http://localhost:3000         | https://tudominio.com             |
| **API**       | http://localhost:8000/api     | https://api.tudominio.com/api     |
| **Docs**      | http://localhost:8000/docs    | https://api.tudominio.com/docs    |
| **WebSocket** | ws://localhost:8000/socket.io | wss://api.tudominio.com/socket.io |

---

## 🎯 Próximos Pasos

1. **Entender la arquitectura:**

   - Lee `CONFIGURACION_SEPARADA.md`
   - Mira `DIAGRAMA_ARQUITECTURA.md`

2. **Configurar conexiones:**

   - Edita `client/.env.development`
   - Edita `server/.env.development`

3. **Probar funcionamiento:**

   - Ejecuta `./deploy-client.sh`
   - Ejecuta `./deploy-server.sh`

4. **Desplegar en producción:**
   - Sigue `GUIA_DESPLIEGUE_CLIENTE.md`
   - Sigue `GUIA_DESPLIEGUE_SERVIDOR.md`

---

## 📞 Documentación Detallada

Para información específica, consulta:

- **Entender la arquitectura** → `DIAGRAMA_ARQUITECTURA.md`
- **Resumen completo** → `CONFIGURACION_SEPARADA.md`
- **Referencia rápida** → `GUIA_DESPLIEGUE_RAPIDA.md`
- **Setup Cliente completo** → `GUIA_DESPLIEGUE_CLIENTE.md`
- **Setup Servidor completo** → `GUIA_DESPLIEGUE_SERVIDOR.md`

---

## ✨ Lo Mejor De Esta Configuración

✅ **Separados** - Cada servidor independiente  
✅ **Flexible** - Desarrollo local sin conflictos  
✅ **Escalable** - Crece cada componente por separado  
✅ **Seguro** - Variables de entorno protegidas  
✅ **Profesional** - Listo para producción  
✅ **Automatizado** - Scripts listos para usar

---

## 🎓 Conceptos Clave

| Concepto        | Explicación                                   |
| --------------- | --------------------------------------------- |
| **Puerto 3000** | Cliente (Next.js) escucha aquí                |
| **Puerto 8000** | Servidor (FastAPI) escucha aquí               |
| **NGINX**       | Proxy reverso, expone puertos públicos        |
| **Desarrollo**  | Conexión directa entre puertos                |
| **Producción**  | NGINX redirige internamente                   |
| **.env**        | Variables de configuración por ambiente       |
| **CORS**        | Controla qué cliente puede llamar al servidor |

---

¿Listo para empezar? 👉 Lee `CONFIGURACION_SEPARADA.md` 🚀
