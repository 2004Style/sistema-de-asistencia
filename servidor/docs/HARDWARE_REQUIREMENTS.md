## Requisitos de hardware — Servicio de reconocimiento facial

Este documento resume los requerimientos de hardware y recomendaciones para ejecutar
el módulo de reconocimiento facial y la aplicación servidor (`servidor`) que lo integra.
Incluye opciones para desarrollo, despliegue CPU-only y despliegue con GPU para producción.

### Resumen rápido
- Desarrollo local (CPU): 4 vCPU, 8 GB RAM, 10–20 GB disco libre.
- Producción (CPU-only, baja/media carga): 4–8 vCPU, 8–16 GB RAM, 50+ GB disco (NVMe recomendado).
- Producción (GPU, latencia baja / alta concurrencia): 1 GPU (T4/A10/NVIDIA), 8–16 GB RAM host, 16+ GB GPU RAM recomendable en modelos grandes.

---

### 1) Requisitos por entorno

- Desarrollo local
  - CPU: 4 vCPU (x86_64). Permite entrenar/extraer embeddings y pruebas. Si usas WSL o contenedor, aumentar a 6 vCPU si es posible.
  - RAM: 8 GB mínimo (12 GB recomendado si se ejecuta DB y servidor simultáneamente).
  - Disco: 20 GB libres; SSD/NVMe mejora tiempos de I/O para carga de modelos y almacenamiento de `embeddings.pkl`.
  - GPU: Opcional (para acelerar extracción con DeepFace/TensorFlow). Si no hay GPU, usar `tensorflow-cpu`.

- Producción (CPU-only)
  - CPU: 4–8 vCPU según concurrencia esperada (cada worker de Uvicorn/FastAPI cargará su propio proceso/instancia del modelo en memoria si no se gestiona correctamente).
  - RAM: 8–16 GB. Modelos como Facenet512 pueden requerir varios GB en memoria al cargar pesos.
  - Disco: 50+ GB (persistencia de embeddings, logs, backups). NVMe recomendado.
  - Concurrency: evitar demasiados workers por host — preferir 1 worker por proceso y usar un balanceador (otra opción: externalizar reconocimiento a microservicio para centralizar la carga).

- Producción (GPU-enabled) — recomendado para alta carga o latencia < 1s
  - GPU recomendada: NVIDIA T4 (buena relación coste/beneficio), A10, V100 o similar.
  - Memoria GPU: mínimo 8 GB; 16 GB+ recomendado para modelos grandes o batch processing.
  - CPU host: 4–8 vCPU dedicadas por instancia GPU.
  - RAM host: 16 GB mínimo.
  - Requisitos adicionales: drivers NVIDIA, CUDA y cuDNN compatibles con la versión de TensorFlow usada.

---

### 2) Almacenamiento y persistencia
- Embeddings: el sistema actual usa `embeddings.pkl` (pickle) en disco.
  - Recomendación: montar un volumen persistente (host path o volumen en Kubernetes). Para entornos distribuidos, migrar embeddings a almacenamiento central (Postgres, S3 + índice) para evitar corrupciones y problemas de sincronización.
- Tipo de disco: SSD / NVMe para reducir latencia de I/O.
- Backups: realizar snapshots periódicos del archivo de embeddings y del metadata.json.

### 3) Redes y latencia
- Si el reconocimiento queda como microservicio separado, la comunicación entre servicios debe ser de baja latencia (misma VPC o subnet). Una llamada REST simple añade ~1–20 ms; en hosts distintos sobre red pública sumar latencia de red.
- Recomendación: desplegar microservicio de reconocimiento en la misma región y VPC que la API principal.

### 4) Contenedores y orquestación
- Docker image: elegir base que incluya dependencias de sistema (libgl1-mesa-glx, libglib2.0-0, etc.) y la versión de TensorFlow adecuada.
- GPU en Docker: usar `--gpus` y una imagen base con CUDA (ej. `nvidia/cuda`) si se emplea GPU.
- Kubernetes: usar `nodeSelector`/`taints` para programar pods en nodos con GPU; usar plugin `nvidia-device-plugin`.

### 5) Requerimientos del sistema operativo / paquetes nativos
- Paquetes (Debian/Ubuntu): build-essential, libglib2.0-0, libsm6, libxrender1, libxext6, libgl1-mesa-glx.
- Para GPU: drivers NVIDIA (host), CUDA Toolkit y cuDNN. Asegurar compatibilidad con la versión de TensorFlow.

### 6) Configuración de despliegue y dimensionamiento
- Primera carga de modelos es costosa: usar `initialize_recognizer()` en startup para precargar modelos y mejorar latencia en la primera petición.
- Worker strategy: preferir 1 proceso por instancia para evitar múltiples cargas de modelos en la misma máquina; si se necesitan múltiples workers, considerar un microservicio centralizado que gestione la GPU.
- Escalado: escalar horizontalmente microservicio de reconocimiento; si hay GPU, escalar por número de GPUs disponibles.

### 7) Observabilidad y monitorización
- Métricas a capturar: tiempo de inferencia (p90/p95), memoria GPU usada, uso de GPU/CPU, tamaño de la DB de embeddings, tasa de errores de reconocimiento.
- Logs: rollover y envío a un sistema central (ELK/Graylog/Cloud logs).

### 8) Checklist previa a producción
1. Verificar compatibilidad TF ↔ CUDA ↔ drivers en el ambiente GPU.
2. Montar volumen persistente para `embeddings.pkl` y `database/`.
3. Probar `initialize_recognizer()` en startup y medir tiempo de carga.
4. Implementar backups periódicos de embeddings y metadata.
5. Definir límites de tamaño de imagen (5MB en controller, aumentar si necesario) y bloquear tipos no permitidos.
6. Añadir health/readiness endpoints y configurar probes en orquestador.

---

Si quieres, puedo generar un `Dockerfile` base optimizado para CPU o uno para GPU y un ejemplo de `docker-compose.yml` con volúmenes y healthchecks (no lo crearé a menos que lo pidas).

Archivo: `servidor/docs/HARDWARE_REQUIREMENTS.md`
