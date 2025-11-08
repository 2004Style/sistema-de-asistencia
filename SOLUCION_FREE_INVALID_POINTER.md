# ⚠️ SOLUCIÓN: Error `free(): invalid pointer` en Docker

## Problema Identificado

El contenedor no arrancaba con error de memoria `free(): invalid pointer` causado por:

1. **Double-loading de modelos ML**: Los modelos de DeepFace/TensorFlow se cargaban:
   - Primero en `run.sh` cuando ejecutaba los seeds
   - Luego en `main.py` cuando inicializaba el reconocedor
2. **Limpieza insuficiente de memoria**: La limpieza de memoria entre cargas no era agresiva

3. **TERM environment variable no configurada**: Causaba problemas con componentes que lo requieren

4. **Healthcheck demasiado agresivo**: 10 segundos era insuficiente para cargar los modelos

## Soluciones Aplicadas

### 1. ✅ Reordenamiento de Inicialización

**Archivo modificado: `main.py`**

- Agregadas variables de entorno críticas **AL INICIO**:

  ```python
  os.environ['TERM'] = 'xterm-256color'
  os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
  os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
  os.environ['KMP_DUPLICATE_LIB_OK'] = 'True'
  ```

- **NUEVO ORDEN EN EL LIFESPAN:**

  1. Inicializar directorios
  2. Aplicar migraciones de BD
  3. **CARGAR MODELOS DE ML PRIMERO** ← Clave
  4. Ejecutar seeds (usan la BD, no cargan modelos)
  5. Iniciar scheduler

- Agregada función `_execute_seeds()` que importa y ejecuta los seeds DESPUÉS de ML

### 2. ✅ Desactivación de Seeds en run.sh

**Archivo modificado: `run.sh`**

- **ELIMINADO**: Ejecución de seeds en el script del contenedor
- **RAZONAMIENTO**: Los seeds ahora se ejecutan en `main.py` lifespan, DESPUÉS de cargar los modelos

### 3. ✅ Mejora de Limpieza de Memoria

**Archivo modificado: `src/recognize/memory_cleanup.py`**

```python
def full_cleanup() -> None:
    cleanup_tensorflow()
    cleanup_torch()

    # Múltiples pasadas de garbage collection
    for _ in range(5):  # ← Aumentado de 1 a 5 pasadas
        gc.collect()
```

Agregadas:

- Múltiples pasadas de GC (5 en lugar de 1)
- Flag `MALLOC_TRIM_THRESHOLD_` para malloc agresivo
- Manejo robusto de excepciones

### 4. ✅ Protección Contra Double-Loading

**Archivo modificado: `src/recognize/reconocimiento.py`**

```python
def initialize_recognizer() -> FaceRecognizer:
    global _global_recognizer
    if _global_recognizer is not None:
        logger.info("ℹ️ Reconocedor ya estaba inicializado, reutilizando")
        return _global_recognizer
    # ... resto de inicialización
```

- Verificación al inicio para evitar recargar

### 5. ✅ Variables de Entorno en Dockerfile

**Archivo modificado: `Dockerfile`**

```dockerfile
ENV TERM=xterm-256color \
    TF_CPP_MIN_LOG_LEVEL=3 \
    TF_ENABLE_ONEDNN_OPTS=0 \
    KMP_DUPLICATE_LIB_OK=True
```

- Agregada variable de TERM

### 6. ✅ Healthcheck Mejorado

**Archivo modificado: `Dockerfile`**

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=45s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health').read()" || exit 1
```

- Aumentado `start-period` de 10s a **45s** (tiempo para cargar modelos)
- Cambio de `curl` a `python` (curl no disponible en imagen slim)
- Se usa `urllib.request` del stdlib (garantizado disponible)

### 6. ✅ Healthcheck Mejorado

**Archivo modificado: `Dockerfile`**

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3
```

- Aumentado `start-period` de 10s a **30s** (tiempo suficiente para cargar modelos)

## Próximos Pasos Para Desplegar

### Opción 1: Reconstruir Imagen Docker

```bash
# En la carpeta server/
docker compose -f docker-compose.yml down
docker image rm server-api:latest
docker compose -f docker-compose.yml up --build
```

### Opción 2: Limpiar y Reintentar (Si ya existe imagen)

```bash
# Limpiar caché de Docker
docker system prune -a

# Rebuildar
docker compose -f docker-compose.yml down
docker compose -f docker-compose.yml up --build
```

### Opción 3: Diagnóstico Previo

```bash
# Verificar que todo está bien ANTES de desplegar
cd /home/ronald/Documentos/project-hibridos/sistema-de-asistencia/server
python diagnose_startup.py
```

Este script verifica:

- Variables de entorno
- Dependencias instaladas
- Conectividad a BD
- Directorios necesarios
- Modelos de ML descargados
- Memoria disponible

## Qué Cambió

| Aspecto                   | Antes                   | Después                        |
| ------------------------- | ----------------------- | ------------------------------ |
| Carga de modelos          | En `run.sh` y `main.py` | **Solo en `main.py` lifespan** |
| Orden de inicialización   | Seeds → Modelos ML      | Modelos ML → Seeds             |
| Limpieza de memoria       | 1 pasada GC             | 5 pasadas GC + malloc trim     |
| TERM variable             | No configurada          | Configurada a `xterm-256color` |
| Healthcheck delay         | 10s                     | **30s**                        |
| Double-loading protection | No                      | **Sí**                         |

## Monitorear Después de Deploy

Después de que el contenedor esté corriendo, verifica los logs:

```bash
docker logs sistema-asistencia-api -f
```

Deberías ver:

```
✓ Directories initialized
✓ Database initialized
════════════════════════════════════════════
🔍 Initializing facial recognition system...
════════════════════════════════════════════
📸 Pre-cargando detector facial...
🧠 Pre-cargando reconocedor facial...
✅ Facial recognition system initialized successfully
════════════════════════════════════════════

🌱 Ejecutando seeds (datos iniciales)...
📋 Ejecutando seed_roles.py...
✅ seed_roles completado
🔄 Ejecutando seed_turnos.py...
✅ seed_turnos completado
👥 Ejecutando seed_users.py...
✅ seed_users completado

✓ Scheduler started

🌐 Server running on http://0.0.0.0:8000
```

## Si Aún Hay Problemas

1. Verifica memoria disponible: `free -h`
2. Verifica logs completos: `docker logs sistema-asistencia-api` (sin `-f`)
3. Ejecuta diagnóstico: `python diagnose_startup.py`
4. Revisa .env: Asegúrate que `AUTO_MIGRATE=false` en producción
5. PostgreSQL: Verifica que la BD está corriendo y es accesible

## Variables de Entorno Críticas

```bash
# En .env o .env.production
DATABASE_URL=postgresql://usuario:pass@host:5432/asistencia
TERM=xterm-256color
TF_CPP_MIN_LOG_LEVEL=3
AUTO_MIGRATE=false  # En producción
DEBUG=false  # En producción
```
