# 📋 Guía de Monitoreo de Logs

Cuando ejecutas los scripts de despliegue, los servicios se inician en **background** y sus logs se guardan en archivos.

## 📂 Ubicación de los Logs

```
/ruta/del/repo/
├── server-start.log      # Logs del servidor FastAPI (puerto 8000)
└── client-start.log      # Logs del cliente Next.js (puerto 3000)
```

## 🔍 Comandos Útiles

### Ver logs del **Servidor** (FastAPI)

```bash
# Ver en tiempo real (sigue nuevos logs conforme se generan)
tail -f ./server-start.log

# Ver últimas 50 líneas
tail -n 50 ./server-start.log

# Ver todas las líneas
cat ./server-start.log

# Buscar solo errores
grep -i error ./server-start.log
```

### Ver logs del **Cliente** (Next.js)

```bash
# Ver en tiempo real
tail -f ./client-start.log

# Ver últimas 50 líneas
tail -n 50 ./client-start.log

# Ver todas las líneas
cat ./client-start.log

# Buscar solo errores
grep -i error ./client-start.log
```

## 🔄 Gestión de Procesos

### Ver procesos activos

```bash
# Ver servidor FastAPI (uvicorn)
ps aux | grep uvicorn

# Ver cliente Next.js (pnpm)
ps aux | grep pnpm
```

### Verificar puertos

```bash
# Ver qué está escuchando en puerto 8000 (servidor)
lsof -i :8000

# Ver qué está escuchando en puerto 3000 (cliente)
lsof -i :3000
```

### Detener procesos

```bash
# Detener servidor
pkill -f "uvicorn main"

# Detener cliente
pkill -f "pnpm start"

# Detener ambos
pkill -f "uvicorn main" && pkill -f "pnpm start"

# Fuerza kill si no funcionan
pkill -9 -f uvicorn && pkill -9 -f pnpm
```

### Health Check

```bash
# Verificar que el servidor responde
curl http://localhost:8000/health

# Verificar que el cliente está sirviendo
curl http://localhost:3000 | head -20
```

## ✅ Comportamiento Correcto

### 1️⃣ Primera ejecución

```bash
$ ./deploy-server.sh
✓ Servidor iniciado (PID: 12345)
✓ Servidor escuchando en puerto 8000
```

### 2️⃣ Segunda ejecución (sin detener)

```bash
$ ./deploy-server.sh
⚠️  Servidor ya está corriendo en puerto 8000
→ Opciones para detener, ver logs o reiniciar
```

### 3️⃣ Hacer cambios y reiniciar

```bash
pkill -f "uvicorn main"     # Detén servidor
./deploy-server.sh          # Reinicia
```

## 🎯 Atajos rápidos

Copia estos en tu `.bashrc` o `.zshrc`:

```bash
alias logs-server='tail -f ./server-start.log'
alias logs-client='tail -f ./client-start.log'
alias stop-all='pkill -f "uvicorn main" && pkill -f "pnpm start"'
alias restart-server='pkill -f "uvicorn main" && sleep 2 && ./deploy-server.sh'
alias restart-client='pkill -f "pnpm start" && sleep 2 && ./deploy-client.sh build-only'
alias health='curl -s http://localhost:8000/health && echo "" && curl -s http://localhost:3000 | head -5'
alias procs='ps aux | grep -E "uvicorn|pnpm" | grep -v grep'
```

Uso:

```bash
logs-server      # Ver logs servidor
logs-client      # Ver logs cliente
stop-all         # Detener todo
restart-server   # Reiniciar servidor
restart-client   # Reiniciar cliente
health           # Ver estado de ambos
procs            # Ver procesos activos
```

## 🚨 Troubleshooting

### Puerto en uso

```bash
lsof -i :8000                  # Ver qué usa el puerto 8000
pkill -f "uvicorn main"        # Liberarlo
```

### Limpiar logs

```bash
rm ./server-start.log ./client-start.log
```

### Logs no se actualizan

```bash
# Verifica que los archivos existan
ls -lah ./server-start.log ./client-start.log

# Re-ejecuta los scripts
./deploy-server.sh
./deploy-client.sh
```

¡Todo debe estar funcionando correctamente ahora! 🚀
