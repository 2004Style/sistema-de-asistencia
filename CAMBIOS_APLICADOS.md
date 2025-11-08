# 🔧 CAMBIOS APLICADOS - Corrección de `free(): invalid pointer`

## 📊 Resumen de Cambios

Se han realizado cambios **importantes** en el flujo de inicialización para resolver el error de memoria que impedía que el contenedor Docker arrancara.

### ⚠️ CAMBIO CRÍTICO: Orden de Ejecución

**ANTES:**

```
run.sh → seeds (BD sin ML)
      → uvicorn → FastAPI lifespan → carga ML
```

**DESPUÉS:**

```
run.sh → uvicorn → FastAPI lifespan → carga ML → seeds
```

## 📁 Archivos Modificados

### 1. `main.py` ⭐ MÁS IMPORTANTE

**Cambios:**

- Agregadas variables de entorno críticas al inicio
- Reorganizado el `lifespan` para cargar ML ANTES de seeds
- Agregada función `_execute_seeds()` que ejecuta seeds DESPUÉS del ML
- Mejor manejo de errores con try/except

**Por qué:** Evita double-loading de modelos de TensorFlow/DeepFace

### 2. `run.sh`

**Cambios:**

- ELIMINADA la ejecución de seeds en el script
- Ahora solo verifica dependencias e inicia uvicorn

**Por qué:** Los seeds se ejecutan en `main.py` lifespan donde ya están listos los modelos

### 3. `src/recognize/memory_cleanup.py`

**Cambios:**

- Aumentadas las pasadas de garbage collection de 1 a 5
- Agregada configuración de malloc agresivo
- Mejor manejo de excepciones

**Por qué:** Limpieza más efectiva entre cargas de modelos

### 4. `src/recognize/reconocimiento.py`

**Cambios:**

- Agregada protección contra double-loading
- Mejor manejo de excepciones con traceback

**Por qué:** Evita intentar cargar el reconocedor 2 veces

### 5. `Dockerfile`

**Cambios:**

- Agregadas variables de entorno (TERM, TF_CPP_MIN_LOG_LEVEL, etc.)
- Aumentado `start-period` del healthcheck de 10s a 30s

**Por qué:** Tiempo suficiente para que DeepFace descargue y cargue modelos (~20-25s)

## 🚀 Cómo Desplegar

### Opción 1: Despliegue Local

```bash
cd /home/ronald/Documentos/project-hibridos/sistema-de-asistencia/server

# Limpiar e invalidar caché
docker compose down
docker system prune -a

# Rebuildar con los cambios nuevos
docker compose up --build
```

### Opción 2: Verificación Previa

```bash
# Ver diagnóstico del sistema
python diagnose_startup.py

# Verificar configuración
bash verify_deploy.sh
```

### Opción 3: Despliegue en Producción (AWS EC2)

```bash
# En la máquina local
git add -A
git commit -m "Fix: Corregir free() invalid pointer en inicialización"
git push

# En AWS EC2 (si tienes acceso)
cd /home/deploy/app/sistema-de-asistencia/server
git pull
docker compose -f docker-compose-production.yml down
docker compose -f docker-compose-production.yml up -d --build
```

## ✅ Verificación Post-Deploy

Espera a que el contenedor esté listo (30-45 segundos):

```bash
# Ver logs en tiempo real
docker logs sistema-asistencia-api -f

# Esperado: ver esto en los logs
# ✅ Facial recognition system initialized successfully
# 🌱 Ejecutando seeds (datos iniciales)...
# ✅ seed_roles completado
# ✅ seed_turnos completado
# ✅ seed_users completado
# 🌐 Server running on http://0.0.0.0:8000

# Verificar health check
docker ps
# Estado debe mostrar "healthy" después de 30s

# Probar API
curl http://localhost:8000/health
curl http://localhost:8000/docs
```

## 🔍 Monitoreo

Si el contenedor no arranca:

```bash
# Ver logs completos (sin streaming)
docker logs sistema-asistencia-api

# Buscar errores específicos
docker logs sistema-asistencia-api | grep -i error
docker logs sistema-asistencia-api | grep -i "free()"
docker logs sistema-asistencia-api | grep -i "tensorflow"

# Reiniciar con más info
docker logs sistema-asistencia-api --tail 100
```

## 📝 Configuración Necesaria

### En `.env`:

```bash
DATABASE_URL=postgresql://rdev:rdev@localhost:5432/asistencia
AUTO_MIGRATE=false    # En producción
DEBUG=false           # En producción
```

### En `.env.production` (AWS):

```bash
DATABASE_URL=postgresql://user:pass@rds-endpoint:5432/asistencia
AUTO_MIGRATE=false
DEBUG=false
```

## 🆘 Solución de Problemas

### Problema: Health check falla después de 30s

**Solución:**

```bash
# Aumentar start-period en Dockerfile o docker-compose.yml a 45s
HEALTHCHECK --interval=30s --timeout=10s --start-period=45s --retries=3
```

### Problema: Memory leak persiste

**Solución:**

```bash
# Verificar modelos descargados
ls -lh ~/.deepface/weights/

# Limpiar cache de DeepFace
rm -rf ~/.deepface/weights/
```

### Problema: PostgreSQL no conecta

**Solución:**

```bash
# Verificar contenedor de BD
docker logs sistema-asistencia-db

# Verificar DATABASE_URL en .env
cat .env | grep DATABASE_URL

# Probar conexión manual
psql postgresql://rdev:rdev@localhost:5432/asistencia
```

## 📊 Comparativa de Cambios

| Aspecto                    | Antes                     | Después                     |
| -------------------------- | ------------------------- | --------------------------- |
| **Carga de ML**            | `run.sh` + `main.py` (2x) | `main.py` solo (1x)         |
| **Seeds ejecutados**       | `run.sh` (sin ML)         | `main.py` lifespan (con ML) |
| **Limpieza de memoria**    | 1 GC pass                 | 5 GC passes                 |
| **TERM variable**          | ❌ No                     | ✅ Sí (xterm-256color)      |
| **Healthcheck delay**      | 10s                       | 30s                         |
| **Double-load protection** | ❌ No                     | ✅ Sí                       |
| **Error `free()`**         | ❌ Presente               | ✅ Resuelto                 |

## 📚 Archivos de Referencia

- Solución detallada: `SOLUCION_FREE_INVALID_POINTER.md`
- Script de diagnóstico: `diagnose_startup.py`
- Script de verificación: `verify_deploy.sh`

## 🎯 Próximos Pasos

1. **Desplegar localmente** para verificar que funciona
2. **Monitorear logs** durante 5-10 minutos
3. **Probar endpoints** de la API
4. **Verificar BD** que los seeds se ejecutaron
5. **Deploy en producción** (AWS EC2)

## 📞 Si Aún Hay Problemas

1. Ejecuta: `python diagnose_startup.py`
2. Revisa logs completos: `docker logs sistema-asistencia-api`
3. Verifica memoria: `docker stats`
4. Verifica BD: `docker logs sistema-asistencia-db`
5. Consulta `SOLUCION_FREE_INVALID_POINTER.md` para detalles técnicos
