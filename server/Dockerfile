# Stage 1: Build dependencies
FROM python:3.12-slim as builder

WORKDIR /app

# Instalar dependencias del sistema necesarias
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements y instalar dependencias de Python
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Stage 2: Runtime
FROM python:3.12-slim

WORKDIR /app

# Instalar dependencias del sistema necesarias en tiempo de ejecución
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    ffmpeg \
    libsm6 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

# Copiar las dependencias instaladas desde el builder
COPY --from=builder /root/.local /root/.local

# Establecer variables de entorno
ENV PATH=/root/.local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    TERM=xterm-256color \
    TF_CPP_MIN_LOG_LEVEL=3 \
    TF_ENABLE_ONEDNN_OPTS=0 \
    KMP_DUPLICATE_LIB_OK=True

# Copiar el código de la aplicación
COPY . .

# Copiar archivos de configuración de entorno (.env y .env.production)
COPY .env* ./

# IMPORTANTE: Hacer ejecutable el script run.sh
RUN chmod +x run.sh

# Exponer el puerto (ajusta según tu configuración)
EXPOSE 8000

# Health check - usar python en lugar de curl (curl no está instalado)
HEALTHCHECK --interval=30s --timeout=10s --start-period=45s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health').read()" || exit 1

# Ejecutar run.sh en lugar de uvicorn directamente
# El script run.sh se encarga de:
# 1. Verificar entorno virtual
# 2. Verificar dependencias
# 3. Iniciar uvicorn
# 4. FastAPI ejecutará automáticamente migraciones y seeds en el lifespan
CMD ["./run.sh"]
